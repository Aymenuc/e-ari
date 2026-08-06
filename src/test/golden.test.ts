import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SCORING_VERSION } from '@/lib/pillars';
import {
  detectScoringDrift, formatScoringReport, type ScoringLockFile,
} from '@/lib/eval/scoring-lock';
import {
  evaluateClassifier, formatClassifierReport, type ClassifierCase,
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
  const cases: ClassifierCase[] = read('classifier-cases.json').cases;
  const m = evaluateClassifier(cases);
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
