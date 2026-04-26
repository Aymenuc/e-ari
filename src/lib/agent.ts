/**
 * E-ARI Agentic Optimization & Support Service
 *
 * Provides AI-powered assistance during and after the assessment.
 * Uses z-ai-web-dev-sdk's LLM capabilities to deliver contextual,
 * actionable guidance grounded in the E-ARI 8-pillar framework.
 *
 * Guardrails:
 * - All responses reference specific pillar names and scores
 * - Never provides legal or medical advice
 * - Stays in the organizational AI readiness domain
 * - All AI-generated content is clearly labeled
 * - Graceful fallback responses when LLM is unavailable
 * - Responses are concise and board-ready
 *
 * This module runs server-side only.
 */

import { PILLARS, getPillarById, MATURITY_BANDS, type MaturityBand } from './pillars';
import { LLM_API_URL_PRO, LLM_MODEL_PRO } from './llm-config';
import { getSectorById } from './sectors';

// ─── Types ──────────────────────────────────────────────────────────────────

/** The type of agent interaction being requested */
type AgentAction =
  | 'question_help'        // Help interpreting/answering a specific assessment question
  | 'pillar_optimization'  // Suggest optimizations for a specific pillar
  | 'context_insight'      // Generate insights from scraped org context
  | 'recommendation'       // Post-assessment strategic recommendation
  | 'benchmark'            // Compare org against sector benchmarks
  | 'roadmap'              // Generate an AI adoption roadmap
  | 'discovery_interview'; // Conversational stakeholder interview for qualitative insights

