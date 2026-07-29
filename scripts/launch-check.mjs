/**
 * Launch readiness end-to-end check.
 *
 * Drives the real client journey against a running server: register → sign in
 * → complete an assessment → read results → download the PDF. Reports what
 * actually happened, including silent degradations (an email that reports
 * "sent: false" still returns HTTP 200 to the caller).
 *
 * Usage: node scripts/launch-check.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const stamp = process.env.RUN_STAMP ?? String(process.hrtime.bigint()).slice(-9);
const EMAIL = `launchcheck+${stamp}@example.com`;
const PASSWORD = 'Str0ng-Passw0rd!' + stamp.slice(0, 3);

const results = [];
const rec = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewportSize: { width: 1380, height: 900 } });
const page = await ctx.newPage();
const api = ctx.request;

// ── 1. Registration ────────────────────────────────────────────────────────
let r = await api.post(`${BASE}/api/auth/register`, {
  data: { email: EMAIL, password: PASSWORD, name: 'Launch Check', organization: 'Launch Check Ltd', sector: 'technology', orgSize: '51-200' },
});
const regBody = await r.text();
rec('register', r.ok(), `HTTP ${r.status()} ${regBody.slice(0, 160)}`);
if (!r.ok()) { await browser.close(); process.exit(1); }

// ── 2. Sign in through the real form ───────────────────────────────────────
await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle', timeout: 60000 });
await page.evaluate(() => {
  const d = [...document.querySelectorAll('button')].find(x => /decline/i.test(x.textContent || ''));
  d && d.click();
});
await page.fill('input[type="email"]', EMAIL).catch(() => {});
await page.fill('input[type="password"]', PASSWORD).catch(() => {});
await Promise.all([
  page.waitForNavigation({ timeout: 45000 }).catch(() => {}),
  page.click('button[type="submit"]').catch(() => {}),
]);
await page.waitForTimeout(3500);
const signedIn = !/\/auth\/signin/.test(page.url());
rec('sign in', signedIn, `landed on ${page.url().replace(BASE, '')}`);

// ── 3. Session established ─────────────────────────────────────────────────
const sess = await api.get(`${BASE}/api/auth/session`);
const sessJson = await sess.json().catch(() => ({}));
rec('session', Boolean(sessJson?.user?.email), `tier=${sessJson?.user?.tier ?? '?'} email=${sessJson?.user?.email ?? 'none'}`);

// ── 4. Quota reachable ─────────────────────────────────────────────────────
const q = await api.get(`${BASE}/api/quota`);
rec('quota', q.ok(), `HTTP ${q.status()} ${(await q.text()).slice(0, 140)}`);

// ── 5. Submit a complete assessment (all 8 pillars x 5 answers) ────────────
const PILLAR_IDS = ['strategy', 'data', 'technology', 'talent', 'governance', 'culture', 'process', 'security'];
const responses = {};
PILLAR_IDS.forEach((p, pi) => {
  for (let i = 1; i <= 5; i++) responses[`${p}_${i}`] = ((pi + i) % 5) + 1;
});
const sub = await api.post(`${BASE}/api/assessment`, { data: { responses, sector: 'technology' } });
const subText = await sub.text();
rec('submit assessment', sub.ok(), `HTTP ${sub.status()} ${subText.slice(0, 200)}`);

let assessmentId = null;
try { assessmentId = JSON.parse(subText)?.assessment?.id ?? JSON.parse(subText)?.id ?? null; } catch {}

// POST only creates a draft; scoring happens on PUT action:"submit".
if (assessmentId) {
  const fin = await api.put(`${BASE}/api/assessment/${assessmentId}`, {
    data: { responses, sector: 'technology', action: 'submit' },
    timeout: 180000,
  });
  const finText = await fin.text();
  const check = await api.get(`${BASE}/api/assessment/${assessmentId}`);
  const checkJson = await check.json().catch(() => ({}));
  const finScore = checkJson?.assessment?.overallScore ?? checkJson?.overallScore ?? null;
  const finStatus = checkJson?.assessment?.status ?? checkJson?.status;
  rec('score assessment', fin.ok() && finScore != null && finStatus === 'completed',
      `PUT ${fin.status()} -> status=${finStatus} score=${finScore} (${finText.length}b)`);
}

// ── 6. Read it back ────────────────────────────────────────────────────────
if (assessmentId) {
  const got = await api.get(`${BASE}/api/assessment/${assessmentId}`);
  const gotJson = await got.json().catch(() => ({}));
  const score = gotJson?.assessment?.overallScore ?? gotJson?.overallScore;
  rec('fetch result', got.ok() && score != null, `HTTP ${got.status()} score=${score}`);

  // ── 7. Results page renders ──────────────────────────────────────────────
  await page.goto(`${BASE}/results/${assessmentId}`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(6000);
  const heading = await page.textContent('h1').catch(() => null);
  const bodyText = await page.textContent('body').catch(() => '');
  const errored = /Something went wrong|Application error|Unhandled|Unable to Load/i.test(bodyText);
  const hasScore = /out of 100/i.test(bodyText);
  rec('results page', Boolean(heading) && !errored && hasScore, `h1="${(heading || '').trim().slice(0, 60)}" score-visible=${hasScore}`);
  await page.screenshot({ path: `/tmp/launch-results-${stamp}.png` });

  // ── 8. PDF download ──────────────────────────────────────────────────────
  const pdf = await api.get(`${BASE}/api/assessment/${assessmentId}/pdf`, { timeout: 120000 });
  const buf = pdf.ok() ? await pdf.body() : Buffer.alloc(0);
  const isPdf = buf.slice(0, 5).toString() === '%PDF-';
  rec('pdf export', pdf.ok() && isPdf, `HTTP ${pdf.status()} ${Math.round(buf.length / 1024)}KB magic=${buf.slice(0, 5).toString()}`);
  if (isPdf) writeFileSync(`/tmp/launch-report-${stamp}.pdf`, buf);
} else {
  rec('fetch result', false, 'no assessment id returned');
  rec('results page', false, 'skipped');
  rec('pdf export', false, 'skipped');
}

// ── 9. Portal loads ────────────────────────────────────────────────────────
await page.goto(`${BASE}/portal`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);
const portalBody = await page.textContent('body').catch(() => '');
rec('portal', /Welcome back|Assessment/i.test(portalBody), `${portalBody.length} chars rendered`);

// ── 10. Password reset request ─────────────────────────────────────────────
const fp = await api.post(`${BASE}/api/auth/forgot-password`, { data: { email: EMAIL } });
rec('forgot-password', fp.ok(), `HTTP ${fp.status()} ${(await fp.text()).slice(0, 120)}`);

console.log('\n--- SUMMARY ---');
console.log(`${results.filter(r => r.ok).length}/${results.length} passed`);
console.log(`test account: ${EMAIL}`);
results.filter(r => !r.ok).forEach(r => console.log(`  FAILED: ${r.name} — ${r.detail}`));
await browser.close();
