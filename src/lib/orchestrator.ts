/**
 * E-ARI Orchestrator — The Brain
 *
 * Coordinates the six AI agents into a proper pipeline with:
 * - Sequential + parallel execution stages
 * - Shared context between agents (output of one feeds input of next)
 * - Result caching (no duplicate LLM calls)
 * - Status tracking per agent per pipeline run
 * - Tier-aware execution (skip agents the user can't access)
 * - Graceful degradation (partial completion is still useful)
 *
 * Pipeline Flow:
 * ┌──────────────┐
 * │  SCORING     │ ← Deterministic, always runs first
 * └──────┬───────┘
 *        ↓
 * ┌──────┴────────────────────────┐
 * │     PARALLEL FAN-OUT          │
 * │  ┌──────────┐ ┌────────────┐  │
 * │  │ INSIGHT  │ │ DISCOVERY  │  │ ← Run simultaneously
 * │  └─────┬────┘ └─────┬──────┘  │
 * └────────┼─────────────┼─────────┘
 *          ↓             ↓
 * ┌────────┴──────────────┴──────┐
 * │  REPORT (compiles all above)  │ ← Combines outputs
 * └──────────────┬───────────────┘
 *                ↓
 * ┌──────────────┴──────────────────────┐
 * │  LITERACY (adaptive layer)          │ ← Always available
 * │  ASSISTANT (interactive layer)      │ ← On-demand after pipeline
 * └────────────────────────────────────┘
 *
 * This module runs server-side only.
 */

import { db } from './db';
import {
  scoreAssessment,
  type ScoringResult,
  type ResponseMap,
} from './assessment-engine';
import { formatFindingsForPrompt } from './scoring-patterns';
import {
  generateAIInsights,
  generateTemplateInsightsSync,
  type AIInsightResult,
} from './ai-insights';
import {
  queryAgent,
  generateRoadmap,
  getSectorBenchmark,
  generateLiteracyAssessment,
  getCuratedBenchmark,
  computePercentile,
  type AgentAction,
  type AgentRequest,
  type AgentResponse,
  type RoadmapPhase,
  type BenchmarkResult,
  type DiscoveryResult,
} from './agent';
import { scrapeOrganizationContext, type OrgContext } from './scraper';

// ─── Types ──────────────────────────────────────────────────────────────────

/** The six agent identifiers */
export type AgentId = 'scoring' | 'insight' | 'discovery' | 'report' | 'assistant' | 'literacy';

/** Pipeline execution status */
export type PipelineStatus = 'pending' | 'running' | 'completed' | 'failed' | 'partial';

/** Individual agent stage status */
export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/** Shared context that flows through the pipeline */
export interface PipelineContext {
  assessmentId: string;
  userId: string;
  sector: string;
  orgSize?: string;
  organization?: string;
  tier: string;
  /** Response map from the assessment */
  responses: ResponseMap;
  /** Org context from web scraping (if available) */
  orgContext?: OrgContext;
  /** Results from each completed agent stage */
  scoringResult?: ScoringResult;
  insightResult?: AIInsightResult;
  discoveryResult?: DiscoveryResult;
  roadmapResult?: RoadmapPhase[];
  benchmarkResult?: BenchmarkResult;
  recommendationResult?: string;
  literacyResult?: Record<string, unknown>;
}

/** A single stage result */
export interface StageResult {
  agent: AgentId;
  status: StageStatus;
  output?: unknown;
  error?: string;
  durationMs?: number;
}

/** The full pipeline result */
export interface PipelineResult {
  pipelineRunId: string;
  status: PipelineStatus;
  stages: StageResult[];
  context: PipelineContext;
  startedAt: string;
  completedAt?: string;
  totalDurationMs?: number;
}