/** Request structure for agent interactions */
interface AgentRequest {
  action: AgentAction;
  /** For question_help */
  pillarId?: string;
  questionId?: string;
  questionText?: string;
  /** For pillar_optimization, recommendation */
  currentScore?: number;
  pillarScores?: Array<{ pillarId: string; score: number; maturityLabel: string }>;
  /** For context_insight */
  orgContext?: string;
  /** For benchmark, roadmap */
  sectorId?: string;
  overallScore?: number;
  /** For discovery_interview */
  discoveryResponse?: string;
  interviewPhase?: 'question' | 'synthesis';
  /** General */
  sector?: string;
  orgSize?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/** Structured discovery result from context analysis */
export interface DiscoveryResult {
  landscapeAnalysis: string;
  competitivePosition: string;
  gapIndicators: Array<{ pillar: string; indicator: string; severity: 'low' | 'medium' | 'high' }>;
  regulatorySignals: string[];
  techStackInsights: string[];
  rawSummary: string; // For backward compatibility
}

/** Response structure from agent interactions */
interface AgentResponse {
  content: string;
  action: AgentAction;
  followUpQuestions?: string[];
  relatedPillars?: string[];
  isAIGenerated: boolean;
  modelUsed?: string;
  generatedAt: string;
  /** Optional structured content for context_insight action */
  structuredContent?: DiscoveryResult;
}

/** A single phase in an AI adoption roadmap */
interface RoadmapPhase {
  phase: string;
  timeframe: string;
  objectives: string[];
  keyActions: string[];
  investmentLevel: 'low' | 'medium' | 'high';
  pillarFocus: string[];
}

/** Result of a sector benchmark comparison */
interface BenchmarkResult {
  sector: string;
  averageScore: number;
  topQuartile: number;
  bottomQuartile: number;
  pillarBenchmarks: Array<{
    pillarId: string;
    userScore: number;
    sectorAverage: number;
    percentile: number;
  }>;
  insight: string;
  isAIGenerated: boolean;
  /** Methodology statement for transparency */
  methodology?: string;
}

// ─── Re-export types for external use ───────────────────────────────────────

export type { AgentAction, AgentRequest, AgentResponse, RoadmapPhase, BenchmarkResult };

// ─── Constants ──────────────────────────────────────────────────────────────

const AGENT_VERSION = '2.0.0';

/** The 8 E-ARI pillar IDs and names for prompt grounding */
const PILLAR_REFERENCE = PILLARS.map(p => `${p.id}: ${p.name} (weight: ${p.weight})`).join('\n');

/** Likert scale interpretation guide */
const LIKERT_GUIDE = `
Likert Scale (1-5):
1 = Strongly Disagree — No capability or practice exists
2 = Disagree — Minimal or ad-hoc capability; not systematic
3 = Neutral — Some capability exists but is inconsistent or immature
4 = Agree — Established capability with consistent execution
5 = Strongly Agree — Best-in-class, optimized, and continuously improving`;

/** Universal guardrails included in every system prompt */
const GUARDRAILS = `
GUARDRAILS:
- Stay strictly within the organizational AI readiness domain.
- Never provide legal advice, medical advice, or regulatory compliance certifications.
- All analysis must reference specific pillar names and scores from the E-ARI framework.
- Do not fabricate statistics, benchmarks, or regulatory references.
- Use concise, board-ready language suitable for Fortune 500 / government stakeholders.
- Clearly state when content is AI-generated or estimated.
- If uncertain, recommend the user consult domain experts rather than guessing.
- BAN: Never use generic phrases like "invest in data governance" or "build an AI strategy" without specifying the exact tool, practice, or deliverable.
- BAN: Never output consultant-speak. Every recommendation must name a specific technology, framework, role, or deliverable.`;

// ─── Curated Benchmark Dataset ──────────────────────────────────────────────

/**
 * Research-grounded sector benchmark data.
 *
 * Values are based on aggregated industry research including:
 * - McKinsey Global AI Survey
 * - Gartner AI Readiness Assessments
 * - World Economic Forum AI Readiness Index
 * - Deloitte State of AI in the Enterprise
 *
 * These are directional estimates, not empirical survey data.
 * Sectors with higher regulatory burden (healthcare, government) tend to score
 * lower on technology adoption but higher on governance readiness.
 */
interface SectorBenchmark {
  averageScore: number;
  topQuartile: number;
  bottomQuartile: number;
  pillarAverages: Record<string, number>;
}

const SECTOR_BENCHMARKS: Record<string, SectorBenchmark> = {
  healthcare: {
    averageScore: 38,
    topQuartile: 58,
    bottomQuartile: 20,
    pillarAverages: {
      strategy: 36, data: 32, technology: 30, talent: 34,
      governance: 48, culture: 35, process: 38, security: 44,
    },
  },
  finance: {
    averageScore: 46,
    topQuartile: 68,
    bottomQuartile: 28,
    pillarAverages: {
      strategy: 44, data: 42, technology: 40, talent: 38,
      governance: 54, culture: 40, process: 44, security: 52,
    },
  },
  manufacturing: {
    averageScore: 36,
    topQuartile: 56,
    bottomQuartile: 18,
    pillarAverages: {
      strategy: 34, data: 38, technology: 36, talent: 30,
      governance: 32, culture: 34, process: 42, security: 36,
    },
  },
  technology: {
    averageScore: 56,
    topQuartile: 78,
    bottomQuartile: 38,
    pillarAverages: {
      strategy: 58, data: 54, technology: 62, talent: 52,
      governance: 46, culture: 56, process: 52, security: 50,
    },
  },
  government: {
    averageScore: 30,
    topQuartile: 48,
    bottomQuartile: 14,
    pillarAverages: {
      strategy: 32, data: 26, technology: 24, talent: 28,
      governance: 42, culture: 28, process: 30, security: 38,
    },
  },
  retail: {
    averageScore: 40,
    topQuartile: 62,
    bottomQuartile: 22,
    pillarAverages: {
      strategy: 38, data: 42, technology: 38, talent: 34,
      governance: 34, culture: 40, process: 44, security: 36,
    },
  },
  education: {
    averageScore: 32,
    topQuartile: 52,
    bottomQuartile: 16,
    pillarAverages: {
      strategy: 30, data: 28, technology: 28, talent: 32,
      governance: 36, culture: 34, process: 30, security: 32,
    },
  },
  energy: {
    averageScore: 38,
    topQuartile: 58,
    bottomQuartile: 20,
    pillarAverages: {
      strategy: 36, data: 40, technology: 34, talent: 30,
      governance: 40, culture: 32, process: 42, security: 44,
    },
  },
};

/** General/default benchmark for unrecognized sectors */
const DEFAULT_BENCHMARK: SectorBenchmark = {
  averageScore: 38,
  topQuartile: 58,
  bottomQuartile: 20,
  pillarAverages: {
    strategy: 36, data: 34, technology: 32, talent: 32,
    governance: 38, culture: 34, process: 36, security: 36,
  },
};

/**
 * Get curated benchmark data for a sector.
 * Falls back to default for unrecognized sectors.
 */
export function getCuratedBenchmark(sectorId: string): SectorBenchmark {
  const normalized = sectorId.toLowerCase().trim();
  // Try exact match, then partial match
  if (SECTOR_BENCHMARKS[normalized]) return SECTOR_BENCHMARKS[normalized];
  for (const key of Object.keys(SECTOR_BENCHMARKS)) {
    if (normalized.includes(key) || key.includes(normalized)) return SECTOR_BENCHMARKS[key];
  }
  return DEFAULT_BENCHMARK;
}

/**
 * Compute a deterministic percentile from user score vs sector average.
 * Uses a simple linear model based on distance from sector average.
 */
export function computePercentile(userScore: number, sectorAvg: number): number {
  if (userScore <= sectorAvg) {
    // Below average: map [0, sectorAvg] -> [5, 50]
    return Math.round(Math.max(5, Math.min(50, (userScore / Math.max(sectorAvg, 1)) * 50)));
  }
  // Above average: map [sectorAvg, 100] -> [50, 95]
  return Math.round(Math.max(50, Math.min(95, 50 + ((userScore - sectorAvg) / Math.max(100 - sectorAvg, 1)) * 45)));
}

// ─── Sector-Specific Example References ─────────────────────────────────────

/** Sector-specific technology and practice references for grounding prompts */
const SECTOR_REFERENCES: Record<string, {
  keySystems: string[];
  keyRegulations: string[];
  keyUseCases: string[];
  keyTools: string[];
}> = {
  healthcare: {
    keySystems: ['EHR (Epic, Cerner)', 'PACS imaging systems', 'clinical data warehouses'],
    keyRegulations: ['HIPAA', 'FDA AI/ML SaMD guidance', 'EU MDR', '21 CFR Part 11'],
    keyUseCases: ['clinical NLP for EHR notes', 'diagnostic imaging AI', 'predictive patient deterioration', 'drug interaction detection'],
    keyTools: ['FHIR data pipelines', 'clinical NLP models (Med-BERT, ClinicalBERT)', 'DICOM imaging AI', 'patient safety monitoring dashboards'],
  },
  finance: {
    keySystems: ['core banking platforms', 'trading systems', 'risk engines', 'KYC/AML platforms'],
    keyRegulations: ['SR 11-7 model risk management', 'Basel III', 'MiFID II', 'GDPR', 'EU AI Act (credit scoring)'],
    keyUseCases: ['real-time fraud detection', 'credit risk scoring', 'algorithmic trading signals', 'regulatory reporting automation'],
    keyTools: ['XGBoost/gradient boosting for credit models', 'real-time feature stores', 'model risk management platforms (ModelOp, Monitaur)', 'explainability tools (SHAP, LIME)'],
  },
  manufacturing: {
    keySystems: ['SCADA/MES systems', 'ERP (SAP, Oracle)', 'PLC controllers', 'IoT sensor networks'],
    keyRegulations: ['ISO 13849 (safety)', 'IEC 62443 (cybersecurity)', 'OSHA requirements'],
    keyUseCases: ['predictive maintenance', 'visual quality inspection', 'digital twin simulation', 'supply chain demand forecasting'],
    keyTools: ['edge inference engines', 'time-series anomaly detection', 'computer vision (YOLO, Detectron2)', 'OPC-UA data pipelines'],
  },
  technology: {
    keySystems: ['cloud infrastructure (AWS, Azure, GCP)', 'CI/CD pipelines', 'microservices architectures', 'data lakes'],
    keyRegulations: ['GDPR', 'CCPA', 'SOC 2', 'EU AI Act'],
    keyUseCases: ['code generation & copilot tools', 'automated testing AI', 'infrastructure optimization', 'product recommendation engines'],
    keyTools: ['MLOps platforms (MLflow, Weights & Biases)', 'LLM APIs', 'feature stores (Feast, Tecton)', 'vector databases (Pinecone, Weaviate)'],
  },
  government: {
    keySystems: ['legacy mainframe systems', 'citizen service portals', 'records management systems', 'case management platforms'],
    keyRegulations: ['FedRAMP', 'FISMA', 'NIST AI RMF', 'EU AI Act (public services)', 'Section 508 accessibility'],
    keyUseCases: ['document processing & classification', 'citizen service chatbots', 'fraud detection in benefits programs', 'predictive analytics for resource allocation'],
    keyTools: ['NLP document extractors', 'secure cloud environments (GovCloud)', 'RPA platforms (UiPath, Blue Prism)', 'compliance automation tools'],
  },
  retail: {
    keySystems: ['e-commerce platforms', 'POS systems', 'inventory management', 'CRM systems'],
    keyRegulations: ['PCI DSS', 'GDPR/CCPA', 'consumer protection regulations'],
    keyUseCases: ['demand forecasting', 'personalized recommendations', 'visual search & product tagging', 'dynamic pricing'],
    keyTools: ['recommendation engines (collaborative filtering)', 'demand forecasting (Prophet, ARIMA+ML)', 'customer data platforms', 'real-time personalization APIs'],
  },
  education: {
    keySystems: ['LMS platforms (Canvas, Moodle)', 'SIS systems', 'research repositories', 'campus IT infrastructure'],
    keyRegulations: ['FERPA', 'GDPR (student data)', 'accessibility standards (WCAG)', 'COPPA'],
    keyUseCases: ['adaptive learning platforms', 'automated grading & feedback', 'student retention prediction', 'research literature analysis'],
    keyTools: ['NLP for essay scoring', 'learning analytics dashboards', 'plagiarism detection', 'accessibility compliance checkers'],
  },
  energy: {
    keySystems: ['SCADA systems', 'grid management platforms', 'asset management systems', 'geological modeling tools'],
    keyRegulations: ['NERC CIP', 'IEC 62351', 'EPA regulations', 'EU emissions standards'],
    keyUseCases: ['predictive maintenance for turbines/pipelines', 'grid load forecasting', 'seismic interpretation AI', 'emissions monitoring'],
    keyTools: ['time-series forecasting models', 'edge AI for remote monitoring', 'digital twin platforms', 'remote sensing & satellite imagery analysis'],
  },
};

/** Get sector references for prompt enrichment */
function getSectorReferences(sector: string | undefined) {
  if (!sector) return SECTOR_REFERENCES.technology; // default
  const normalized = sector.toLowerCase().trim();
  if (SECTOR_REFERENCES[normalized]) return SECTOR_REFERENCES[normalized];
  for (const key of Object.keys(SECTOR_REFERENCES)) {
    if (normalized.includes(key) || key.includes(normalized)) return SECTOR_REFERENCES[key];
  }
  return SECTOR_REFERENCES.technology;
}

// ─── Action-Specific System Prompts ─────────────────────────────────────────

/**
 * Builds the system prompt for question_help action.
 * Helps users interpret and answer a specific assessment question.
 */
function buildQuestionHelpSystemPrompt(): string {
  return `You are an E-ARI Assessment Advisor. You help respondents understand what each assessment question measures, how to interpret the Likert scale in context, and what different answers imply for their organization's AI readiness.

E-ARI FRAMEWORK PILLARS:
${PILLAR_REFERENCE}

${LIKERT_GUIDE}

Your role:
- Explain what the question is measuring and why it matters for AI readiness.
- Help the respondent understand how each Likert option (1-5) maps to their organization's reality.
- Provide examples of what a "3" vs "5" response looks like in practice.
- Reference the specific pillar and its weight in the overall score.
- Never tell the user what to answer — help them calibrate their response accurately.

${GUARDRAILS}`;
}

/**
 * Builds the system prompt for pillar_optimization action.
 * Provides specific, actionable steps to improve a pillar score.
 */
function buildPillarOptimizationSystemPrompt(): string {
  return `You are an E-ARI Optimization Strategist. You provide specific, actionable recommendations to improve an organization's score on a specific E-ARI readiness pillar.

E-ARI FRAMEWORK PILLARS:
${PILLAR_REFERENCE}

Your role:
- Analyze the current pillar score and maturity level.
- Identify the highest-impact actions that will move the score most effectively.
- Provide 3-5 specific, implementable recommendations with estimated effort and impact.
- Reference how improvements in this pillar may positively affect related pillars.
- Prioritize quick wins alongside longer-term strategic investments.
- Always reference the specific pillar name and current score in your recommendations.

${GUARDRAILS}`;
}

/**
 * Builds the system prompt for context_insight action.
 * Demands structured gap analysis with specific format.
 */
function buildContextInsightSystemPrompt(): string {
  return `You are an E-ARI Discovery Analyst. You perform structured gap analysis by examining organizational context and mapping it to the E-ARI 8-pillar AI readiness framework.

E-ARI FRAMEWORK PILLARS:
${PILLAR_REFERENCE}

METHODOLOGY:
1. Analyze the organizational context for sector-specific AI landscape patterns
2. Identify specific technology gaps visible in the organization's stated capabilities vs. sector norms
3. Assess competitive positioning indicators (where does the org lead/lag its sector)
4. Detect regulatory readiness signals (compliance frameworks, data protection posture)
5. Map observable tech stack and infrastructure choices to readiness implications

REQUIRED OUTPUT FORMAT — You MUST respond with valid JSON in this exact structure:
\`\`\`json
{
  "landscapeAnalysis": "2-3 sentence analysis of the organization's position within its sector's AI landscape",
  "competitivePosition": "2-3 sentence assessment of competitive standing based on visible AI capabilities",
  "gapIndicators": [
    {"pillar": "pillar_id_here", "indicator": "specific observable gap", "severity": "low|medium|high"}
  ],
  "regulatorySignals": ["specific regulatory signals detected from context"],
  "techStackInsights": ["specific technology infrastructure observations relevant to readiness"],
  "rawSummary": "2-3 paragraph narrative summary for backward compatibility"
}
\`\`\`

CRITICAL RULES:
- Every gap indicator must reference a SPECIFIC observation from the context — not generic advice
- techStackInsights must name SPECIFIC systems, tools, or platforms mentioned or implied
- regulatorySignals must reference SPECIFIC regulations relevant to the sector (e.g., "HIPAA compliance posture unclear from context" not "regulatory compliance needs attention")
- severity must be "low", "medium", or "high" based on how much the gap threatens AI readiness
- Include 3-6 gap indicators, 2-4 regulatory signals, and 2-4 tech stack insights minimum

${GUARDRAILS}`;
}

/**
 * Builds the system prompt for recommendation action.
 * Demands specific, prioritized recommendations with effort, ownership, and dependencies.
 */
function buildRecommendationSystemPrompt(): string {
  return `You are an E-ARI Strategic Advisor. You provide post-assessment strategic recommendations that are specific, actionable, and grounded in the organization's actual assessment results and sector context.

E-ARI FRAMEWORK PILLARS:
${PILLAR_REFERENCE}

Maturity Bands:
- Laggard (0-25%): Minimal or no AI readiness
- Follower (26-50%): Early-stage readiness with some initiatives
- Chaser (51-75%): Progressing readiness with active investment
- Pacesetter (76-100%): Advanced readiness for competitive advantage

MANDATORY FORMAT — For each recommendation, you MUST include:
1. **Recommendation title** — Specific, not generic (NOT "Invest in data governance" but "Deploy a data catalog with automated lineage tracking across [specific systems]")
2. **Rationale** — Why this matters, tied to specific pillar scores and sector context
3. **Estimated effort** — weeks or months with realistic range
4. **Responsible team/role** — Who should own this (e.g., "Chief Data Officer + Data Engineering team")
5. **Dependencies** — What must be in place first (reference other recommendations by number)
6. **Expected impact** — Which pillar scores will improve and by approximately how much

BANNED PHRASES (never use without specificity):
- "Invest in data governance" → instead specify the tool, policy, or practice
- "Build an AI strategy" → instead specify the deliverable and stakeholder group
- "Upskill employees" → instead specify the training program, platform, and target audience
- "Improve data quality" → instead specify the data quality dimensions, tools, and measurement approach

Your role:
- Synthesize the full pillar score profile AND per-question detail into strategic recommendations.
- Identify the 4-6 most impactful areas for investment based on the specific score distribution.
- Consider interdependencies between pillars (e.g., Data readiness enables Technology).
- Distinguish between foundational investments (must-do) and accelerating investments (differentiating).
- Reference sector-specific tools, regulations, and practices throughout.
- Always reference specific pillar names and scores in your recommendations.

${GUARDRAILS}`;
}

/**
 * Builds the system prompt for benchmark action.
 * Uses curated benchmark data as a base, asks LLM to adjust with explicit methodology.
 */
function buildBenchmarkSystemPrompt(): string {
  return `You are an E-ARI Benchmark Analyst. You adjust curated sector benchmark data based on organizational context to provide reasoned, transparent benchmark comparisons.

E-ARI FRAMEWORK PILLARS:
${PILLAR_REFERENCE}

METHODOLOGY REQUIREMENTS:
You will be given CURATED BASE BENCHMARKS derived from industry research. Your job is to ADJUST these based on:
1. Organization size (larger orgs tend to score higher on governance, lower on agility)
2. Geographic region signals from context (EU orgs face stricter AI regulation)
3. Specific technology choices mentioned in context
4. Any sector-specific market conditions visible in context

For every adjustment you make, you MUST state:
- What data the estimate is based on
- Your confidence level (high/medium/low)
- Key assumptions behind the adjustment

OUTPUT FORMAT — JSON:
\`\`\`json
{
  "averageScore": number,
  "topQuartile": number,
  "bottomQuartile": number,
  "pillarBenchmarks": [
    {"pillarId": "string", "sectorAverage": number, "percentile": number, "adjustmentReason": "string"}
  ],
  "insight": "string with analysis",
  "methodology": "string explaining data sources, confidence, and assumptions"
}
\`\`\`

REQUIRED: Include the disclaimer in insight: "Sector benchmarks are AI-estimated and intended for directional guidance only. Actual sector performance may vary."

${GUARDRAILS}`;
}

/**
 * Builds the system prompt for roadmap action.
 * Enriched with methodology and sector references.
 */
function buildRoadmapSystemPrompt(sector?: string): string {
  const sectorRef = getSectorReferences(sector);

  return `You are an E-ARI Roadmap Architect. You generate phased AI adoption roadmaps where every action names a SPECIFIC tool, practice, or deliverable — not generic consultant-speak.

E-ARI FRAMEWORK PILLARS:
${PILLAR_REFERENCE}

Maturity Bands:
- Laggard (0-25%): Minimal or no AI readiness
- Follower (26-50%): Early-stage readiness with some initiatives
- Chaser (51-75%): Progressing readiness with active investment
- Pacesetter (76-100%): Advanced readiness for competitive advantage

SECTOR CONTEXT (${sector || 'General'}):
- Key systems in this sector: ${sectorRef.keySystems.join(', ')}
- Key regulations: ${sectorRef.keyRegulations.join(', ')}
- Typical AI use cases: ${sectorRef.keyUseCases.join(', ')}
- Relevant tools/platforms: ${sectorRef.keyTools.join(', ')}

ROADMAP METHODOLOGY:
- Phase 1 (Foundation, months 1-6): MUST fix specific foundational gaps. Name the lowest-scoring pillars and specify WHAT is missing (not "improve data" but "deploy FHIR-compliant data pipeline from EHR to analytics warehouse"). Every action must reference a specific tool or deliverable.
- Phase 2 (Acceleration, months 7-12): Builds on Phase 1 gains. Actions must reference the sector-specific use cases and tools listed above. Not "deploy AI models" but "deploy clinical NLP pipeline for EHR unstructured data extraction using ClinicalBERT".
- Phase 3 (Optimization, months 13-18): Focus on differentiation. Actions should reference advanced practices specific to the sector's regulatory and competitive landscape.
- Phase 4 (Leadership, months 19-24, only if overall > 50%): Industry leadership and ecosystem building.

MANDATORY RULES FOR KEY ACTIONS:
- Every key action MUST name a SPECIFIC tool, practice, deliverable, or system — NOT "implement data governance" but "establish a data catalog with lineage tracking using [tool] across [specific systems from context]"
- Every key action MUST reference the sector (e.g., "deploy clinical NLP pipeline for EHR unstructured data extraction" for healthcare, not "deploy NLP for document processing")
- Ban phrases: "implement data governance", "build AI strategy", "improve data quality", "invest in talent" — always specify WHAT exactly

OUTPUT FORMAT — JSON array of phases:
\`\`\`json
[
  {
    "phase": "Foundation",
    "timeframe": "Months 1-6",
    "objectives": ["specific objective 1", "specific objective 2"],
    "keyActions": ["specific action with tool/deliverable", "specific action referencing sector use case"],
    "investmentLevel": "low|medium|high",
    "pillarFocus": ["pillar_id_1", "pillar_id_2"]
  }
]
\`\`\`

${GUARDRAILS}`;
}

/**
 * Builds the system prompt for discovery_interview action.
 * A conversational AI agent that interviews stakeholders to uncover qualitative nuances.
 */
function buildDiscoveryInterviewSystemPrompt(): string {
  return `You are an E-ARI Discovery Interview Agent. You conduct conversational interviews with organizational stakeholders to uncover qualitative insights about AI readiness that multiple-choice assessments cannot capture.

E-ARI FRAMEWORK PILLARS:
${PILLAR_REFERENCE}

Your role:
- Ask one probing question at a time about the organization's AI readiness.
- Questions should explore: organizational culture toward AI, unreported or informal AI initiatives, grassroots AI usage, pain points with current AI efforts, aspirations and fears about AI adoption, and leadership alignment on AI strategy.
- Adapt your questions based on the interviewee's previous answers — follow up on interesting or surprising responses.
- After 5-8 exchanges, provide a synthesis summary of key qualitative findings.
- Map findings to specific E-ARI pillars where applicable.
- Be conversational, empathetic, and genuinely curious — not robotic.
- Keep your questions concise (2-3 sentences max) and your follow-ups focused.
- When providing synthesis, organize findings into: Key Strengths, Critical Gaps, Hidden Risks, and Emerging Opportunities.

${GUARDRAILS}`;
}

// ─── User Prompt Builders ───────────────────────────────────────────────────

/**
 * Builds the user prompt for a question_help request.
 */
function buildQuestionHelpUserPrompt(request: AgentRequest): string {
  const pillar = request.pillarId ? getPillarById(request.pillarId) : null;
  const sectorInfo = request.sector ? `Sector: ${request.sector}` : '';

  return `I need help understanding this assessment question:

Pillar: ${pillar?.name || request.pillarId || 'Unknown'}
Question ID: ${request.questionId || 'Unknown'}
Question Text: "${request.questionText || 'Not provided'}"
${sectorInfo}

Please explain:
1. What this question is measuring and why it matters for AI readiness
2. How to interpret the Likert scale (1-5) for this specific question
3. What different answer levels (1 vs 3 vs 5) look like in practice
4. Any context that might help calibrate the response accurately`;
}

/**
 * Builds the user prompt for a pillar_optimization request.
 */
function buildPillarOptimizationUserPrompt(request: AgentRequest): string {
  const pillar = request.pillarId ? getPillarById(request.pillarId) : null;
  const pillarName = pillar?.name || request.pillarId || 'Unknown';
  const scoreInfo = request.currentScore !== undefined
    ? `Current Score: ${request.currentScore}%`
    : '';
  const maturityLabel = request.pillarScores?.find(p => p.pillarId === request.pillarId)?.maturityLabel || '';
  const allScores = request.pillarScores?.map(p =>
    `- ${p.pillarId}: ${p.score}% (${p.maturityLabel})`
  ).join('\n') || '';

  return `I need optimization recommendations for the "${pillarName}" pillar.

${scoreInfo}
${maturityLabel ? `Maturity Level: ${maturityLabel}` : ''}

${allScores ? `All Pillar Scores:\n${allScores}` : ''}

Please provide:
1. Specific, actionable steps to improve the "${pillarName}" score
2. Quick wins vs. longer-term strategic investments
3. How improvements here may positively affect related pillars
4. Priority ranking of recommended actions`;
}

/**
 * Builds the user prompt for a context_insight request.
 * Demands structured JSON output for gap analysis.
 */
function buildContextInsightUserPrompt(request: AgentRequest): string {
  const sectorInfo = request.sector ? `Sector: ${request.sector}` : '';
  const sectorRef = getSectorReferences(request.sector);
  const scoreInfo = request.pillarScores?.map(p =>
    `- ${p.pillarId}: ${p.score}% (${p.maturityLabel})`
  ).join('\n') || '';

  return `Perform a structured gap analysis on this organization.

${sectorInfo}
${sectorInfo ? `Sector context - Key systems: ${sectorRef.keySystems.join(', ')}; Key regulations: ${sectorRef.keyRegulations.join(', ')}` : ''}
${scoreInfo ? `Current Pillar Scores:\n${scoreInfo}` : ''}

ORGANIZATIONAL CONTEXT:
---
${request.orgContext || 'No context provided'}
---

You MUST respond with valid JSON following the exact format specified in your system prompt. Every gap indicator must reference a SPECIFIC observation from the context. Every tech stack insight must name a SPECIFIC system or tool.`;
}

/**
 * Builds the user prompt for a recommendation request.
 * Enriched with per-question detail and sector references.
 */
function buildRecommendationUserPrompt(request: AgentRequest): string {
  const overallInfo = request.overallScore !== undefined
    ? `Overall Score: ${request.overallScore}%`
    : '';
  const sectorInfo = request.sector ? `Sector: ${request.sector}` : '';
  const sectorRef = getSectorReferences(request.sector);
  const allScores = request.pillarScores?.map(p =>
    `- ${p.pillarId}: ${p.score}% (${p.maturityLabel})`
  ).join('\n') || '';

  return `Provide strategic recommendations based on our E-ARI assessment results.

${overallInfo}
${sectorInfo}
${sectorInfo ? `Sector-specific context:\n- Key systems: ${sectorRef.keySystems.join(', ')}\n- Key regulations: ${sectorRef.keyRegulations.join(', ')}\n- Typical AI use cases: ${sectorRef.keyUseCases.join(', ')}\n- Relevant tools: ${sectorRef.keyTools.join(', ')}` : ''}

Pillar Scores:
${allScores || 'No pillar scores provided'}

${request.orgContext ? `Organizational Context:\n${request.orgContext}` : ''}

Provide 4-6 specific, prioritized recommendations. For EACH recommendation include:
1. **Title** — specific, not generic
2. **Rationale** — tied to specific pillar scores and sector context
3. **Estimated effort** — weeks/months with range
4. **Responsible team/role** — who owns this
5. **Dependencies** — what must be done first
6. **Expected impact** — which pillar scores improve and by approximately how much

Do NOT use generic phrases like "invest in data governance" without specifying the exact tool, practice, or deliverable.`;
}

/**
 * Builds the user prompt for a benchmark request.
 * Includes curated base benchmarks for the LLM to adjust.
 */
function buildBenchmarkUserPrompt(request: AgentRequest): string {
  const sectorDef = request.sectorId ? getSectorById(request.sectorId) : null;
  const sectorName = sectorDef?.name || request.sectorId || 'General';
  const pillarScores = request.pillarScores?.map(p =>
    `- ${p.pillarId}: ${p.score}%`
  ).join('\n') || '';

  // Include curated base benchmarks
  const curated = getCuratedBenchmark(request.sectorId || request.sector || '');
  const curatedPillarAvgs = Object.entries(curated.pillarAverages)
    .map(([k, v]) => `  ${k}: ${v}%`)
    .join('\n');

  return `Adjust curated sector benchmarks for this organization.

Sector: ${sectorName}
Overall Score: ${request.overallScore !== undefined ? `${request.overallScore}%` : 'Not provided'}
${request.orgSize ? `Organization Size: ${request.orgSize}` : ''}

Our Pillar Scores:
${pillarScores || 'No pillar scores provided'}

CURATED BASE BENCHMARKS for ${sectorName} (from industry research):
- Sector Average: ${curated.averageScore}%
- Top Quartile: ${curated.topQuartile}%
- Bottom Quartile: ${curated.bottomQuartile}%
- Per-Pillar Sector Averages:
${curatedPillarAvgs}

${request.orgContext ? `Additional Organizational Context:\n${request.orgContext.slice(0, 2000)}` : ''}

INSTRUCTIONS:
1. Start from the curated base benchmarks above
2. Adjust based on org size, context, and specific score distribution
3. For each adjustment, state: what data it's based on, confidence level (high/medium/low), and key assumptions
4. Return valid JSON following the format in your system prompt
5. Include the disclaimer about AI-estimated benchmarks in the insight field`;
}

/**
 * Builds the user prompt for a roadmap request.
 * Enriched with full org context and sector references.
 */
function buildRoadmapUserPrompt(request: AgentRequest): string {
  const overallInfo = request.overallScore !== undefined
    ? `Overall Score: ${request.overallScore}%`
    : '';
  const sectorInfo = request.sector ? `Sector: ${request.sector}` : '';
  const sectorRef = getSectorReferences(request.sector);
  const allScores = request.pillarScores?.map(p =>
    `- ${p.pillarId}: ${p.score}% (${p.maturityLabel})`
  ).join('\n') || '';

  // Identify weakest and strongest pillars explicitly
  const sortedPillars = [...(request.pillarScores || [])].sort((a, b) => a.score - b.score);
  const weakestPillars = sortedPillars.slice(0, 3).map(p => {
    const pillar = getPillarById(p.pillarId);
    return `${pillar?.name || p.pillarId} (${p.score}%, ${p.maturityLabel}) — key gaps: ${getGapDescription(p.pillarId, p.score)}`;
  }).join('\n');
  const strongestPillars = sortedPillars.slice(-2).map(p => {
    const pillar = getPillarById(p.pillarId);
    return `${pillar?.name || p.pillarId} (${p.score}%, ${p.maturityLabel})`;
  }).join(', ');

  return `Generate a phased AI adoption roadmap based on our E-ARI assessment results.

${overallInfo}
${sectorInfo}

Pillar Scores (sorted weakest to strongest):
${allScores || 'No pillar scores provided'}

Weakest Pillars Requiring Foundation:
${weakestPillars || 'None identified'}

Strongest Pillars to Leverage:
${strongestPillars || 'None identified'}

Sector Context:
- Key systems: ${sectorRef.keySystems.join(', ')}
- Key regulations: ${sectorRef.keyRegulations.join(', ')}
- Typical AI use cases: ${sectorRef.keyUseCases.join(', ')}
- Relevant tools: ${sectorRef.keyTools.join(', ')}

${request.orgContext ? `Organizational Context (full):\n${request.orgContext}` : ''}

Return a JSON array of 3-4 phases. Every key action MUST:
1. Name a SPECIFIC tool, practice, or deliverable (not generic)
2. Reference the sector context (e.g., for healthcare: "deploy clinical NLP pipeline for EHR unstructured data extraction")
3. Reference specific systems from the organizational context where available`;
}

/**
 * Returns a gap description for a pillar at a given score level.
 */
function getGapDescription(pillarId: string, score: number): string {
  const pillar = getPillarById(pillarId);
  if (!pillar) return 'assessment needed';

  if (score <= 25) {
    return `no formal ${pillar.shortName.toLowerCase()} capability exists`;
  } else if (score <= 50) {
    return `${pillar.shortName.toLowerCase()} practices are ad-hoc and inconsistent`;
  } else if (score <= 75) {
    return `${pillar.shortName.toLowerCase()} is established but not optimized`;
  }
  return `${pillar.shortName.toLowerCase()} is strong`;
}

/**
 * Builds the user prompt for a discovery_interview request.
 */
function buildDiscoveryInterviewUserPrompt(request: AgentRequest): string {
  const sectorInfo = request.sector ? `Sector: ${request.sector}` : '';
  const scoreInfo = request.overallScore !== undefined ? `Overall Score: ${request.overallScore}%` : '';
  const pillarInfo = request.pillarScores?.map(p =>
    `- ${p.pillarId}: ${p.score}% (${p.maturityLabel})`
  ).join('\n') || '';

  if (request.interviewPhase === 'synthesis') {
    return `The interview is concluding. Based on all the responses provided in our conversation, please synthesize your findings into a structured summary organized as:

**Key Strengths** — What the organization is doing well regarding AI readiness
**Critical Gaps** — Where the most significant readiness deficiencies exist
**Hidden Risks** — Risks that might not be visible from quantitative assessment alone
**Emerging Opportunities** — Untapped potential or organic AI initiatives that could be accelerated

${sectorInfo}
${scoreInfo}
${pillarInfo ? `Pillar Scores:\n${pillarInfo}` : ''}

Please provide a comprehensive synthesis.`;
  }

  // Initial question or follow-up based on conversation history
  const hasHistory = request.conversationHistory && request.conversationHistory.length > 0;

  if (!hasHistory) {
    return `I'd like to begin a discovery interview about this organization's AI readiness. 

${sectorInfo}
${scoreInfo}
${pillarInfo ? `Pillar Scores:\n${pillarInfo}` : ''}
${request.orgContext ? `Organizational Context: ${request.orgContext}` : ''}

Please start by asking your first probing question about the organization's AI readiness journey. Focus on understanding the organizational culture and attitude toward AI adoption.`;
  }

  // Follow-up question based on the latest user response
  const latestResponse = request.discoveryResponse || '';
  return `The stakeholder has responded: "${latestResponse}"

Based on this response and our conversation so far, ask your next probing question. If we have had 5 or more exchanges, indicate that the interview is wrapping up and provide an initial synthesis. Otherwise, continue exploring the topic or pivot to a new area of inquiry.

${sectorInfo}
${scoreInfo}`;
}

// ─── LLM Invocation Helper ──────────────────────────────────────────────────

/**
 * Calls the z-ai-web-dev-sdk LLM with the given system and user prompts.
 * Returns the raw content string or throws on failure.
 * Default max_tokens increased from 1500 to 3000.
 */
async function callLLM(systemPrompt: string, userPrompt: string, maxTokens: number = 3000): Promise<{ content: string; model: string }> {
  const response = await fetch(
    LLM_API_URL_PRO,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.NVIDIA_API_KEY_PRO}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL_PRO,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
    }
  );
  if (!response.ok) {
    const errText = await response.text();
    console.error('LLM API error:', response.status, errText);
    throw new Error(`LLM service error: ${response.status}`);
  }
  const data = await response.json();
  const completion = { choices: data.choices };

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty LLM response');
  }

  return { content, model: 'GLM-5.1' };
}

