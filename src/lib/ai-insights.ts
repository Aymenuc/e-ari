/**
 * E-ARI AI Insights Layer — v2.0
 *
 * Produces deep, contextual, organization-specific AI readiness insights by:
 * - Passing per-question answer detail to the LLM (not just pillar scores)
 * - Including sector-specific context, regulatory considerations, and language
 * - Using a long, prescriptive system prompt that demands specific, grounded analysis
 * - Providing an enriched rule-based fallback with question-level drilldown
 *
 * Guardrails (unchanged from v1):
 * - Grounding: LLM prompts include only user data and verified benchmark figures
 * - Safety: Refuses medical/legal advice; stays in organizational readiness domain
 * - Hallucination control: Prefers bullet lists with max length; cites pillar names and scores
 * - Privacy: Minimizes PII in prompts; no raw PII in logs
 * - Fallback: If LLM unavailable, shows template-based insights (deterministic strings)
 * - Labeling: UI clearly marks "AI-generated" vs "Calculated from your responses"
 */

import { PILLARS, getPillarById, LIKERT_LABELS, type PillarDefinition } from './pillars';
import { ScoringResult, generateTemplateInsights, type ResponseMap, type QuestionScoreDetail } from './assessment-engine';
import { getSectorById, getEffectivePillarQuestions, type SectorDefinition } from './sectors';
import { LLM_API_URL_PRO, LLM_MODEL_PRO, LLM_API_KEY, withRetry } from './llm-config';
import { complianceLLMChat } from '@/lib/compliance/llm';
import type { Citation } from '@/lib/compliance/defensibility';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PillarDrilldownItem {
  pillarId: string;
  pillarName: string;
  score: number;
  maturityLabel: string;
  strongestQuestions: Array<{ questionId: string; questionTopic: string; answer: number; answerLabel: string }>;
  weakestQuestions: Array<{ questionId: string; questionTopic: string; answer: number; answerLabel: string }>;
}

export interface AIInsightResult {
  executiveSummary: string;
  strengths: string[];
  gaps: string[];
  risks: string[];
  opportunities: string[];
  nextSteps: string[];
  pillarDrilldown: PillarDrilldownItem[];
  isAIGenerated: boolean;
  modelUsed?: string;
  promptVersion?: string;
  generatedAt: string;
}

const PROMPT_VERSION = '2.0.0';

// ─── Likert answer interpretation ──────────────────────────────────────────

function interpretLikert(answer: number): string {
  switch (answer) {
    case 1: return 'Strongly Disagree — no capability or practice in place';
    case 2: return 'Disagree — minimal or ad-hoc capability only';
    case 3: return 'Neutral — some capability exists but inconsistent or incomplete';
    case 4: return 'Agree — established capability with room for improvement';
    case 5: return 'Strongly Agree — mature, well-established practice';
    default: return 'Not answered';
  }
}

// ─── Sector-specific regulatory context ────────────────────────────────────

const SECTOR_REGULATORY_CONTEXT: Record<string, string> = {
  healthcare: `Healthcare organizations face stringent regulatory oversight for AI. Key frameworks include: HIPAA (patient data privacy), FDA guidance on AI/ML-based Software as a Medical Device (SaMD), EU MDR for medical devices, HITRUST for security, and emerging EU AI Act provisions for high-risk medical AI. Clinical AI must demonstrate safety and efficacy before deployment, and algorithmic transparency is increasingly mandated for diagnostic and treatment recommendation systems.`,
  finance: `Financial services AI operates under heavy regulatory scrutiny. Key frameworks include: SR 11-7 (model risk management), Basel III/IV (capital and risk), BCBS 239 (data risk aggregation), MiFID II (algorithmic trading transparency), Dodd-Frank, PCI DSS (payment data security), GDPR (data privacy with right to explanation), and the EU AI Act's high-risk classification for credit scoring and insurance pricing. Fair lending laws require demonstrable non-discrimination in AI-driven credit decisions.`,
  manufacturing: `Manufacturing AI is subject to industry-specific safety and operational standards. Key frameworks include: ISO 13849 (safety of machinery control systems), IEC 62443 (industrial cybersecurity), OSHA regulations for workplace safety, EPA environmental compliance, and sector-specific standards like AS9100 (aerospace) or IATF 16949 (automotive). AI in quality control and predictive maintenance must meet traceability requirements for regulated products.`,
  government: `Government AI adoption must comply with federal frameworks including: OMB Memo M-24-10 (advancing governance of AI), NIST AI Risk Management Framework, FedRAMP (cloud security), FISMA (information security), Section 508 (accessibility), and sector-specific mandates (DoD AI Ethical Principles, HIPAA for health agencies, FERPA for education). Procurement regulations and transparency requirements add complexity to AI acquisition and deployment.`,
  retail: `Retail AI must navigate consumer protection regulations including: CCPA/CPRA and GDPR (consumer data privacy), CAN-SPAM and CASL (marketing communications), PCI DSS (payment data), ADA/ACA (accessibility), FTC guidelines on AI-generated content and automated decision-making, and emerging state-level AI transparency laws. Personalization algorithms must avoid discriminatory pricing or product recommendations.`,
  education: `Education AI faces unique regulatory considerations: FERPA (student data privacy), COPPA (children's online privacy), ADA/Section 508 (accessibility), state-level student data protection laws, and emerging regulations on AI in assessment and admissions. Algorithmic fairness in student evaluation and admissions is under increasing scrutiny, and human oversight requirements for AI-driven academic decisions are tightening.`,
  energy: `Energy sector AI operates under: NERC CIP (critical infrastructure protection), IEC 62351 (power system security), NIST Cybersecurity Framework, DOE cybersecurity standards, EPA environmental monitoring requirements, and nuclear regulatory frameworks (NRC). AI in grid management and predictive maintenance for critical infrastructure requires rigorous validation, fail-safe design, and regulatory approval.`,
  technology: `Technology companies face: GDPR and CCPA/CPRA (data privacy), EU AI Act (especially for general-purpose AI models), DMA/DSA (platform regulation), SOC 2 (security compliance), ISO 27001 (information security), and increasing scrutiny of AI-generated content under copyright and deepfake regulations. Responsible AI practices are both a regulatory requirement and competitive differentiator.`,
  general: `Organizations should be aware of the EU AI Act (risk-based classification of AI systems), NIST AI Risk Management Framework, ISO/IEC 42001 (AI management systems), GDPR and CCPA/CPRA (data privacy), and emerging sector-specific AI regulations in their jurisdiction. Proactive alignment with these frameworks reduces legal risk and accelerates responsible AI deployment.`,
};

