/**
 * E-ARI Assessment Engine
 * 
 * A versioned, deterministic pipeline from questionnaire responses to pillar and overall scores.
 * 
 * Pipeline:
 * 1. Validate completeness — all questions must be answered
 * 2. Normalize raw answers to 0-100 scale per pillar
 * 3. Apply interdependency adjustments (documented, testable)
 * 4. Calculate overall score via weighted combination
 * 5. Map to maturity bands
 * 6. Persist methodology_version and scoring_version per assessment
 * 
 * Guarantees:
 * - Deterministic: same inputs → same outputs (no randomness)
 * - Versioned: each assessment stores methodology/scoring version
 * - Explainable: all adjustments are documented and surfaced in reports
 */

import {
  PILLARS,
  MATURITY_BANDS,
  MaturityBand,
  MAX_PILLAR_RAW,
  MIN_PILLAR_RAW,
  SCORING_VERSION,
  METHODOLOGY_VERSION,
  getPillarById,
} from './pillars';
import { detectXRayFindings, type XRayFinding } from './scoring-patterns';
import { applySectorWeighting, type SectorWeightingApplication } from './sector-weights';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PillarScoreResult {
  pillarId: string;
  pillarName: string;
  rawScore: number;
  maxRaw: number;
  normalizedScore: number; // 0–100
  maturityBand: MaturityBand;
  maturityLabel: string;
  maturityColor: string;
  weight: number;
  questionDetails: QuestionScoreDetail[];
  adjustments: AdjustmentRecord[];
}

export interface QuestionScoreDetail {
  questionId: string;
  answer: number;
  normalizedAnswer: number; // 0–100
  contribution: string; // e.g. "4/5 = 80%"
}

export interface AdjustmentRecord {
  type: string;
  description: string;
  pillarAffected: string;
  originalScore: number;
  adjustedScore: number;
  delta: number;
}

export interface ScoringResult {
  overallScore: number;
  /** Overall score before sector weighting was applied (for transparency). */
  baselineOverallScore?: number;
  maturityBand: MaturityBand;
  maturityLabel: string;
  maturityColor: string;
  pillarScores: PillarScoreResult[];
  adjustments: AdjustmentRecord[];
  criticalPillarFailures: string[];
  /** Structural patterns detected from response combinations (X-Ray engine). */
  xRayFindings?: XRayFinding[];
  /** Sector-specific pillar weighting that was applied to compute overallScore. */
  sectorWeighting?: SectorWeightingApplication;
  scoringVersion: string;
  methodologyVersion: string;
  timestamp: string;
}

export type ResponseMap = Record<string, number>; // questionId → answer (1–5)

// ─── Interdependency Rules ──────────────────────────────────────────────────

interface InterdependencyRule {
  id: string;
  description: string;
  condition: (pillarScores: Record<string, number>) => boolean;
  adjustment: (pillarScores: Record<string, number>) => { pillarId: string; newScore: number; reason: string };
}

/**
 * Documented interdependency rules:
 * 
 * RULE_1: If Governance score < 30, cap Technology score by multiplying by 0.7
 *   Rationale: High technology without governance creates uncontrolled risk.
 * 
 * RULE_2: If Data score < 30, cap Strategy score by multiplying by 0.85
 *   Rationale: AI strategy without adequate data infrastructure is aspirational, not actionable.
 * 
 * RULE_3: If any pillar scores below 15 (critical failure), flag it
 *   Rationale: Critical pillar failures must be highlighted regardless of overall score.
 */