// ─── Fallback Response Generators ───────────────────────────────────────────

/**
 * Generates a fallback response for question_help when LLM is unavailable.
 */
function fallbackQuestionHelp(request: AgentRequest): string {
  const pillar = request.pillarId ? getPillarById(request.pillarId) : null;
  const pillarName = pillar?.name || request.pillarId || 'this pillar';
  const pillarDesc = pillar?.description || '';

  return `**Question Guidance (${pillarName})**

${request.questionText ? `Question: "${request.questionText}"` : ''}

This question measures an aspect of your **${pillarName}** readiness. ${pillarDesc ? `\n\n${pillarDesc}` : ''}

**Likert Scale Interpretation:**
- **1 (Strongly Disagree)**: No capability or practice exists in this area
- **2 (Disagree)**: Minimal or ad-hoc capability; not systematic
- **3 (Neutral)**: Some capability exists but is inconsistent or immature
- **4 (Agree)**: Established capability with consistent execution
- **5 (Strongly Agree)**: Best-in-class, optimized, and continuously improving

**Calibration Tips:**
- Rate based on documented, verifiable practices — not aspirations
- Consider whether the capability is consistent across the organization or limited to specific teams
- A score of 3 indicates a starting foundation; moving to 4-5 requires systematic, organization-wide adoption

*Note: This guidance was generated from E-ARI templates. For more detailed analysis, try again when AI assistance is available.*`;
}

