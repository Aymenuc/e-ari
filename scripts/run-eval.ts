/**
 * Eval harness.
 *
 *   npx tsx scripts/run-eval.ts           offline only — no API key, no cost
 *   npx tsx scripts/run-eval.ts --live    adds the rationale stage (calls the model)
 *   npx tsx scripts/run-eval.ts --live --sample 8
 *
 * The offline half also runs in `npm test`, so this script is for reading the
 * detail and for the live stage. Exit code is non-zero when a hard check fails,
 * so it can gate a deploy.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from 'dotenv';
import { SCORING_VERSION } from '../src/lib/pillars';
import { detectScoringDrift, formatScoringReport, type ScoringLockFile } from '../src/lib/eval/scoring-lock';
import { evaluateClassifier, formatClassifierReport, type ClassifierCase } from '../src/lib/eval/classifier-eval';

// Next loads these automatically; tsx does not. Only needed for --live.
config({ path: '.env.local' });
config({ path: '.env' });

const argv = process.argv.slice(2);
const LIVE = argv.includes('--live');
const SAMPLE = Number(argv[argv.indexOf('--sample') + 1]) || 6;

const GOLDEN = join(process.cwd(), 'src/test/golden');
const read = (f: string) => JSON.parse(readFileSync(join(GOLDEN, f), 'utf8'));

const rule = (s: string) => console.log(`\n${s}\n${'─'.repeat(s.length)}`);
let failed = false;

// ── Scoring ────────────────────────────────────────────────────────────────
rule('Scoring regression');
const lock: ScoringLockFile = read('scoring-lock.json');
if (lock.scoringVersion !== SCORING_VERSION) {
  console.log(`FAIL: lock frozen at v${lock.scoringVersion}, engine is v${SCORING_VERSION}`);
  failed = true;
}
const drift = detectScoringDrift(lock);
console.log(formatScoringReport(lock, drift));
if (drift.length > 0) failed = true;

// ── Classifier ─────────────────────────────────────────────────────────────
rule('Classifier accuracy');
const cases: ClassifierCase[] = read('classifier-cases.json').cases;
const m = evaluateClassifier(cases);
console.log(formatClassifierReport(m));
if (m.falseNegatives.length > 0 || m.falsePositives.length > 0) failed = true;

/**
 * These are the numbers worth watching over time. Accuracy alone would hide
 * which direction the engine is wrong in, and the two directions cost
 * different things.
 */
rule('Summary');
console.log(`  scoring profiles stable   ${drift.length === 0 ? 'yes' : `NO (${drift.length} drifted)`}`);
console.log(`  classifier accuracy       ${(m.accuracy * 100).toFixed(1)}% (${m.correct}/${m.scored})`);
console.log(`  false negatives           ${m.falseNegatives.length}`);
console.log(`  false positives           ${m.falsePositives.length}`);
console.log(`  coverage gaps (unscored)  ${m.coverageGaps.length}`);