/** Configuration for a pipeline run */
export interface PipelineConfig {
  assessmentId: string;
  userId: string;
  tier: string;
  triggeredBy?: 'auto' | 'manual' | 'retry';
  /** Skip specific agents */
  skipAgents?: AgentId[];
  /** Only run specific agents (overrides skipAgents) */
  onlyAgents?: AgentId[];
  /** Provide org context directly (skip scraping) */
  orgContext?: OrgContext;
  /** Sector override */
  sector?: string;
  orgSize?: string;
  organization?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ORCHESTRATOR_VERSION = '2.0.0';

/** Agent execution order — defines the pipeline stages */
const PIPELINE_STAGES: { agents: AgentId[]; parallel: boolean }[] = [
  { agents: ['scoring'], parallel: false },                        // Stage 1: Scoring (must run first)
  { agents: ['insight', 'discovery'], parallel: true },            // Stage 2: Insight + Discovery in parallel
  { agents: ['report'], parallel: false },                          // Stage 3: Report (compiles above)
  { agents: ['literacy'], parallel: false },                        // Stage 4: Literacy (adaptive)
  // Assistant is NOT auto-run — it's on-demand after pipeline completes
];

/** Which tiers unlock which agents */
const TIER_ACCESS: Record<AgentId, string[]> = {
  scoring: ['free', 'professional', 'enterprise'],
  insight: ['free', 'professional', 'enterprise'],  // Free tier gets 1 insight summary (limited)
  discovery: ['professional', 'enterprise'],
  report: ['professional', 'enterprise'],
  assistant: ['professional', 'enterprise'],
  literacy: ['free', 'professional', 'enterprise'],
};

// ─── Caching Layer ──────────────────────────────────────────────────────────

/** In-memory cache keyed by assessmentId+key to prevent duplicate LLM calls */
const resultCache = new Map<string, { result: unknown; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCacheKey(assessmentId: string, key: string): string {
  return `${assessmentId}::${key}`;
}

function getCachedResult<T>(assessmentId: string, key: string): T | null {
  const k = getCacheKey(assessmentId, key);
  const cached = resultCache.get(k);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    resultCache.delete(k);
    return null;
  }
  return cached.result as T;
}

function setCachedResult(assessmentId: string, key: string, result: unknown): void {
  const k = getCacheKey(assessmentId, key);
  resultCache.set(k, { result, timestamp: Date.now() });
}

/**
 * Clear cached results for an assessment (e.g., on re-submit)
 */
export function clearCache(assessmentId: string): void {
  for (const key of resultCache.keys()) {
    if (key.startsWith(`${assessmentId}::`)) {
      resultCache.delete(key);
    }
  }
}

// ─── DB Helpers ─────────────────────────────────────────────────────────────

async function createPipelineRun(config: PipelineConfig): Promise<string> {
  const run = await db.pipelineRun.create({
    data: {
      assessmentId: config.assessmentId,
      userId: config.userId,
      triggeredBy: config.triggeredBy || 'auto',
      status: 'pending',
    },
  });
  return run.id;
}

async function updatePipelineRunStatus(
  runId: string,
  status: PipelineStatus,
  startedAt?: Date,
  completedAt?: Date
): Promise<void> {
  await db.pipelineRun.update({
    where: { id: runId },
    data: {
      status,
      ...(startedAt && { startedAt }),
      ...(completedAt && { completedAt }),
    },
  });
}

async function createStage(
  runId: string,
  agent: AgentId
): Promise<string> {
  const stage = await db.pipelineStage.create({
    data: {
      pipelineRunId: runId,
      agent,
      status: 'pending',
    },
  });
  return stage.id;
}

async function updateStageResult(
  stageId: string,
  status: StageStatus,
  data: {
    input?: string;
    output?: string;
    error?: string;
    durationMs?: number;
    startedAt?: Date;
    completedAt?: Date;
  }
): Promise<void> {
  await db.pipelineStage.update({
    where: { id: stageId },
    data: {
      status,
      ...data,
    },
  });
}

// ─── Agent Execution Functions ──────────────────────────────────────────────

/**
 * SCORING AGENT — Deterministic, always runs first.
 * No LLM call. Computes pillar scores, adjustments, maturity band.
 */
async function executeScoringAgent(ctx: PipelineContext): Promise<ScoringResult> {
  // Check cache first
  const cached = getCachedResult<ScoringResult>(ctx.assessmentId, 'scoring');
  if (cached) return cached;

  // Sector-aware scoring — the engine applies sector-specific pillar weights
  // and detects structural risk patterns (X-Ray findings) from response combos.
  const result = scoreAssessment(ctx.responses, ctx.sector);
  setCachedResult(ctx.assessmentId, 'scoring', result);
  return result;
}

/**
 * INSIGHT AGENT — LLM-powered narrative insights grounded in scores.
 * Uses the scoring result as input. Falls back to template insights.
 */
async function executeInsightAgent(ctx: PipelineContext): Promise<AIInsightResult> {
  // Check cache
  const cached = getCachedResult<AIInsightResult>(ctx.assessmentId, 'insight');
  if (cached) return cached;

  if (!ctx.scoringResult) {
    throw new Error('Insight agent requires scoring result');
  }

  const result = await generateAIInsights(ctx.scoringResult, {
    sector: ctx.sector,
    orgSize: ctx.orgSize,
  }, ctx.responses);

  setCachedResult(ctx.assessmentId, 'insight', result);
  return result;
}

/**
 * DISCOVERY AGENT — Maps the organization's AI landscape.
 * Runs web scraping + LLM synthesis to identify gaps and opportunities.
 * Returns structured DiscoveryResult instead of plain string.
 */
async function executeDiscoveryAgent(ctx: PipelineContext): Promise<DiscoveryResult> {
  // Check cache
  const cached = getCachedResult<DiscoveryResult>(ctx.assessmentId, 'discovery');
  if (cached) return cached;

  // Try to use existing org context or scrape new
  let orgContext = ctx.orgContext;
  if (!orgContext && ctx.organization) {
    try {
      orgContext = await scrapeOrganizationContext({
        orgName: ctx.organization,
        sector: ctx.sector,
      });
    } catch {
      // Scraping failed — continue without context
    }
  }

  // If we have scoring results, ask the discovery agent for gap analysis
  if (ctx.scoringResult) {
    const pillarScores = ctx.scoringResult.pillarScores.map(p => ({
      pillarId: p.pillarId,
      score: Math.round(p.normalizedScore),
      maturityLabel: p.maturityLabel,
    }));

    // Prepend X-Ray findings to the discovery prompt so the agent grounds its
    // landscape analysis in detected structural patterns, not just scores.
    const xRayBlock = ctx.scoringResult.xRayFindings && ctx.scoringResult.xRayFindings.length > 0
      ? `${formatFindingsForPrompt(ctx.scoringResult.xRayFindings)}\n\n`
      : '';
    const orgContextBlock = orgContext
      ? JSON.stringify(orgContext)
      : `Organization in ${ctx.sector} sector, size: ${ctx.orgSize || 'unknown'}`;

    const request: AgentRequest = {
      action: 'context_insight',
      orgContext: xRayBlock + orgContextBlock,
      pillarScores,
      sector: ctx.sector,
      orgSize: ctx.orgSize,
    };

    const response = await queryAgent(request);

    // If the response has structured content, use it directly
    if (response.structuredContent) {
      const discoveryResult = response.structuredContent;
      setCachedResult(ctx.assessmentId, 'discovery', discoveryResult);
      return discoveryResult;
    }

    // If no structured content, construct a DiscoveryResult from the raw text
    const discoveryResult: DiscoveryResult = {
      landscapeAnalysis: `Analysis based on organizational context in ${ctx.sector} sector.`,
      competitivePosition: 'Competitive positioning requires LLM analysis with structured output.',
      gapIndicators: pillarScores
        .filter(p => p.score < 50)
        .map(p => ({
          pillar: p.pillarId,
          indicator: `Score of ${p.score}% indicates readiness gap`,
          severity: p.score < 30 ? 'high' as const : 'medium' as const,
        })),
      regulatorySignals: [],
      techStackInsights: [],
      rawSummary: response.content,
    };

    setCachedResult(ctx.assessmentId, 'discovery', discoveryResult);
    return discoveryResult;
  }

  // No scoring result — return minimal discovery
  const discoveryResult: DiscoveryResult = {
    landscapeAnalysis: 'Discovery analysis requires completed scoring.',
    competitivePosition: 'Assessment not yet completed.',
    gapIndicators: [],
    regulatorySignals: [],
    techStackInsights: [],
    rawSummary: 'Discovery analysis requires completed scoring. Please run the scoring agent first.',
  };

  setCachedResult(ctx.assessmentId, 'discovery', discoveryResult);
  return discoveryResult;
}

/**
 * Format a DiscoveryResult into a clean summary for the report agent.
 * Passes full context, not truncated.
 */
function formatDiscoverySummary(discovery: DiscoveryResult): string {
  const gapSummary = discovery.gapIndicators
    .map(g => `  - ${g.pillar}: ${g.indicator} (severity: ${g.severity})`)
    .join('\n');
  const regSummary = discovery.regulatorySignals
    .map(s => `  - ${s}`)
    .join('\n');
  const techSummary = discovery.techStackInsights
    .map(s => `  - ${s}`)
    .join('\n');

  return `DISCOVERY AGENT FINDINGS:

Landscape Analysis:
${discovery.landscapeAnalysis}

Competitive Position:
${discovery.competitivePosition}

Gap Indicators:
${gapSummary || '  No specific gaps identified'}

Regulatory Signals:
${regSummary || '  No specific regulatory signals detected'}

Tech Stack Insights:
${techSummary || '  No specific tech stack insights detected'}

Raw Summary:
${discovery.rawSummary}`;
}

/**
 * REPORT AGENT — Compiles all agent outputs into structured recommendations.
 * Generates roadmap, benchmark, and strategic recommendations.
 * This is the synthesis agent — it takes all previous outputs as input.
 * Now passes FULL discovery context (not truncated to 500 chars).
 */
async function executeReportAgent(ctx: PipelineContext): Promise<{
  roadmap: RoadmapPhase[];
  benchmark: BenchmarkResult;
  recommendation: string;
}> {
  if (!ctx.scoringResult) {
    throw new Error('Report agent requires scoring result');
  }

  const pillarScores = ctx.scoringResult.pillarScores.map(p => ({
    pillarId: p.pillarId,
    score: Math.round(p.normalizedScore),
    maturityLabel: p.maturityLabel,
  }));

  const overallScore = Math.round(ctx.scoringResult.overallScore);

  // Build enriched context from previous agents
  const insightContext = ctx.insightResult
    ? `\n\nInsight Agent Findings:\n- Strengths: ${ctx.insightResult.strengths.slice(0, 2).join('; ')}\n- Gaps: ${ctx.insightResult.gaps.slice(0, 2).join('; ')}\n- Risks: ${ctx.insightResult.risks.slice(0, 2).join('; ')}`
    : '';

  // Pass FULL discovery context (not truncated)
  const discoveryContext = ctx.discoveryResult
    ? `\n\n${formatDiscoverySummary(ctx.discoveryResult)}`
    : '';

  // X-Ray findings are the highest-signal context — surface them first so the
  // report agent grounds its roadmap and recommendation in specific patterns.
  const xRayContext = ctx.scoringResult?.xRayFindings && ctx.scoringResult.xRayFindings.length > 0
    ? `\n\n${formatFindingsForPrompt(ctx.scoringResult.xRayFindings)}`
    : '';

  // Sector weighting context — explains why some pillars matter more here.
  const sectorContext = ctx.scoringResult?.sectorWeighting
    ? `\n\nSECTOR WEIGHTING APPLIED (${ctx.scoringResult.sectorWeighting.sector}): ${ctx.scoringResult.sectorWeighting.rationale}`
    : '';

  const combinedContext = xRayContext + sectorContext + insightContext + discoveryContext;

  // Run all three report sub-actions in parallel
  const [roadmap, benchmark, recommendation] = await Promise.all([
    // Roadmap
    (async () => {
      const cached = getCachedResult<RoadmapPhase[]>(ctx.assessmentId, 'roadmap');
      if (cached) return cached;

      const request: AgentRequest = {
        action: 'roadmap',
        pillarScores,
        overallScore,
        sector: ctx.sector,
        orgContext: combinedContext,
        orgSize: ctx.orgSize,
      };
      const response = await queryAgent(request);
      // Try to parse structured roadmap from response
      try {
        let jsonStr = response.content.trim();
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed.phases)) {
          const result = parsed.phases as RoadmapPhase[];
          setCachedResult(ctx.assessmentId, 'roadmap', result);
          return result;
        }
        if (Array.isArray(parsed)) {
          setCachedResult(ctx.assessmentId, 'roadmap', parsed);
          return parsed as RoadmapPhase[];
        }
      } catch {
        // Not structured JSON — return the raw content as a single-phase roadmap
      }
      const fallback: RoadmapPhase[] = [{
        phase: 'AI Adoption Roadmap',
        timeframe: '12-24 months',
        objectives: ['Follow the detailed roadmap in the analysis'],
        keyActions: [response.content.slice(0, 200)],
        investmentLevel: 'medium',
        pillarFocus: pillarScores.slice(0, 3).map(p => p.pillarId),
      }];
      setCachedResult(ctx.assessmentId, 'roadmap', fallback);
      return fallback;
    })(),

    // Benchmark — uses curated benchmarks for fallback, NOT Math.random()
    (async () => {
      const cached = getCachedResult<BenchmarkResult>(ctx.assessmentId, 'benchmark');
      if (cached) return cached;

      try {
        const result = await getSectorBenchmark(
          ctx.sector,
          pillarScores
        );
        setCachedResult(ctx.assessmentId, 'benchmark', result);
        return result;
      } catch {
        // Fallback uses curated benchmark data
        const curated = getCuratedBenchmark(ctx.sector);
        const pillarBenchmarks = pillarScores.map(p => {
          const sectorAvg = curated.pillarAverages[p.pillarId] || curated.averageScore;
          const percentile = computePercentile(p.score, sectorAvg);
          return {
            pillarId: p.pillarId,
            userScore: p.score,
            sectorAverage: sectorAvg,
            percentile,
          };
        });

        const fallback: BenchmarkResult = {
          sector: ctx.sector,
          averageScore: curated.averageScore,
          topQuartile: curated.topQuartile,
          bottomQuartile: curated.bottomQuartile,
          pillarBenchmarks,
          insight: `Your organization's AI readiness has been compared against curated ${ctx.sector} sector benchmarks. Pillars where your score exceeds the sector average represent competitive advantages; those below indicate areas for targeted investment. ⚠️ Sector benchmarks are AI-estimated and intended for directional guidance only. Actual sector performance may vary.`,
          isAIGenerated: false,
          methodology: 'Based on curated industry research benchmarks without LLM adjustment. Confidence: medium.',
        };
        setCachedResult(ctx.assessmentId, 'benchmark', fallback);
        return fallback;
      }
    })(),

    // Strategic Recommendation
    (async () => {
      const cached = getCachedResult<string>(ctx.assessmentId, 'recommendation');
      if (cached) return cached;

      const request: AgentRequest = {
        action: 'recommendation',
        pillarScores,
        overallScore,
        sector: ctx.sector,
        orgContext: combinedContext,
        orgSize: ctx.orgSize,
      };
      const response = await queryAgent(request);
      setCachedResult(ctx.assessmentId, 'recommendation', response.content);
      return response.content;
    })(),
  ]);

  return { roadmap, benchmark, recommendation };
}

