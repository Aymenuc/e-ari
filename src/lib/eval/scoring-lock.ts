/**
 * Regression lock for the deterministic scoring engine.
 *
 * These are **lock files, not ground truth**. The expected values were produced
 * by the engine itself and frozen, so they can only prove that scoring has not
 * changed — never that it is right. That is worth saying plainly, because a
 * green lock reads like a correctness proof and is not one. Correctness of the
 * methodology is argued in the published methodology; this file exists to make
 * sure the code still implements whatever was published.
 *
 * What it does catch is the failure that matters commercially: a refactor,
 * dependency bump or "harmless" tweak that shifts a score by a point. Past
 * assessments become unreproducible, and reproducibility is the product's
 * central claim. A drift here is either a bug, or a deliberate methodology
 * change that owes a SCORING_VERSION bump and a re-freeze.
 */

import { scoreAssessment, type ResponseMap } from '@/lib/assessment-engine';
import { PILLARS } from '@/lib/pillars';

export interface ScoringProfile {
  id: string;
  /** Why this profile is in the set — what shape of assessment it represents. */
  why: string;
  /** Default Likert answer for every question. */
  fill: number;
  /** Per-question overrides, by question ID. */
  overrides?: Record<string, number>;
  sector?: string;
}

/** The frozen output of one profile. Compared field-by-field. */
export interface ScoringExpectation {
  overallScore: number;
  baselineOverallScore?: number;
  maturityBand: string;
  pillarScores: Array<{ pillarId: string; normalizedScore: number; maturityBand: string }>;
  adjustmentTypes: string[];
  criticalPillarFailures: string[];
  xRayFindingIds: string[];
  sectorWeightingApplied: boolean;
}

export interface ScoringLockFile {
  scoringVersion: string;
  frozenOn: string;
  profiles: ScoringProfile[];
  expectations: Record<string, ScoringExpectation>;
}

export function buildResponses(profile: ScoringProfile): ResponseMap {
  const responses: ResponseMap = {};
  for (const pillar of PILLARS) {
    for (const q of pillar.questions) responses[q.id] = profile.fill;
  }
  return { ...responses, ...(profile.overrides ?? {}) };
}

/** Run a profile and reduce the result to the fields worth locking. */
export function computeExpectation(profile: ScoringProfile): ScoringExpectation {
  const result = scoreAssessment(buildResponses(profile), profile.sector);
  return {
    overallScore: result.overallScore,
    baselineOverallScore: result.baselineOverallScore,
    maturityBand: result.maturityBand,
    pillarScores: result.pillarScores.map((p) => ({
      pillarId: p.pillarId,
      normalizedScore: p.normalizedScore,
      maturityBand: p.maturityBand,
    })),
    // Types and IDs, not prose: rewording a description should not fail a lock,
    // but a rule firing or ceasing to fire must.
    adjustmentTypes: result.adjustments.map((a) => a.type).sort(),
    criticalPillarFailures: [...result.criticalPillarFailures].sort(),
    xRayFindingIds: (result.xRayFindings ?? []).map((f) => f.id).sort(),
    sectorWeightingApplied: result.sectorWeighting != null,
  };
}

export interface ScoringDrift {
  profileId: string;
  field: string;
  expected: unknown;
  actual: unknown;
}

/** Compare current engine output against the frozen file. */
export function detectScoringDrift(lock: ScoringLockFile): ScoringDrift[] {
  const drift: ScoringDrift[] = [];

  for (const profile of lock.profiles) {
    const expected = lock.expectations[profile.id];
    if (!expected) {
      drift.push({ profileId: profile.id, field: '(missing)', expected: 'a frozen expectation', actual: undefined });
      continue;
    }
    const actual = computeExpectation(profile);

    const cmp = (field: string, e: unknown, a: unknown) => {
      if (JSON.stringify(e) !== JSON.stringify(a)) {
        drift.push({ profileId: profile.id, field, expected: e, actual: a });
      }
    };

    cmp('overallScore', expected.overallScore, actual.overallScore);
    cmp('baselineOverallScore', expected.baselineOverallScore, actual.baselineOverallScore);
    cmp('maturityBand', expected.maturityBand, actual.maturityBand);
    cmp('pillarScores', expected.pillarScores, actual.pillarScores);
    cmp('adjustmentTypes', expected.adjustmentTypes, actual.adjustmentTypes);
    cmp('criticalPillarFailures', expected.criticalPillarFailures, actual.criticalPillarFailures);
    cmp('xRayFindingIds', expected.xRayFindingIds, actual.xRayFindingIds);
    cmp('sectorWeightingApplied', expected.sectorWeightingApplied, actual.sectorWeightingApplied);
  }

  return drift;
}

export function formatScoringReport(lock: ScoringLockFile, drift: ScoringDrift[]): string {
  if (drift.length === 0) {
    return `Scoring — ${lock.profiles.length} profiles stable against v${lock.scoringVersion} (frozen ${lock.frozenOn})`;
  }
  const lines = [
    `Scoring — DRIFT in ${drift.length} field(s) against v${lock.scoringVersion}`,
    '',
    'Either this is a bug, or it is a deliberate methodology change — in which case',
    'bump SCORING_VERSION and re-freeze with: npx tsx scripts/freeze-scoring-baseline.ts',
    '',
  ];
  for (const d of drift) {
    lines.push(`  ${d.profileId}.${d.field}`);
    lines.push(`    expected: ${JSON.stringify(d.expected)}`);
    lines.push(`    actual:   ${JSON.stringify(d.actual)}`);
  }
  return lines.join('\n');
}
