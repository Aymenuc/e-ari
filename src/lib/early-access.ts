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
/**
 * Addresses that are ours, not a customer's.
 *
 * The public counter said "38 of 50 places remaining" while eleven of the
 * thirteen claimed places were throwaway accounts from test runs. Scarcity a
 * visitor can see has to be true, or it is just a number that moves — and the
 * reserved domains below (RFC 2606) plus our own are exactly the ones that can
 * never belong to a paying organisation.
 */
const NON_CUSTOMER_EMAILS = {
  OR: [
    // RFC 2606 reserves these names *and their subdomains*, so match on the
    // dot form too — "marta@nordhaven-demo.example.com" is as reserved as
    // "marta@example.com" and was slipping through an @-anchored check.
    { email: { contains: 'example.com' } },
    { email: { contains: 'example.org' } },
    { email: { contains: 'example.net' } },
    { email: { endsWith: '.test' } },
    { email: { endsWith: '.invalid' } },
    { email: { endsWith: '.localhost' } },
    { email: { endsWith: '.local' } },
    { email: { endsWith: '@e-ari.com' } },
    { email: { contains: '+launchcheck' } },
  ],
};

export async function getCohortState(): Promise<{
  on: boolean;
  cap: number;
  claimed: number;
  remaining: number;
  full: boolean;
  /** Length of each member's free window, in days. */
  days: number;
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
    claimed = await db.user.count({
      where: { foundingMemberNo: { not: null }, NOT: NON_CUSTOMER_EMAILS },
    });
  } catch { /* unreachable DB — report zero rather than guess */ }
  let days = 90;
  try {
    const raw = await getSetting('early_access_days');
    const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
    if (Number.isFinite(n) && n > 0) days = n;
  } catch { /* default */ }
  const remaining = Math.max(0, cap - claimed);
  return { on, cap, claimed, remaining, full: remaining === 0, days };
}

/**
 * When a given member's free window closes.
 *
 * The window runs from the member's own grant, not from a shared calendar
 * date. A fixed deadline gave the first joiner five months and the last one a
 * fortnight — same offer, wildly different value, and it was the late joiner
 * who felt short-changed. Counting from the grant makes the offer identical
 * for everyone and puts the renewal conversation on a rolling schedule instead
 * of stacking all fifty into one week.
 */
export function accessEndsAt(grantedAt: Date | string | null | undefined, days = 90): Date | null {
  if (!grantedAt) return null;
  const start = grantedAt instanceof Date ? grantedAt : new Date(grantedAt);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + days * 86_400_000);
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
         AND (
               -- Same exclusions as NON_CUSTOMER_EMAILS above. If the counter a
               -- visitor sees and the capacity check that admits them disagree,
               -- someone is told "12 places left" and then refused.
               SELECT COUNT(*) FROM "User"
                WHERE "foundingMemberNo" IS NOT NULL
                  AND "email" NOT LIKE '%example.com'
                  AND "email" NOT LIKE '%example.org'
                  AND "email" NOT LIKE '%example.net'
                  AND "email" NOT LIKE '%.test'
                  AND "email" NOT LIKE '%.invalid'
                  AND "email" NOT LIKE '%.localhost'
                  AND "email" NOT LIKE '%.local'
                  AND "email" NOT LIKE '%@e-ari.com'
                  AND "email" NOT LIKE '%+launchcheck%'
             ) < ${cap}
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