// ── Rationale (live model) ─────────────────────────────────────────────────
// Wrapped rather than top-level await: tsx compiles this file as CJS.
void (async () => {
if (LIVE) {
  rule(`Rationale quality — live model, ${SAMPLE} cases`);

  const { LLM_API_KEY } = await import('../src/lib/llm-config');
  if (!LLM_API_KEY?.trim()) {
    // --live was asked for and cannot run. Saying so and failing is the only
    // honest option: classifyAISystem catches an LLM outage and falls back to
    // the rule basis, so the run would otherwise complete and report metrics
    // computed entirely from deterministic output — a fabricated 100%.
    console.log('  SKIPPED: no LLM API key (GEMINI_API_KEY / GLM_API_KEY).');
    console.log('  The offline results above stand; the rationale stage did not run.');
    console.log('');
    process.exit(1);
  }

  const { classifyAISystem } = await import('../src/lib/compliance/classifier');

  // Spread across tiers rather than taking the first N, which would be all
  // prohibited cases and would measure nothing about the common path.
  const byTier = new Map<string, ClassifierCase[]>();
  for (const c of cases.filter((x) => !x.knownLimitation)) {
    if (!byTier.has(c.expectedTier)) byTier.set(c.expectedTier, []);
    byTier.get(c.expectedTier)!.push(c);
  }
  const sample: ClassifierCase[] = [];
  let i = 0;
  while (sample.length < SAMPLE) {
    let added = false;
    for (const list of byTier.values()) {
      if (list[i] && sample.length < SAMPLE) { sample.push(list[i]!); added = true; }
    }
    if (!added) break;
    i++;
  }

  let keptTotal = 0, droppedTotal = 0, tierContradictions = 0, provisionalStated = 0, provisionalDue = 0, errors = 0;
  // Backstop for the same problem mid-run: a per-case failure also falls back
  // silently. A case whose rationale is verbatim the rule basis did not come
  // from the model and must not be scored as if it had.
  let fellBack = 0;

  for (const c of sample) {
    try {
      const res = await classifyAISystem(
        {
          id: c.id, name: c.id, description: c.description ?? '', purpose: c.purpose,
          sector: c.sector ?? 'general', deployerRole: c.deployerRole ?? 'deployer',
          populationsAffected: c.populationsAffected ?? null,
        } as never,
        [],
      );

      if (res.riskRationale === res.rules.basis) {
        fellBack++;
        console.log(`  ${c.id.padEnd(18)} ${res.riskTier.padEnd(11)} FELL BACK — model output not used, excluded`);
        continue;
      }

      keptTotal += res.citedArticles.length;
      droppedTotal += res.droppedCitations.length;

      // Heuristic, and labelled as one: does the prose assert a tier other than
      // the one determined? A keyword scan cannot read intent, so treat a hit
      // as something to read, not as a verdict.
      const other = (['prohibited', 'high', 'limited', 'minimal'] as const)
        .filter((t) => t !== res.riskTier)
        .filter((t) => new RegExp(`\\b${t}[- ]risk\\b`, 'i').test(res.riskRationale));
      if (other.length > 0) tierContradictions++;

      if (res.rules.requiresHumanConfirmation) {
        provisionalDue++;
        if (/provisional|confirm|not settled|open question|must be answered/i.test(res.riskRationale)) {
          provisionalStated++;
        }
      }

      const flags = [
        res.droppedCitations.length > 0 ? `dropped: ${res.droppedCitations.join(', ')}` : null,
        other.length > 0 ? `asserts "${other[0]} risk"` : null,
      ].filter(Boolean);
      console.log(`  ${c.id.padEnd(18)} ${res.riskTier.padEnd(11)} ${flags.join(' | ') || 'clean'}`);
    } catch (err) {
      errors++;
      console.log(`  ${c.id.padEnd(18)} ERROR ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const scored = sample.length - errors - fellBack;
  const proposed = keptTotal + droppedTotal;
  console.log('');
  console.log(`  cases scored              ${scored}/${sample.length}${fellBack > 0 ? ` (${fellBack} fell back to the rule basis)` : ''}`);
  if (scored === 0) {
    console.log('  No case produced model output — nothing to measure.');
    failed = true;
  }
  console.log(`  citation precision        ${proposed === 0 ? 'n/a' : `${((keptTotal / proposed) * 100).toFixed(1)}% (${keptTotal}/${proposed} survived the filter)`}`);
  console.log(`  tier contradictions       ${tierContradictions}/${scored}  (heuristic — read the flagged ones)`);
  console.log(`  provisional stated        ${provisionalDue === 0 ? 'n/a' : `${provisionalStated}/${provisionalDue}`}`);
  if (errors > 0) console.log(`  errors                    ${errors} (missing API key?)`);
}

console.log('');
process.exit(failed ? 1 : 0);
})();
