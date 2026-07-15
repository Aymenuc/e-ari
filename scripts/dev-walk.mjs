/**
 * Authenticated scroll-walk capture: saves ordered viewport frames
 * (<prefix>-00.png, -01.png, …) top to bottom. Precise section-by-section
 * review without fullPage/crop tooling ambiguity.
 *
 * Usage: node scripts/dev-walk.mjs <path> <outPrefix> [settleMs]
 */
import { chromium } from 'playwright';

const [, , path = '/portal', prefix = '/tmp/walk', settleMs = '5000'] = process.argv;

const browser = await chromium.launch();
const page = await browser.newPage({ viewportSize: { width: 1380, height: 900 } });
await page
  .goto(`http://localhost:3000/api/dev/login?next=${encodeURIComponent(path)}`, {
    waitUntil: 'networkidle',
    timeout: 45000,
  })
  .catch(() => {});
await page.waitForTimeout(parseInt(settleMs));

await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent === 'Decline');
  b?.click();
});
await page.waitForTimeout(400);

const total = await page.evaluate(() => document.body.scrollHeight);
const step = 860; // slight overlap with the 900px viewport
let i = 0;
for (let y = 0; y < total; y += step) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(650); // let whileInView reveals finish
  await page.screenshot({ path: `${prefix}-${String(i).padStart(2, '0')}.png` });
  i += 1;
  if (i > 30) break;
}
console.log(`${i} frames → ${prefix}-NN.png (page ${total}px)`);
await browser.close();