/**
 * Generates a fallback response for pillar_optimization when LLM is unavailable.
 */
function fallbackPillarOptimization(request: AgentRequest): string {
  const pillar = request.pillarId ? getPillarById(request.pillarId) : null;
  const pillarName = pillar?.name || request.pillarId || 'this pillar';
  const score = request.currentScore ?? 0;
  const scoreLabel = score <= 25 ? 'Laggard' : score <= 50 ? 'Follower' : score <= 75 ? 'Chaser' : 'Pacesetter';

  let recommendations = '';
  if (score <= 25) {
    recommendations = `**${pillarName} Optimization (Current: ${score}% — ${scoreLabel})**

Critical foundational gaps require immediate attention:

1. **Establish basic capabilities**: Create a formal baseline by documenting current state and defining target outcomes
2. **Secure executive sponsorship**: Without leadership commitment, improvements will remain ad-hoc
3. **Invest in foundational skills**: Build basic literacy and competence before pursuing advanced initiatives
4. **Define governance minimum**: Even lightweight governance structures prevent uncontrolled risk
5. **Quick win**: Identify one high-visibility, low-complexity improvement to demonstrate value within 30 days`;
  } else if (score <= 50) {
    recommendations = `**${pillarName} Optimization (Current: ${score}% — ${scoreLabel})**

Early-stage capabilities need systematization:

1. **Formalize existing practices**: Move from ad-hoc to documented, repeatable processes
2. **Invest in measurement**: Establish KPIs to track progress and demonstrate ROI
3. **Expand coverage**: Extend capabilities beyond initial teams to broader organization
4. **Strengthen governance**: Mature oversight structures to support scaling
5. **Quick win**: Standardize the most mature existing practice for immediate consistency gains`;
  } else if (score <= 75) {
    recommendations = `**${pillarName} Optimization (Current: ${score}% — ${scoreLabel})**

Solid foundation ready for optimization:

1. **Optimize existing processes**: Focus on efficiency and consistency of established capabilities
2. **Adopt advanced practices**: Move beyond basics to industry-leading approaches
3. **Enable self-service**: Empower teams to operate independently with guardrails
4. **Drive cross-pollination**: Share best practices across business units
5. **Quick win**: Automate the most manual aspect of your current workflow`;
  } else {
    recommendations = `**${pillarName} Optimization (Current: ${score}% — ${scoreLabel})**

Advanced capabilities should focus on continuous innovation:

1. **Lead industry standards**: Contribute to best practices and frameworks
2. **Explore frontier capabilities**: Investigate emerging technologies and approaches
3. **Build ecosystem partnerships**: Collaborate with external organizations to drive innovation
4. **Ensure sustainability**: Create structures that maintain excellence through organizational changes
5. **Quick win**: Document and publish internal best practices for broader industry benefit`;
  }

  return `${recommendations}

*Note: This guidance was generated from E-ARI templates. For personalized optimization strategies, try again when AI assistance is available.*`;
}

/**
 * Generates a fallback response for context_insight when LLM is unavailable.
 * Now returns structured DiscoveryResult JSON for backward compatibility.
 */
function fallbackContextInsight(request: AgentRequest): string {
  const sectorInfo = request.sector || 'general';
  const sectorRef = getSectorReferences(sectorInfo);

  const gapIndicators = (request.pillarScores || []).map(p => {
    const pillar = getPillarById(p.pillarId);
    return `- **${pillar?.name || p.pillarId}** (${p.score}%): ${p.score < 30 ? `${pillar?.shortName || p.pillarId} capability gap — no formal practices exist` : p.score < 50 ? `${pillar?.shortName || p.pillarId} is ad-hoc and inconsistent` : 'at or above developing level; context may reveal specific strengths'}`;
  }).join('\n') || '- No pillar scores available for context correlation';

  const rawSummary = `**Context Analysis (Template-Based)**

Organizational context review for the ${sectorInfo} sector indicates the following considerations for your E-ARI assessment:

${gapIndicators}

**Sector-Specific Signals:**
- Key systems typical in this sector: ${sectorRef.keySystems.join(', ')}
- Key regulations to verify compliance posture: ${sectorRef.keyRegulations.join(', ')}
- Common AI use cases to evaluate readiness for: ${sectorRef.keyUseCases.join(', ')}

**Recommendations:**
- Cross-reference your organizational context against each pillar's assessment questions
- Identify stated strategic priorities that map to specific E-ARI pillars
- Look for gaps between publicly stated ambitions and observable capabilities

*Note: This is a template-based analysis. For detailed context insights, try again when AI assistance is available.*`;

  return rawSummary;
}

/**
 * Generates a structured fallback DiscoveryResult when LLM is unavailable.
 */
