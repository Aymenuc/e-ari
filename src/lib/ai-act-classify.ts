/**
 * Deterministic risk classification, with a trace.
 *
 * The tier used to be whatever a language model returned. This decides it from
 * the enumerated law and reports which rules fired, so the answer can be
 * argued with rather than merely believed. Same facts in, same tier out, every
 * time — which is the claim the rest of the product already makes about the
 * score and could not make about the thing that matters most.
 *
 * Three deliberate constraints:
 *
 *  1. It never returns "high" on its own authority. Annex III membership makes
 *     a system a *candidate*; whether it is actually high-risk turns on
 *     questions this file cannot answer from a text field. So a candidate
 *     comes back as `high` with `requiresHumanConfirmation` set and the open
 *     questions attached, and the caller is expected to keep the tier
 *     provisional until someone answers them.
 *
 *  2. It never silently downgrades. Absence of a trigger is absence of
 *     evidence, not evidence of absence, so a system with nothing matched is
 *     returned as `minimal` with `confidence: 'low'` and the reason stated.
 *
 *  3. Prohibited beats everything. Art. 5 is not a risk tier to be weighed
 *     against others; if a practice is banned, no amount of governance makes
 *     it lawful, and the result says so.
 */

import {
  ANNEX_III_AREAS, PROHIBITED_PRACTICES, TRANSPARENCY_TRIGGERS,
  type EnumeratedArea,
} from './ai-act-annex';

export type RiskTier = 'prohibited' | 'high' | 'limited' | 'minimal';

export interface FiredRule {
  code: string;
  heading: string;
  article: string;
  /** The phrase that matched, quoted back so the reader can see why. */
  matchedOn: string;
  /** Where it matched — purpose, description, or the affected populations. */
  field: string;
}

export interface ClassificationFacts {
  name: string;
  description: string;
  purpose: string;
  sector?: string | null;
  deployerRole?: string | null;
  populationsAffected?: string | null;
}

export interface RuleClassification {
  tier: RiskTier;
  /** Every rule that matched, in the order the Act presents them. */
  firedRules: FiredRule[];
  /** Questions a person must answer before the tier is settled. */
  openQuestions: string[];
  /** True whenever the tier depends on an unanswered question. */
  requiresHumanConfirmation: boolean;
  confidence: 'low' | 'medium' | 'high';
  /** Plain sentence explaining how the tier was reached. */
  basis: string;
}

/** Fields searched, in the order a reader would expect them cited. */
function searchable(facts: ClassificationFacts): Array<{ field: string; text: string }> {
  return [
    { field: 'purpose', text: facts.purpose ?? '' },
    { field: 'description', text: facts.description ?? '' },
    { field: 'name', text: facts.name ?? '' },
    { field: 'populations affected', text: facts.populationsAffected ?? '' },
  ].filter((f) => f.text.trim().length > 0);
}

/** Words, lower-cased, punctuation dropped. */
function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

/**
 * Does one word match a trigger word, allowing regular English inflection?
 *
 * "scrapes" is "scrape", "targets" is "target", "policing" is "police". A
 * trigger phrase written in the infinitive has to match the sentence someone
 * actually wrote, and people write "scrapes facial images", not "scrape facial
 * images".
 *
 * Only regular suffixes, and only on a whole word — that is what keeps
 * "policies" away from "police" and "upgrading" away from "grading". Matching
 * words rather than characters is also why "Irish" no longer contains "iris":
 * a substring search cannot see word structure, so it had to be told about
 * boundaries; comparing tokens never sees inside a word in the first place.
 */
function wordMatches(word: string, trigger: string): boolean {
  if (word === trigger) return true;
  if (word === `${trigger}s` || word === `${trigger}es`) return true;
  if (word === `${trigger}ed` || word === `${trigger}ing`) return true;
  // English drops a silent final "e" before -ing/-ed: score → scoring.
  if (trigger.endsWith('e')) {
    const stem = trigger.slice(0, -1);
    if (word === `${stem}ing` || word === `${stem}ed`) return true;
  }
  return false;
}

/** A trigger matches when its words appear consecutively, in order. */
function phraseAt(words: string[], trigger: string[], start: number): boolean {
  if (start + trigger.length > words.length) return false;
  for (let i = 0; i < trigger.length; i++) {
    if (!wordMatches(words[start + i]!, trigger[i]!)) return false;
  }
  return true;
}

function findMatch(area: EnumeratedArea, facts: ClassificationFacts): FiredRule | null {
  for (const { field, text } of searchable(facts)) {
    const words = tokenize(text);
    for (const trigger of area.triggers) {
      const t = tokenize(trigger);
      if (t.length === 0) continue;
      for (let i = 0; i < words.length; i++) {
        if (phraseAt(words, t, i)) {
          return { code: area.code, heading: area.heading, article: area.article, matchedOn: trigger, field };
        }
      }
    }
  }
  return null;
}

function matchAll(areas: readonly EnumeratedArea[], facts: ClassificationFacts) {
  const fired: FiredRule[] = [];
  const questions: string[] = [];
  for (const area of areas) {
    const hit = findMatch(area, facts);
    if (!hit) continue;
    fired.push(hit);
    for (const q of area.openQuestions) if (!questions.includes(q)) questions.push(q);
  }
  return { fired, questions };
}

