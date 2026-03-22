import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.connect({
            browserURL: 'http://127.0.0.1:9222',
            defaultViewport: { width: 1280, height: 800 }
        });
        const pages = await browser.pages();
        const page = pages.find(p => p.url().includes('gemini.google.com')) || pages[0];
        
        const domInfo = await page.evaluate(() => {
            // Find the deepest elements that contain "---" and "Foreground:"
            const all = Array.from(document.querySelectorAll('*'));
            const matches = all.filter(el => {
                const txt = el.textContent || '';
                return txt.includes('---') && txt.length > 100;
            }).sort((a,b) => a.children.length - b.children.length); // get elements with fewest children (leaf nodes)
            
            // Go up the parent chain slightly to find the main container
            if (matches.length > 0) {
                let el = matches[0];
                const hierarchy = [];
                for(let i=0; i<8; i++) {
                    if(!el) break;
                    hierarchy.push({
                        tagName: el.tagName,
                        className: el.className,
                        id: el.id
                    });
                    el = el.parentElement;
                }
                return hierarchy;
            }
            return "NO MATCHES";
        });
        
        console.log("Hierarchy of the response element (Deepest to highest):");
        console.log(JSON.stringify(domInfo, null, 2));
        
        browser.disconnect();
    } catch(e) {
        console.error("Error:", e);
    }
    process.exit(0);
})();