function fallbackDiscoveryResult(request: AgentRequest): DiscoveryResult {
  const sectorInfo = request.sector || 'general';
  const sectorRef = getSectorReferences(sectorInfo);

  const gapIndicators: DiscoveryResult['gapIndicators'] = (request.pillarScores || [])
    .filter(p => p.score < 50)
    .map(p => ({
      pillar: p.pillarId,
      indicator: `Score of ${p.score}% indicates ${p.score < 30 ? 'no formal' : 'ad-hoc'} ${getPillarById(p.pillarId)?.shortName || p.pillarId} practices`,
      severity: p.score < 30 ? 'high' as const : 'medium' as const,
    }));

  return {
    landscapeAnalysis: `Organization operates in the ${sectorInfo} sector where AI adoption is ${sectorInfo === 'technology' ? 'rapid' : sectorInfo === 'government' ? 'early-stage' : 'accelerating'}. Assessment scores suggest ${request.overallScore && request.overallScore < 40 ? 'significant foundational gaps' : 'emerging readiness'} relative to sector norms.`,
    competitivePosition: `Based on available assessment data, the organization appears to be ${request.overallScore && request.overallScore < 35 ? 'behind sector peers' : request.overallScore && request.overallScore < 55 ? 'at sector average' : 'ahead of sector average'} in AI readiness. Template-based analysis — full competitive positioning requires LLM analysis.`,
    gapIndicators: gapIndicators.length > 0 ? gapIndicators : [{ pillar: 'strategy', indicator: 'Insufficient data for detailed gap analysis', severity: 'medium' }],
    regulatorySignals: sectorRef.keyRegulations.slice(0, 3).map(r => `Compliance posture for ${r} requires verification`),
    techStackInsights: sectorRef.keySystems.slice(0, 3).map(s => `Integration readiness with ${s} should be assessed`),
    rawSummary: fallbackContextInsight(request),
  };
}

/**
 * Generates a fallback response for recommendation when LLM is unavailable.
 * Now includes sector-specific details and more specific actions.
 */
function fallbackRecommendation(request: AgentRequest): string {
  const overall = request.overallScore ?? 0;
  const sortedPillars = [...(request.pillarScores || [])].sort((a, b) => a.score - b.score);
  const weakest = sortedPillars.slice(0, 3);
  const strongest = sortedPillars.slice(-3).reverse();
  const sectorRef = getSectorReferences(request.sector);

  return `**Strategic Recommendations (Overall: ${overall}%)**

**Foundational Investments (Must-Do):**
${weakest.map(p => {
  const pillar = getPillarById(p.pillarId);
  const sectorAction = p.pillarId === 'data'
    ? `Deploy data catalog with lineage tracking across ${sectorRef.keySystems[0] || 'core systems'}`
    : p.pillarId === 'governance'
    ? `Establish AI governance board with ${sectorRef.keyRegulations[0] || 'regulatory'} compliance review`
    : p.pillarId === 'security'
    ? `Implement AI security controls aligned with ${sectorRef.keyRegulations[0] || 'industry'} standards`
    : `Formalize ${pillar?.shortName || p.pillarId} practices with documented processes and ownership`;
  return `- **${pillar?.name || p.pillarId}** (${p.score}%): ${sectorAction}`;
}).join('\n') || '- Complete your assessment for personalized recommendations'}

**Accelerating Investments (Differentiating):**
${strongest.map(p => {
  const pillar = getPillarById(p.pillarId);
  return `- **${pillar?.name || p.pillarId}** (${p.score}%): Leverage this strength for competitive advantage — explore ${sectorRef.keyUseCases[0] || 'advanced AI use cases'} to differentiate`;
}).join('\n') || '- Complete your assessment for personalized recommendations'}

**Sequencing Principle:** Address foundational gaps (Data, Governance) before accelerating technology investment. Strong pillars should be leveraged to build momentum while weaker pillars are strengthened.

*Note: These recommendations were generated from E-ARI templates. For AI-powered strategic analysis, try again when AI assistance is available.*`;
}

/**
 * Generates a fallback response for benchmark when LLM is unavailable.
 * Now uses curated benchmark data instead of Math.random().
 */
function fallbackBenchmark(request: AgentRequest): string {
  const sectorDef = request.sectorId ? getSectorById(request.sectorId) : null;
  const sectorName = sectorDef?.name || request.sectorId || 'General';
  const curated = getCuratedBenchmark(request.sectorId || request.sector || '');

  return `**Sector Benchmark Comparison — ${sectorName}**

⚠️ **Disclaimer**: Benchmark data shown below is based on curated industry research and E-ARI framework analysis. It is intended for directional guidance only and does not represent empirical survey data. Actual sector performance may vary.

**Estimated Sector Averages:**
| Pillar | Your Score | Est. Sector Avg | Est. Percentile |
|--------|-----------|-----------------|-----------------|
${(request.pillarScores || []).map(p => {
  const sectorAvg = curated.pillarAverages[p.pillarId] || curated.averageScore;
  const percentile = computePercentile(p.score, sectorAvg);
  return `| ${p.pillarId} | ${p.score}% | ~${sectorAvg}% | ~${percentile}th |`;
}).join('\n') || '| - | - | - | - |'}

**General Guidance:**
- Scores above estimated sector averages suggest competitive advantage
- Scores below averages indicate areas for targeted investment
- Use these estimates as conversation starters, not definitive benchmarks

*Note: These benchmarks are based on curated industry research. For AI-powered sector analysis with context-specific adjustments, try again when AI assistance is available.*`;
}

/**
 * Generates a fallback roadmap when LLM is unavailable.
 */
function fallbackRoadmap(request: AgentRequest): string {
  const overall = request.overallScore ?? 0;
  const sortedPillars = [...(request.pillarScores || [])].sort((a, b) => a.score - b.score);
  const weakest3 = sortedPillars.slice(0, 3).map(p => p.pillarId);
  const middle3 = sortedPillars.slice(3, 6).map(p => p.pillarId);
  const top2 = sortedPillars.slice(-2).map(p => p.pillarId);

  return `**AI Adoption Roadmap (Overall: ${overall}%)**

**Phase 1: Foundation (Months 1-6)**
- Investment Level: **Medium**
- Pillar Focus: ${weakest3.map(id => getPillarById(id)?.name || id).join(', ')}
- Objectives: Establish baseline capabilities in weakest areas; build governance and data foundations
- Key Actions:
  1. Formalize AI strategy aligned with business objectives
  2. Establish data governance framework
  3. Implement foundational security controls
  4. Launch AI literacy program for leadership

**Phase 2: Acceleration (Months 7-12)**
- Investment Level: **Medium-High**
- Pillar Focus: ${middle3.map(id => getPillarById(id)?.name || id).join(', ')}
- Objectives: Scale initial successes; build operational AI capabilities
- Key Actions:
  1. Deploy MLOps practices for production AI
  2. Expand AI talent through hiring and upskilling
  3. Integrate AI into core business workflows
  4. Establish cross-functional AI center of excellence

**Phase 3: Optimization (Months 13-18)**
- Investment Level: **High**
- Pillar Focus: ${top2.map(id => getPillarById(id)?.name || id).join(', ')}
- Objectives: Achieve competitive differentiation; optimize across all pillars
- Key Actions:
  1. Scale AI across business units
  2. Implement advanced governance and ethics practices
  3. Drive cultural transformation and change management
  4. Establish continuous improvement processes

${overall > 50 ? `**Phase 4: Leadership (Months 19-24)**
- Investment Level: **Medium**
- Pillar Focus: All pillars — continuous improvement
- Objectives: Achieve and sustain pacesetter status; lead industry practices
- Key Actions:
  1. Contribute to industry standards and best practices
  2. Explore frontier AI capabilities
  3. Build ecosystem partnerships
  4. Ensure sustainability through organizational resilience` : ''}

*Note: This roadmap was generated from E-ARI templates. For an AI-powered, personalized roadmap, try again when AI assistance is available.*`;
}

/**
 * Generates a fallback response for discovery_interview when LLM is unavailable.
 */
function fallbackDiscoveryInterview(request: AgentRequest): string {
  if (request.interviewPhase === 'synthesis') {
    return `**Discovery Interview Synthesis (Template-Based)**

Based on the interview responses, here is a summary of qualitative findings:

**Key Strengths:**
- The organization demonstrates awareness of AI's strategic importance
- Some departments have begun experimenting with AI tools independently

**Critical Gaps:**
- Lack of centralized AI strategy and governance
- Inconsistent AI literacy across departments
- Limited coordination between AI initiatives in different business units

**Hidden Risks:**
- Uncoordinated AI experimentation may create security and compliance vulnerabilities
- AI initiatives may not align with business objectives without strategic oversight
- Employee anxiety about AI displacement may undermine adoption efforts

**Emerging Opportunities:**
- Grassroots AI enthusiasts could form the nucleus of an AI champions network
- Existing data assets may be underutilized for AI applications
- Quick wins in process automation could build momentum for larger initiatives

*Note: This synthesis was generated from E-ARI templates. For AI-powered analysis, try again when AI assistance is available.*`;
  }

  // Fallback questions
  const questions = [
    'How would you describe the general attitude toward AI in your organization? Are people excited, apprehensive, or indifferent?',
    'Are there any AI initiatives happening in departments that might not be formally tracked or reported?',
    'What has been the biggest challenge in implementing AI solutions so far?',
    'How aligned is your leadership team on the strategic importance of AI adoption?',
    'Are there employees using AI tools informally (e.g., ChatGPT, Copilot) without official IT approval or support?',
    'What outcomes would make you consider your AI investment successful in 12 months?',
    'Is there a formal process for evaluating and approving new AI tools or use cases?',
  ];

  const historyLength = request.conversationHistory?.length ?? 0;
  const questionIndex = Math.min(Math.floor(historyLength / 2), questions.length - 1);

  if (historyLength >= 10) {
    return `Thank you for sharing these insights. It sounds like there are some important themes emerging. Based on what you've shared, I'd summarize the key findings as:

- **Cultural readiness** varies significantly across departments
- **Informal AI usage** exists but lacks governance and support
- **Leadership alignment** needs strengthening for sustained investment

Would you like me to provide a detailed synthesis of our conversation?`;
  }

  return questions[questionIndex];
}

// ─── System Prompt Dispatcher ───────────────────────────────────────────────

/**
 * Returns the appropriate system prompt for a given agent action.
 */
function getSystemPrompt(action: AgentAction, request?: AgentRequest): string {
  switch (action) {
    case 'question_help':
      return buildQuestionHelpSystemPrompt();
    case 'pillar_optimization':
      return buildPillarOptimizationSystemPrompt();
    case 'context_insight':
      return buildContextInsightSystemPrompt();
    case 'recommendation':
      return buildRecommendationSystemPrompt();
    case 'benchmark':
      return buildBenchmarkSystemPrompt();
    case 'roadmap':
      return buildRoadmapSystemPrompt(request?.sector);
    case 'discovery_interview':
      return buildDiscoveryInterviewSystemPrompt();
    default:
      return buildRecommendationSystemPrompt();
  }
}

/**
 * Returns the appropriate user prompt for a given agent action and request.
 */
