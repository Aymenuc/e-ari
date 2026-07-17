/**
 * Marketing Engine — the AI marketing team the founder doesn't have.
 *
 * Replaces the old template generator, which FABRICATED: Math.random()
 * "benchmark" scores, an invented certification announcement, "Join 500+
 * organizations", and called the framework "6-pillar" (it is eight). A
 * marketing channel that lies about the product would sink a compliance
 * company. This engine is built on one rule: every claim is grounded in
 * PRODUCT_FACTS — compiled from the actual codebase constants — or it
 * doesn't ship.
 *
 * generateMarketingPack() produces channel-ready drafts (LinkedIn, X,
 * newsletter) for a topic, in brand voice, via DeepSeek. A weekly cron
 * drafts a pack for admin review; nothing publishes without approval.
 */

import { PILLARS, SCORING_VERSION } from './pillars';
import { DEEPSEEK_API_KEY, DEEPSEEK_API_URL, DEEPSEEK_MODEL } from './llm-config';

// ─── Ground truth: compiled from code, not copywriting ──────────────────────

const AI_ACT_FULL_APPLICATION = new Date('2026-08-02T00:00:00Z');

export function buildProductFacts(): string {
  const daysToDeadline = Math.max(
    0,
    Math.ceil((AI_ACT_FULL_APPLICATION.getTime() - Date.now()) / 86_400_000),
  );
  return [
    `- E-ARI is an enterprise AI-readiness and EU AI Act compliance platform (e-ari.com).`,
    `- Scoring is deterministic and versioned (${SCORING_VERSION}): the same 40 answers always produce the same score. No black box.`,
    `- Framework: EIGHT pillars — ${PILLARS.map((p) => p.name).join(', ')} — five Likert questions each, sector-weighted (9 sector profiles), with six documented cross-pillar interdependency rules.`,
    `- X-Ray engine: eight structural detectors find failure patterns in answer COMBINATIONS (e.g. Ambition Gap, Shadow IT Risk), each with evidence, business impact, and a concrete move.`,
    `- Leverage simulation: the pipeline re-runs with each answer improved one step and reports the EXACT overall-score gain per move, plus the shortest simulated path to the next maturity band.`,
    `- Continuous layer between assessments: Pulse (monthly re-checks), Shadow AI Discovery (SSO/expense-export scans for undeclared tools), Article 4 Literacy training (per-role quizzes, exportable roster), and a grounded Assistant.`,
    `- Compliance workspace: AI system registry, EU AI Act obligation mapping, evidence vault, FRIA and technical-file exports, vendor questionnaires.`,
    `- Reports: board-ready .docx with sector weighting, structural findings, and an owner/timeline/metric action table.`,
    `- EU AI Act timeline fact: full high-risk obligations apply from 2 August 2026 — ${daysToDeadline} days from today. Penalties reach €35M or 7% of global turnover.`,
    `- Maturity bands: Laggard, Follower, Chaser, Pacesetter. Certification tiers: Bronze → Platinum, each with published overall + per-pillar minimums.`,
    `- Tiers: Free, Professional, Growth, Autopilot, Enterprise.`,
  ].join('\n');
}

// ─── Topics the engine can write about honestly ─────────────────────────────

export const MARKETING_TOPICS: Record<string, { label: string; angle: string }> = {
  'aiact-deadline': {
    label: 'EU AI Act deadline',
    angle:
      'The countdown to 2 August 2026 (use the exact day count from the facts). What full high-risk application means, why waiting is the expensive option, how an assessment is the honest first step.',
  },
  methodology: {
    label: 'Methodology explainer',
    angle:
      'Why deterministic, versioned scoring matters: a defensible number vs. consultant vibes. Pick ONE concrete mechanism (interdependency rules, sector weighting, or the X-Ray detectors) and explain it plainly.',
  },
  leverage: {
    label: 'Leverage simulation',
    angle:
      'Most reports say "improve governance". E-ARI re-runs the entire scoring pipeline per possible improvement and tells you the exact points each one is worth. Explain why exactness changes boardroom conversations.',
  },
  'shadow-ai': {
    label: 'Shadow AI',
    angle:
      'Undeclared AI tools are the compliance gap nobody budgets for. How Discovery scans SSO and expense exports, and why finding tools yourself beats an auditor finding them.',
  },
  literacy: {
    label: 'Article 4 literacy',
    angle:
      'Article 4 makes AI literacy a duty, not a perk. What per-role training with an exportable roster looks like in practice.',
  },
  custom: {
    label: 'Custom brief',
    angle: 'Write from the admin-supplied brief, grounded in the product facts.',
  },
};

export type MarketingChannel = 'linkedin' | 'twitter' | 'newsletter';

export interface MarketingDraft {
  platform: MarketingChannel;
  content: string;
  category: string;
}

const SYSTEM_PROMPT = `You are the marketing writer for E-ARI, an EU AI Act compliance platform. You write for compliance officers, CTOs, and founders in the EU mid-market.

VOICE: calm, specific, confident. Plain sentences. One idea per post. No hype ("game-changer", "revolutionize"), at most one emoji per post and only if it earns its place, no exclamation marks, no rhetorical question openers.

HARD HONESTY RULES — a compliance company that lies in marketing is finished:
- Every factual claim must come from the PRODUCT FACTS block. Nothing else exists.
- NEVER invent: customer counts, testimonials, benchmark numbers, certifications earned, statistics, or "studies show".
- Regulation facts: only the AI Act dates/penalties given in the facts.
- If the brief asks for something the facts cannot support, write the nearest honest version.

FORMAT per channel:
- linkedin: 80–160 words, line breaks between thoughts, end with ONE call to action (a plain sentence + e-ari.com), then 3–4 hashtags on the final line.
- twitter: a thread of 2–4 numbered tweets, each ≤270 chars, first tweet must stand alone, last tweet carries the CTA + at most 2 hashtags.
- newsletter: subject line (≤60 chars) then a 120–200 word body in plain text, one CTA link sentence.

Return ONLY valid JSON: {"drafts":[{"platform":"linkedin|twitter|newsletter","content":"...","category":"<topic key>"}]}`;

export async function generateMarketingPack(
  topic: string,
  channels: MarketingChannel[],
  brief?: string,
): Promise<MarketingDraft[]> {
  const t = MARKETING_TOPICS[topic] ?? MARKETING_TOPICS['methodology'];
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY not configured — marketing generation requires the LLM backbone');
  }

  const userPrompt = `PRODUCT FACTS (the only permitted source of claims):
${buildProductFacts()}

TOPIC: ${t.label}
ANGLE: ${t.angle}
${brief ? `ADMIN BRIEF (follow it within the honesty rules): ${brief}` : ''}
CHANNELS TO WRITE: ${channels.join(', ')}

Write one draft per requested channel. Use category "${topic}".`;

  const res = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1800,
      temperature: 0.4,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty LLM response');

  const parsed = JSON.parse(content) as { drafts?: MarketingDraft[] };
  const valid: MarketingChannel[] = ['linkedin', 'twitter', 'newsletter'];
  const drafts = (parsed.drafts ?? []).filter(
    (d) => d && valid.includes(d.platform) && typeof d.content === 'string' && d.content.trim().length > 40,
  );
  if (drafts.length === 0) throw new Error('LLM returned no usable drafts');
  return drafts.map((d) => ({ ...d, category: topic }));
}