/**
 * LITERACY AGENT — Assesses the organization's AI literacy level.
 * Now uses LLM-powered assessment with sector-specific learning paths.
 * Falls back to improved deterministic assessment with sector-specific module names.
 */
async function executeLiteracyAgent(ctx: PipelineContext): Promise<Record<string, unknown>> {
  const cached = getCachedResult<Record<string, unknown>>(ctx.assessmentId, 'literacy');
  if (cached) return cached;

  if (!ctx.scoringResult) {
    return { error: 'Literacy agent requires scoring result' };
  }

  const overallScore = Math.round(ctx.scoringResult.overallScore);
  const pillarScores = ctx.scoringResult.pillarScores.map(p => ({
    pillarId: p.pillarId,
    score: Math.round(p.normalizedScore),
    maturityLabel: p.maturityLabel,
    pillarName: p.pillarName,
  }));

  try {
    // Use LLM-powered literacy assessment
    const result = await generateLiteracyAssessment(
      overallScore,
      pillarScores,
      ctx.sector,
      ctx.orgSize
    );

    setCachedResult(ctx.assessmentId, 'literacy', result);
    return result;
  } catch (error) {
    console.error('[E-ARI Orchestrator] LLM literacy assessment failed, using improved fallback:', error);

    // Improved deterministic fallback with sector-specific module names
    const weakestPillars = ctx.scoringResult.pillarScores
      .sort((a, b) => a.normalizedScore - b.normalizedScore)
      .slice(0, 3);

    const strongestPillars = ctx.scoringResult.pillarScores
      .sort((a, b) => b.normalizedScore - a.normalizedScore)
      .slice(0, 2);

    // Sector-specific module name mapping
    const sectorModules: Record<string, Record<string, string>> = {
      healthcare: {
        strategy: 'Clinical AI Strategy & FDA SaMD Pathway Planning',
        data: 'FHIR Data Pipeline Architecture for Clinical AI',
        technology: 'Clinical MLOps: Model Monitoring in Healthcare',
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
        governance: 'Fair Lending Compliance & AI Bias Detection',
        culture: 'AI Adoption in Trading & Risk Teams',
        process: 'KYC Automation & AI-Driven Process Optimization',
        security: 'Financial AI Security & Adversarial Defense',
      },
      manufacturing: {
        strategy: 'Industry 4.0 AI Strategy & Smart Factory Planning',
        data: 'IoT Sensor Data Pipeline Architecture for Predictive Analytics',
        technology: 'Edge AI Deployment for Quality Inspection & Maintenance',
        talent: 'AI Literacy for Plant Managers & OT Engineers',
        governance: 'IEC 62443 Aligned AI Governance for Industrial Systems',
        culture: 'AI Adoption on the Shop Floor: Change Management',
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
        strategy: 'Public Sector AI Strategy & FedRAMP Compliance',
        data: 'Secure Data Pipeline Architecture for Government AI',
        technology: 'GovCloud AI Deployment & Legacy System Integration',
        talent: 'AI Literacy for Government Program Managers',
        governance: 'NIST AI RMF Implementation for Public Sector',
        culture: 'Citizen-Centric AI Adoption & Public Trust Building',
        process: 'AI-Enabled Government Process Automation & RPA',
        security: 'FISMA-Compliant AI Security & FedRAMP Authorization',
      },
      retail: {
        strategy: 'Customer-Centric AI Strategy & Omnichannel Planning',
        data: 'Customer Data Platform Architecture & Personalization Pipelines',
        technology: 'Recommendation Engine Deployment & A/B Testing at Scale',
        talent: 'AI Literacy for Merchandising & Marketing Teams',
        governance: 'Consumer Data Privacy (GDPR/CCPA) & AI Ethics',
        culture: 'Data-Driven Culture for Retail AI Adoption',
        process: 'Demand Forecasting & Inventory Optimization with AI',
        security: 'PCI DSS-Compliant AI Systems & Fraud Detection',
      },
      education: {
        strategy: 'AI-Enhanced Learning Strategy & Digital Transformation',
        data: 'Learning Analytics Data Pipeline Architecture',
        technology: 'Adaptive Learning Platform Integration & LMS AI',
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
        process: 'Predictive Maintenance Workflow Design for Energy Assets',
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

    const modules = sectorModules[ctx.sector] || sectorModules.technology;

    const result: Record<string, unknown> = {
      overallLiteracyLevel: overallScore <= 25 ? 'Beginner'
        : overallScore <= 50 ? 'Developing'
        : overallScore <= 75 ? 'Proficient'
        : 'Expert',
      literacyScore: overallScore,
      focusAreas: weakestPillars.map(p => ({
        pillar: p.pillarName,
        score: Math.round(p.normalizedScore),
        priority: p.normalizedScore < 30 ? 'critical' : p.normalizedScore < 45 ? 'high' : 'moderate',
      })),
      strengths: strongestPillars.map(p => ({
        pillar: p.pillarName,
        score: Math.round(p.normalizedScore),
      })),
      recommendedModules: weakestPillars.map((p, i) => ({
        order: i + 1,
        title: modules[p.pillarId] || defaultModules[p.pillarId],
        priority: i === 0 ? 'critical' : i === 1 ? 'high' : 'moderate',
        pillarId: p.pillarId,
      })),
      generatedAt: new Date().toISOString(),
    };

    setCachedResult(ctx.assessmentId, 'literacy', result);
    return result;
  }
}

// ─── Main Orchestrator ──────────────────────────────────────────────────────

/**
 * Execute the full orchestration pipeline.
 *
 * This is THE entry point — the brain. Call this after assessment submission
 * to auto-trigger the entire agent pipeline.
 *
 * @param config - Pipeline configuration
 * @returns Full pipeline result with all agent outputs
 */
export async function executePipeline(config: PipelineConfig): Promise<PipelineResult> {
  const pipelineStart = Date.now();
  const stageResults: StageResult[] = [];
  const ctx: PipelineContext = {
    assessmentId: config.assessmentId,
    userId: config.userId,
    sector: config.sector || 'general',
    orgSize: config.orgSize,
    organization: config.organization,
    tier: config.tier,
    responses: {},
    orgContext: config.orgContext,
  };

  // Create the pipeline run record
  const runId = await createPipelineRun(config);
  await updatePipelineRunStatus(runId, 'running', new Date());

  // Load assessment responses
  try {
    const assessment = await db.assessment.findUnique({
      where: { id: config.assessmentId },
      include: { responses: true, user: true },
    });

    if (!assessment) {
      await updatePipelineRunStatus(runId, 'failed', undefined, new Date());
      throw new Error(`Assessment ${config.assessmentId} not found`);
    }

    if (assessment.status !== 'completed') {
      await updatePipelineRunStatus(runId, 'failed', undefined, new Date());
      throw new Error('Assessment must be completed before running the pipeline');
    }

    // Build response map
    const responseMap: ResponseMap = {};
    assessment.responses.forEach(r => {
      responseMap[r.questionId] = r.answer;
    });
    ctx.responses = responseMap;
    ctx.sector = config.sector || assessment.sector || 'general';
    ctx.orgSize = config.orgSize || assessment.user?.orgSize || undefined;
    ctx.organization = config.organization || assessment.user?.organization || undefined;
  } catch (error) {
    await updatePipelineRunStatus(runId, 'failed', undefined, new Date());
    return {
      pipelineRunId: runId,
      status: 'failed',
      stages: stageResults,
      context: ctx,
      startedAt: new Date(pipelineStart).toISOString(),
      completedAt: new Date().toISOString(),
      totalDurationMs: Date.now() - pipelineStart,
    };
  }

  // Determine which agents to run
  const skipSet = new Set<AgentId>(config.skipAgents || []);
  const onlySet = config.onlyAgents ? new Set<AgentId>(config.onlyAgents) : null;

  function shouldRun(agent: AgentId): boolean {
    if (onlySet) return onlySet.has(agent);
    if (skipSet.has(agent)) return false;
    // Tier check
    if (!TIER_ACCESS[agent].includes(config.tier)) return false;
    return true;
  }

  // Execute pipeline stages
  let pipelineStatus: PipelineStatus = 'completed';

  for (const stage of PIPELINE_STAGES) {
    const runnableAgents = stage.agents.filter(shouldRun);

    if (runnableAgents.length === 0) {
      // Mark skipped agents
      for (const agent of stage.agents) {
        stageResults.push({ agent, status: 'skipped' });
        const stageId = await createStage(runId, agent);
        await updateStageResult(stageId, 'skipped', {});
      }
      continue;
    }

    if (stage.parallel && runnableAgents.length > 1) {
      // ── Parallel Execution ──
      const parallelResults = await Promise.allSettled(
        runnableAgents.map(async (agent) => {
          const stageStart = Date.now();
          const stageId = await createStage(runId, agent);
          await updateStageResult(stageId, 'running', { startedAt: new Date() });

          try {
            const result = await executeAgent(agent, ctx);
            const duration = Date.now() - stageStart;

            // Update shared context with result
            updateContext(ctx, agent, result);

            await updateStageResult(stageId, 'completed', {
              output: JSON.stringify(result).slice(0, 50000), // Cap at 50KB
              durationMs: duration,
              completedAt: new Date(),
            });

            return { agent, status: 'completed' as StageStatus, output: result, durationMs: duration };
          } catch (error) {
            const duration = Date.now() - stageStart;
            const errMsg = error instanceof Error ? error.message : 'Unknown error';

            await updateStageResult(stageId, 'failed', {
              error: errMsg,
              durationMs: duration,
              completedAt: new Date(),
            });

            return { agent, status: 'failed' as StageStatus, error: errMsg, durationMs: duration };
          }
        })
      );

      for (const settled of parallelResults) {
        if (settled.status === 'fulfilled') {
          stageResults.push(settled.value);
          if (settled.value.status === 'failed') pipelineStatus = 'partial';
        } else {
          stageResults.push({
            agent: runnableAgents[parallelResults.indexOf(settled)] || 'scoring',
            status: 'failed',
            error: settled.reason?.message || 'Unknown error',
          });
          pipelineStatus = 'partial';
        }
      }
    } else {
      // ── Sequential Execution ──
      for (const agent of runnableAgents) {
        const stageStart = Date.now();
        const stageId = await createStage(runId, agent);
        await updateStageResult(stageId, 'running', { startedAt: new Date() });

        try {
          const result = await executeAgent(agent, ctx);
          const duration = Date.now() - stageStart;

          // Update shared context with result
          updateContext(ctx, agent, result);

          await updateStageResult(stageId, 'completed', {
            output: JSON.stringify(result).slice(0, 50000),
            durationMs: duration,
            completedAt: new Date(),
          });

          stageResults.push({ agent, status: 'completed', output: result, durationMs: duration });
        } catch (error) {
          const duration = Date.now() - stageStart;
          const errMsg = error instanceof Error ? error.message : 'Unknown error';

          await updateStageResult(stageId, 'failed', {
            error: errMsg,
            durationMs: duration,
            completedAt: new Date(),
          });

          stageResults.push({ agent, status: 'failed', error: errMsg, durationMs: duration });
          pipelineStatus = 'partial';

          // For scoring, failure is fatal — abort pipeline
          if (agent === 'scoring') {
            pipelineStatus = 'failed';
            break;
          }
        }
      }

      // If scoring failed, abort
      if (pipelineStatus === 'failed') break;
    }

    // Mark non-runnable agents in this stage as skipped
    for (const agent of stage.agents) {
      if (!runnableAgents.includes(agent)) {
        stageResults.push({ agent, status: 'skipped' });
        const stageId = await createStage(runId, agent);
        await updateStageResult(stageId, 'skipped', {});
      }
    }
  }

  // Persist AI insights to assessment record (if available)
  if (ctx.insightResult && ctx.scoringResult) {
    try {
      await db.assessment.update({
        where: { id: config.assessmentId },
        data: {
          aiInsights: JSON.stringify(ctx.insightResult),
        },
      });
    } catch {
      // Non-critical — insights are in the pipeline stage record
    }
  }

  // Finalize pipeline run
  const totalDuration = Date.now() - pipelineStart;
  await updatePipelineRunStatus(runId, pipelineStatus, undefined, new Date());

  return {
    pipelineRunId: runId,
    status: pipelineStatus,
    stages: stageResults,
    context: ctx,
    startedAt: new Date(pipelineStart).toISOString(),
    completedAt: new Date().toISOString(),
    totalDurationMs: totalDuration,
  };
}

// ─── Agent Dispatcher ───────────────────────────────────────────────────────

/**
 * Dispatch execution to the appropriate agent function.
 */
async function executeAgent(agent: AgentId, ctx: PipelineContext): Promise<unknown> {
  switch (agent) {
    case 'scoring':
      return executeScoringAgent(ctx);
    case 'insight':
      return executeInsightAgent(ctx);
    case 'discovery':
      return executeDiscoveryAgent(ctx);
    case 'report':
      return executeReportAgent(ctx);
    case 'literacy':
      return executeLiteracyAgent(ctx);
    case 'assistant':
      // Assistant is on-demand, not auto-run in pipeline
      return { message: 'Assistant agent is available for interactive Q&A after pipeline completion.' };
    default:
      throw new Error(`Unknown agent: ${agent}`);
  }
}

/**
 * Update the shared pipeline context with an agent's output.
 * This is how agents share results — the output of one becomes the input of the next.
 * Now handles DiscoveryResult (structured) instead of string.
 */
function updateContext(ctx: PipelineContext, agent: AgentId, result: unknown): void {
  switch (agent) {
    case 'scoring':
      ctx.scoringResult = result as ScoringResult;
      break;
    case 'insight':
      ctx.insightResult = result as AIInsightResult;
      break;
    case 'discovery':
      ctx.discoveryResult = result as DiscoveryResult;
      break;
    case 'report': {
      const reportResult = result as { roadmap: RoadmapPhase[]; benchmark: BenchmarkResult; recommendation: string };
      ctx.roadmapResult = reportResult.roadmap;
      ctx.benchmarkResult = reportResult.benchmark;
      ctx.recommendationResult = reportResult.recommendation;
      break;
    }
    case 'literacy':
      ctx.literacyResult = result as Record<string, unknown>;
      break;
  }
}

// ─── Pipeline Status & Retrieval ────────────────────────────────────────────

/**
 * Get the latest pipeline run for an assessment.
 */
export async function getLatestPipelineRun(assessmentId: string): Promise<{
  id: string;
  status: PipelineStatus;
  isStale: boolean;
  stages: Array<{
    agent: string;
    status: string;
    durationMs: number | null;
    error: string | null;
  }>;
  startedAt: Date | null;
  completedAt: Date | null;
  totalDurationMs: number | null;
} | null> {
  const run = await db.pipelineRun.findFirst({
    where: { assessmentId },
    orderBy: { createdAt: 'desc' },
    include: { stages: true },
  });

  if (!run) return null;

  const totalDuration = run.completedAt && run.startedAt
    ? run.completedAt.getTime() - run.startedAt.getTime()
    : null;
  const now = Date.now();
  const staleCutoffMs = 2 * 60 * 1000;
  const ageFromStart = run.startedAt ? now - run.startedAt.getTime() : now - run.createdAt.getTime();
  const hasRunningStage = run.stages.some(s => s.status === 'running');
  const hasOnlyPendingStages = run.stages.length > 0 && run.stages.every(s => s.status === 'pending');
  const hasNoStagesYet = run.stages.length === 0;
  const isStale =
    (run.status === 'pending' || run.status === 'running') &&
    !hasRunningStage &&
    (hasOnlyPendingStages || hasNoStagesYet) &&
    ageFromStart > staleCutoffMs;

  return {
    id: run.id,
    status: run.status as PipelineStatus,
    isStale,
    stages: run.stages.map(s => ({
      agent: s.agent,
      status: s.status,
      durationMs: s.durationMs,
      error: s.error,
    })),
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    totalDurationMs: totalDuration,
  };
}

/**
 * Get all pipeline runs for an assessment.
 */
export async function getPipelineHistory(assessmentId: string): Promise<Array<{
  id: string;
  status: string;
  triggeredBy: string;
  startedAt: Date | null;
  completedAt: Date | null;
  stageCount: number;
}>> {
  const runs = await db.pipelineRun.findMany({
    where: { assessmentId },
    orderBy: { createdAt: 'desc' },
    include: { stages: true },
  });

  return runs.map(run => ({
    id: run.id,
    status: run.status,
    triggeredBy: run.triggeredBy,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    stageCount: run.stages.length,
  }));
}

/**
 * Get the cached pipeline context for an assessment.
 * Returns the assembled context from the most recent completed pipeline run.
 */
export async function getPipelineContext(assessmentId: string): Promise<PipelineContext | null> {
  const run = await db.pipelineRun.findFirst({
    where: { assessmentId, status: { in: ['completed', 'partial'] } },
    orderBy: { createdAt: 'desc' },
    include: {
      stages: true,
      assessment: {
        include: { responses: true, user: true },
      },
    },
  });

  if (!run) return null;

  // Reconstruct context from stages
  const responseMap: ResponseMap = {};
  run.assessment.responses.forEach(r => {
    responseMap[r.questionId] = r.answer;
  });

  const ctx: PipelineContext = {
    assessmentId,
    userId: run.userId,
    sector: run.assessment.sector,
    orgSize: run.assessment.user?.orgSize || undefined,
    organization: run.assessment.user?.organization || undefined,
    tier: run.assessment.user?.tier || 'free',
    responses: responseMap,
  };

  // Populate context from stage outputs
  for (const stage of run.stages) {
    if (stage.status !== 'completed' || !stage.output) continue;
    try {
      const output = JSON.parse(stage.output);
      const agent = stage.agent as AgentId;
      updateContext(ctx, agent, output);
    } catch {
      // Skip unparseable outputs
    }
  }

  return ctx;
}

/**
 * Check if an agent's result is cached (no LLM call needed).
 */
export function isAgentCached(assessmentId: string, agent: AgentId): boolean {
  return getCachedResult(assessmentId, String(agent)) !== null;
}

/**
 * Retry a specific failed agent in an existing pipeline run.
 */
export async function retryAgent(
  pipelineRunId: string,
  agent: AgentId
): Promise<StageResult> {
  const run = await db.pipelineRun.findUnique({
    where: { id: pipelineRunId },
    include: { stages: true, assessment: { include: { responses: true, user: true } } },
  });

  if (!run) throw new Error('Pipeline run not found');

  // Reconstruct context from completed stages
  const responseMap: ResponseMap = {};
  run.assessment.responses.forEach(r => {
    responseMap[r.questionId] = r.answer;
  });

  const ctx: PipelineContext = {
    assessmentId: run.assessmentId,
    userId: run.userId,
    sector: run.assessment.sector,
    orgSize: run.assessment.user?.orgSize || undefined,
    organization: run.assessment.user?.organization || undefined,
    tier: run.assessment.user?.tier || 'free',
    responses: responseMap,
  };

  // Populate context from completed stages
  for (const stage of run.stages) {
    if (stage.status !== 'completed' || !stage.output) continue;
    try {
      const output = JSON.parse(stage.output);
      updateContext(ctx, stage.agent as AgentId, output);
    } catch {
      // Skip
    }
  }

  // Execute the specific agent
  const stageStart = Date.now();
  const stageId = await createStage(pipelineRunId, agent);
  await updateStageResult(stageId, 'running', { startedAt: new Date() });

  try {
    const result = await executeAgent(agent, ctx);
    const duration = Date.now() - stageStart;

    await updateStageResult(stageId, 'completed', {
      output: JSON.stringify(result).slice(0, 50000),
      durationMs: duration,
      completedAt: new Date(),
    });

    // Clear the cache so fresh results are available
    clearCache(run.assessmentId);

    return { agent, status: 'completed', output: result, durationMs: duration };
  } catch (error) {
    const duration = Date.now() - stageStart;
    const errMsg = error instanceof Error ? error.message : 'Unknown error';

    await updateStageResult(stageId, 'failed', {
      error: errMsg,
      durationMs: duration,
      completedAt: new Date(),
    });

    return { agent, status: 'failed', error: errMsg, durationMs: duration };
  }
}