const INTERDEPENDENCY_RULES: InterdependencyRule[] = [
  {
    id: 'RULE_1',
    description: 'Governance deficit penalises Technology: low governance turns mature tooling into uncontrolled risk.',
    condition: (ps) => (ps['governance'] ?? 0) < 30,
    adjustment: (ps) => {
      const techScore = ps['technology'] ?? 0;
      const newScore = Math.round(techScore * 0.7 * 100) / 100;
      return { pillarId: 'technology', newScore, reason: `Governance below 30 — Technology capped at 70% to reflect the unmanaged-risk discount (${techScore} → ${newScore}).` };
    },
  },
  {
    id: 'RULE_2',
    description: 'Data deficit penalises Strategy: AI strategy without data infrastructure is aspirational, not operational.',
    condition: (ps) => (ps['data'] ?? 0) < 30,
    adjustment: (ps) => {
      const stratScore = ps['strategy'] ?? 0;
      const newScore = Math.round(stratScore * 0.85 * 100) / 100;
      return { pillarId: 'strategy', newScore, reason: `Data below 30 — Strategy reduced 15% because the data foundation cannot deliver on the stated ambition (${stratScore} → ${newScore}).` };
    },
  },
  {
    id: 'RULE_3',
    description: 'Security deficit penalises Technology: deployable models without controls are a liability, not an asset.',
    condition: (ps) => (ps['security'] ?? 0) < 30,
    adjustment: (ps) => {
      const techScore = ps['technology'] ?? 0;
      const newScore = Math.round(techScore * 0.85 * 100) / 100;
      return { pillarId: 'technology', newScore, reason: `Security below 30 — Technology capped at 85% to reflect deployment-without-controls exposure (${techScore} → ${newScore}).` };
    },
  },
  {
    id: 'RULE_4',
    description: 'Talent deficit penalises Strategy: ambition that exceeds internal capacity does not ship.',
    condition: (ps) => (ps['talent'] ?? 0) < 25,
    adjustment: (ps) => {
      const stratScore = ps['strategy'] ?? 0;
      const newScore = Math.round(stratScore * 0.90 * 100) / 100;
      return { pillarId: 'strategy', newScore, reason: `Talent below 25 — Strategy reduced 10% to reflect execution capacity below stated ambition (${stratScore} → ${newScore}).` };
    },
  },
  {
    id: 'RULE_5',
    description: 'Governance + Security combined deficit penalises Process: industrialised AI at scale without controls compounds incidents.',
    condition: (ps) => (ps['governance'] ?? 0) < 35 && (ps['security'] ?? 0) < 35,
    adjustment: (ps) => {
      const procScore = ps['process'] ?? 0;
      const newScore = Math.round(procScore * 0.85 * 100) / 100;
      return { pillarId: 'process', newScore, reason: `Both governance and security below 35 — Process capped at 85% because scaling unmanaged AI accelerates harm (${procScore} → ${newScore}).` };
    },
  },
  {
    id: 'RULE_6',
    description: 'Culture deficit penalises Process: change-resistant cultures cannot operationalise AI gains.',
    condition: (ps) => (ps['culture'] ?? 0) < 30,
    adjustment: (ps) => {
      const procScore = ps['process'] ?? 0;
      const newScore = Math.round(procScore * 0.92 * 100) / 100;
      return { pillarId: 'process', newScore, reason: `Culture below 30 — Process reduced 8% to reflect adoption friction on the operating floor (${procScore} → ${newScore}).` };
    },
  },
];

const CRITICAL_PILLAR_THRESHOLD = 15;

// ─── Core Scoring Functions ─────────────────────────────────────────────────

/**
 * Normalize a raw pillar score to 0–100 scale.
 * 
 * Formula: ((raw - minRaw) / (maxRaw - minRaw)) * 100
 * 
 * Where minRaw = 5 (all 1s) and maxRaw = 25 (all 5s) for a 5-question Likert pillar.
 * This ensures the minimum possible normalized score is 0, not 20.
 */
export function normalizePillarScore(rawScore: number, maxRaw: number = MAX_PILLAR_RAW, minRaw: number = MIN_PILLAR_RAW): number {
  if (maxRaw === minRaw) return 0;
  const normalized = ((rawScore - minRaw) / (maxRaw - minRaw)) * 100;
  return Math.round(Math.max(0, Math.min(100, normalized)) * 100) / 100;
}

/**
 * Normalize a single Likert answer (1–5) to 0–100 scale.
 */
export function normalizeAnswer(answer: number): number {
  return ((answer - 1) / 4) * 100;
}