// ─── System Prompt ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior AI readiness analyst producing a board-ready assessment report. Your analysis must be specific, evidence-grounded, and actionable — never generic or superficial.

## YOUR ANALYTICAL METHODOLOGY

1. **Score-grounded interpretation**: Every claim must trace back to a specific question topic and its answer. Do not discuss a pillar generically — identify which specific capability within that pillar drives the score up or down.

2. **Causal reasoning**: When you identify a strength or gap, explain the "why." What specific practice, capability, or organizational condition produces this result? For example, do not say "Data is a gap." Say "Data governance scored at 20% because the organization lacks formal data lineage and ownership policies, meaning AI models would be trained on data of unknown provenance and quality."

3. **Cross-pillar dependency analysis**: Identify where weaknesses in one pillar create compounding risks in others. For instance, weak governance combined with strong technology deployment creates uncontrolled AI risk. Low data readiness undermines any strategy that assumes AI model reliability.

4. **Sector-aware interpretation**: Interpret scores through the lens of the organization's sector. A Data score of 35% means something very different for a healthcare organization (clinical data likely siloed across EHR systems, compromising diagnostic AI reliability) versus a technology company (data access issues likely organizational rather than structural).

5. **Consequence-oriented risk analysis**: Every risk must name a concrete consequence. Do not say "poses a risk." Say what happens — what breaks, who is affected, what the organizational impact is. For example: "Without data governance, AI models trained on inconsistent data will produce unreliable clinical recommendations, creating patient safety risk and FDA compliance exposure."

6. **Implementation-specific next steps**: Every next step must be specific enough that an executive could assign it to a team with a rough timeline. Include the "what," "who" (type of team/role), and "when" (rough timeframe). For example: "Establish a cross-functional AI governance board with CTO, CLO, and business unit leads — charter and first meeting within 60 days."

## MANDATORY RULES

- Every strength and gap MUST reference a specific question topic (not just the pillar name). Example: "Executive sponsorship of AI initiatives (Strategy Q2: score 4/5) provides the leadership mandate needed to..." NOT "Strategy is a key strength."
- Every risk MUST include a concrete consequence. Name what fails, who is affected, and the organizational impact.
- Every next step MUST include a specific action, responsible team/role type, and rough timeline (e.g., "within 90 days," "by end of quarter").
- You MUST interpret scores in the context of the organization's sector where one is provided.
- You MUST identify the top 2 strongest and weakest specific question topics within each pillar.

## BANNED PHRASES — Do NOT use any of these:

- "requires focused investment"
- "has potential for rapid improvement"
- "is a key strength"
- "poses a significant risk" (without naming the consequence)
- "should be prioritized" (without specifying what and when)
- "needs attention"
- "is an area of concern"
- "will be critical for success"
- "leverage AI capabilities"
- "harness the power of AI"
- "unlock value"
- "drive transformation"
- "embark on the AI journey"

These phrases are banned because they sound impressive but convey no specific information. Replace every banned phrase with a concrete, grounded statement.

## RESPONSE FORMAT

Respond with valid JSON only — no markdown, no commentary outside the JSON. Use this exact structure:

{
  "executiveSummary": "3-5 sentence overview that names the overall readiness level, identifies the single most impactful strength and the single most consequential gap, and states what the organization should do first and why. Must reference specific scores and sector context.",
  "strengths": [
    "Specific strength referencing a question topic — e.g., 'Executive championship of AI initiatives (Strategy Q2: 4/5) provides the leadership mandate to secure budget and remove organizational barriers, which is especially critical in [sector] where regulatory navigation requires C-suite authority.'",
    "...up to 5 items"
  ],
  "gaps": [
    "Specific gap referencing a question topic — e.g., 'Absence of formal data governance (Data Q3: 1/5) means there are no data lineage, ownership, or quality standards, so AI models would be trained on data of unknown provenance — in [sector] this directly creates [specific regulatory/safety/compliance risk].'",
    "...up to 5 items"
  ],
  "risks": [
    "Risk with concrete consequence — e.g., 'Without MLOps practices (Technology Q2: 2/5), deployed models will drift undetected. In [sector], a degraded fraud detection model could [specific consequence], resulting in [specific impact].'",
    "...up to 4 items"
  ],
  "opportunities": [
    "Specific opportunity tied to existing capability — e.g., 'Strong executive sponsorship (Strategy Q2: 4/5) combined with the sector's accelerating AI adoption creates an opening to [specific initiative] within [timeframe], which would [specific outcome].'",
    "...up to 5 items"
  ],
  "nextSteps": [
    "Specific action with responsible party and timeline — e.g., 'Appoint an AI Governance Lead and charter a cross-functional AI board (CTO, CLO, business unit heads) within 60 days to establish accountability structures before scaling AI deployments.'",
    "...up to 6 items"
  ],
  "pillarDrilldown": [
    {
      "pillarId": "strategy",
      "pillarName": "Strategy & Vision",
      "score": 45,
      "maturityLabel": "Follower",
      "strongestQuestions": [
        {"questionId": "strategy_2", "questionTopic": "Executive championship of AI initiatives", "answer": 4, "answerLabel": "Agree"},
        {"questionId": "strategy_1", "questionTopic": "Documented AI strategy", "answer": 3, "answerLabel": "Neutral"}
      ],
      "weakestQuestions": [
        {"questionId": "strategy_5", "questionTopic": "ROI measurement of AI initiatives", "answer": 1, "answerLabel": "Strongly Disagree"},
        {"questionId": "strategy_4", "questionTopic": "Multi-year AI investment roadmap", "answer": 2, "answerLabel": "Disagree"}
      ]
    }
  ]
}`;

// ─── User Prompt Builder ──────────────────────────────────────────────────

/**
 * Build the enriched user prompt with per-question detail and sector context.
 */
function buildInsightPrompt(
  result: ScoringResult,
  orgContext?: { sector?: string; orgSize?: string; organization?: string },
  responses?: ResponseMap
): string {
  const sector = orgContext?.sector ? getSectorById(orgContext.sector) : undefined;

  // ── Sector Context Section ──
  const sectorSection = sector
    ? `
## ORGANIZATION SECTOR: ${sector.name}
${sector.description}
Key sector concerns: ${sector.highlights.join('; ')}
Regulatory context: ${SECTOR_REGULATORY_CONTEXT[sector.id] || SECTOR_REGULATORY_CONTEXT['general']}
`
    : orgContext?.sector
      ? `
## ORGANIZATION SECTOR: ${orgContext.sector}
Regulatory context: ${SECTOR_REGULATORY_CONTEXT[orgContext.sector] || SECTOR_REGULATORY_CONTEXT['general']}
`
      : `
## ORGANIZATION SECTOR: General / Not specified
Regulatory context: ${SECTOR_REGULATORY_CONTEXT['general']}
`;

  // ── Organization Context ──
  const orgInfo = orgContext
    ? `Organization: ${orgContext.organization || 'Not specified'} | Size: ${orgContext.orgSize || 'Not specified'}`
    : 'Organization: Not specified';

  // ── Per-Pillar Detail with Question Breakdown ──
  const pillarDetails = result.pillarScores.map(pillarResult => {
    const pillarDef = getPillarById(pillarResult.pillarId);
    if (!pillarDef) return '';

    // Get sector-specific question text if sector is provided
    const effectiveQuestions = sector
      ? getEffectivePillarQuestions(sector.id, pillarResult.pillarId)
      : pillarDef.questions;

    // Build per-question detail
    const questionLines = pillarResult.questionDetails.map((qd, idx) => {
      const questionDef = effectiveQuestions[idx];
      const questionText = questionDef?.text || pillarDef.questions[idx]?.text || 'Unknown question';
      const answerLabel = LIKERT_LABELS[qd.answer] || 'Unknown';
      const interpretation = interpretLikert(qd.answer);

      return `  Q${idx + 1} (${qd.questionId}): "${questionText}"
    → Answer: ${qd.answer}/5 (${answerLabel}) — ${interpretation}`;
    }).join('\n');

    const adjustments = pillarResult.adjustments.length > 0
      ? `\n  [Adjustments applied: ${pillarResult.adjustments.map(a => a.description).join('; ')}]`
      : '';

    return `
