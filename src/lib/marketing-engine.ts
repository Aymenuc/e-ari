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
import { milestone, daysUntil, formatMilestoneDate } from './ai-act-timeline';

// ─── Ground truth: compiled from code, not copywriting ──────────────────────

export function buildProductFacts(): string {
  const highRisk = milestone('high-risk-annex-iii')!;
  const annexI = milestone('high-risk-annex-i')!;
  const daysToHighRisk = Math.max(0, daysUntil(highRisk));
  return [
    `- E-ARI is an enterprise AI-readiness and EU AI Act compliance platform (e-ari.com).`,
    `- Scoring is deterministic and versioned (${SCORING_VERSION}): the same 40 answers always produce the same score. No black box.`,
    `- Framework: EIGHT pillars — ${PILLARS.map((p) => p.name).join(', ')} — five Likert questions each, sector-weighted (9 sector profiles), with six documented cross-pillar interdependency rules.`,
    `- X-Ray engine: eight structural detectors find failure patterns in answer COMBINATIONS (e.g. Ambition Gap, Shadow IT Risk), each with evidence, business impact, and a concrete move.`,
    `- Leverage simulation: the pipeline re-runs with each answer improved one step and reports the EXACT overall-score gain per move, plus the shortest simulated path to the next maturity band.`,
    `- Continuous layer between assessments: Pulse (monthly re-checks), Shadow AI Discovery (SSO/expense-export scans for undeclared tools), Article 4 Literacy training (per-role quizzes, exportable roster), and a grounded Assistant.`,
    `- Compliance workspace: AI system registry, EU AI Act obligation mapping, evidence vault, FRIA and technical-file exports, vendor questionnaires.`,
    `- Reports: board-ready .docx with sector weighting, structural findings, and an owner/timeline/metric action table.`,
    // The dates are the fact the model most needs to get right, and it was
    // being handed a superseded one. Both halves are stated so it cannot
    // manufacture a countdown to a deadline that moved.
    `- EU AI Act timeline fact: the Digital Omnibus (in force, amending Regulation (EU) 2024/1689) DEFERRED high-risk obligations. Standalone Annex III high-risk applies from ${formatMilestoneDate(highRisk)} (${daysToHighRisk} days from today); AI embedded in regulated products from ${formatMilestoneDate(annexI)}. NEVER state that high-risk obligations apply from 2 August 2026 — that date was superseded.`,
    `- EU AI Act timeline fact: what binds an organisation TODAY regardless of classification is the Article 4 AI literacy duty, and from 2 August 2026 the Article 50 transparency duties. Both were deliberately left unchanged by the Omnibus. Two further Article 5 prohibitions (non-consensual intimate imagery; child sexual abuse material) apply from 2 December 2026.`,
    `- EU AI Act penalty fact: high-risk non-compliance reaches EUR 15M or 3% of global turnover (Art. 99(4)); the EUR 35M / 7% ceiling applies only to prohibited practices under Art. 5. Never conflate the two.`,
    `- Maturity bands: Laggard, Follower, Chaser, Pacesetter. Certification tiers: Bronze → Platinum, each with published overall + per-pillar minimums.`,
    `- Tiers: Free, Professional, Growth, Autopilot, Enterprise.`,
  ].join('\n');
}

// ─── Topics the engine can write about honestly ─────────────────────────────

export const MARKETING_TOPICS: Record<string, { label: string; angle: string }> = {
  'aiact-deadline': {
    label: 'EU AI Act timeline',
    angle:
      'What actually binds an organisation today (Article 4 literacy, Article 50 transparency) versus what was deferred to December 2027 and August 2028 by the Digital Omnibus. Use the exact dates from the facts. The honest angle is that the deferral bought time to build evidence, not permission to wait — the controls take longer to stand up than to describe.',
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
