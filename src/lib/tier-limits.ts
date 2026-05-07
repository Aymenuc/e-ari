/**
 * Monthly quotas per tier — enforce what /pricing advertises.
 *
 * The pricing page sells specific monthly limits (1 / 5 / 20 / unlimited
 * assessments; 3 / 15 / 50 / unlimited pulse checks). Without enforcement,
 * a Free user could run 200 assessments and the LLM-pipeline cost would
 * be the same as Enterprise. This module is the only authoritative quota
 * gate — call it from API routes before creating expensive resources.
 *
 * Quota window: calendar month (UTC), reset at the first second of the
 * 1st each month. We deliberately don't use a rolling 30-day window —
 * customers expect "5 assessments / month" to mean "by the calendar".
 *
 * The unlimited sentinel is `Infinity`, not -1 — comparisons stay
 * idiomatic (`count >= limit` always false for unlimited).
 */

import { db } from './db';
import { normalizeTier, type Tier } from './tier';

export type Quota = 'assessment' | 'pulse';

interface TierQuota {
  assessment: number;
  pulse: number;
}

/** Monthly entitlements per tier — must match /pricing. */
const TIER_QUOTAS: Record<Tier, TierQuota> = {
  free:         { assessment: 1,  pulse: 3   },
  professional: { assessment: 5,  pulse: 15  },
  growth:       { assessment: 20, pulse: 50  },
  enterprise:   { assessment: Infinity, pulse: Infinity },
};

export function getMonthlyLimit(tier: string | null | undefined, quota: Quota): number {
  return TIER_QUOTAS[normalizeTier(tier)][quota];
}

/** Start-of-month boundary in UTC (first instant of the current month). */
function startOfMonthUTC(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * Count completed assessments in the current calendar month for a user.
 * Excludes pulse assessments — pulses count against a separate quota.
 * Drafts also don't count — only `completed` because that's where the
 * LLM pipeline actually fires.
 */
async function countMonthlyAssessments(userId: string): Promise<number> {
  return db.assessment.count({
    where: {
      userId,
      isPulse: false,
      status: 'completed',
      completedAt: { gte: startOfMonthUTC() },
    },
  });
}

/** Count pulse runs in the current calendar month. */
async function countMonthlyPulses(userId: string): Promise<number> {
  return db.pulseRun.count({
    where: {
      userId,
      createdAt: { gte: startOfMonthUTC() },
    },
  });
}

export interface QuotaStatus {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  resetsAt: Date;
  /** When `allowed` is false, a user-friendly message naming the limit. */
  message?: string;
}

function nextMonthBoundary(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

/**
 * Check whether a user is allowed to consume one more unit of quota this
 * month. Call this BEFORE you create the resource — it is non-incrementing.
 *
 * Returns the full counter so the caller can build a useful response
 * (HTTP 402 / 429 with reset time, etc.).
 */
export async function checkQuota(
  userId: string,
  tier: string | null | undefined,
  quota: Quota,
): Promise<QuotaStatus> {
  const limit = getMonthlyLimit(tier, quota);
  const resetsAt = nextMonthBoundary();
  if (limit === Infinity) {
    return { allowed: true, used: 0, limit: Infinity, remaining: Infinity, resetsAt };
  }
  const used = quota === 'assessment'
    ? await countMonthlyAssessments(userId)
    : await countMonthlyPulses(userId);
  const remaining = Math.max(0, limit - used);
  const allowed = used < limit;
  const status: QuotaStatus = { allowed, used, limit, remaining, resetsAt };
  if (!allowed) {
    const noun = quota === 'assessment' ? 'assessment' : 'pulse check';
    const plural = limit === 1 ? noun : `${noun}s`;
    status.message = `Your tier includes ${limit} ${plural} per month. You have used ${used}/${limit} this month — quota resets ${resetsAt.toISOString().slice(0, 10)}.`;
  }
  return status;
}
