const puppeteer = require('puppeteer-core');

async function testBrowser() {
    console.log('Starting browser test...');
    try {
        console.log('Launching browser with system Chrome...');
        const browser = await puppeteer.launch({
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
            ignoreHTTPSErrors: true,
            env: process.env
        });
        
        console.log('Browser launched successfully!');
        console.log('Opening a new page...');
        const page = await browser.newPage();
        console.log('Page opened successfully!');
        
        await browser.close();
        console.log('Browser closed successfully!');
        return true;
    } catch (error) {
        console.error('Browser test failed:', error);
        console.error('Error stack:', error.stack);
        console.error('Environment:', {
            PATH: process.env.PATH,
            LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH
        });
        return false;
    }
}

testBrowser().then(success => {
    if (!success) {
        process.exit(1);
    }
});