/**
 * Determine maturity band from a normalized score (0–100).
 */
export function getMaturityBand(score: number): { band: MaturityBand; label: string; color: string; description: string } {
  if (score <= 25) return { band: 'laggard', label: MATURITY_BANDS.laggard.label, color: MATURITY_BANDS.laggard.color, description: MATURITY_BANDS.laggard.description };
  if (score <= 50) return { band: 'follower', label: MATURITY_BANDS.follower.label, color: MATURITY_BANDS.follower.label, description: MATURITY_BANDS.follower.description };
  if (score <= 75) return { band: 'chaser', label: MATURITY_BANDS.chaser.label, color: MATURITY_BANDS.chaser.color, description: MATURITY_BANDS.chaser.description };
  return { band: 'pacesetter', label: MATURITY_BANDS.pacesetter.label, color: MATURITY_BANDS.pacesetter.color, description: MATURITY_BANDS.pacesetter.description };
}

/**
 * Validate that all required questions have been answered.
 * Returns an array of missing question IDs (empty if complete).
 */
export function validateCompleteness(responses: ResponseMap): string[] {
  const missing: string[] = [];
  for (const pillar of PILLARS) {
    for (const q of pillar.questions) {
      if (q.required && (responses[q.id] === undefined || responses[q.id] === null)) {
        missing.push(q.id);
      }
    }
  }
  return missing;
}

/**
 * Calculate pillar scores from responses, without applying interdependency adjustments.
 */
export function calculateRawPillarScores(responses: ResponseMap): PillarScoreResult[] {
  return PILLARS.map(pillar => {
    const questionDetails: QuestionScoreDetail[] = pillar.questions.map(q => {
      const answer = responses[q.id] ?? 0;
      const normalizedAnswer = normalizeAnswer(answer);
      return {
        questionId: q.id,
        answer,
        normalizedAnswer: Math.round(normalizedAnswer * 100) / 100,
        contribution: `${answer}/5 = ${Math.round(normalizedAnswer)}%`,
      };
    });

    const rawScore = questionDetails.reduce((sum, qd) => sum + qd.answer, 0);
    const normalizedScore = normalizePillarScore(rawScore);
    const maturity = getMaturityBand(normalizedScore);

    return {
      pillarId: pillar.id,
      pillarName: pillar.name,
      rawScore,
      maxRaw: MAX_PILLAR_RAW,
      normalizedScore,
      maturityBand: maturity.band,
      maturityLabel: maturity.label,
      maturityColor: maturity.color,
      weight: pillar.weight,
      questionDetails,
      adjustments: [],
    };
  });
}

/**
 * Apply interdependency adjustment rules to pillar scores.
 * Returns adjusted pillar scores and a log of all adjustments made.
 */
export function applyInterdependencyAdjustments(
  pillarResults: PillarScoreResult[]
): { adjustedPillars: PillarScoreResult[]; adjustments: AdjustmentRecord[] } {
  const adjustments: AdjustmentRecord[] = [];
  const scoreMap: Record<string, number> = {};
  pillarResults.forEach(p => { scoreMap[p.pillarId] = p.normalizedScore; });

  // Deep clone pillar results
  const adjustedPillars = pillarResults.map(p => ({ ...p, adjustments: [...p.adjustments] }));

  for (const rule of INTERDEPENDENCY_RULES) {
    if (rule.condition(scoreMap)) {
      const result = rule.adjustment(scoreMap);
      const pillarIdx = adjustedPillars.findIndex(p => p.pillarId === result.pillarId);
      if (pillarIdx >= 0) {
        const originalScore = adjustedPillars[pillarIdx].normalizedScore;
        const adjustedScore = Math.max(0, result.newScore);
        const delta = Math.round((adjustedScore - originalScore) * 100) / 100;

        const adjustment: AdjustmentRecord = {
          type: rule.id,
          description: result.reason,
          pillarAffected: result.pillarId,
          originalScore,
          adjustedScore,
          delta,
        };

        adjustedPillars[pillarIdx].normalizedScore = adjustedScore;
        adjustedPillars[pillarIdx].adjustments.push(adjustment);
        adjustments.push(adjustment);

        // Update score map for subsequent rules
        scoreMap[result.pillarId] = adjustedScore;

        // Recalculate maturity band for adjusted pillar
        const newMaturity = getMaturityBand(adjustedScore);
        adjustedPillars[pillarIdx].maturityBand = newMaturity.band;
        adjustedPillars[pillarIdx].maturityLabel = newMaturity.label;
        adjustedPillars[pillarIdx].maturityColor = newMaturity.color;
      }
    }
  }

  return { adjustedPillars, adjustments };
}

