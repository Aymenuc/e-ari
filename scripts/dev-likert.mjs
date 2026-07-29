/** Drives the assessment to a question step and screenshots the Likert scale. */
import { chromium } from 'playwright';

const out = process.argv[2] ?? '/tmp/likert.png';
const browser = await chromium.launch();
const page = await browser.newPage({ viewportSize: { width: 1380, height: 900 } });
await page.goto('http://localhost:3000/api/dev/login?next=%2Fassessment', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
await page.waitForTimeout(5000);

// decline non-essential cookies so the banner stops covering the flow
await page.getByRole('button', { name: /decline/i }).first().click().catch(() => {});
await page.waitForTimeout(600);

// pick the first sector card
await page.getByText('Healthcare & Life Sciences', { exact: false }).first().click().catch(() => {});
await page.waitForTimeout(1200);

// jump straight to the first pillar via the step rail
await page.getByText('Strategy', { exact: true }).first().click().catch(() => {});
await page.waitForTimeout(1800);
await page.evaluate(() => window.scrollTo(0, 420));
await page.waitForTimeout(900);
await page.screenshot({ path: out });
console.log('shot ->', out);
await browser.close();