function getUserPrompt(action: AgentAction, request: AgentRequest): string {
  switch (action) {
    case 'question_help':
      return buildQuestionHelpUserPrompt(request);
    case 'pillar_optimization':
      return buildPillarOptimizationUserPrompt(request);
    case 'context_insight':
      return buildContextInsightUserPrompt(request);
    case 'recommendation':
      return buildRecommendationUserPrompt(request);
    case 'benchmark':
      return buildBenchmarkUserPrompt(request);
    case 'roadmap':
      return buildRoadmapUserPrompt(request);
    case 'discovery_interview':
      return buildDiscoveryInterviewUserPrompt(request);
    default:
      return buildRecommendationUserPrompt(request);
  }
}

/**
 * Returns a fallback response for a given agent action when LLM is unavailable.
 */
function getFallbackResponse(action: AgentAction, request: AgentRequest): string {
  switch (action) {
    case 'question_help':
      return fallbackQuestionHelp(request);
    case 'pillar_optimization':
      return fallbackPillarOptimization(request);
    case 'context_insight':
      return fallbackContextInsight(request);
    case 'recommendation':
      return fallbackRecommendation(request);
    case 'benchmark':
      return fallbackBenchmark(request);
    case 'roadmap':
      return fallbackRoadmap(request);
    case 'discovery_interview':
      return fallbackDiscoveryInterview(request);
    default:
      return fallbackRecommendation(request);
  }
}

/**
 * Extracts follow-up questions from LLM response content.
 * Looks for questions in the content and returns up to 3.
 */
function extractFollowUpQuestions(content: string): string[] {
  const questions: string[] = [];
  // Match lines that contain question marks and are phrased as questions
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim().replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '');
    if (trimmed.includes('?') && trimmed.length > 10 && trimmed.length < 200) {
      questions.push(trimmed);
      if (questions.length >= 3) break;
    }
  }
  return questions;
}

/**
 * Determines related pillars based on the action and request context.
 */
function identifyRelatedPillars(action: AgentAction, request: AgentRequest): string[] {
  const related: string[] = [];

  if (request.pillarId) {
    // Map pillar interdependencies
    const dependencies: Record<string, string[]> = {
      strategy: ['data', 'governance', 'talent'],
      data: ['technology', 'strategy', 'security'],
      technology: ['data', 'talent', 'process'],
      talent: ['culture', 'strategy', 'technology'],
      governance: ['security', 'strategy', 'culture'],
      culture: ['talent', 'process', 'governance'],
      process: ['technology', 'culture', 'data'],
      security: ['governance', 'data', 'technology'],
    };
    related.push(...(dependencies[request.pillarId] || []));
  }

  // For benchmark/recommendation, include weakest pillars
  if ((action === 'benchmark' || action === 'recommendation') && request.pillarScores) {
    const sorted = [...request.pillarScores].sort((a, b) => a.score - b.score);
    sorted.slice(0, 3).forEach(p => {
      if (!related.includes(p.pillarId)) related.push(p.pillarId);
    });
  }

  return related.slice(0, 4);
}

/**
 * Parse structured DiscoveryResult from LLM JSON response.
 * Falls back to extracting what we can from free text.
 */
function parseDiscoveryResult(content: string, fallbackRequest: AgentRequest): { discoveryResult: DiscoveryResult; rawContent: string } {
  // Try to parse JSON from the response
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.landscapeAnalysis || parsed.gapIndicators || parsed.competitivePosition) {
      const result: DiscoveryResult = {
        landscapeAnalysis: typeof parsed.landscapeAnalysis === 'string' ? parsed.landscapeAnalysis : '',
        competitivePosition: typeof parsed.competitivePosition === 'string' ? parsed.competitivePosition : '',
        gapIndicators: Array.isArray(parsed.gapIndicators)
          ? parsed.gapIndicators.filter((g: unknown) => typeof g === 'object' && g !== null).map((g: Record<string, unknown>) => ({
              pillar: typeof g.pillar === 'string' ? g.pillar : 'strategy',
              indicator: typeof g.indicator === 'string' ? g.indicator : 'Gap identified',
              severity: g.severity === 'low' || g.severity === 'medium' || g.severity === 'high' ? g.severity : 'medium',
            }))
          : [],
        regulatorySignals: Array.isArray(parsed.regulatorySignals)
          ? parsed.regulatorySignals.filter((s: unknown) => typeof s === 'string')
          : [],
        techStackInsights: Array.isArray(parsed.techStackInsights)
          ? parsed.techStackInsights.filter((s: unknown) => typeof s === 'string')
          : [],
        rawSummary: typeof parsed.rawSummary === 'string' ? parsed.rawSummary : content,
      };
      return { discoveryResult: result, rawContent: content };
    }
  } catch {
    // JSON parse failed; try to find JSON in the text
  }

  const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]);
      if (parsed.landscapeAnalysis || parsed.gapIndicators) {
        return parseDiscoveryResult(JSON.stringify(parsed), fallbackRequest);
      }
    } catch {
      // Nested parse also failed
    }
  }

  // Fallback: return structured result from template
  const fallback = fallbackDiscoveryResult(fallbackRequest);
  fallback.rawSummary = content;
  return { discoveryResult: fallback, rawContent: content };
}

// ─── Main Exported Functions ────────────────────────────────────────────────

/**
 * Query the AI agent for assistance with a specific action.
 *
 * This is the primary entry point for all agent interactions. It routes
 * the request to the appropriate system prompt, calls the LLM, and
 * returns a structured response with follow-up questions and related pillars.
 *
 * Falls back to deterministic template responses if the LLM is unavailable.
 *
 * @param request - The agent request specifying the action and context
 * @returns A structured agent response with content and metadata
 */
export async function queryAgent(request: AgentRequest): Promise<AgentResponse> {
  const timestamp = new Date().toISOString();
  const { action } = request;

  try {
    const systemPrompt = getSystemPrompt(action, request);
    const userPrompt = getUserPrompt(action, request);

    // Build conversation messages including history if provided
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Include conversation history for multi-turn interactions
    if (request.conversationHistory && request.conversationHistory.length > 0) {
      for (const msg of request.conversationHistory) {
        messages.push(msg);
      }
    }

    messages.push({ role: 'user', content: userPrompt });

    // Call LLM with increased max_tokens
    const glmResponse = await fetch(
      LLM_API_URL_PRO,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NVIDIA_API_KEY_PRO}`,
        },
        body: JSON.stringify({
          model: LLM_MODEL_PRO,
          messages,
          max_tokens: 3000,
          temperature: 0.3,
        }),
      }
    );
    if (!glmResponse.ok) {
      const errText = await glmResponse.text();
      console.error('LLM API error:', glmResponse.status, errText);
      throw new Error(`LLM service error: ${glmResponse.status}`);
    }
    const glmData = await glmResponse.json();
    const completion = { choices: glmData.choices };

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty LLM response');
    }

    // For context_insight, parse structured DiscoveryResult
    if (action === 'context_insight') {
      const { discoveryResult, rawContent } = parseDiscoveryResult(content, request);
      return {
        content: rawContent,
        action,
        followUpQuestions: extractFollowUpQuestions(rawContent),
        relatedPillars: identifyRelatedPillars(action, request),
        isAIGenerated: true,
        modelUsed: 'GLM-5.1',
        generatedAt: timestamp,
        structuredContent: discoveryResult,
      };
    }

    return {
      content,
      action,
      followUpQuestions: extractFollowUpQuestions(content),
      relatedPillars: identifyRelatedPillars(action, request),
      isAIGenerated: true,
      modelUsed: 'z-ai-llm',
      generatedAt: timestamp,
    };
  } catch (error) {
    // Fallback to deterministic template response
    console.error(`[E-ARI Agent] LLM unavailable for action "${action}", using fallback:`, error);

    const fallbackContent = getFallbackResponse(action, request);

    // For context_insight, also provide structured fallback
    if (action === 'context_insight') {
      const discoveryResult = fallbackDiscoveryResult(request);
      return {
        content: fallbackContent,
        action,
        followUpQuestions: [],
        relatedPillars: identifyRelatedPillars(action, request),
        isAIGenerated: false,
        generatedAt: timestamp,
        structuredContent: discoveryResult,
      };
    }

    return {
      content: fallbackContent,
      action,
      followUpQuestions: [],
      relatedPillars: identifyRelatedPillars(action, request),
      isAIGenerated: false,
      generatedAt: timestamp,
    };
  }
}

/**
 * Get contextual help for a specific assessment question.
 */
export async function getQuestionHelp(
  pillarId: string,
  questionId: string,
  questionText: string,
  sector?: string
): Promise<string> {
  const response = await queryAgent({
    action: 'question_help',
    pillarId,
    questionId,
    questionText,
    sector,
  });

  return response.content;
}

/**
 * Generate an AI adoption roadmap based on assessment results.
 *
 * Creates a phased roadmap with 3-4 phases spanning 12-24 months.
 * Phase 1 addresses foundational gaps, and subsequent phases build on
 * prior outcomes. Each phase includes objectives, key actions,
 * investment levels, and specific pillar focus areas.
 */
export async function generateRoadmap(
  overallScore: number,
  pillarScores: Array<{ pillarId: string; score: number; maturityLabel: string }>,
  sector?: string,
  orgContext?: string
): Promise<RoadmapPhase[]> {
  const timestamp = new Date().toISOString();

  try {
    const systemPrompt = buildRoadmapSystemPrompt(sector);
    const userPrompt = buildRoadmapUserPrompt({
      action: 'roadmap',
      overallScore,
      pillarScores,
      sector,
      orgContext,
    });

    const { content } = await callLLM(systemPrompt, userPrompt);

    // Try to parse JSON from the response
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    // Try direct JSON parse
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        return validateAndNormalizePhases(parsed);
      }
      if (parsed.phases && Array.isArray(parsed.phases)) {
        return validateAndNormalizePhases(parsed.phases);
      }
      if (parsed.roadmap && Array.isArray(parsed.roadmap)) {
        return validateAndNormalizePhases(parsed.roadmap);
      }
    } catch {
      // JSON parse failed; try to extract JSON from within the text
    }

    // Try to find JSON array in the response
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        if (Array.isArray(parsed)) {
          return validateAndNormalizePhases(parsed);
        }
      } catch {
        // Nested JSON parse also failed
      }
    }

    // If all parsing fails, return template fallback
    console.error('[E-ARI Agent] Failed to parse roadmap LLM response, using fallback');
    return generateFallbackRoadmap(overallScore, pillarScores);
  } catch (error) {
    console.error('[E-ARI Agent] LLM unavailable for roadmap generation, using fallback:', error);
    return generateFallbackRoadmap(overallScore, pillarScores);
  }
}

/**
 * Get sector benchmark comparison for an organization's pillar scores.
 *
 * Uses curated benchmark data as a base and asks the LLM to adjust
 * based on organizational context. Falls back to curated data if LLM
 * is unavailable.
 */
export async function getSectorBenchmark(
  sectorId: string,
  pillarScores: Array<{ pillarId: string; score: number }>
): Promise<BenchmarkResult> {
  const sectorDef = getSectorById(sectorId);
  const sectorName = sectorDef?.name || sectorId;

  try {
    const systemPrompt = buildBenchmarkSystemPrompt();
    const userPrompt = buildBenchmarkUserPrompt({
      action: 'benchmark',
      sectorId,
      pillarScores: pillarScores.map(p => ({
        ...p,
        maturityLabel: getMaturityLabelForScore(p.score),
      })),
    });

    const { content } = await callLLM(systemPrompt, userPrompt);

    // Try to parse JSON from the response
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    try {
      const parsed = JSON.parse(jsonStr);
      return validateAndNormalizeBenchmark(parsed, sectorName, pillarScores, true);
    } catch {
      // JSON parse failed; try to find JSON in the text
    }

    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        const parsed = JSON.parse(objectMatch[0]);
        return validateAndNormalizeBenchmark(parsed, sectorName, pillarScores, true);
      } catch {
        // Nested parse also failed
      }
    }

    // If all parsing fails, return curated fallback
    console.error('[E-ARI Agent] Failed to parse benchmark LLM response, using curated fallback');
    return generateCuratedBenchmark(sectorName, sectorId, pillarScores);
  } catch (error) {
    console.error('[E-ARI Agent] LLM unavailable for benchmark, using curated fallback:', error);
    return generateCuratedBenchmark(sectorName, sectorId, pillarScores);
  }
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Returns the maturity label for a given normalized score.
 */
function getMaturityLabelForScore(score: number): string {
  if (score <= 25) return 'Laggard';
  if (score <= 50) return 'Follower';
  if (score <= 75) return 'Chaser';
  return 'Pacesetter';
}

/**
 * Validates and normalizes parsed roadmap phases from LLM response.
 * Ensures all required fields exist and have correct types.
 */
function validateAndNormalizePhases(phases: unknown[]): RoadmapPhase[] {
  if (!Array.isArray(phases) || phases.length === 0) {
    throw new Error('No valid phases in LLM response');
  }

  return phases.slice(0, 4).map((phase, index): RoadmapPhase => {
    const p = phase as Record<string, unknown>;
    const validInvestmentLevels = ['low', 'medium', 'high'] as const;

    let investmentLevel: 'low' | 'medium' | 'high' = 'medium';
    if (typeof p.investmentLevel === 'string' && validInvestmentLevels.includes(p.investmentLevel as 'low' | 'medium' | 'high')) {
      investmentLevel = p.investmentLevel as 'low' | 'medium' | 'high';
    }

    return {
      phase: typeof p.phase === 'string' ? p.phase : `Phase ${index + 1}`,
      timeframe: typeof p.timeframe === 'string' ? p.timeframe : '6 months',
      objectives: Array.isArray(p.objectives)
        ? p.objectives.filter((o: unknown) => typeof o === 'string').slice(0, 3)
        : [`Improve readiness in phase ${index + 1} focus areas`],
      keyActions: Array.isArray(p.keyActions) || Array.isArray(p.actions)
        ? ((p.keyActions || p.actions) as unknown[]).filter((a: unknown) => typeof a === 'string').slice(0, 5)
        : [`Execute phase ${index + 1} improvements`],
      investmentLevel,
      pillarFocus: Array.isArray(p.pillarFocus) || Array.isArray(p.focusPillars)
        ? ((p.pillarFocus || p.focusPillars) as unknown[]).filter((f: unknown) => typeof f === 'string').slice(0, 4)
        : [],
    };
  });
}

/**
 * Validates and normalizes a parsed benchmark result from LLM response.
 * Uses curated data for fallback values instead of Math.random().
 */
function validateAndNormalizeBenchmark(
  parsed: Record<string, unknown>,
  sectorName: string,
  pillarScores: Array<{ pillarId: string; score: number }>,
  isAIGenerated: boolean
): BenchmarkResult {
  // Get curated benchmarks for this sector as fallback
  const curated = getCuratedBenchmark(sectorName);

  const pillarBenchmarks = pillarScores.map(ps => {
    // Try to find matching benchmark from parsed data
    const match = Array.isArray(parsed.pillarBenchmarks)
      ? (parsed.pillarBenchmarks as Array<Record<string, unknown>>).find(
          (pb) => pb.pillarId === ps.pillarId
        )
      : null;

    const sectorAvg = typeof match?.sectorAverage === 'number'
      ? match.sectorAverage
      : curated.pillarAverages[ps.pillarId] || curated.averageScore;

    const percentile = typeof match?.percentile === 'number'
      ? match.percentile
      : computePercentile(ps.score, sectorAvg);

    return {
      pillarId: ps.pillarId,
      userScore: ps.score,
      sectorAverage: Math.round(sectorAvg),
      percentile: Math.round(Math.max(5, Math.min(95, percentile))),
    };
  });

  const overallAvg = pillarBenchmarks.reduce((sum, pb) => sum + pb.sectorAverage, 0) / pillarBenchmarks.length;

  const methodology = typeof parsed.methodology === 'string'
    ? parsed.methodology
    : 'Based on curated industry research benchmarks with LLM-adjusted estimates. Confidence: medium. Key assumption: organization operates within typical sector parameters.';

  return {
    sector: sectorName,
    averageScore: typeof parsed.averageScore === 'number' ? Math.round(parsed.averageScore) : Math.round(overallAvg),
    topQuartile: typeof parsed.topQuartile === 'number' ? Math.round(parsed.topQuartile) : curated.topQuartile,
    bottomQuartile: typeof parsed.bottomQuartile === 'number' ? Math.round(parsed.bottomQuartile) : curated.bottomQuartile,
    pillarBenchmarks,
    insight: typeof parsed.insight === 'string'
      ? `${parsed.insight} ⚠️ Sector benchmarks are AI-estimated and intended for directional guidance only. Actual sector performance may vary.`
      : `Your organization's AI readiness has been compared against estimated ${sectorName} sector benchmarks. Pillars where your score exceeds the sector average represent competitive advantages; those below indicate areas for targeted investment. ⚠️ Sector benchmarks are AI-estimated and intended for directional guidance only. Actual sector performance may vary.`,
    isAIGenerated,
    methodology,
  };
}

