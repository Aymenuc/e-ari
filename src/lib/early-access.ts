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
  if (!(await isEarlyAccessOn())) return current;

  try {
    await db.user.update({
      where: { id: user.id },
      data: { tier: EARLY_ACCESS_TIER, earlyAccessAt: new Date() },
    });
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
