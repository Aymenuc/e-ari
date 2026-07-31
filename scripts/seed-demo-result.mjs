/**
 * Seed a realistic completed assessment for looking at the results page.
 *
 * The launch harness answers in a rotating pattern, which lands every pillar
 * on exactly 50 — a flat profile where no chart has anything to show and no
 * finding fires. That is fine for proving the pipeline runs and useless for
 * judging whether the page reads well, which is what this is for.
 *
 * Usage: node scripts/seed-demo-result.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const stamp = process.env.RUN_STAMP ?? String(process.hrtime.bigint()).slice(-9);
const EMAIL = `demo+${stamp}@example.com`;
const PASSWORD = 'Str0ng-Passw0rd!' + stamp.slice(0, 3);

// Weak governance and data against strong people and tooling — the shape that
// makes interdependency rules and X-ray detectors actually fire.
const PROFILE = {
  strategy: [4, 4, 3, 4, 4], data: [2, 2, 1, 2, 2],
  technology: [4, 4, 5, 4, 4], talent: [4, 5, 4, 4, 4],
  governance: [1, 2, 1, 2, 1], culture: [4, 4, 4, 5, 4],
  process: [3, 2, 3, 3, 2], security: [3, 3, 2, 3, 3],
};
const responses = {};
for (const [p, vals] of Object.entries(PROFILE)) {
  vals.forEach((v, i) => { responses[`${p}_${i + 1}`] = v; });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ baseURL: BASE });
const api = ctx.request;

const reg = await api.post(`${BASE}/api/auth/register`, {
  data: { email: EMAIL, password: PASSWORD, name: 'Aurora Demo',
          organization: 'Aurora Health Group', sector: 'healthcare', orgSize: '201-1000' },
});
if (!reg.ok()) { console.error('register failed', reg.status(), await reg.text()); process.exit(1); }

const page = await ctx.newPage();
await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL(/portal|dashboard/, { timeout: 30000 }).catch(() => {});

const sub = await api.post(`${BASE}/api/assessment`, { data: { responses, sector: 'healthcare' } });
const id = JSON.parse(await sub.text())?.id;
const fin = await api.put(`${BASE}/api/assessment/${id}`, {
  data: { responses, sector: 'healthcare', action: 'submit' }, timeout: 180000,
});
const scored = JSON.parse(await fin.text());

console.log(`email:  ${EMAIL}`);
console.log(`pass:   ${PASSWORD}`);
console.log(`result: ${BASE}/results/${id}`);
console.log(`score:  ${scored?.overallScore ?? scored?.assessment?.overallScore ?? '?'}`);
await browser.close();