/**
 * Generates a fallback benchmark using curated data when LLM is unavailable.
 * Replaces the old Math.random()-based generateFallbackBenchmark.
 */
function generateCuratedBenchmark(
  sectorName: string,
  sectorId: string,
  pillarScores: Array<{ pillarId: string; score: number }>
): BenchmarkResult {
  const curated = getCuratedBenchmark(sectorId);

  const pillarBenchmarks = pillarScores.map(ps => {
    const sectorAvg = curated.pillarAverages[ps.pillarId] || curated.averageScore;
    const percentile = computePercentile(ps.score, sectorAvg);

    return {
      pillarId: ps.pillarId,
      userScore: ps.score,
      sectorAverage: sectorAvg,
      percentile,
    };
  });

  return {
    sector: sectorName,
    averageScore: curated.averageScore,
    topQuartile: curated.topQuartile,
    bottomQuartile: curated.bottomQuartile,
    pillarBenchmarks,
    insight: `Your organization's AI readiness has been compared against curated ${sectorName} sector benchmarks derived from industry research. Pillars where your score exceeds the sector average represent competitive advantages; those below indicate areas for targeted investment. ⚠️ Sector benchmarks are AI-estimated and intended for directional guidance only. Actual sector performance may vary.`,
    isAIGenerated: false,
    methodology: 'Based on curated industry research benchmarks (McKinsey, Gartner, WEF, Deloitte) without LLM adjustment. Confidence: medium. Key assumption: organization operates within typical sector parameters.',
  };
}

/**
 * Generates a fallback roadmap using templates when LLM is unavailable.
 */
function generateFallbackRoadmap(
  overallScore: number,
  pillarScores: Array<{ pillarId: string; score: number; maturityLabel: string }>
): RoadmapPhase[] {
  const sortedPillars = [...pillarScores].sort((a, b) => a.score - b.score);
  const weakest3 = sortedPillars.slice(0, 3).map(p => p.pillarId);
  const middle3 = sortedPillars.slice(3, 6).map(p => p.pillarId);
  const top2 = sortedPillars.slice(-2).map(p => p.pillarId);

  const phases: RoadmapPhase[] = [
    {
      phase: 'Foundation',
      timeframe: 'Months 1-6',
      objectives: [
        'Establish baseline capabilities in weakest areas',
        'Build governance and data foundations',
        'Secure executive sponsorship for AI initiatives',
      ],
      keyActions: [
        'Formalize AI strategy aligned with business objectives',
        'Establish data governance framework',
        'Implement foundational security controls',
        'Launch AI literacy program for leadership',
      ],
      investmentLevel: 'medium',
      pillarFocus: weakest3,
    },
    {
      phase: 'Acceleration',
      timeframe: 'Months 7-12',
      objectives: [
        'Scale initial AI successes',
        'Build operational AI capabilities',
        'Strengthen talent and technology infrastructure',
      ],
      keyActions: [
        'Deploy MLOps practices for production AI',
        'Expand AI talent through hiring and upskilling',
        'Integrate AI into core business workflows',
        'Establish cross-functional AI center of excellence',
      ],
      investmentLevel: 'medium',
      pillarFocus: middle3,
    },
    {
      phase: 'Optimization',
      timeframe: 'Months 13-18',
      objectives: [
        'Achieve competitive differentiation',
        'Optimize performance across all pillars',
        'Drive cultural transformation',
      ],
      keyActions: [
        'Scale AI across business units',
        'Implement advanced governance and ethics practices',
        'Drive cultural transformation and change management',
        'Establish continuous improvement processes',
      ],
      investmentLevel: 'high',
      pillarFocus: top2,
    },
  ];

  if (overallScore > 50) {
    phases.push({
      phase: 'Leadership',
      timeframe: 'Months 19-24',
      objectives: [
        'Achieve and sustain pacesetter status',
        'Lead industry practices',
        'Build ecosystem partnerships',
      ],
      keyActions: [
        'Contribute to industry standards and best practices',
        'Explore frontier AI capabilities',
        'Build ecosystem partnerships',
        'Ensure sustainability through organizational resilience',
      ],
      investmentLevel: 'medium',
      pillarFocus: PILLARS.map(p => p.id),
    });
  }

  return phases;
}

/**
 * LLM-powered literacy assessment.
 * Generates sector-specific, adaptive, role-based learning paths.
 */
