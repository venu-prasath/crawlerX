const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

class CrawlerMonitor {
    constructor() {
        this.startTime = Date.now();
        this.lastStats = null;
        this.pageProcessingRates = [];
    }

    formatBytes(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let value = bytes;
        let unitIndex = 0;
        while (value > 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex++;
        }
        return `${Math.round(value * 100) / 100} ${units[unitIndex]}`;
    }

    getSystemStats() {
        const used = process.memoryUsage();
        const systemMemory = {
            total: os.totalmem(),
            free: os.freemem(),
            used: os.totalmem() - os.freemem()
        };

        const stats = {
            timestamp: new Date().toISOString(),
            memory: {
                process: {
                    heapUsed: Math.round(used.heapUsed / 1024 / 1024),
                    heapTotal: Math.round(used.heapTotal / 1024 / 1024),
                    rss: Math.round(used.rss / 1024 / 1024),
                    external: Math.round(used.external / 1024 / 1024)
                },
                system: {
                    total: Math.round(systemMemory.total / 1024 / 1024),
                    free: Math.round(systemMemory.free / 1024 / 1024),
                    used: Math.round(systemMemory.used / 1024 / 1024)
                }
            },
            cpuUsage: process.cpuUsage(),
            uptime: Math.round((Date.now() - this.startTime) / 1000),
            intermediateFile: this.getIntermediateFileStats()
        };

        // Calculate processing rate
        if (this.lastStats && stats.intermediateFile && this.lastStats.intermediateFile) {
            const timeDiff = stats.uptime - this.lastStats.uptime;
            const pagesDiff = stats.intermediateFile.pagesProcessed - this.lastStats.intermediateFile.pagesProcessed;
            if (timeDiff > 0) {
                const rate = pagesDiff / (timeDiff / 60); // pages per minute
                this.pageProcessingRates.push(rate);
            }
        }

        return stats;
    }

    getIntermediateFileStats() {
        try {
            if (fs.existsSync('intermediate_results.json')) {
                const stats = fs.statSync('intermediate_results.json');
                const data = JSON.parse(fs.readFileSync('intermediate_results.json', 'utf8'));

                // Get queue size from page links map
                let queueSize = 0;
                if (fs.existsSync('page_links_map.json')) {
                    const linksMap = JSON.parse(fs.readFileSync('page_links_map.json', 'utf8'));
                    queueSize = Object.values(linksMap).flat().length;
                }

                // Calculate max depth
                const maxDepth = data.results.reduce((max, page) => {
                    const depth = page.url.split('/').length - 3; // Rough depth estimation
                    return Math.max(max, depth);
                }, 0);

                return {
                    size: this.formatBytes(stats.size),
                    pagesProcessed: data.stats.totalPages,
                    successfulPages: data.stats.successfulPages,
                    failedPages: data.stats.failedPages,
                    queueSize,
                    maxDepth,
                    lastModified: stats.mtime
                };
            }
        } catch (error) {
            console.error('Error reading intermediate file stats:', error);
        }
        return null;
    }

    getEstimatedTimeRemaining() {
        if (!this.lastStats || !this.lastStats.intermediateFile) return 'calculating...';

        const avgRate = this.pageProcessingRates.reduce((a, b) => a + b, 0) / this.pageProcessingRates.length;
        if (!avgRate) return 'calculating...';

        const remainingPages = this.lastStats.intermediateFile.queueSize;
        const estimatedMinutes = remainingPages / avgRate;

        if (estimatedMinutes < 1) return 'less than a minute';
        return `~${Math.round(estimatedMinutes)} minutes`;
    }

    logStats() {
        const stats = this.getSystemStats();
        console.log('\n=== Crawler Status ===');
        console.log(`Time Elapsed: ${Math.floor(stats.uptime / 60)}m ${stats.uptime % 60}s`);

        if (stats.intermediateFile) {
            console.log('\nProgress:');
            console.log(`- Total Pages: ${stats.intermediateFile.pagesProcessed}`);
            console.log(`- Successful Pages: ${stats.intermediateFile.successfulPages}`);
            console.log(`- Failed Pages: ${stats.intermediateFile.failedPages}`);
            console.log(`- Pending URLs: ${stats.intermediateFile.queueSize}`);
            console.log(`- Max Crawl Depth: ${stats.intermediateFile.maxDepth}`);
            console.log(`- Output File Size: ${stats.intermediateFile.size}`);

            if (this.pageProcessingRates.length > 0) {
                const avgRate = this.pageProcessingRates.reduce((a, b) => a + b, 0) / this.pageProcessingRates.length;
                console.log(`- Processing Rate: ${avgRate.toFixed(2)} pages/minute`);
                console.log(`- Estimated Time Remaining: ${this.getEstimatedTimeRemaining()}`);
            }
        }

        console.log('\nSystem Resources:');
        console.log(`- Process Memory: ${this.formatBytes(stats.memory.process.rss)}`);
        console.log(`- System Memory Used: ${this.formatBytes(stats.memory.system.used)} / ${this.formatBytes(stats.memory.system.total)}`);

        this.lastStats = stats;
    }

    async monitorCrawl(url) {
        return new Promise((resolve, reject) => {
            const crawler = spawn('node', ['crawler.js', url], {
                stdio: ['inherit', 'pipe', 'pipe']
            });

            // Monitor system stats every 5 seconds
            const statsInterval = setInterval(() => this.logStats(), 5000);

            crawler.stdout.on('data', (data) => {
                console.log(`Crawler: ${data}`);
            });

            crawler.stderr.on('data', (data) => {
                console.error(`Crawler Error: ${data}`);
            });

            crawler.on('close', (code) => {
                clearInterval(statsInterval);
                this.logStats(); // Final stats
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Crawler process exited with code ${code}`));
                }
            });
        });
    }
}

module.exports = { CrawlerMonitor };