/**
 * Classify from facts alone.
 *
 * Returns a provisional answer plus its reasoning. The caller decides what to
 * do with `requiresHumanConfirmation`; this function will not resolve it.
 */
export function classifyByRules(facts: ClassificationFacts): RuleClassification {
  const prohibited = matchAll(PROHIBITED_PRACTICES, facts);
  if (prohibited.fired.length > 0) {
    return {
      tier: 'prohibited',
      firedRules: prohibited.fired,
      openQuestions: prohibited.questions,
      // Even here a person confirms: the triggers are phrases, and a system
      // that *detects* CSAM is not a system that produces it.
      requiresHumanConfirmation: true,
      confidence: 'high',
      basis:
        'Matched a practice Article 5 bans outright. A prohibited practice cannot be brought into compliance by governance — it must not be placed on the market or used. Confirm the match describes what the system does rather than what it detects or prevents.',
    };
  }

  const annex = matchAll(ANNEX_III_AREAS, facts);
  if (annex.fired.length > 0) {
    return {
      tier: 'high',
      firedRules: annex.fired,
      // Article 6(3) applies to every Annex III area without exception, so it
      // leads. A listed system that only performs a narrow procedural task, or
      // prepares work a person then does, is not high-risk — but the provider
      // has to document that assessment, and no text field can show it was made.
      openQuestions: [
        'Does an Article 6(3) derogation apply — narrow procedural task, improving a completed human activity, detecting patterns without replacing human judgement, or preparatory work — and has that assessment been documented?',
        ...annex.questions,
      ],
      // Never settled from a description alone. Annex III membership is a
      // presumption the provider may rebut, not a finding.
      requiresHumanConfirmation: true,
      confidence: 'medium',
      basis:
        `Matched ${annex.fired.length} Annex III area${annex.fired.length === 1 ? '' : 's'}. ` +
        'Annex III membership makes the system high-risk by presumption, not by finding: the questions below decide whether it actually is, and none of them is answerable from a description. Note also that a system may be high-risk under Article 6(1) as a safety component of a product covered by Annex I, which this check does not cover.',
    };
  }

  const transparency = matchAll(TRANSPARENCY_TRIGGERS, facts);
  if (transparency.fired.length > 0) {
    return {
      tier: 'limited',
      firedRules: transparency.fired,
      openQuestions: [],
      requiresHumanConfirmation: false,
      confidence: 'medium',
      basis:
        'No Annex III area matched, but the system interacts with people or generates content, so the Article 50 transparency duties apply. Those have been applicable since 2 August 2026 and were not deferred.',
    };
  }

  return {
    tier: 'minimal',
    firedRules: [],
    openQuestions: [
      'Does the recorded purpose and description fully describe what the system does?',
    ],
    // Nothing matching is the weakest possible evidence, so it is never
    // reported as a confident clearance.
    requiresHumanConfirmation: true,
    confidence: 'low',
    basis:
      'No Article 5, Annex III or Article 50 trigger matched the recorded facts. That is an absence of evidence rather than a finding of low risk: a thin description produces this result as readily as a genuinely minimal system. The Article 4 literacy duty applies regardless of tier.',
  };
}

/**
 * Markers separating the three parts of a stored rationale.
 *
 * The rationale is one text column — exports and the public API need it whole —
 * but the parts carry different weight, and a caveat that reads as prose is a
 * caveat nobody acts on. Writer and reader share these so the split cannot
 * drift apart silently.
 */
export const RATIONALE_TRACE_MARKER = 'How this was determined';
export const RATIONALE_PROVISIONAL_MARKER = 'PROVISIONAL — confirm before relying on this:';

export interface SplitRationale {
  /** The narrative, plus any cited articles. */
  prose: string;
  /** The deterministic trace, one rule per line. */
  trace: string[];
  /** Questions that must be answered before the tier is settled. */
  provisional: string[];
}

/** Split a stored rationale for display. Falls back to prose-only. */
export function splitRationale(text: string): SplitRationale {
  const out: SplitRationale = { prose: text.trim(), trace: [], provisional: [] };
  if (!text) return out;

  const bullets = (block: string) =>
    block.split('\n').map((l) => l.replace(/^\s*·\s*/, '').trim()).filter(Boolean);

  let rest = text;
  const pi = rest.indexOf(RATIONALE_PROVISIONAL_MARKER);
  if (pi !== -1) {
    out.provisional = bullets(rest.slice(pi + RATIONALE_PROVISIONAL_MARKER.length));
    rest = rest.slice(0, pi);
  }
  const ti = rest.indexOf(RATIONALE_TRACE_MARKER);
  if (ti !== -1) {
    const after = rest.slice(ti);
    const nl = after.indexOf('\n');
    out.trace = nl === -1 ? [] : bullets(after.slice(nl));
    rest = rest.slice(0, ti);
  }
  out.prose = rest.trim();
  return out;
}

/** The trace, as lines a report or an auditor can read. */
export function explainClassification(r: RuleClassification): string[] {
  const lines = r.firedRules.map(
    (f) => `${f.article} — ${f.heading}: matched "${f.matchedOn}" in the ${f.field}.`,
  );
  if (lines.length === 0) lines.push('No enumerated provision matched the recorded facts.');
  return lines;
}
