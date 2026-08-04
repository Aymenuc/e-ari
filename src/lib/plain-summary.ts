import { milestone, daysUntil, inForce, formatMilestoneDate } from './ai-act-timeline';
import type { ScoringResult } from './assessment-engine';

/**
 * The results in the language a compliance officer actually uses.
 *
 * The page led with "53 out of 100", "Chaser", "Scoring v5.3" and
 * "52% baseline -> 53% healthcare-weighted". Every one of those is meaningful
 * to whoever built the engine and opaque to the person who has to act on it:
 * a band name is invented vocabulary, a version string is an internal detail,
 * and a weighting delta is methodology showing through the front of the house.
 *
 * This answers the four questions an officer opens the page with — where do I
 * stand, what is worst, what do I do first, and how long have I got — in
 * sentences that need no glossary. Computed from the same numbers, so it can
 * never disagree with the charts beside it.
 *
 * Deliberately NOT a compliance determination. Nothing here says "you are
 * compliant" or "you are in breach": that is a legal conclusion this product
 * is not entitled to draw, and saying it would be the single most damaging
 * thing the page could get wrong.
 */

/** The EU AI Act's high-risk obligations date, used for the time framing. */

/** Pillars a regulator looks at first for a high-risk system. */
const REGULATOR_FIRST = ['governance', 'security', 'data'];

const THRESHOLD = 50;

export interface PlainSummary {
  /** One sentence: where this organisation stands, without jargon. */
  headline: string;
  /** What is holding the score down, named concretely. */
  constraint: string;
  /** The regulator-facing read: which of the areas they check first are weak. */
  regulatorView: string;
  /** Time framing against the Act's high-risk date. */
  timing: string;
  /** Plain gloss for the band name, so the badge stops being a private word. */
  bandGloss: string;
}

function ordinalList(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const BAND_GLOSS: Record<string, string> = {
  laggard: 'the foundations for governed AI are not in place yet',
  follower: 'some pieces are in place, but they do not yet join up',
  chaser: 'the foundations are in place and the gaps are specific, not structural',
  pacesetter: 'the controls a regulator looks for are largely in place',
};

export function buildPlainSummary(
  scoring: ScoringResult,
  opts: { orgName?: string | null; now?: Date } = {},
): PlainSummary {
  const now = opts.now ?? new Date();
  const pillars = scoring.pillarScores;
  const below = pillars.filter((p) => p.normalizedScore < THRESHOLD);
  const weakest = [...pillars].sort((a, b) => a.normalizedScore - b.normalizedScore)[0];
  const strongest = [...pillars].sort((a, b) => b.normalizedScore - a.normalizedScore)[0];
  const score = Math.round(scoring.overallScore);

  const headline =
    below.length === 0
      ? `Every one of the eight areas assessed is at or above the halfway mark, and your overall position is ${score} out of 100. Nothing here is failing; the work is raising a good position to a defensible one.`
      : `${below.length} of the ${pillars.length} areas assessed sit below the halfway mark, which is what holds your overall position at ${score} out of 100. The weakest is ${weakest?.pillarName} at ${Math.round(weakest?.normalizedScore ?? 0)}.`;

  const constraint = weakest
    ? `${weakest.pillarName} is the binding constraint. Work in the stronger areas — ${strongest?.pillarName} is at ${Math.round(strongest?.normalizedScore ?? 0)} — will not move your overall position much while this one stays where it is.`
    : '';

  const regulatorWeak = pillars
    .filter((p) => REGULATOR_FIRST.includes(p.pillarId) && p.normalizedScore < THRESHOLD)
    .map((p) => p.pillarName);

  const regulatorView =
    regulatorWeak.length === 0
      ? 'The areas a reviewer tends to open first — governance, security and data — are all above the halfway mark. That is the part of this result worth showing.'
      : `Of the areas a reviewer tends to open first, ${ordinalList(regulatorWeak)} ${regulatorWeak.length === 1 ? 'is' : 'are'} below the halfway mark. ${regulatorWeak.length === 1 ? 'That is the one' : 'Those are the ones'} most likely to invite follow-up questions.`;

  /**
   * What actually applies, and when.
   *
   * This used to count down to 2 August 2026 as "the" deadline. The Digital
   * Omnibus moved standalone Annex III high-risk obligations to 2 December
   * 2027 and product-embedded ones to 2 August 2028, while leaving Article 4
   * literacy and Article 50 transparency exactly where they were. A single
   * countdown cannot express that, and stating a superseded date to a
   * compliance officer is the worst thing this product could do.
   *
   * So the reader gets both halves: what binds them today, and what is coming.
   */
  const highRisk = milestone('high-risk-annex-iii')!;
  const daysToHighRisk = daysUntil(highRisk, now);
  const alreadyBinding = inForce(now)
    .filter((m) => m.id === 'literacy' || m.id === 'transparency')
    .length;

  const classifierNote =
    'Whether the high-risk rules reach you depends on how your systems are classified, which the Compliance tab walks through.';

  const bindingNow = alreadyBinding > 0
    ? 'The AI literacy duty (Article 4) and the transparency duties (Article 50) already bind you today, whatever your systems are classified as. '
    : '';

  const timing =
    daysToHighRisk > 0
      ? `${bindingNow}High-risk obligations for standalone Annex III systems apply from ${formatMilestoneDate(highRisk)} — ${daysToHighRisk} days away, deferred from August 2026 by the Digital Omnibus. Systems embedded in regulated products follow on ${formatMilestoneDate(milestone('high-risk-annex-i')!)}. That is time to build evidence, not time to wait: the controls below take longer to stand up than they do to describe. ${classifierNote}`
      : `${bindingNow}High-risk obligations are in force. They are continuous, not a one-off deadline: what counts is what you can evidence now and keep evidencing. ${classifierNote}`;

  const bandGloss = BAND_GLOSS[scoring.maturityBand] ?? '';

  return { headline, constraint, regulatorView, timing, bandGloss };
}
