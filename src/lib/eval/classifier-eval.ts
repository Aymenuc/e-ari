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

/**
 * What a case's label is worth.
 *
 * `regression` — labelled in-house from the instrument. Enough to catch a bug,
 * and it has: two Article 5 prohibitions were found missing this way. Not
 * enough to quote at anyone, because it tests the engine against its author's
 * reading of the Act rather than against the Act.
 *
 * `certification` — labelled by a qualified reviewer who is not the author of
 * the engine, with the review recorded. This is the only set whose accuracy
 * figure may leave the building.
 *
 * Both are scored and both gate the build. The difference is not rigour of
 * execution, it is standing: who is willing to put their name to the label.
 */
export type CaseStanding = 'regression' | 'certification';

/** Provenance for a certification label. Required — see the test. */
export interface CaseReview {
  /** Who reviewed it. A name or firm, not "a lawyer". */
  reviewer: string;
  /** Their basis for reviewing EU AI Act classification. */
  qualification: string;
  /** ISO date of the review. */
  reviewedOn: string;
  /** What they were shown and what they were asked. */
  method: string;
}

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
  /** Defaults to the dataset's `defaultStanding`. */
  standing?: CaseStanding;
  /** Mandatory when standing is 'certification'. */
  review?: CaseReview;
  /** Where the description came from, when it was not written in-house. */
  sourceUrl?: string;
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
  standing: CaseStanding;
}

export interface CoreMetrics {
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
}

export interface ClassifierMetrics extends CoreMetrics {
  /**
   * The same measurements split by what the labels are worth.
   *
   * Kept separate rather than blended, because a single headline number over
   * both sets would carry the certification set's authority and the regression
   * set's provenance — which is precisely the misquote this exists to prevent.
   */
  bySet: Record<CaseStanding, CoreMetrics>;
  outcomes: CaseOutcome[];
}

const IN_SCOPE: ReadonlySet<RiskTier> = new Set<RiskTier>(['prohibited', 'high']);

function computeMetrics(outcomes: CaseOutcome[]): CoreMetrics {
  const gaps = outcomes.filter((o) => o.knownLimitation);
  const scorable = outcomes.filter((o) => !o.knownLimitation);
  const correct = scorable.filter((o) => o.match);
  const wrong = scorable.filter((o) => !o.match);

  return {
    scored: scorable.length,
    correct: correct.length,
    accuracy: scorable.length === 0 ? 0 : correct.length / scorable.length,
    falsePositives: wrong.filter((o) => !IN_SCOPE.has(o.expected) && IN_SCOPE.has(o.actual)),
    falseNegatives: wrong.filter((o) => IN_SCOPE.has(o.expected) && !IN_SCOPE.has(o.actual)),
    tierConfusions: wrong.filter((o) => IN_SCOPE.has(o.expected) === IN_SCOPE.has(o.actual)),
    articleMismatches: scorable.filter((o) => o.articleMismatch),
    coverageGaps: gaps,
    confirmationFailures: outcomes.filter((o) => o.confirmationExpected === true && !o.confirmationActual),
  };
}

export function evaluateClassifier(
  cases: ClassifierCase[],
  defaultStanding: CaseStanding = 'regression',
): ClassifierMetrics {
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
      standing: c.standing ?? defaultStanding,
    };

    if (c.expectedArticle && r.tier === c.expectedTier && !actualArticles.includes(c.expectedArticle)) {
      outcome.articleMismatch = { expected: c.expectedArticle, actual: actualArticles };
    }
    return outcome;
  });

  return {
    ...computeMetrics(outcomes),
    bySet: {
      regression: computeMetrics(outcomes.filter((o) => o.standing === 'regression')),
      certification: computeMetrics(outcomes.filter((o) => o.standing === 'certification')),
    },
    outcomes,
  };
}

/**
 * The only function permitted to produce an external accuracy claim.
 *
 * It returns null when the certification set is empty, which is the current
 * state and will be until a qualified reviewer has labelled cases. Routing
 * every outward claim through one function that can refuse is the difference
 * between a rule people remember and a rule that holds: there is no honest
 * sentence to paste into a deck if this returns null, and no need to rely on
 * whoever is writing the deck recalling why.
 *
 * The regression figure is deliberately unreachable from here. It is real, it
 * gates the build, and it is nobody's business outside the repository.
 */
export function quotableClaim(m: ClassifierMetrics): string | null {
  const cert = m.bySet.certification;
  if (cert.scored === 0) return null;

  const pct = ((cert.accuracy) * 100).toFixed(1);
  const gaps = cert.coverageGaps.length;
  return (
    `${pct}% (${cert.correct}/${cert.scored}) on independently reviewed cases, ` +
    `measured against ${CURRENT_CORPUS.citation}` +
    (gaps > 0 ? `, with ${gaps} further case${gaps === 1 ? '' : 's'} held out as not determinable from a system description` : '') +
    '.'
  );
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
  const set = (label: string, c: CoreMetrics, note: string) =>
    c.scored === 0
      ? `  ${label.padEnd(14)} empty — ${note}`
      : `  ${label.padEnd(14)} ${c.correct}/${c.scored} (${pct(c.accuracy)}) — ${note}`;

  const claim = quotableClaim(m);
  const lines: string[] = [
    `Classifier — measured against ${CURRENT_CORPUS.citation}`,
    '',
    set('certification', m.bySet.certification, 'independently reviewed labels; the only set quotable externally'),
    set('regression', m.bySet.regression, 'in-house labels; gates the build, never quoted'),
    '',
    claim
      ? `  External claim: ${claim}`
      : '  External claim: none available. No case carries an independent review, so there is no accuracy figure that may be quoted outside the repository.',
  ];

  const section = (title: string, rows: CaseOutcome[]) => {
    if (rows.length === 0) return;
    lines.push('', `${title} (${rows.length}):`);
    for (const o of rows) {
      lines.push(`  ${o.id} [${o.standing}]: expected ${o.expected}, got ${o.actual}`);
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
