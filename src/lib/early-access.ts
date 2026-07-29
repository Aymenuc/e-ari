/**
 * Early Access programme.
 *
 * The platform is pre-revenue: asking a compliance officer to put a card
 * down before any reference customer exists is the wrong ask. During Early
 * Access we keep the prices VISIBLE (price signals seriousness and anchors
 * future value) but grant full programme-tier features free, and disable
 * checkout with an explanation.
 *
 * Mechanism: the grant is written to the user's real tier column, so all
 * existing gates — client and the ~18 server routes that read the DB tier —
 * work unchanged. `earlyAccessAt` records who was granted, so ending the
 * programme is a single reversible query (see endEarlyAccess below) that
 * never touches genuinely paying customers (they have a stripeCustomerId).
 */

import { db } from './db';
import { getSetting } from './platform-settings';
import { normalizeTier, type Tier } from './tier';

/** What early-access users receive. Growth, not Enterprise: SSO, custom
 *  branding and dedicated support stay a real sales conversation. */
export const EARLY_ACCESS_TIER: Tier = 'growth';

/** Live cohort state — every number here is counted, never fabricated. */
export async function getCohortState(): Promise<{
  on: boolean;
  cap: number;
  claimed: number;
  remaining: number;
  full: boolean;
  /** ISO date the programme ends, or null if none is set. */
  endsAt: string | null;
}> {
  const on = await isEarlyAccessOn();
  let cap = 50;
  try {
    const raw = await getSetting('early_access_cap');
    const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
    if (Number.isFinite(n) && n > 0) cap = n;
  } catch { /* default */ }
  let claimed = 0;
  try {
    claimed = await db.user.count({ where: { foundingMemberNo: { not: null } } });
  } catch { /* unreachable DB — report zero rather than guess */ }
  let endsAt: string | null = null;
  try {
    const raw = await getSetting('early_access_ends');
    const str = String(raw ?? '').trim();
    // Only publish a date we can actually parse — a malformed deadline is
    // worse than none.
    if (str && !Number.isNaN(Date.parse(str))) endsAt = str;
  } catch { /* no date */ }
  const remaining = Math.max(0, cap - claimed);
  return { on, cap, claimed, remaining, full: remaining === 0, endsAt };
}

export async function isEarlyAccessOn(): Promise<boolean> {
  try {
    return (await getSetting('early_access_mode')) === true;
  } catch {
    return false; // setting table unavailable — fail closed, never auto-grant
  }
}

/**
 * Lazily grant the programme tier on session refresh. Idempotent: only
 * fires for a free user who has not been granted before, so it runs once
 * per user and self-heals for accounts created before the programme began.
 * Returns the tier the caller should use.
 */
export async function grantEarlyAccessIfEligible(user: {
  id: string;
  tier: string | null;
  earlyAccessAt?: Date | null;
}): Promise<Tier> {
  const current = normalizeTier(user.tier);
  if (current !== 'free' || user.earlyAccessAt) return current;
  const cohort = await getCohortState();
  if (!cohort.on || cohort.full) return current;
  const cap = cohort.cap;

  try {
    // Assign the next founding number and grant the tier in ONE statement so
    // two simultaneous signups cannot claim the same number, and so the cap
    // cannot be exceeded by a race. The WHERE clause re-checks capacity at
    // write time, which is the only place it can be checked safely.
    const rows = await db.$queryRaw<Array<{ foundingMemberNo: number }>>`
      UPDATE "User"
         SET "tier" = ${EARLY_ACCESS_TIER},
             "earlyAccessAt" = NOW(),
             "foundingMemberNo" = (
               SELECT COALESCE(MAX("foundingMemberNo"), 0) + 1 FROM "User"
             )
       WHERE "id" = ${user.id}
         AND "foundingMemberNo" IS NULL
         AND (SELECT COUNT(*) FROM "User" WHERE "foundingMemberNo" IS NOT NULL) < ${cap}
      RETURNING "foundingMemberNo"
    `;
    if (rows.length === 0) return current; // cohort full — user stays free
    return EARLY_ACCESS_TIER;
  } catch (err) {
    console.error('[early-access] grant failed (user keeps free tier):', err);
    return current;
  }
}

/**
 * End the programme: return every granted account to free. Accounts that
 * converted to a real subscription (they have a Stripe customer) are left
 * alone. Call from an admin action or a one-off script.
 */
export async function endEarlyAccess(): Promise<number> {
  const res = await db.user.updateMany({
    where: { earlyAccessAt: { not: null }, stripeCustomerId: null },
    data: { tier: 'free' },
  });
  return res.count;
}
