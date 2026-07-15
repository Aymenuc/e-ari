/**
 * Full-page authenticated capture for local design iteration.
 *
 * Usage: node scripts/dev-shot.mjs <path> <out.png> [settleMs]
 *
 * Logs in via the dev-only /api/dev/login redirect, then SCROLL-WALKS the
 * page viewport by viewport before capturing — framer-motion whileInView
 * sections animate `initial opacity: 0`, so a naive fullPage screenshot
 * photographs black below the fold. Walking triggers every once:true
 * reveal; scrolling back up lets sticky elements settle.
 */
import { chromium } from 'playwright';

const [, , path = '/portal', out = '/tmp/shot.png', settleMs = '4000'] = process.argv;

const browser = await chromium.launch();
const page = await browser.newPage({ viewportSize: { width: 1380, height: 900 } });
await page
  .goto(`http://localhost:3000/api/dev/login?next=${encodeURIComponent(path)}`, {
    waitUntil: 'networkidle',
    timeout: 45000,
  })
  .catch(() => {});
await page.waitForTimeout(parseInt(settleMs));

// Dismiss the cookie banner so it doesn't photobomb every slice.
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent === 'Decline');
  b?.click();
});

// Scroll-walk: trigger every whileInView reveal down the page.
await page.evaluate(async () => {
  const step = window.innerHeight * 0.8;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 260));
  }
  window.scrollTo(0, document.body.scrollHeight);
  await new Promise((r) => setTimeout(r, 500));
  window.scrollTo(0, 0);
});
await page.waitForTimeout(1200);

await page.screenshot({ path: out, fullPage: true });
console.log(out, 'url:', page.url());
await browser.close();