/**
 * Identify critical pillar failures (any pillar with normalized score < threshold).
 */
export function identifyCriticalFailures(pillarResults: PillarScoreResult[]): string[] {
  return pillarResults
    .filter(p => p.normalizedScore < CRITICAL_PILLAR_THRESHOLD)
    .map(p => p.pillarId);
}

/**
 * Calculate overall score from pillar scores using weighted combination.
 *
 * Formula: overallScore = Σ (pillarScore_i × weight_i)
 * where weights sum to 1.0.
 *
 * If a sector weighting application is supplied, the renormalised sector
 * weights are used in place of base pillar weights. Otherwise base weights
 * are used. Both branches keep the result on the 0–100 scale.
 */
export function calculateOverallScore(
  pillarResults: PillarScoreResult[],
  sectorWeighting?: SectorWeightingApplication,
): number {
  const weightLookup: Record<string, number> = {};
  if (sectorWeighting) {
    for (const p of sectorWeighting.pillars) weightLookup[p.pillarId] = p.finalWeight;
  }
  const overall = pillarResults.reduce((sum, p) => {
    const w = sectorWeighting ? (weightLookup[p.pillarId] ?? p.weight) : p.weight;
    return sum + p.normalizedScore * w;
  }, 0);
  return Math.round(Math.max(0, Math.min(100, overall)) * 100) / 100;
}

// ─── Main Scoring Pipeline ──────────────────────────────────────────────────

/**
 * Complete scoring pipeline: validate → calculate → adjust → sector-weight →
 * pattern-detect → classify.
 *
 * Deterministic: same responses + sector always produce the same result.
 *
 * @param responses Map of questionId → Likert 1–5 answer
 * @param sector Optional sector identifier for sector-specific pillar weighting
 */
export function scoreAssessment(responses: ResponseMap, sector?: string): ScoringResult {
  // Step 1: Validate completeness
  const missing = validateCompleteness(responses);
  if (missing.length > 0) {
    throw new Error(`Assessment incomplete. Missing answers for: ${missing.join(', ')}`);
  }

  // Step 2: Calculate raw pillar scores
  const rawPillarScores = calculateRawPillarScores(responses);

  // Step 3: Apply interdependency adjustments
  const { adjustedPillars, adjustments } = applyInterdependencyAdjustments(rawPillarScores);

  // Step 4: Compute baseline (un-sector-weighted) overall score for transparency
  const baselineOverallScore = calculateOverallScore(adjustedPillars);

  // Step 5: Apply sector-specific pillar weighting (if sector supplied)
  const sectorWeighting = sector ? applySectorWeighting(sector) : undefined;
  const overallScore = calculateOverallScore(adjustedPillars, sectorWeighting);

  // Step 6: Classify overall maturity
  const overallMaturity = getMaturityBand(overallScore);

  // Step 7: Identify critical failures
  const criticalFailures = identifyCriticalFailures(adjustedPillars);

  // Step 8: Run X-Ray pattern detection over the response map
  const xRayFindings = detectXRayFindings(responses);

  return {
    overallScore,
    baselineOverallScore,
    maturityBand: overallMaturity.band,
    maturityLabel: overallMaturity.label,
    maturityColor: overallMaturity.color,
    pillarScores: adjustedPillars,
    adjustments,
    criticalPillarFailures: criticalFailures,
    xRayFindings,
    sectorWeighting,
    scoringVersion: SCORING_VERSION,
    methodologyVersion: METHODOLOGY_VERSION,
    timestamp: new Date().toISOString(),
  };
}

