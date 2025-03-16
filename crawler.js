const puppeteer = require('puppeteer-core');
const fs = require('fs');
const { extractData } = require('./extractor');
const { isSameDomain, normalizeUrl } = require('./utils');

async function loadPageLinksMap() {
    try {
        if (fs.existsSync('page_links_map.json')) {
            const data = fs.readFileSync('page_links_map.json', 'utf8');
            return new Map(Object.entries(JSON.parse(data)));
        }
    } catch (error) {
        console.error('Error loading page links map:', error);
    }
    return new Map();
}

async function savePageLinksMap(pageLinksMap) {
    try {
        const data = Object.fromEntries(pageLinksMap);
        fs.writeFileSync('page_links_map.json', JSON.stringify(data, null, 2));
        console.log('Page links map saved successfully');
    } catch (error) {
        console.error('Error saving page links map:', error);
    }
}

async function loadIntermediateResults() {
    try {
        if (fs.existsSync('intermediate_results.json')) {
            const data = fs.readFileSync('intermediate_results.json', 'utf8');
            return JSON.parse(data).results || [];
        }
    } catch (error) {
        console.error('Error loading intermediate results:', error);
    }
    return [];
}

async function saveIntermediateResults(results) {
    try {
        const successfulPages = results.filter(r => !r.error).length;
        const failedPages = results.filter(r => r.error).length;
        
        const data = {
            results,
            timestamp: new Date().toISOString(),
            stats: {
                totalPages: results.length,
                successfulPages,
                failedPages
            }
        };
        fs.writeFileSync('intermediate_results.json', JSON.stringify(data, null, 2));
        console.log(`Progress saved: ${results.length} pages processed`);
    } catch (error) {
        console.error('Error saving intermediate results:', error);
    }
}

async function crawl(startUrl) {
    let browser;
    try {
        console.log('Initializing browser...');
        console.log('Loading previous results and page links map...');

        const results = await loadIntermediateResults();
        const pageLinksMap = await loadPageLinksMap();
        const visited = new Set(results.map(r => r.url));

        if (results.length > 0) {
            console.log(`Resuming crawl with ${results.length} pages already processed`);
        }

        console.log('Launching browser with system Chrome...');
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-extensions'
            ],
            ignoreHTTPSErrors: true
        });
        console.log('Browser launched successfully');

        let queue = visited.size === 0 ? [normalizeUrl(startUrl)] : Array.from(pageLinksMap.values()).flat();
        const batchSize = 3;

        while (queue.length > 0) {
            const batch = queue.splice(0, batchSize);
            const promises = batch.map(async (url) => {
                if (visited.has(url)) return;
                visited.add(url);

                console.log(`Processing ${url}`);
                const page = await browser.newPage();

                try {
                    await page.setViewport({ width: 1280, height: 800 });
                    await page.setDefaultNavigationTimeout(30000);
                    await page.setDefaultTimeout(30000);

                    await page.setRequestInterception(true);
                    page.on('request', (request) => {
                        const resourceType = request.resourceType();
                        if (['font', 'stylesheet', 'image'].includes(resourceType)) {
                            request.abort();
                        } else {
                            request.continue();
                        }
                    });

                    const data = await extractData(page, url);
                    
                    const { links, ...resultData } = data;
                    results.push(resultData);

                    if (links && !data.error) {
                        const validLinks = links
                            .map(normalizeUrl)
                            .filter(link => isSameDomain(link, startUrl));
                        pageLinksMap.set(url, validLinks);
                        
                        validLinks.forEach(link => {
                            if (!visited.has(link)) {
                                queue.push(link);
                            }
                        });
                    }
                } catch (error) {
                    console.error(`Error processing ${url}:`, error);
                    results.push({
                        url,
                        error: `Crawling failed: ${error.message}`,
                        timestamp: new Date().toISOString()
                    });
                } finally {
                    await page.close().catch(err => console.error('Error closing page:', err));
                }
            });

            await Promise.all(promises);

            await saveIntermediateResults(results);
            await savePageLinksMap(pageLinksMap);

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return results;
    } catch (error) {
        console.error('Browser initialization error:', error);
        throw new Error(`Crawler initialization failed: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close().catch(err => console.error('Error closing browser:', err));
        }
    }
}

if (require.main === module) {
    const url = process.argv[2];
    if (!url) {
        console.error('Please provide a URL as an argument');
        process.exit(1);
    }

    crawl(url)
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Crawling failed:', error);
            process.exit(1);
        });
}

module.exports = { crawl };