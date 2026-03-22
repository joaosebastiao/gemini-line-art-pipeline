import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.connect({
            browserURL: 'http://127.0.0.1:9222',
            defaultViewport: { width: 1280, height: 800 }
        });
        const pages = await browser.pages();
        const page = pages.find(p => p.url().includes('gemini.google.com')) || pages[0];
        
        const text = await page.evaluate(() => {
            return document.body.innerText;
        });
        
        console.log("Last 2000 chars of document.body.innerText:");
        console.log(text.slice(-2000));
        
        browser.disconnect();
    } catch(e) {
        console.error("Error:", e);
    }
    process.exit(0);
})();
