/** Logged-out scroll-walk of a public page. Usage: node walk-anon.mjs <path> <prefix> */
import { chromium } from 'playwright';

const [, , path = '/', prefix = '/tmp/anon', settleMs = '4500'] = process.argv;

const browser = await chromium.launch();
const page = await browser.newPage({ viewportSize: { width: 1380, height: 900 } });
await page.goto(`http://localhost:3000${path}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
await page.waitForTimeout(parseInt(settleMs));

// dismiss cookie banner if present
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /decline|reject/i.test(x.textContent || ''));
  b?.click();
});
await page.waitForTimeout(400);

const total = await page.evaluate(() => document.body.scrollHeight);
const step = 860;
let i = 0;
for (let y = 0; y < total; y += step) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${prefix}-${String(i).padStart(2, '0')}.png` });
  i++;
}
console.log(`height=${total} frames=${i}`);
await browser.close();
