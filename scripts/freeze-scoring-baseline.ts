/**
 * Re-freezes the scoring regression lock.
 *
 * Run this ONLY when a scoring change is deliberate and SCORING_VERSION has
 * been bumped. Running it to make a red test go green erases the only signal
 * that the methodology changed.
 *
 *   npx tsx scripts/freeze-scoring-baseline.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SCORING_VERSION } from '../src/lib/pillars';
import { computeExpectation, type ScoringProfile, type ScoringLockFile } from '../src/lib/eval/scoring-lock';

/**
 * A deliberately uneven answer set: strong strategy, weak security and
 * governance. Shared by the three sector profiles so that re-weighting has
 * something to act on.
 */
const SECTOR_SPREAD: Record<string, number> = {
  strategy_1: 5, strategy_2: 5, strategy_3: 5, strategy_4: 4, strategy_5: 4,
  security_1: 1, security_2: 1, security_3: 2, security_4: 1, security_5: 2,
  governance_1: 2, governance_2: 1, governance_3: 2, governance_4: 2, governance_5: 1,
  data_1: 4, data_2: 4, data_3: 3, data_4: 4, data_5: 3,
};

/**
 * Profiles chosen to exercise distinct paths, not to sample realistically:
 * the two ends of the range, the midpoint, each adjustment rule that can be
 * triggered from responses alone, and sector weighting on and off.
 */
const PROFILES: ScoringProfile[] = [
  { id: 'floor', why: 'Every answer at 1 — the bottom of the range, and the band boundary most likely to move under a normalisation change.', fill: 1 },
  { id: 'ceiling', why: 'Every answer at 5 — the top of the range.', fill: 5 },
  { id: 'midpoint', why: 'Every answer at 3 — no adjustment should fire on a flat profile.', fill: 3 },
  { id: 'near-band-edge', why: 'A profile sitting close to a maturity band boundary, where a sub-point drift changes the label a customer sees.', fill: 3, overrides: { strategy_1: 4, strategy_2: 4, governance_1: 4 } },
  {
    id: 'governance-gap',
    why: 'High capability with weak governance — the interdependency rules exist for exactly this shape, so at least one adjustment must fire.',
    fill: 5,
    overrides: { governance_1: 1, governance_2: 1, governance_3: 1, governance_4: 1, governance_5: 1 },
  },
  {
    id: 'critical-failure',
    why: 'A pillar at the floor while the rest is strong — must register a critical pillar failure.',
    fill: 4,
    overrides: { data_1: 1, data_2: 1, data_3: 1, data_4: 1, data_5: 1 },
  },
  // Sector weighting is invisible on a flat profile: if every pillar scores the
  // same, every weighting of them is that same number. These three share one
  // deliberately uneven answer set so the weights actually have something to
  // move, and the three scores are expected to differ from each other.
  { id: 'sector-healthcare', why: 'Sector weighting on an uneven profile — healthcare re-weights toward governance and security.', fill: 3, overrides: SECTOR_SPREAD, sector: 'healthcare' },
  { id: 'sector-finance', why: 'The same answers under finance weighting — must not equal the healthcare score.', fill: 3, overrides: SECTOR_SPREAD, sector: 'finance' },
  { id: 'sector-technology', why: 'The same answers under technology weighting — three identical scores here would mean weighting is not being applied.', fill: 3, overrides: SECTOR_SPREAD, sector: 'technology' },
  {
    id: 'mixed-realistic',
    why: 'An uneven profile resembling a real submission, so the lock is not made only of uniform fills.',
    fill: 3,
    overrides: {
      strategy_1: 5, strategy_3: 2, governance_2: 1, governance_5: 4,
      data_1: 4, data_4: 2, talent_2: 5, talent_3: 1,
    },
    sector: 'technology',
  },
];

const expectations: ScoringLockFile['expectations'] = {};
for (const p of PROFILES) expectations[p.id] = computeExpectation(p);

const lock: ScoringLockFile = {
  scoringVersion: SCORING_VERSION,
  // Passed in rather than read from the clock, so re-running without changes
  // produces an identical file and shows up as no diff.
  frozenOn: process.env.FREEZE_DATE ?? new Date().toISOString().slice(0, 10),
  profiles: PROFILES,
  expectations,
};

const out = join(process.cwd(), 'src/test/golden/scoring-lock.json');
writeFileSync(out, `${JSON.stringify(lock, null, 2)}\n`);

console.log(`Froze ${PROFILES.length} profiles at scoring v${SCORING_VERSION} → ${out}`);
for (const p of PROFILES) {
  const e = expectations[p.id]!;
  console.log(`  ${p.id.padEnd(18)} ${String(e.overallScore).padStart(5)}  ${e.maturityBand.padEnd(12)} adj=${e.adjustmentTypes.length} xray=${e.xRayFindingIds.length}`);
}
