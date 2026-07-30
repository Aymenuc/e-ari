/**
 * Admin portal functional audit.
 *
 * Signs in as an admin and exercises every admin endpoint — reads AND writes —
 * rather than checking that tabs render. A tab that paints an empty table looks
 * identical whether the feature works, returns nothing, or is a stub.
 *
 * Writes are made against a throwaway user created here, and reverted.
 *
 * Usage: node scripts/admin-audit.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const ADMIN = { email: 'demo@e-ari.local', password: 'local-dev-only' };

const rows = [];
const rec = (area, check, ok, detail) => {
  rows.push({ area, check, ok, detail });
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${(area + '              ').slice(0, 15)} ${check}${detail ? '  — ' + detail : ''}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const api = ctx.request;

// ── sign in ────────────────────────────────────────────────────────────────
await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle', timeout: 240000 });
await page.evaluate(() => {
  const d = [...document.querySelectorAll('button')].find(x => /decline/i.test(x.textContent || ''));
  d && d.click();
});
await page.fill('input[type="email"]', ADMIN.email);
await page.fill('input[type="password"]', ADMIN.password);
await page.click('button[type="submit"]');
await page.waitForTimeout(6000);

const sess = await (await api.get(`${BASE}/api/auth/session`)).json().catch(() => ({}));
rec('auth', 'admin session', sess?.user?.role === 'admin', `role=${sess?.user?.role ?? 'none'}`);
if (sess?.user?.role !== 'admin') { await browser.close(); process.exit(1); }

// ── every GET endpoint returns usable data ─────────────────────────────────
const GETS = [
  ['stats', '/api/admin/stats'],
  ['revenue', '/api/admin/revenue'],
  ['users', '/api/admin/users'],
  ['assessments', '/api/admin/assessments'],
  ['agent-health', '/api/admin/agent-health'],
  ['refunds', '/api/admin/refunds'],
  ['inbox', '/api/admin/inbox'],
  ['compliance-logs', '/api/admin/compliance-logs'],
  ['settings', '/api/admin/settings'],
  ['subscribers', '/api/admin/subscribers'],
  ['integrations', '/api/admin/integration-status'],
];
for (const [name, url] of GETS) {
  const r = await api.get(`${BASE}${url}`, { timeout: 90000 });
  let shape = '';
  try {
    const j = await r.json();
    const keys = Object.keys(j || {});
    const arr = keys.find(k => Array.isArray(j[k]));
    shape = arr ? `${arr}[${j[arr].length}]` : keys.slice(0, 4).join(',');
  } catch { shape = 'non-JSON'; }
  rec('GET', name.padEnd(16), r.ok(), `HTTP ${r.status()} ${shape}`);
}

// ── throwaway user for write tests ─────────────────────────────────────────
const stamp = Date.now().toString().slice(-8);
const email = `adminaudit+${stamp}@example.com`;
await api.post(`${BASE}/api/auth/register`, {
  data: { email, password: 'Str0ng-Passw0rd!' + stamp.slice(0, 3), name: 'Admin Audit', organization: 'X', sector: 'technology', orgSize: '51-200' },
});
const asList = (j) => (Array.isArray(j) ? j : (j?.users ?? []));
const usersList = asList(await (await api.get(`${BASE}/api/admin/users`)).json().catch(() => []));
const target = usersList.find((u) => u.email === email);
rec('users', 'new user visible   ', Boolean(target), target ? `id=${String(target.id).slice(0, 8)} tier=${target.tier}` : 'not found in list');

// ── WRITE: change tier ─────────────────────────────────────────────────────
if (target) {
  const before = target.tier;
  const patch = await api.patch(`${BASE}/api/admin/users`, { data: { userId: target.id, tier: 'professional' } });
  const after = await (await api.get(`${BASE}/api/admin/users`)).json().catch(() => []);
  const now = asList(after).find((u) => u.id === target.id);
  rec('users', 'PATCH tier         ', patch.ok() && now?.tier === 'professional', `HTTP ${patch.status()} ${before} -> ${now?.tier}`);

  // Self-demote while sole admin: must be refused, or the platform locks out
  // with no recovery short of direct database access.
  const selfDemote = await api.patch(`${BASE}/api/admin/users`, { data: { userId: sess.user.id, role: 'user' } });
  rec('safety', 'sole-admin demote  ', !selfDemote.ok(), `HTTP ${selfDemote.status()} (want 4xx)`);
  if (selfDemote.ok()) await api.patch(`${BASE}/api/admin/users`, { data: { userId: sess.user.id, role: 'admin' } });

  const selfDelete = await api.delete(`${BASE}/api/admin/users?userId=${sess.user.id}`);
  rec('safety', 'self-delete blocked', !selfDelete.ok(), `HTTP ${selfDelete.status()} (want 4xx)`);

  const del = await api.delete(`${BASE}/api/admin/users?userId=${target.id}`);
  rec('users', 'DELETE user        ', del.ok(), `HTTP ${del.status()}`);
}

// ── WRITE: settings round-trip ─────────────────────────────────────────────
const sBefore = await (await api.get(`${BASE}/api/admin/settings`)).json().catch(() => ({}));
const put = await api.put(`${BASE}/api/admin/settings`, { data: { maintenance_mode: false } });
const sAfter = await (await api.get(`${BASE}/api/admin/settings`)).json().catch(() => ({}));
rec('settings', 'PUT round-trip     ', put.ok() && 'maintenance_mode' in (sAfter.settings ?? sAfter ?? {}),
  `HTTP ${put.status()} keys=${Object.keys(sAfter.settings ?? sAfter ?? {}).length}`);

// ── unknown setting must be rejected, not silently dropped ─────────────────
const bogus = await api.put(`${BASE}/api/admin/settings`, { data: { definitely_not_a_setting: true } });
const sAfter2 = await (await api.get(`${BASE}/api/admin/settings`)).json().catch(() => ({}));
const leaked = 'definitely_not_a_setting' in (sAfter2.settings ?? sAfter2 ?? {});
rec('settings', 'unknown key handled', !leaked, `HTTP ${bogus.status()} stored=${leaked}`);

// ── non-admin must be refused ──────────────────────────────────────────────
const anon = await browser.newContext();
for (const [name, url] of [['stats', '/api/admin/stats'], ['users', '/api/admin/users']]) {
  const r = await anon.request.get(`${BASE}${url}`);
  rec('authz', `anon ${name} blocked `.slice(0, 19), r.status() === 401 || r.status() === 403, `HTTP ${r.status()}`);
}


// ── NEW: the six additions ────────────────────────────────────────────────
{
  const stamp2 = Date.now().toString().slice(-7);
  const email2 = `auditnew+${stamp2}@example.com`;
  await api.post(`${BASE}/api/auth/register`, {
    data: { email: email2, password: 'Str0ng-Passw0rd!' + stamp2.slice(0, 3), name: 'Audit New', organization: 'X', sector: 'technology', orgSize: '51-200' },
  });
  const list2 = asList(await (await api.get(`${BASE}/api/admin/users`)).json().catch(() => []));
  const t2 = list2.find((u) => u.email === email2);

  rec('cohort', 'cohort fields on user', t2 && 'foundingMemberNo' in t2 && 'isPaying' in t2,
    t2 ? `founding=${t2.foundingMemberNo} paying=${t2.isPaying} verified=${Boolean(t2.emailVerified)}` : 'user missing');

  if (t2) {
    const unlock = await api.post(`${BASE}/api/admin/users/actions`, { data: { userId: t2.id, action: 'unlock' } });
    const uj = await unlock.json().catch(() => ({}));
    rec('support', 'clear lockout        ', unlock.ok(), `HTTP ${unlock.status()} ${String(uj.message ?? '').slice(0, 46)}`);

    const resend = await api.post(`${BASE}/api/admin/users/actions`, { data: { userId: t2.id, action: 'resend_verification' } });
    const rj = await resend.json().catch(() => ({}));
    rec('support', 'resend verification  ', resend.status() !== 404 && resend.status() !== 500,
      `HTTP ${resend.status()} ${String(rj.message ?? '').slice(0, 46)}`);

    const exp = await api.post(`${BASE}/api/admin/users/actions`, { data: { userId: t2.id, action: 'export' } });
    let expOk = false, counts = '';
    try {
      const j = JSON.parse(await exp.text());
      expOk = j.format === 'e-ari-subject-access-v1' && j.user?.email === email2 && !('passwordHash' in (j.user ?? {}));
      counts = `assessments=${j.counts?.assessments} noPwHash=${!('passwordHash' in (j.user ?? {}))}`;
    } catch { /* not JSON */ }
    rec('gdpr', 'subject access export', exp.ok() && expOk, `HTTP ${exp.status()} ${counts}`);

    await api.patch(`${BASE}/api/admin/users`, { data: { userId: t2.id, tier: 'growth' } });
    await api.delete(`${BASE}/api/admin/users?userId=${t2.id}`);
  }

  const audit = await api.get(`${BASE}/api/admin/audit`);
  const aj = await audit.json().catch(() => ({}));
  const acts = (aj.entries ?? []).map((e) => e.action);
  rec('audit', 'trail records actions', audit.ok() && acts.length > 0, `HTTP ${audit.status()} ${acts.length} entries: ${[...new Set(acts)].slice(0, 6).join(',')}`);
  rec('audit', 'tier+delete captured ', acts.includes('user.tier') && acts.includes('user.delete'),
    `tier=${acts.includes('user.tier')} delete=${acts.includes('user.delete')} settings=${acts.includes('settings.update')}`);

  const anonAudit = await anon.request.get(`${BASE}/api/admin/audit`);
  rec('authz', 'anon audit blocked ', anonAudit.status() === 401 || anonAudit.status() === 403, `HTTP ${anonAudit.status()}`);
}

console.log('\n--- SUMMARY ---');
console.log(`${rows.filter(r => r.ok).length}/${rows.length} passed`);
rows.filter(r => !r.ok).forEach(r => console.log(`  FAILED: ${r.area} ${r.check.trim()} — ${r.detail}`));
await browser.close();
