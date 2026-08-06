/**
 * Evaluation of the rule-based risk classifier against a labelled dataset.
 *
 * The cases in `src/test/golden/classifier-cases.json` are labelled from the
 * Regulation, not from this engine's output. That distinction is the whole
 * value: a dataset generated from the thing it tests can only detect change,
 * never error. Where the engine and the label disagree, the disagreement is a
 * finding — the case is not retuned to make the number go up.
 *
 * Two error directions are counted separately because they cost different
 * things. A false positive tells an organisation it is high-risk when it is
 * not: wasted work, and eventually distrust of every finding the product
 * makes. A false negative tells it there is nothing to do when an obligation
 * exists, which is the failure that reaches a regulator. Neither is
 * acceptable, but they are not the same error and a single accuracy number
 * hides which one is happening.
 *
 * Cases marked `knownLimitation` are provably outside what rules over a text
 * description can decide — Art. 6(1) Annex I safety components, Art. 6(3)
 * derogations. They are never counted as passes and never as failures. They
 * are reported as coverage, because a harness that quietly scores them either
 * way is lying about what the engine can do.
 */

import { classifyByRules, type RiskTier } from '@/lib/ai-act-classify';
import { CURRENT_CORPUS } from '@/lib/regulatory-provenance';

export interface ClassifierCase {
  id: string;
  purpose: string;
  description?: string;
  sector?: string;
  deployerRole?: string;
  populationsAffected?: string;
  expectedTier: RiskTier;
  expectedArticle?: string;
  why: string;
  knownLimitation?: boolean;
  expectRequiresConfirmation?: boolean;
  tags?: string[];
}

export interface CaseOutcome {
  id: string;
  expected: RiskTier;
  actual: RiskTier;
  match: boolean;
  /** Set when the label names an article and the engine cited a different one. */
  articleMismatch?: { expected: string; actual: string[] };
  confirmationExpected?: boolean;
  confirmationActual: boolean;
  knownLimitation: boolean;
  tags: string[];
  why: string;
}

export interface ClassifierMetrics {
  /** Cases the engine is expected to be able to decide. */
  scored: number;
  correct: number;
  accuracy: number;
  /** Told an org it is in scope when the law says it is not. */
  falsePositives: CaseOutcome[];
  /** Told an org there is nothing to do when an obligation exists. */
  falseNegatives: CaseOutcome[];
  /** Wrong tier, but not across the in-scope/out-of-scope line. */
  tierConfusions: CaseOutcome[];
  /** Right tier, wrong provision cited. */
  articleMismatches: CaseOutcome[];
  /** Provably undecidable from a description — reported, never scored. */
  coverageGaps: CaseOutcome[];
  /** Cases asserting a confirmation flag that did not appear. */
  confirmationFailures: CaseOutcome[];
  outcomes: CaseOutcome[];
}

const IN_SCOPE: ReadonlySet<RiskTier> = new Set<RiskTier>(['prohibited', 'high']);

export function evaluateClassifier(cases: ClassifierCase[]): ClassifierMetrics {
  const outcomes: CaseOutcome[] = cases.map((c) => {
    const r = classifyByRules({
      name: c.id,
      description: c.description ?? '',
      purpose: c.purpose,
      sector: c.sector ?? null,
      deployerRole: c.deployerRole ?? null,
      populationsAffected: c.populationsAffected ?? null,
    });

    const actualArticles = r.firedRules.map((f) => f.article);
    const outcome: CaseOutcome = {
      id: c.id,
      expected: c.expectedTier,
      actual: r.tier,
      match: r.tier === c.expectedTier,
      confirmationExpected: c.expectRequiresConfirmation,
      confirmationActual: r.requiresHumanConfirmation,
      knownLimitation: c.knownLimitation === true,
      tags: c.tags ?? [],
      why: c.why,
    };

    if (c.expectedArticle && r.tier === c.expectedTier && !actualArticles.includes(c.expectedArticle)) {
      outcome.articleMismatch = { expected: c.expectedArticle, actual: actualArticles };
    }
    return outcome;
  });

  const gaps = outcomes.filter((o) => o.knownLimitation);
  const scorable = outcomes.filter((o) => !o.knownLimitation);
  const wrong = scorable.filter((o) => !o.match);

  return {
    scored: scorable.length,
    correct: scorable.filter((o) => o.match).length,
    accuracy: scorable.length === 0 ? 0 : scorable.filter((o) => o.match).length / scorable.length,
    falsePositives: wrong.filter((o) => !IN_SCOPE.has(o.expected) && IN_SCOPE.has(o.actual)),
    falseNegatives: wrong.filter((o) => IN_SCOPE.has(o.expected) && !IN_SCOPE.has(o.actual)),
    tierConfusions: wrong.filter(
      (o) => IN_SCOPE.has(o.expected) === IN_SCOPE.has(o.actual),
    ),
    articleMismatches: scorable.filter((o) => o.articleMismatch),
    coverageGaps: gaps,
    confirmationFailures: outcomes.filter(
      (o) => o.confirmationExpected === true && !o.confirmationActual,
    ),
    outcomes,
  };
}

/**
 * Human-readable report. Used by the CLI and by test failure messages.
 *
 * Carries the corpus line, because an accuracy figure without the instrument it
 * was measured against is not quotable. "97% accurate" is a claim about
 * nothing; "97% against Regulation (EU) 2024/1689 as amended by 2026/1744, on
 * 39 cases, with 3 held out as undecidable" is a claim someone can check.
 */
export function formatClassifierReport(m: ClassifierMetrics): string {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const lines: string[] = [
    `Classifier — ${m.correct}/${m.scored} correct (${pct(m.accuracy)})`,
    `  measured against: ${CURRENT_CORPUS.citation}`,
    `  labels: written in-house from the instrument, not independently reviewed`,
  ];

  const section = (title: string, rows: CaseOutcome[]) => {
    if (rows.length === 0) return;
    lines.push('', `${title} (${rows.length}):`);
    for (const o of rows) {
      lines.push(`  ${o.id}: expected ${o.expected}, got ${o.actual}`);
      lines.push(`    ${o.why}`);
    }
  };

  section('FALSE NEGATIVES — obligation missed', m.falseNegatives);
  section('FALSE POSITIVES — scope over-claimed', m.falsePositives);
  section('TIER CONFUSION — same side of the scope line', m.tierConfusions);

  if (m.articleMismatches.length > 0) {
    lines.push('', `ARTICLE MISMATCH — right tier, different provision (${m.articleMismatches.length}):`);
    for (const o of m.articleMismatches) {
      lines.push(`  ${o.id}: expected ${o.articleMismatch!.expected}, cited ${o.articleMismatch!.actual.join(', ') || '(none)'}`);
    }
  }

  if (m.confirmationFailures.length > 0) {
    lines.push('', `CONFIRMATION NOT FLAGGED (${m.confirmationFailures.length}):`);
    for (const o of m.confirmationFailures) lines.push(`  ${o.id}`);
  }

  if (m.coverageGaps.length > 0) {
    lines.push('', `COVERAGE GAPS — outside what rules can decide (${m.coverageGaps.length}, not scored):`);
    for (const o of m.coverageGaps) {
      lines.push(`  ${o.id}: law says ${o.expected}, engine says ${o.actual} — ${o.tags.join(', ')}`);
    }
  }

  return lines.join('\n');
}
