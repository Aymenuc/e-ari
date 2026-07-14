import { chromium } from 'playwright';
const [,, path, out, waitMs = '6000', height = '900'] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewportSize: { width: 1380, height: parseInt(height) } });
await page.goto(`http://localhost:3000/api/dev/login?next=${encodeURIComponent(path)}`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
await page.waitForTimeout(parseInt(waitMs));
await page.screenshot({ path: out, fullPage: true });
console.log(out, 'url:', page.url());
await browser.close();