// ─── Fallback Template Insights (Deterministic) ─────────────────────────────

/**
 * Generate deterministic template-based insights when LLM is unavailable.
 * These are rule-based strings derived from computed scores.
 */
export function generateTemplateInsights(result: ScoringResult): {
  strengths: string[];
  gaps: string[];
  risks: string[];
  nextSteps: string[];
} {
  const strengths: string[] = [];
  const gaps: string[] = [];
  const risks: string[] = [];
  const nextSteps: string[] = [];

  for (const pillar of result.pillarScores) {
    if (pillar.normalizedScore >= 75) {
      strengths.push(`${pillar.pillarName} is a key strength at ${Math.round(pillar.normalizedScore)}%, positioning your organization as a pacesetter in this dimension.`);
    } else if (pillar.normalizedScore >= 50) {
      strengths.push(`${pillar.pillarName} shows solid progress at ${Math.round(pillar.normalizedScore)}%, with room for targeted improvement.`);
    } else if (pillar.normalizedScore >= 25) {
      gaps.push(`${pillar.pillarName} at ${Math.round(pillar.normalizedScore)}% requires focused investment to reach foundational readiness levels.`);
    } else {
      gaps.push(`${pillar.pillarName} at ${Math.round(pillar.normalizedScore)}% is critically underdeveloped and poses a significant barrier to AI adoption.`);
      risks.push(`Very low ${pillar.pillarName} readiness (${Math.round(pillar.normalizedScore)}%) may create compliance gaps and operational failures.`);
    }
  }

  // Check for interdependency adjustments
  for (const adj of result.adjustments) {
    risks.push(`Adjustment applied: ${adj.description}`);
  }

  // Critical pillar failures
  for (const pillarId of result.criticalPillarFailures) {
    const pillar = getPillarById(pillarId);
    if (pillar) {
      risks.push(`Critical failure in ${pillar.name}: immediate remediation required before advancing AI initiatives.`);
    }
  }

  // Next steps based on maturity band
  if (result.overallScore <= 25) {
    nextSteps.push('Establish foundational AI governance and data infrastructure before pursuing advanced use cases.');
    nextSteps.push('Secure executive sponsorship and develop a formal AI strategy aligned with core business objectives.');
    nextSteps.push('Invest in AI literacy programs to build organizational understanding and reduce resistance.');
  } else if (result.overallScore <= 50) {
    nextSteps.push('Prioritize high-value, low-complexity AI use cases to demonstrate ROI and build momentum.');
    nextSteps.push('Strengthen data governance and pipeline infrastructure to support scaling AI initiatives.');
    nextSteps.push('Develop formal MLOps practices to transition from experimental models to production systems.');
  } else if (result.overallScore <= 75) {
    nextSteps.push('Scale successful AI use cases across business units while maintaining governance oversight.');
    nextSteps.push('Invest in advanced talent acquisition and retention strategies to support growing AI portfolio.');
    nextSteps.push('Establish cross-functional AI centers of excellence to propagate best practices.');
  } else {
    nextSteps.push('Lead industry standards development and share AI governance practices with the broader ecosystem.');
    nextSteps.push('Explore frontier AI capabilities including autonomous systems and advanced generative AI applications.');
    nextSteps.push('Continuously monitor and adapt AI strategy to emerging regulations and technological shifts.');
  }

  // Ensure we have at least some content
  if (strengths.length === 0) strengths.push('No pillars currently score at pacesetter level; focus on building foundations first.');
  if (gaps.length === 0) gaps.push('No critical gaps identified; maintain current trajectory and explore advanced capabilities.');
  if (risks.length === 0) risks.push('No immediate risks detected; continue monitoring for emerging threats and regulatory changes.');
  if (nextSteps.length === 0) nextSteps.push('Begin with a comprehensive AI readiness assessment to establish your baseline.');

  return { strengths, gaps, risks, nextSteps };
}
