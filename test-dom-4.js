import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.connect({
            browserURL: 'http://127.0.0.1:9222',
            defaultViewport: { width: 1280, height: 800 }
        });
        const pages = await browser.pages();
        const page = pages.find(p => p.url().includes('gemini.google.com')) || pages[0];
        
        // 1. Try piercing selectors
        const shadowTexts = await page.$$eval('pierce/message-content', els => els.map(e => e.textContent.trim()));
        
        console.log(`Found ${shadowTexts.length} message elements via pierce/message-content`);
        if (shadowTexts.length > 0) {
           console.log("Last element preview:", shadowTexts[shadowTexts.length - 1].substring(0, 300));
        }
        
        // 2. Try generic pierce/p
        const pTexts = await page.$$eval('pierce/p', els => els.map(e => e.textContent.trim()).filter(t => t.includes('---')));
        console.log(`Found ${pTexts.length} paragraphs containing '---'`);
        if(pTexts.length > 0) {
           console.log("Preview:", pTexts[0].substring(0, 300));
        }
        
        browser.disconnect();
    } catch(e) {
        console.error("Error:", e);
    }
    process.exit(0);
})();