### ${pillarResult.pillarName} — Score: ${Math.round(pillarResult.normalizedScore)}% (${pillarResult.maturityLabel})${adjustments}
${questionLines}`;
  }).join('\n');

  // ── Critical Failures ──
  const criticalFailures = result.criticalPillarFailures.length > 0
    ? `\n## CRITICAL PILLAR FAILURES\n${result.criticalPillarFailures.map(pid => {
        const p = getPillarById(pid);
        return `- ${p?.name || pid}: Score below 15% — fundamental readiness is absent`;
      }).join('\n')}`
    : '';

  // ── Interdependency Adjustments ──
  const adjustments = result.adjustments.length > 0
    ? `\n## INTERDEPENDENCY ADJUSTMENTS APPLIED\n${result.adjustments.map(a =>
        `- ${a.description} (Impact: ${a.pillarAffected} score adjusted from ${Math.round(a.originalScore)}% to ${Math.round(a.adjustedScore)}%)`
      ).join('\n')}`
    : '';

  // ── X-Ray Findings (structural patterns from response combinations) ──
  // These are the highest-signal context. The insight agent must reflect
  // them in its strengths/gaps/risks rather than producing generic prose.
  const xRayBlock = result.xRayFindings && result.xRayFindings.length > 0
    ? `\n## X-RAY FINDINGS — STRUCTURAL PATTERNS DETECTED\n${result.xRayFindings.map(f =>
        `- [${f.id} · ${f.severity.toUpperCase()}] ${f.title}\n  Headline: ${f.headline}\n  Evidence: ${f.evidence.map(e => `${e.questionId}=${e.answer}/5`).join(', ')}\n  Business impact: ${f.businessImpact}\n  Recommended move: ${f.recommendation}`
      ).join('\n')}\n\nThese findings are the most important context in this report. Every \`risks\` and \`nextSteps\` item you produce should map back to one of these patterns where applicable. Do NOT invent risks that aren't grounded here.`
    : '';

  // ── Sector Weighting Application ──
  const sectorWeightingBlock = result.sectorWeighting
    ? `\n## SECTOR WEIGHTING APPLIED — ${result.sectorWeighting.sector}\nRationale: ${result.sectorWeighting.rationale}\nThis means in this organisation's sector, ${result.sectorWeighting.pillars.filter(p => p.multiplier >= 1.15).map(p => `${p.pillarId} (×${p.multiplier})`).join(', ') || 'no pillars'} count more toward the overall score, and ${result.sectorWeighting.pillars.filter(p => p.multiplier <= 0.9).map(p => `${p.pillarId} (×${p.multiplier})`).join(', ') || 'no pillars'} count less. Reflect this in your sector-aware narrative.${typeof result.baselineOverallScore === 'number' && Math.abs(result.overallScore - result.baselineOverallScore) >= 1 ? `\nBaseline (unweighted) overall: ${Math.round(result.baselineOverallScore)}% → Sector-weighted overall: ${Math.round(result.overallScore)}%.` : ''}`
    : '';

  // ── Score Summary Table ──
  const scoreSummary = result.pillarScores.map(p =>
    `${p.pillarName}: ${Math.round(p.normalizedScore)}% (${p.maturityLabel})`
  ).join(' | ');

  return `
## ASSESSMENT DATA

Overall Score: ${Math.round(result.overallScore)}% (${result.maturityLabel})
${orgInfo}
Pillar Summary: ${scoreSummary}

${sectorSection}

## DETAILED QUESTION-BY-QUESTION RESULTS
${pillarDetails}
${criticalFailures}${adjustments}${xRayBlock}${sectorWeightingBlock}

---

Based on the assessment data above, produce your analysis following the methodology and rules defined in your instructions. Remember:
- Reference specific question topics, not just pillar names
- Explain the "why" behind every strength and gap
- Name concrete consequences for every risk
- Include specific actions with responsible parties and timelines for every next step
- Interpret scores through the sector lens where applicable
- Where X-Ray findings are surfaced, your risks and nextSteps must reflect them — these are the patterns that distinguish this organisation from a generic peer at the same score
- Identify the top 2 strongest and weakest questions within each pillar for pillarDrilldown

Respond with valid JSON only.`;
}

// ─── Fallback Helpers ──────────────────────────────────────────────────────

/**
 * Build pillar drilldown from scoring results and (optionally) response map.
 */
function buildPillarDrilldown(
  result: ScoringResult,
  sectorId?: string
): PillarDrilldownItem[] {
  return result.pillarScores.map(pillarResult => {
    const pillarDef = getPillarById(pillarResult.pillarId);
    const effectiveQuestions = sectorId
      ? getEffectivePillarQuestions(sectorId, pillarResult.pillarId)
      : pillarDef?.questions || [];

    // Sort question details by answer (ascending for weakest, descending for strongest)
    const sorted = [...pillarResult.questionDetails].sort((a, b) => a.answer - b.answer);
    const weakest = sorted.slice(0, 2);
    const strongest = sorted.slice(-2).reverse(); // top 2, highest first

    const makeQItem = (qd: QuestionScoreDetail) => {
      const idx = pillarResult.questionDetails.indexOf(qd);
      const questionDef = effectiveQuestions[idx];
      const baseQuestion = pillarDef?.questions[idx];
      return {
        questionId: qd.questionId,
        questionTopic: questionDef?.text || baseQuestion?.text || 'Unknown question',
        answer: qd.answer,
        answerLabel: LIKERT_LABELS[qd.answer] || 'Unknown',
      };
    };

    return {
      pillarId: pillarResult.pillarId,
      pillarName: pillarResult.pillarName,
      score: Math.round(pillarResult.normalizedScore),
      maturityLabel: pillarResult.maturityLabel,
      strongestQuestions: strongest.map(makeQItem),
      weakestQuestions: weakest.map(makeQItem),
    };
  });
}

/**
 * Sector-aware pillar interpretation for fallback.
 */
