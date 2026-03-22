import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
    try {
        const browser = await puppeteer.connect({
            browserURL: 'http://127.0.0.1:9222',
            defaultViewport: { width: 1280, height: 800 }
        });
        const pages = await browser.pages();
        const page = pages.find(p => p.url().includes('gemini.google.com')) || pages[0];
        console.log('Found page: ' + page.url());
        
        const domInfo = await page.evaluate(() => {
            // Find all elements containing text that resembles a generated response
            // Usually responses are inside large containers
            const elements = Array.from(document.querySelectorAll('*'));
            const textHeavy = elements.filter(el => {
                if(el.children.length > 5) return false;
                const txt = el.textContent.trim();
                return txt.length > 200 && txt.includes('---'); // The response format often has "---"
            });
            
            return textHeavy.slice(0, 5).map(el => ({
                tagName: el.tagName,
                className: el.className,
                id: el.id,
                textLength: el.textContent.length,
                preview: el.textContent.substring(0, 100)
            }));
        });
        
        console.log("Found text-heavy elements:");
        console.log(JSON.stringify(domInfo, null, 2));
        
        browser.disconnect();
    } catch(e) {
        console.error("Error:", e);
    }
})();