export async function generateLiteracyAssessment(
  overallScore: number,
  pillarScores: Array<{ pillarId: string; score: number; maturityLabel: string; pillarName: string }>,
  sector: string,
  orgSize?: string
): Promise<Record<string, unknown>> {
  try {
    const sectorRef = getSectorReferences(sector);
    const sortedPillars = [...pillarScores].sort((a, b) => a.score - b.score);
    const weakestPillars = sortedPillars.slice(0, 3);
    const strongestPillars = sortedPillars.slice(-2);

    const literacyLevel = overallScore <= 25 ? 'Beginner'
      : overallScore <= 50 ? 'Developing'
      : overallScore <= 75 ? 'Proficient'
      : 'Expert';

    const systemPrompt = `You are an E-ARI Literacy Assessment Agent. You generate specific, sector-relevant learning paths based on an organization's AI readiness assessment results.

E-ARI FRAMEWORK PILLARS:
${PILLAR_REFERENCE}

Your role:
- Generate sector-specific learning recommendations (NOT generic "AI Data Fundamentals")
- Adapt difficulty based on the overall score level
- Create role-based learning paths based on org size and sector
- Recommend specific courses/modules with estimated hours
- Every module name must reference the sector and specific capability gap
- Example: NOT "AI Governance Fundamentals" but "HIPAA-Compliant AI Governance for Clinical Systems" for healthcare

OUTPUT FORMAT — valid JSON:
\`\`\`json
{
  "overallLiteracyLevel": "Beginner|Developing|Proficient|Expert",
  "literacyScore": number,
  "focusAreas": [{"pillar": "string", "score": number, "priority": "critical|high|moderate"}],
  "strengths": [{"pillar": "string", "score": number}],
  "recommendedModules": [
    {
      "order": number,
      "title": "sector-specific module title",
      "description": "what this module covers, referencing sector-specific tools/practices",
      "priority": "critical|high|moderate",
      "pillarId": "string",
      "estimatedHours": number,
      "targetAudience": "string describing role/team",
      "difficultyLevel": "beginner|intermediate|advanced"
    }
  ],
  "roleBasedPaths": [
    {"role": "string", "recommendedModules": [1, 2], "rationale": "string"}
  ],
  "generatedAt": "ISO date string"
}
\`\`\`

${GUARDRAILS}`;

    const userPrompt = `Generate an AI literacy assessment and learning path for this organization.

Overall Score: ${overallScore}% (${literacyLevel})
Sector: ${sector}
Organization Size: ${orgSize || 'Not specified'}

Sector Context:
- Key systems: ${sectorRef.keySystems.join(', ')}
- Key regulations: ${sectorRef.keyRegulations.join(', ')}
- Typical AI use cases: ${sectorRef.keyUseCases.join(', ')}

Weakest Pillars (focus areas):
${weakestPillars.map(p => `- ${p.pillarName}: ${p.score}% (${p.maturityLabel})`).join('\n')}

Strongest Pillars:
${strongestPillars.map(p => `- ${p.pillarName}: ${p.score}% (${p.maturityLabel})`).join('\n')}

Generate 4-6 specific learning modules. Every module title must be sector-specific (NOT "AI X Fundamentals" but something like "FHIR Data Pipeline Architecture for Clinical AI" or "SR 11-7 Model Risk Management for Banking AI").`;

    const { content } = await callLLM(systemPrompt, userPrompt, 2500);

    // Try to parse JSON
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    try {
      const parsed = JSON.parse(jsonStr);
      // Ensure generatedAt is set
      parsed.generatedAt = parsed.generatedAt || new Date().toISOString();
      parsed.literacyScore = parsed.literacyScore || Math.round(overallScore);
      parsed.overallLiteracyLevel = parsed.overallLiteracyLevel || literacyLevel;
      return parsed;
    } catch {
      // Try to find JSON object
      const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try {
          const parsed = JSON.parse(objectMatch[0]);
          parsed.generatedAt = parsed.generatedAt || new Date().toISOString();
          return parsed;
        } catch {
          // JSON parse failed
        }
      }
    }

    // If parsing fails, fall through to deterministic fallback
    console.error('[E-ARI Agent] Failed to parse literacy LLM response, using fallback');
    return generateFallbackLiteracy(overallScore, pillarScores, sector, orgSize);
  } catch (error) {
    console.error('[E-ARI Agent] LLM unavailable for literacy assessment, using fallback:', error);
    return generateFallbackLiteracy(overallScore, pillarScores, sector, orgSize);
  }
}

/**
 * Generates a deterministic fallback literacy assessment with sector-specific module names.
 */
function generateFallbackLiteracy(
  overallScore: number,
  pillarScores: Array<{ pillarId: string; score: number; maturityLabel: string; pillarName: string }>,
  sector: string,
  orgSize?: string
): Record<string, unknown> {
  const sortedPillars = [...pillarScores].sort((a, b) => a.score - b.score);
  const weakestPillars = sortedPillars.slice(0, 3);
  const strongestPillars = sortedPillars.slice(-2);
  const sectorRef = getSectorReferences(sector);

  // Sector-specific module name templates
  const sectorModuleNames: Record<string, Record<string, string>> = {
    healthcare: {
      strategy: 'Clinical AI Strategy & FDA SaMD Pathway Planning',
      data: 'FHIR Data Pipeline Architecture for Clinical AI',
      technology: 'Clinical MLOps: Model Monitoring in Healthcare Environments',
      talent: 'Clinical AI Literacy for Physicians & Care Teams',
      governance: 'HIPAA-Compliant AI Governance for Clinical Systems',
      culture: 'Change Management for AI in Clinical Workflows',
      process: 'AI-Enabled Clinical Workflow Optimization',
      security: 'Healthcare AI Security & Patient Data Protection',
    },
    finance: {
      strategy: 'AI Strategy for Banking: SR 11-7 & Model Risk Integration',
      data: 'Real-Time Financial Data Pipelines for AI Workloads',
      technology: 'MLOps for Financial Models: Monitoring & Compliance',
      talent: 'AI Literacy for Risk Analysts & Compliance Officers',
      governance: 'Fair Lending Compliance & AI Bias Detection in Credit Models',
      culture: 'AI Adoption in Trading & Risk Teams',
      process: 'KYC Automation & AI-Driven Process Optimization',
      security: 'Financial AI Security: Adversarial Defense & Fraud Prevention',
    },
    manufacturing: {
      strategy: 'Industry 4.0 AI Strategy & Smart Factory Planning',
      data: 'IoT Sensor Data Pipeline Architecture for Predictive Analytics',
      technology: 'Edge AI Deployment for Quality Inspection & Predictive Maintenance',
      talent: 'AI Literacy for Plant Managers & OT Engineers',
      governance: 'IEC 62443 Aligned AI Governance for Industrial Systems',
      culture: 'AI Adoption on the Shop Floor: Change Management for Operations',
      process: 'Predictive Maintenance Workflow Design & KPI Tracking',
      security: 'OT/IT Convergence Security for Industrial AI Systems',
    },
    technology: {
      strategy: 'Product-Led AI Strategy & Platform Thinking',
      data: 'Feature Store Architecture & Real-Time ML Data Pipelines',
      technology: 'Production ML Systems: MLOps at Scale',
      talent: 'Full-Stack ML Engineering Skills Development',
      governance: 'Responsible AI: Explainability, Fairness & Transparency',
      culture: 'AI-Native Product Development Culture',
      process: 'CI/CD for ML: Automated Training, Testing & Deployment',
      security: 'ML Security: Adversarial Robustness & Model Protection',
    },
    government: {
      strategy: 'Public Sector AI Strategy & FedRAMP Compliance Planning',
      data: 'Secure Data Pipeline Architecture for Government AI Systems',
      technology: 'GovCloud AI Deployment & Legacy System Integration',
      talent: 'AI Literacy for Government Program Managers',
      governance: 'NIST AI RMF Implementation for Public Sector AI',
      culture: 'Citizen-Centric AI Adoption & Public Trust Building',
      process: 'AI-Enabled Government Process Automation & RPA',
      security: 'FISMA-Compliant AI Security & FedRAMP Authorization',
    },
    retail: {
      strategy: 'Customer-Centric AI Strategy & Omnichannel Planning',
      data: 'Customer Data Platform Architecture & Real-Time Personalization Pipelines',
      technology: 'Recommendation Engine Deployment & A/B Testing at Scale',
      talent: 'AI Literacy for Merchandising & Marketing Teams',
      governance: 'Consumer Data Privacy (GDPR/CCPA) & AI Ethics in Retail',
      culture: 'Data-Driven Culture for Retail AI Adoption',
      process: 'Demand Forecasting & Inventory Optimization with AI',
      security: 'PCI DSS-Compliant AI Systems & Fraud Detection',
    },
    education: {
      strategy: 'AI-Enhanced Learning Strategy & Digital Transformation Planning',
      data: 'Learning Analytics Data Pipeline Architecture',
      technology: 'Adaptive Learning Platform Integration & LMS AI Deployment',
      talent: 'AI Literacy for Educators & Academic Administrators',
      governance: 'FERPA-Compliant AI Governance for Student Data',
      culture: 'AI-Enhanced Teaching Culture & Faculty Adoption',
      process: 'Automated Assessment & Learning Path Optimization',
      security: 'Student Data Protection & EdTech AI Security',
    },
    energy: {
      strategy: 'Energy Transition AI Strategy & Digital Twin Planning',
      data: 'SCADA/IoT Data Pipeline Architecture for Energy AI',
      technology: 'Edge AI for Remote Monitoring & Predictive Maintenance',
      talent: 'AI Literacy for Field Engineers & Operations Teams',
      governance: 'NERC CIP Aligned AI Governance for Critical Infrastructure',
      culture: 'AI Adoption in High-Safety Energy Environments',
      process: 'Predictive Maintenance Workflow Design for Turbines & Pipelines',
      security: 'Critical Infrastructure AI Security & IEC 62351 Compliance',
    },
  };

  const defaultModules: Record<string, string> = {
    strategy: 'AI Strategy & Investment Roadmap Planning',
    data: 'Data Pipeline Architecture for AI Workloads',
    technology: 'MLOps Platform Selection & Deployment',
    talent: 'AI Literacy & Cross-Functional Collaboration',
    governance: 'AI Governance Framework Design & Implementation',
    culture: 'AI Adoption Change Management',
    process: 'AI-Enabled Process Automation & Optimization',
    security: 'AI Security Controls & Compliance Readiness',
  };

  const modules = sectorModuleNames[sector] || sectorModuleNames.technology;

  const difficultyLevel = overallScore <= 25 ? 'beginner'
    : overallScore <= 50 ? 'beginner'
    : overallScore <= 75 ? 'intermediate'
    : 'advanced';

  const estimatedHours = overallScore <= 25 ? 40
    : overallScore <= 50 ? 30
    : overallScore <= 75 ? 20
    : 12;

  const result: Record<string, unknown> = {
    overallLiteracyLevel: overallScore <= 25 ? 'Beginner'
      : overallScore <= 50 ? 'Developing'
      : overallScore <= 75 ? 'Proficient'
      : 'Expert',
    literacyScore: Math.round(overallScore),
    focusAreas: weakestPillars.map(p => ({
      pillar: p.pillarName,
      score: Math.round(p.score),
      priority: p.score < 30 ? 'critical' : p.score < 45 ? 'high' : 'moderate',
    })),
    strengths: strongestPillars.map(p => ({
      pillar: p.pillarName,
      score: Math.round(p.score),
    })),
    recommendedModules: weakestPillars.map((p, i) => ({
      order: i + 1,
      title: modules[p.pillarId] || defaultModules[p.pillarId],
      description: `Build ${p.pillarName.toLowerCase()} capabilities specific to the ${sector} sector, addressing the gap at ${p.score}% readiness. Focus on ${sectorRef.keyUseCases[i % sectorRef.keyUseCases.length] || 'sector-specific practices'}.`,
      priority: i === 0 ? 'critical' : i === 1 ? 'high' : 'moderate',
      pillarId: p.pillarId,
      estimatedHours: estimatedHours - i * 4,
      targetAudience: orgSize === 'enterprise' ? 'Department leaders and technical staff' : orgSize === 'mid-market' ? 'Cross-functional team leads' : 'Core AI team and leadership',
      difficultyLevel,
    })),
    roleBasedPaths: [
      {
        role: 'Executive Leadership',
        recommendedModules: [1],
        rationale: `Strategic understanding of ${sector} AI landscape and investment priorities`,
      },
      {
        role: 'Technical Teams',
        recommendedModules: weakestPillars.map((_, i) => i + 1),
        rationale: `Deep technical capability building in ${sector} AI readiness gaps`,
      },
    ],
    generatedAt: new Date().toISOString(),
  };

  return result;
}