function getPillarFallbackStrength(
  pillarId: string,
  score: number,
  topQuestions: QuestionScoreDetail[],
  sectorId?: string
): string {
  const pillarDef = getPillarById(pillarId);
  const pillarName = pillarDef?.shortName || pillarId;
  const sector = sectorId ? getSectorById(sectorId) : undefined;

  if (score >= 75) {
    const topQ = topQuestions[0];
    if (topQ) {
      const topQLabel = LIKERT_LABELS[topQ.answer] || '';
      return `${pillarName} scores at ${score}% with mature practices — particularly strong in ${getQuestionTopicShort(pillarId, topQ.questionId, sectorId)} (${topQ.answer}/5, ${topQLabel}), indicating well-established capabilities that provide a reliable foundation for AI advancement${sector ? ` in the ${sector.shortName} sector` : ''}.`;
    }
    return `${pillarName} at ${score}% reflects comprehensive, mature practices across all dimensions, positioning the organization to lead on AI initiatives${sector ? ` in ${sector.shortName}` : ''}.`;
  }

  if (score >= 50) {
    const topQ = topQuestions[0];
    if (topQ) {
      return `${pillarName} at ${score}% shows established capability in ${getQuestionTopicShort(pillarId, topQ.questionId, sectorId)} (${topQ.answer}/5), though not all dimensions are equally mature — some areas need reinforcement to reach full readiness.`;
    }
    return `${pillarName} at ${score}% demonstrates developing readiness with solid foundations in place, but inconsistency across dimensions limits the organization's ability to scale AI confidently.`;
  }

  // Low scores are gaps, not strengths
  return '';
}

function getPillarFallbackGap(
  pillarId: string,
  score: number,
  bottomQuestions: QuestionScoreDetail[],
  sectorId?: string
): string {
  const pillarDef = getPillarById(pillarId);
  const pillarName = pillarDef?.shortName || pillarId;
  const sector = sectorId ? getSectorById(sectorId) : undefined;
  const sectorContext = sector ? ` in ${sector.shortName}` : '';

  if (score >= 50) return ''; // Not a gap at this level

  const bottomQ = bottomQuestions[0];
  if (bottomQ) {
    const topic = getQuestionTopicShort(pillarId, bottomQ.questionId, sectorId);
    if (score < 25) {
      return `${pillarName} at ${score}% is critically underdeveloped${sectorContext}. The weakest area — ${topic} (${bottomQ.answer}/5) — indicates near-total absence of capability, which blocks any meaningful AI deployment in this dimension and creates downstream risk for dependent pillars.`;
    }
    return `${pillarName} at ${score}% lacks foundational readiness${sectorContext}. The lowest-scoring area — ${topic} (${bottomQ.answer}/5) — means the organization operates without a critical building block, so any AI initiative depending on this capability will underdeliver or fail.`;
  }

  if (score < 25) {
    return `${pillarName} at ${score}% is critically underdeveloped${sectorContext}, posing a fundamental barrier to AI adoption that will compound as other pillars advance.`;
  }
  return `${pillarName} at ${score}% falls below the threshold for foundational readiness${sectorContext}, meaning AI initiatives in this area lack the organizational support needed to succeed.`;
}

/**
 * Get a short topic description from a question ID for fallback language.
 */
function getQuestionTopicShort(pillarId: string, questionId: string, sectorId?: string): string {
  const pillarDef = getPillarById(pillarId);
  if (!pillarDef) return questionId;

  const qIdx = pillarDef.questions.findIndex(q => q.id === questionId);
  if (qIdx < 0) return questionId;

  // Use sector-specific question text if available
  const effectiveQuestions = sectorId
    ? getEffectivePillarQuestions(sectorId, pillarId)
    : pillarDef.questions;

  const question = effectiveQuestions[qIdx] || pillarDef.questions[qIdx];
  if (!question) return questionId;

  // Extract a short topic from the question text (first clause or phrase)
  const text = question.text;
  // Try to extract the core topic from the question
  const match = text.match(/^(?:Does|To what extent|How)\s+(?:your\s+organization\s+)?(?:have|does|is|can|effectively|well|strongly|mature|receptive|prepared|established)?\s*(.+?)[\?\.]/i);
  if (match?.[1]) {
    return match[1].trim().toLowerCase();
  }
  // Fallback: truncate at first comma or 60 chars
  const commaIdx = text.indexOf(',');
  if (commaIdx > 10 && commaIdx < 80) {
    return text.substring(0, commaIdx).toLowerCase();
  }
  return text.length > 60 ? text.substring(0, 57).toLowerCase() + '...' : text.toLowerCase();
}

// ─── Main AI Insights Generator ────────────────────────────────────────────

/**
 * Generate AI-powered insights using the LLM.
 * Falls back to deterministic template insights if the LLM is unavailable.
 */
