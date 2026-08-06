import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SCORING_VERSION } from '@/lib/pillars';
import {
  detectScoringDrift, formatScoringReport, type ScoringLockFile,
} from '@/lib/eval/scoring-lock';
import {
  evaluateClassifier, formatClassifierReport, quotableClaim, type ClassifierCase,
} from '@/lib/eval/classifier-eval';

const GOLDEN = join(process.cwd(), 'src/test/golden');
const read = (f: string) => JSON.parse(readFileSync(join(GOLDEN, f), 'utf8'));

/**
 * The offline half of the eval harness, run on every build.
 *
 * Everything here is deterministic and needs no API key, which is why it can
 * sit in the build gate. The stage that needs a live model —
 * `npx tsx scripts/run-eval.ts --live` — measures the rationale, and is run on
 * demand because it costs money and varies between runs.
 */
describe('scoring lock', () => {
  const lock: ScoringLockFile = read('scoring-lock.json');

  it('is frozen against the scoring version currently shipping', () => {
    // Catches both directions: a version bumped without re-freezing, and a
    // re-freeze that quietly captured a change nobody versioned.
    expect(lock.scoringVersion, 'scoring-lock.json is stale — re-freeze it').toBe(SCORING_VERSION);
  });

  it('produces identical scores for every frozen profile', () => {
    const drift = detectScoringDrift(lock);
    expect(drift, formatScoringReport(lock, drift)).toEqual([]);
  });

  it('covers the range, the band edges and the adjustment rules', () => {
    const ids = lock.profiles.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['floor', 'ceiling', 'midpoint', 'near-band-edge']));
    expect(lock.expectations['floor']!.overallScore).toBe(0);
    expect(lock.expectations['ceiling']!.overallScore).toBe(100);
    // At least one profile must exercise the interdependency rules, or a
    // regression in them would pass unnoticed.
    expect(
      lock.profiles.some((p) => lock.expectations[p.id]!.adjustmentTypes.length > 0),
      'no frozen profile fires an interdependency adjustment',
    ).toBe(true);
  });

  it('shows sector weighting actually changing the result', () => {
    // A flat profile cannot detect this: if every pillar scores the same, every
    // weighting of them is that same number. The sector profiles share one
    // uneven answer set precisely so the weights have something to move.
    const sectorScores = lock.profiles
      .filter((p) => p.id.startsWith('sector-'))
      .map((p) => lock.expectations[p.id]!.overallScore);
    expect(sectorScores.length).toBeGreaterThanOrEqual(3);
    expect(new Set(sectorScores).size, 'sector weighting produced identical scores').toBe(sectorScores.length);
  });
});

describe('classifier accuracy', () => {
  const dataset = read('classifier-cases.json');
  const cases: ClassifierCase[] = dataset.cases;
  const m = evaluateClassifier(cases, dataset.defaultStanding ?? 'regression');
  const report = () => formatClassifierReport(m);

  it('never misses an obligation that exists', () => {
    // The expensive direction: telling an organisation there is nothing to do
    // when the Act says otherwise. This is the one that reaches a regulator.
    expect(m.falseNegatives.map((o) => o.id), report()).toEqual([]);
  });

  it('never claims scope the law does not give it', () => {
    // The corrosive direction: a false high-risk finding costs wasted work and,
    // repeated, costs belief in every other finding the product makes.
    expect(m.falsePositives.map((o) => o.id), report()).toEqual([]);
  });

  it('holds overall accuracy', () => {
    expect(m.accuracy, report()).toBeGreaterThanOrEqual(0.95);
  });

  it('cites the provision the label names', () => {
    expect(m.articleMismatches.map((o) => o.id), report()).toEqual([]);
  });

  it('flags cases where the matched phrase may not describe the intent', () => {
    // A CSAM detector matches the CSAM prohibition. The tier is defensible; a
    // determination presented as settled is not.
    expect(m.confirmationFailures.map((o) => o.id), report()).toEqual([]);
  });

  it('reports what it cannot decide instead of scoring it', () => {
    // Art. 6(1) Annex I safety components and Art. 6(3) derogations are not
    // reachable from a text description. Counting them either way would
    // misstate what the engine does — so they are held out and reported.
    expect(m.coverageGaps.length).toBeGreaterThan(0);
    for (const gap of m.coverageGaps) {
      expect(gap.tags).toContain('coverage-gap');
    }
    // Guard against silent growth: a new unreachable case should be a decision,
    // not something that appears in a report nobody reads.
    expect(m.coverageGaps.length, 'coverage gaps changed — confirm this is intended').toBe(3);
  });

  it('exercises both error directions and every tier', () => {
    // A dataset of only easy positives measures nothing. This asserts the set
    // still contains the traps it was built around.
    const tags = new Set(cases.flatMap((c) => c.tags ?? []));
    expect(tags).toContain('false-positive-trap');
    expect(tags).toContain('word-boundary');
    const tiers = new Set(cases.map((c) => c.expectedTier));
    expect([...tiers].sort()).toEqual(['high', 'limited', 'minimal', 'prohibited']);
    expect(cases.length).toBeGreaterThanOrEqual(40);
  });
});

/**
 * What an accuracy figure is allowed to claim.
 *
 * The regression set is real work and it finds real bugs, but its labels are
 * the engine author's reading of the Act. Quoting it externally would present
 * self-agreement as validation. These tests make that boundary structural
 * rather than a habit someone has to remember under deadline.
 */
describe('label standing', () => {
  const dataset = read('classifier-cases.json');
  const cases: ClassifierCase[] = dataset.cases;
  const m = evaluateClassifier(cases, dataset.defaultStanding ?? 'regression');

  it('demands full provenance before a case counts as reviewed', () => {
    // Promotion must cost something. Without this, 'certification' is one word
    // in a JSON file away from a quotable number nobody actually reviewed.
    for (const c of cases.filter((x) => x.standing === 'certification')) {
      const r = c.review;
      expect(r, `${c.id} claims certification with no review block`).toBeDefined();
      expect(r!.reviewer?.trim(), `${c.id}: reviewer`).toBeTruthy();
      expect(r!.qualification?.trim(), `${c.id}: qualification`).toBeTruthy();
      expect(r!.method?.trim(), `${c.id}: method`).toBeTruthy();
      expect(r!.reviewedOn, `${c.id}: reviewedOn must be an ISO date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('refuses an external claim while nothing has been reviewed', () => {
    // The honest state today. When this starts returning a string, it is
    // because a reviewer's name is in the file — not because a threshold moved.
    if (m.bySet.certification.scored === 0) {
      expect(quotableClaim(m)).toBeNull();
    }
  });

  it('never lets the regression figure reach an external claim', () => {
    const claim = quotableClaim(m);
    if (claim) {
      expect(claim).not.toContain(String(m.bySet.regression.correct));
      expect(claim).toContain('independently reviewed');
    }
  });

  it('says plainly in the report that no figure is quotable', () => {
    const text = formatClassifierReport(m);
    if (m.bySet.certification.scored === 0) {
      expect(text).toContain('External claim: none available');
      expect(text).toContain('never quoted');
    }
  });

  it('holds every case to the build gate regardless of standing', () => {
    // Standing governs what may be claimed, not what is checked. A regression
    // case failing is still a failing build.
    expect(m.falseNegatives).toEqual([]);
    expect(m.falsePositives).toEqual([]);
    expect(m.bySet.regression.scored + m.bySet.certification.scored).toBe(m.scored);
  });
});
