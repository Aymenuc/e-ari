/**
 * Tier predicates — single source of truth for "what does this tier unlock".
 *
 * Why this file exists: the codebase had a recurring pattern of writing
 * `tier === 'professional' || tier === 'enterprise'` inline. Growth tier
 * (€149/mo) was added later and was silently excluded from those checks,
 * so Growth users were paying more than Professional users (€49/mo) but
 * receiving fewer features than Professional. Centralising the predicates
 * here prevents that regression.
 *
 * Tier hierarchy (low → high):  free < professional < growth < enterprise
 *
 * Treat these as the authoritative gates. Don't compare tier strings inline.
 */

export type Tier = 'free' | 'professional' | 'growth' | 'enterprise';

export const ALL_TIERS: readonly Tier[] = ['free', 'professional', 'growth', 'enterprise'] as const;
export const PAID_TIERS: readonly Tier[] = ['professional', 'growth', 'enterprise'] as const;

/** Normalise an unknown tier value to a known tier (defaults to free). */
export function normalizeTier(t: string | null | undefined): Tier {
  if (t === 'professional' || t === 'growth' || t === 'enterprise') return t;
  return 'free';
}

/** Has the user paid for any subscription? */
export function isPaidTier(t: string | null | undefined): boolean {
  return normalizeTier(t) !== 'free';
}

/** Is this Growth or Enterprise? (gates higher-end features like all-sectors, full API) */
export function isGrowthOrAbove(t: string | null | undefined): boolean {
  const tier = normalizeTier(t);
  return tier === 'growth' || tier === 'enterprise';
}

/** Is this Enterprise specifically? (gates SSO/SAML, unlimited everything, custom branding) */
export function isEnterprise(t: string | null | undefined): boolean {
  return normalizeTier(t) === 'enterprise';
}

/**
 * Feature gates — call these instead of comparing strings.
 * Each gate documents which tiers unlock the feature.
 */
export const TIER_FEATURE = {
  /** AI-narrative insights (LLM) — vs. template insights for free. */
  aiInsights: (t: string | null | undefined) => isPaidTier(t),
  /** Full PDF/.docx report with AI insights baked in. */
  fullReport: (t: string | null | undefined) => isPaidTier(t),
  /** Discovery agent (web scraping + landscape analysis). */
  discoveryAgent: (t: string | null | undefined) => isPaidTier(t),
  /** Report agent (roadmap, recommendations, benchmark). */
  reportAgent: (t: string | null | undefined) => isPaidTier(t),
  /** AI Assistant chat. */
  assistant: (t: string | null | undefined) => isPaidTier(t),
  /** Read-only API access. */
  apiAccess: (t: string | null | undefined) => isGrowthOrAbove(t),
  /** All sectors unlocked (free/pro get a curated subset). */
  allSectors: (t: string | null | undefined) => isGrowthOrAbove(t),
  /** Full admin portal (vs. basic). */
  fullAdminPortal: (t: string | null | undefined) => isGrowthOrAbove(t),
  /** SSO / SAML. */
  sso: (t: string | null | undefined) => isEnterprise(t),
  /** Custom branding. */
  customBranding: (t: string | null | undefined) => isEnterprise(t),
  /** Full CRUD API access (write). */
  apiWrite: (t: string | null | undefined) => isEnterprise(t),
} as const;
