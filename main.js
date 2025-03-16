const fs = require('fs');
const { crawl } = require('./crawler');
const { CrawlerMonitor } = require('./monitor');

async function main() {
    const startUrl = process.argv[2];

    // Validate URL input
    if (!startUrl) {
        console.error('Please provide a URL as an argument');
        console.error('Usage: node main.js https://example.com');
        process.exit(1);
    }

    try {
        new URL(startUrl); // Validate URL format
    } catch (error) {
        console.error('Invalid URL format provided');
        process.exit(1);
    }

    try {
        console.log(`Starting monitored crawl for ${startUrl}`);
        console.log('This may take a while depending on the website size...');

        const monitor = new CrawlerMonitor();
        await monitor.monitorCrawl(startUrl);

        console.log('\nCrawling complete. Results written to output.json');

        // Load final results for summary
        const results = require('./intermediate_results.json').results;
        console.log(`\nCrawling Summary:`);
        console.log(`- Total pages processed: ${results.length}`);
        console.log(`- Successful pages: ${results.filter(r => !r.error).length}`);
        console.log(`- Failed pages: ${results.filter(r => r.error).length}`);
    } catch (error) {
        console.error('Crawling failed:', error.message);
        process.exit(1);
    }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
    process.exit(1);
});

main().catch(console.error);