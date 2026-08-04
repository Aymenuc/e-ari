/**
 * When each part of the EU AI Act actually applies.
 *
 * This existed as `new Date('2026-08-02')` copied into eight files — the
 * landing banner, the results narrative, the X-ray findings, the training
 * content, and the ground-truth block fed to the LLM. One date, eight copies,
 * and the Act does not have one date.
 *
 * It also became wrong. The Digital Omnibus on AI amended Regulation (EU)
 * 2024/1689 and is in force: Parliament endorsed it on 16 June 2026, the
 * Council approved it on 29 June 2026, and it was published in the Official
 * Journal. Standalone Annex III high-risk obligations moved from 2 August 2026
 * to 2 December 2027, and Annex I product-embedded systems to 2 August 2028.
 * Article 4 literacy and Article 50 transparency were deliberately left where
 * they were.
 *
 * Telling a compliance officer the wrong applicability date is the worst error
 * this product can make, so every surface reads from here and every entry
 * carries what it is grounded in.
 *
 * Sources:
 *  - Regulation (EU) 2024/1689 (the AI Act), Article 113 application dates
 *  - Digital Omnibus on AI, amending 2024/1689 — in force, OJ published 2026
 *  - https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai
 */

export interface AiActMilestone {
  id: string;
  /** UTC date the obligation becomes applicable. */
  date: Date;
  /** What applies, in an officer's words. */
  label: string;
  /** The provisions concerned. */
  articles: string[];
  /** Whether the Digital Omnibus moved this. */
  amendedByOmnibus: boolean;
}

export const AI_ACT_MILESTONES: readonly AiActMilestone[] = [
  {
    id: 'prohibitions',
    date: new Date('2025-02-02T00:00:00Z'),
    label: 'Prohibited practices banned',
    articles: ['Art.5'],
    amendedByOmnibus: false,
  },
  {
    id: 'literacy',
    date: new Date('2025-02-02T00:00:00Z'),
    label: 'AI literacy duty — applies to every organisation using AI, not only high-risk',
    articles: ['Art.4'],
    amendedByOmnibus: false,
  },
  {
    id: 'gpai',
    date: new Date('2025-08-02T00:00:00Z'),
    label: 'General-purpose AI model obligations',
    articles: ['Art.53', 'Art.55'],
    amendedByOmnibus: false,
  },
  {
    id: 'transparency',
    date: new Date('2026-08-02T00:00:00Z'),
    label: 'Transparency duties for AI that interacts with people or generates content',
    articles: ['Art.50'],
    amendedByOmnibus: false,
  },
  {
    id: 'new-prohibitions',
    date: new Date('2026-12-02T00:00:00Z'),
    label: 'Two further prohibitions: non-consensual intimate imagery, and child sexual abuse material',
    articles: ['Art.5'],
    amendedByOmnibus: true,
  },
  {
    id: 'synthetic-legacy',
    date: new Date('2026-12-02T00:00:00Z'),
    label: 'Marking of synthetic content for systems already on the market before 2 August 2026',
    articles: ['Art.50(2)'],
    amendedByOmnibus: true,
  },
  {
    id: 'high-risk-annex-iii',
    date: new Date('2027-12-02T00:00:00Z'),
    label: 'High-risk obligations for standalone Annex III systems',
    articles: ['Art.6(2)', 'Art.9–17', 'Art.26', 'Annex III'],
    amendedByOmnibus: true,
  },
  {
    id: 'high-risk-annex-i',
    date: new Date('2028-08-02T00:00:00Z'),
    label: 'High-risk obligations for AI embedded in regulated products',
    articles: ['Art.6(1)', 'Annex I'],
    amendedByOmnibus: true,
  },
  {
    id: 'public-authority-legacy',
    date: new Date('2030-08-02T00:00:00Z'),
    label: 'Legacy public-authority systems brought into scope',
    articles: ['Art.111'],
    amendedByOmnibus: false,
  },
] as const;

const byId = new Map(AI_ACT_MILESTONES.map((m) => [m.id, m]));

export function milestone(id: string): AiActMilestone | undefined {
  return byId.get(id);
}

/** The next milestone still ahead, or null once they have all passed. */
export function nextMilestone(now: Date = new Date()): AiActMilestone | null {
  return AI_ACT_MILESTONES.find((m) => m.date.getTime() > now.getTime()) ?? null;
}

/** Milestones already applicable, newest first. */
export function inForce(now: Date = new Date()): AiActMilestone[] {
  return AI_ACT_MILESTONES.filter((m) => m.date.getTime() <= now.getTime()).reverse();
}

/** Whole days until a milestone; negative once it has passed. */
export function daysUntil(m: AiActMilestone, now: Date = new Date()): number {
  return Math.ceil((m.date.getTime() - now.getTime()) / 86_400_000);
}

/** "2 December 2027" — the form used in customer-facing copy. */
export function formatMilestoneDate(m: AiActMilestone): string {
  return m.date.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}