export async function generateAIInsights(
  result: ScoringResult,
  orgContext?: { sector?: string; orgSize?: string; organization?: string },
  responses?: ResponseMap
): Promise<AIInsightResult> {
  const timestamp = new Date().toISOString();
  const sectorId = orgContext?.sector;

  // Build drilldown regardless of LLM availability (used in both paths)
  const pillarDrilldown = buildPillarDrilldown(result, sectorId);

  try {
    const prompt = buildInsightPrompt(result, orgContext, responses);

    const { content } = await withRetry(async () => {
      const response = await fetch(
        LLM_API_URL_PRO,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LLM_API_KEY}`,
          },
          body: JSON.stringify({
            model: LLM_MODEL_PRO,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: prompt },
            ],
            max_tokens: 3000,
            temperature: 0.2,
          }),
          signal: AbortSignal.timeout(90000),
        }
      );
      if (!response.ok) {
        const errText = await response.text();
        console.error('[ai-insights] LLM API error:', response.status, errText);
        throw new Error(`LLM service error: ${response.status}`);
      }
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty LLM response');
      return { content };
    }, { maxAttempts: 3, baseDelayMs: 3000 });

    // Parse the JSON response from the LLM
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr);

    // Validate the response has expected fields
    if (!parsed.executiveSummary || !Array.isArray(parsed.strengths)) {
      throw new Error('Invalid LLM response structure');
    }

    // Parse pillarDrilldown from LLM response, or fall back to computed
    let llmDrilldown = pillarDrilldown;
    if (Array.isArray(parsed.pillarDrilldown) && parsed.pillarDrilldown.length > 0) {
      llmDrilldown = parsed.pillarDrilldown.map((pd: Record<string, unknown>) => ({
        pillarId: (pd.pillarId as string) || '',
        pillarName: (pd.pillarName as string) || '',
        score: typeof pd.score === 'number' ? pd.score : 0,
        maturityLabel: (pd.maturityLabel as string) || '',
        strongestQuestions: Array.isArray(pd.strongestQuestions)
          ? (pd.strongestQuestions as Array<Record<string, unknown>>).map(sq => ({
              questionId: (sq.questionId as string) || '',
              questionTopic: (sq.questionTopic as string) || '',
              answer: typeof sq.answer === 'number' ? sq.answer : 0,
              answerLabel: (sq.answerLabel as string) || '',
            }))
          : [],
        weakestQuestions: Array.isArray(pd.weakestQuestions)
          ? (pd.weakestQuestions as Array<Record<string, unknown>>).map(wq => ({
              questionId: (wq.questionId as string) || '',
              questionTopic: (wq.questionTopic as string) || '',
              answer: typeof wq.answer === 'number' ? wq.answer : 0,
              answerLabel: (wq.answerLabel as string) || '',
            }))
          : [],
      }));
    }

    return {
      executiveSummary: parsed.executiveSummary || '',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : [],
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps.slice(0, 5) : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks.slice(0, 4) : [],
      opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities.slice(0, 5) : [],
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.slice(0, 6) : [],
      pillarDrilldown: llmDrilldown,
      isAIGenerated: true,
      modelUsed: 'GLM-5.1',
      promptVersion: PROMPT_VERSION,
      generatedAt: timestamp,
    };
  } catch (error) {
    // Fallback to deterministic template insights
    console.error('LLM unavailable, falling back to template insights:', error);
    return generateFallbackInsights(result, orgContext, timestamp);
  }
}

// ─── Fallback Template Insights ────────────────────────────────────────────

/**
 * Generate rich, rule-based fallback insights when the LLM is unavailable.
 * Much more specific than v1 — uses per-question detail and sector context.
 */
function generateFallbackInsights(
  result: ScoringResult,
  orgContext?: { sector?: string; orgSize?: string; organization?: string },
  timestamp?: string
): AIInsightResult {
  const sectorId = orgContext?.sector;
  const sector = sectorId ? getSectorById(sectorId) : undefined;
  const sectorName = sector?.shortName || '';
  const pillarDrilldown = buildPillarDrilldown(result, sectorId);

  const strengths: string[] = [];
  const gaps: string[] = [];
  const risks: string[] = [];
  const opportunities: string[] = [];
  const nextSteps: string[] = [];

  // ── Per-pillar analysis with question-level detail ──
  for (const pillarResult of result.pillarScores) {
    const score = Math.round(pillarResult.normalizedScore);
    const sorted = [...pillarResult.questionDetails].sort((a, b) => a.answer - b.answer);
    const weakest = sorted.slice(0, 2);
    const strongest = sorted.slice(-2).reverse();

    // Strengths
    const strengthText = getPillarFallbackStrength(pillarResult.pillarId, score, strongest, sectorId);
    if (strengthText) strengths.push(strengthText);

    // Gaps
    const gapText = getPillarFallbackGap(pillarResult.pillarId, score, weakest, sectorId);
    if (gapText) gaps.push(gapText);
  }

  // ── Cross-pillar risks ──
  for (const adj of result.adjustments) {
    if (adj.type === 'RULE_1') {
      risks.push(`Governance deficit (below 30%) has capped Technology at 70% of its computed score — deploying AI tools without governance oversight means there is no accountability framework for AI decisions${sectorName ? `, which in ${sectorName} could result in regulatory non-compliance` : ''}.`);
    } else if (adj.type === 'RULE_2') {
      risks.push(`Data infrastructure deficit (below 30%) has reduced Strategy scoring by 15% — AI strategies built without adequate data infrastructure are aspirational rather than actionable${sectorName ? `; in ${sectorName}, this means planned AI use cases cannot be reliably executed` : ''}.`);
    } else {
      risks.push(`Adjustment applied: ${adj.description}`);
    }
  }

  // Critical pillar failures
  for (const pillarId of result.criticalPillarFailures) {
    const pillar = getPillarById(pillarId);
    if (pillar) {
      risks.push(`${pillar.name} scored below 15% — this is a critical failure indicating near-total absence of capability. Any AI initiative requiring ${pillar.shortName.toLowerCase()} will be blocked until foundational elements are established${sectorName ? `; in ${sectorName}, this also creates regulatory exposure` : ''}.`);
    }
  }

  // Compounding risk: low governance + high technology
  const govScore = result.pillarScores.find(p => p.pillarId === 'governance')?.normalizedScore ?? 0;
  const techScore = result.pillarScores.find(p => p.pillarId === 'technology')?.normalizedScore ?? 0;
  if (govScore < 40 && techScore > 50) {
    risks.push(`Technology readiness (${Math.round(techScore)}%) outpaces governance (${Math.round(govScore)}%), creating uncontrolled AI deployment risk${sectorName ? ` — in ${sectorName}, this imbalance could attract regulatory scrutiny` : ''}. Models may be deployed without bias testing, transparency requirements, or incident response protocols.`);
  }

  // Compounding risk: low data + high strategy
  const dataScore = result.pillarScores.find(p => p.pillarId === 'data')?.normalizedScore ?? 0;
  const stratScore = result.pillarScores.find(p => p.pillarId === 'strategy')?.normalizedScore ?? 0;
  if (dataScore < 40 && stratScore > 50) {
    risks.push(`AI strategy (${Math.round(stratScore)}%) is being formulated without commensurate data readiness (${Math.round(dataScore)}%). Strategic plans will fail at execution because the data infrastructure needed to train and operate AI models is not in place.`);
  }

  // ── Opportunities based on mid-range pillars ──
  const midRangePillars = result.pillarScores.filter(p => p.normalizedScore >= 40 && p.normalizedScore < 70);
  for (const p of midRangePillars.slice(0, 3)) {
    const sorted = [...p.questionDetails].sort((a, b) => b.answer - a.answer);
    const topQ = sorted[0];
    if (topQ) {
      const topic = getQuestionTopicShort(p.pillarId, topQ.questionId, sectorId);
      opportunities.push(`${p.pillarName} at ${Math.round(p.normalizedScore)}% has a strong foundation in ${topic} (${topQ.answer}/5) — targeting the weaker dimensions within this pillar could raise overall readiness significantly within 6-12 months${sectorName ? `, particularly important in ${sectorName} where this capability is increasingly expected` : ''}.`);
    } else {
      opportunities.push(`${p.pillarName} at ${Math.round(p.normalizedScore)}% is positioned for accelerated improvement — focused effort on the lowest-scoring dimensions could yield measurable gains within two quarters.`);
    }
  }

  // ── Next steps based on maturity band ──
  if (result.overallScore <= 25) {
    nextSteps.push(`Appoint an AI readiness lead and assemble a cross-functional working group (IT, data, compliance, business) within 30 days to begin addressing critical capability gaps.`);
    nextSteps.push(`Commission a data infrastructure audit within 60 days — identify where data silos exist, what quality issues block AI use cases, and what governance policies must be established first.`);
    nextSteps.push(`Develop a minimal viable AI governance framework covering model accountability, bias testing requirements, and incident escalation within 90 days${sectorName ? `; align with ${sectorName} regulatory requirements from the start` : ''}.`);
    nextSteps.push(`Launch AI literacy workshops for leadership and key business functions within 60 days to build the organizational understanding needed to support AI initiatives.`);
  } else if (result.overallScore <= 50) {
    nextSteps.push(`Prioritize 2-3 high-value, low-complexity AI use cases for production deployment within 90 days — use these to demonstrate ROI and build organizational confidence before scaling.`);
    nextSteps.push(`Establish formal data governance with assigned data owners, quality standards, and lineage tracking within 120 days — this is the prerequisite for reliable AI at scale.`);
    nextSteps.push(`Implement MLOps basics (model versioning, performance monitoring, automated retraining triggers) within 180 days to transition from experimental to production-grade AI.`);
    nextSteps.push(`Create an AI center of excellence or community of practice within 90 days to propagate lessons learned and standardize best practices across teams.`);
  } else if (result.overallScore <= 75) {
    nextSteps.push(`Scale proven AI use cases across business units within 6 months — establish shared infrastructure, reusable model components, and cross-team governance to accelerate deployment.`);
    nextSteps.push(`Develop advanced talent acquisition and retention strategies within 90 days — create specialized career paths for AI roles and invest in upskilling programs for existing staff.`);
    nextSteps.push(`Strengthen governance from compliance-focused to value-creating within 6 months — implement proactive bias monitoring, model explainability dashboards, and stakeholder transparency reporting.`);
    nextSteps.push(`Establish AI performance benchmarking against industry peers and sector leaders within 90 days to identify remaining competitive gaps.`);
  } else {
    nextSteps.push(`Lead sector AI standards development and contribute to industry governance frameworks — position the organization as a trusted voice in ${sectorName || 'your sector'} AI policy.`);
    nextSteps.push(`Explore frontier AI capabilities (autonomous systems, advanced generative AI, causal reasoning models) with dedicated R&D investment — evaluate within 6 months for strategic fit.`);
    nextSteps.push(`Continuously monitor and adapt AI strategy to emerging regulations and technological shifts — establish quarterly AI strategy reviews with executive leadership.`);
    nextSteps.push(`Mentor ecosystem partners and supply chain on AI readiness — extend your governance practices to create an AI-ready business network.`);
  }

  // Ensure we have at least some content
  if (strengths.length === 0) strengths.push('No pillars currently score above the developing threshold; the priority is establishing foundational capabilities before pursuing advanced AI use cases.');
  if (gaps.length === 0) gaps.push('No critical gaps identified at the pillar level — maintain current trajectory and focus on advancing from developing to advanced readiness across all dimensions.');
  if (risks.length === 0) risks.push('No immediate structural risks detected from the scoring adjustments; continue monitoring for emerging regulatory requirements and data quality degradation as AI initiatives scale.');
  if (opportunities.length === 0) opportunities.push('With all pillars at consistent readiness levels, the opportunity lies in cross-pillar integration — connecting strategy, data, and governance into a unified operating model for AI.');
  if (nextSteps.length === 0) nextSteps.push('Begin with a comprehensive AI readiness baseline assessment to establish measurable improvement targets.');

  // Executive summary
  const topPillar = [...result.pillarScores].sort((a, b) => b.normalizedScore - a.normalizedScore)[0];
  const bottomPillar = [...result.pillarScores].sort((a, b) => a.normalizedScore - b.normalizedScore)[0];
  const sectorPrefix = sectorName ? `As a ${sectorName} organization, ` : '';

  const executiveSummary = `${sectorPrefix}your organization's AI readiness stands at ${Math.round(result.overallScore)}% (${result.maturityLabel}). The strongest dimension is ${topPillar.pillarName} at ${Math.round(topPillar.normalizedScore)}%, driven by ${getQuestionTopicShort(topPillar.pillarId, [...topPillar.questionDetails].sort((a, b) => b.answer - a.answer)[0]?.questionId || '', sectorId)}. The most consequential gap is ${bottomPillar.pillarName} at ${Math.round(bottomPillar.normalizedScore)}%, where ${getQuestionTopicShort(bottomPillar.pillarId, [...bottomPillar.questionDetails].sort((a, b) => a.answer - b.answer)[0]?.questionId || '', sectorId)} is the weakest link. The first priority should be addressing ${bottomPillar.pillarName.toLowerCase()} fundamentals before scaling AI initiatives that depend on this capability.`;

  return {
    executiveSummary,
    strengths,
    gaps,
    risks,
    opportunities,
    nextSteps,
    pillarDrilldown,
    isAIGenerated: false,
    promptVersion: PROMPT_VERSION,
    generatedAt: timestamp || new Date().toISOString(),
  };
}

/**
 * Generate insights synchronously using template rules (no LLM call).
 * Used as a guaranteed fallback and for testing.
 */
export function generateTemplateInsightsSync(
  result: ScoringResult,
  orgContext?: { sector?: string; orgSize?: string; organization?: string }
): AIInsightResult {
  return generateFallbackInsights(result, orgContext);
}

/** Context bundle for optional compliance-aware pillar narratives (scores unchanged). */
export type AssessmentInsightContext = {
  sector?: string;
  orgSize?: string;
  organization?: string;
};

/**
 * Single-pillar narrative; when citations are provided, the model anchors wording to vault evidence counts only (no score changes).
 */
export async function generatePillarInsight(
  pillarId: string,
  pillarScore: number,
  context: AssessmentInsightContext,
  evidenceCitations?: Citation[],
): Promise<string> {
  const pillarDef = getPillarById(pillarId);
  const pillarName = pillarDef?.name ?? pillarId;
  const sector = context.sector ? getSectorById(context.sector) : undefined;

  const citationLines =
    evidenceCitations?.slice(0, 12).map(
      (c) =>
        `- ${c.evidenceFilename}${c.pageNumber != null ? ` p.${c.pageNumber}` : ''}: "${c.textExcerpt.slice(0, 160)}${c.textExcerpt.length > 160 ? '…' : ''}"`,
    ) ?? [];

  const citeBlock =
    citationLines.length > 0
      ? `\nEvidence excerpts (do not contradict; summarize coverage):\n${citationLines.join('\n')}`
      : '';

  const sys = `You write one short pillar readiness narrative for executives.
Rules: no legal advice; tie language to the score and sector context; if evidence excerpts are listed, mention they support this pillar across uploaded documents (give approximate counts).
Max 120 words; plain sentences; no banned hype. Temperature discipline: be precise.`;

  const user = `Pillar: ${pillarName} (${pillarId})
Normalized score: ${Math.round(pillarScore)}%
Sector: ${sector?.shortName ?? context.sector ?? 'general'}
Organization hint: ${context.organization ?? 'n/a'}
${citeBlock}`;

  try {
    const raw = await complianceLLMChat(sys, user, { maxTokens: 512, operation: 'pillar_insight' });
    return raw.trim().slice(0, 2500);
  } catch {
    const base = `${pillarName} is at ${Math.round(pillarScore)}% readiness${sector ? ` for ${sector.shortName}` : ''}.`;
    if (evidenceCitations?.length) {
      return `${base} Uploaded compliance evidence includes ${evidenceCitations.length} clause excerpt(s) mapped to this pillar — review the vault for citations.`;
    }
    return base;
  }
}
