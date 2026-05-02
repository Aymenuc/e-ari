/**
 * E-ARI Pulse Engine
 *
 * Monthly continuous monitoring engine that compares the user's latest
 * assessment with the previous one to detect score changes, identify
 * top risks, and suggest quick wins.
 *
 * Pipeline:
 * 1. Fetch user's latest completed assessment
 * 2. Fetch the previous completed assessment (if any)
 * 3. Compare pillar scores and overall score
 * 4. Generate deterministic top 3 risks and quick wins
 * 5. Return a PulseRun result
 */

import { db } from './db';
import { PILLARS, getPillarById, SCORING_VERSION } from './pillars';
import { scoreAssessment, calculateOverallScore, type ResponseMap, type PillarScoreResult } from './assessment-engine';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PillarScoreChange {
  pillarId: string;
  pillarName: string;
  previous: number;
  current: number;
  delta: number;
}

export interface PulseResult {
  overallScore: number;
  previousOverallScore: number | null;
  overallDelta: number | null;
  pillarScores: Array<{
    pillarId: string;
    pillarName: string;
    normalizedScore: number;
    weight: number;
  }>;
  scoreChanges: PillarScoreChange[];
  topRisks: string[];
  topQuickWins: string[];
  month: string;
  assessmentId: string;
}

// ─── Core Pulse Functions ───────────────────────────────────────────────────

/**
 * Generate the current month string in "YYYY-MM" format.
 */
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Run a Pulse analysis for the given user.
 *
 * This compares the user's latest completed assessment with the previous one,
 * generating score changes, risks, and quick wins.
 */
export async function runPulse(userId: string): Promise<PulseResult> {
  // Step 1: Fetch the user's latest completed assessment
  const latestAssessment = await db.assessment.findFirst({
    where: {
      userId,
      status: 'completed',
    },
    orderBy: { completedAt: 'desc' },
    include: { responses: true },
  });

  if (!latestAssessment) {
    throw new Error('No completed assessment found. Complete an assessment first.');
  }

  // Step 2: Compute current scores from responses (deterministic)
  const responseMap: ResponseMap = {};
  latestAssessment.responses.forEach(r => {
    responseMap[r.questionId] = r.answer;
  });

  let scoringResult;
  try {
    scoringResult = scoreAssessment(responseMap);
  } catch {
    throw new Error('Unable to score latest assessment. Assessment may be incomplete.');
  }

  const currentPillarScores = scoringResult.pillarScores.map(ps => ({
    pillarId: ps.pillarId,
    pillarName: ps.pillarName,
    normalizedScore: ps.normalizedScore,
    weight: ps.weight,
  }));

  // Step 3: Find the previous assessment
  const previousAssessment = await db.assessment.findFirst({
    where: {
      userId,
      status: 'completed',
      id: { not: latestAssessment.id },
      completedAt: { lt: latestAssessment.completedAt ?? new Date(0) },
    },
    orderBy: { completedAt: 'desc' },
    include: { responses: true },
  });

  let previousPillarScores: Record<string, number> = {};
  let previousOverallScore: number | null = null;
  let scoreChanges: PillarScoreChange[] = [];

  if (previousAssessment && previousAssessment.pillarScores) {
    try {
      const prevScores = JSON.parse(previousAssessment.pillarScores) as Array<{
        pillarId: string;
        normalizedScore: number;
      }>;

      for (const ps of prevScores) {
        previousPillarScores[ps.pillarId] = ps.normalizedScore;
      }

      previousOverallScore = previousAssessment.overallScore ?? null;
    } catch {
      // Previous scores are invalid, treat as no previous assessment
    }
  }

  // Step 4: Compute score changes
  for (const current of currentPillarScores) {
    const previous = previousPillarScores[current.pillarId];
    if (previous !== undefined) {
      scoreChanges.push({
        pillarId: current.pillarId,
        pillarName: current.pillarName,
        previous,
        current: current.normalizedScore,
        delta: Math.round((current.normalizedScore - previous) * 100) / 100,
      });
    }
  }

  // Step 5: Generate deterministic top 3 risks
  const topRisks = generateTopRisks(currentPillarScores, scoreChanges);

  // Step 6: Generate deterministic top 3 quick wins
  const topQuickWins = generateTopQuickWins(currentPillarScores, scoreChanges);

  const overallDelta = previousOverallScore !== null
    ? Math.round((scoringResult.overallScore - previousOverallScore) * 100) / 100
    : null;

  return {
    overallScore: scoringResult.overallScore,
    previousOverallScore,
    overallDelta,
    pillarScores: currentPillarScores,
    scoreChanges,
    topRisks,
    topQuickWins,
    month: getCurrentMonth(),
    assessmentId: latestAssessment.id,
  };
}

/**
 * Generate deterministic top 3 risks based on:
 * 1. Pillars with the biggest declines
 * 2. Pillars with the lowest absolute scores
 */
function generateTopRisks(
  currentPillarScores: Array<{ pillarId: string; pillarName: string; normalizedScore: number }>,
  scoreChanges: PillarScoreChange[]
): string[] {
  const risks: Array<{ pillarId: string; pillarName: string; riskScore: number; description: string }> = [];

  for (const pillar of currentPillarScores) {
    const change = scoreChanges.find(sc => sc.pillarId === pillar.pillarId);
    const delta = change?.delta ?? 0;

    // Risk score: higher is more risky
    // Low absolute score contributes to risk
    // Negative delta (decline) strongly contributes to risk
    const lowScoreRisk = Math.max(0, 50 - pillar.normalizedScore) * 1.5;
    const declineRisk = Math.max(0, -delta) * 3;
    const riskScore = lowScoreRisk + declineRisk;

    if (riskScore > 0) {
      let description: string;

      if (delta < -5) {
        description = `${pillar.pillarName} has declined by ${Math.abs(delta).toFixed(1)} points and now sits at ${Math.round(pillar.normalizedScore)}%. This downward trend requires immediate attention to prevent further erosion of AI readiness.`;
      } else if (pillar.normalizedScore < 25) {
        description = `${pillar.pillarName} is critically low at ${Math.round(pillar.normalizedScore)}%, posing a fundamental barrier to AI adoption. This pillar must be addressed before advanced initiatives can succeed.`;
      } else if (pillar.normalizedScore < 40) {
        description = `${pillar.pillarName} remains below foundational readiness at ${Math.round(pillar.normalizedScore)}%. Without investment here, AI initiatives in dependent areas will struggle to deliver value.`;
      } else if (delta < -2) {
        description = `${pillar.pillarName} shows a slight decline of ${Math.abs(delta).toFixed(1)} points (now ${Math.round(pillar.normalizedScore)}%). Monitor this trend to ensure it doesn't accelerate.`;
      } else {
        description = `${pillar.pillarName} at ${Math.round(pillar.normalizedScore)}% has limited improvement potential and may constrain overall AI readiness if not addressed.`;
      }

      risks.push({
        pillarId: pillar.pillarId,
        pillarName: pillar.pillarName,
        riskScore,
        description,
      });
    }
  }

  // Sort by risk score descending, take top 3
  return risks
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 3)
    .map(r => r.description);
}

/**
 * Generate deterministic top 3 quick wins based on:
 * Pillars with low scores but high strategic weight — meaning small improvements
 * yield disproportionate impact on overall readiness.
 */
function generateTopQuickWins(
  currentPillarScores: Array<{ pillarId: string; pillarName: string; normalizedScore: number; weight: number }>,
  scoreChanges: PillarScoreChange[]
): string[] {
  const quickWins: Array<{ pillarId: string; pillarName: string; quickWinScore: number; description: string }> = [];

  for (const pillar of currentPillarScores) {
    // Quick win potential: low score + high weight = high impact from small improvement
    // Also, pillars that were previously higher and declined are easier to recover
    const change = scoreChanges.find(sc => sc.pillarId === pillar.pillarId);
    const delta = change?.delta ?? 0;
    const improvementPotential = Math.max(0, 75 - pillar.normalizedScore);
    const quickWinScore = improvementPotential * pillar.weight * 2 + Math.max(0, -delta);

    if (quickWinScore > 5) {
      let description: string;
      const pillarDef = getPillarById(pillar.pillarId);

      if (delta < -3) {
        description = `Recovering the ${Math.abs(delta).toFixed(1)}-point decline in ${pillar.pillarName} (currently ${Math.round(pillar.normalizedScore)}%) would yield a high-impact quick win, as this pillar carries ${Math.round(pillar.weight * 100)}% weight in overall readiness.`;
      } else if (pillar.normalizedScore < 35) {
        description = `${pillar.pillarName} at ${Math.round(pillar.normalizedScore)}% offers the highest improvement potential. Even modest gains in this high-weight pillar (${Math.round(pillar.weight * 100)}%) will significantly boost overall AI readiness.`;
      } else if (pillar.normalizedScore < 55) {
        description = `${pillar.pillarName} at ${Math.round(pillar.normalizedScore)}% is approaching foundational readiness. Targeted improvements here (${Math.round(pillar.weight * 100)}% weight) offer a strong return on effort.`;
      } else {
        description = `${pillar.pillarName} at ${Math.round(pillar.normalizedScore)}% has room for incremental gains that, combined with its ${Math.round(pillar.weight * 100)}% strategic weight, would noticeably improve your overall score.`;
      }

      quickWins.push({
        pillarId: pillar.pillarId,
        pillarName: pillar.pillarName,
        quickWinScore,
        description,
      });
    }
  }

  // Sort by quick win score descending, take top 3
  return quickWins
    .sort((a, b) => b.quickWinScore - a.quickWinScore)
    .slice(0, 3)
    .map(qw => qw.description);
}

/**
 * Recompute previousOverallScore / overallDelta for PulseRun rows loaded from the DB.
 * These fields are not persisted on PulseRun; GET /api/pulse hydrates them so clients
 * match POST responses and avoid undefined vs null bugs.
 */
export function deriveStoredPulseOverallMetrics(input: {
  overallScore: number;
  pillarScores: PulseResult['pillarScores'];
  scoreChanges: PillarScoreChange[];
}): { previousOverallScore: number | null; overallDelta: number | null } {
  const { overallScore, pillarScores, scoreChanges } = input;
  if (!pillarScores.length || !scoreChanges.length) {
    return { previousOverallScore: null, overallDelta: null };
  }

  const prevPillars: PillarScoreResult[] = pillarScores.map((p) => {
    const ch = scoreChanges.find((c) => c.pillarId === p.pillarId);
    const normalizedScore = ch !== undefined ? ch.previous : p.normalizedScore;
    return {
      pillarId: p.pillarId,
      pillarName: p.pillarName,
      rawScore: 0,
      maxRaw: 1,
      normalizedScore,
      maturityBand: 'laggard',
      maturityLabel: '',
      maturityColor: '',
      weight: p.weight,
      questionDetails: [],
      adjustments: [],
    };
  });

  const previousOverallScore = calculateOverallScore(prevPillars);
  const cur = Math.round(Math.max(0, Math.min(100, overallScore)) * 100) / 100;
  const overallDelta = Math.round((cur - previousOverallScore) * 100) / 100;
  return { previousOverallScore, overallDelta };
}

/**
 * Save a PulseRun result to the database.
 */
export async function savePulseRun(userId: string, result: PulseResult): Promise<string> {
  // Check if a pulse already exists for this month
  const existing = await db.pulseRun.findFirst({
    where: { userId, month: result.month },
  });

  if (existing) {
    // Update existing pulse
    await db.pulseRun.update({
      where: { id: existing.id },
      data: {
        assessmentId: result.assessmentId,
        overallScore: result.overallScore,
        pillarScores: JSON.stringify(result.pillarScores),
        scoreChanges: JSON.stringify(result.scoreChanges),
        topRisks: JSON.stringify(result.topRisks),
        topQuickWins: JSON.stringify(result.topQuickWins),
        status: 'completed',
      },
    });
    return existing.id;
  }

  // Create new pulse run
  const pulseRun = await db.pulseRun.create({
    data: {
      userId,
      assessmentId: result.assessmentId,
      overallScore: result.overallScore,
      pillarScores: JSON.stringify(result.pillarScores),
      scoreChanges: JSON.stringify(result.scoreChanges),
      topRisks: JSON.stringify(result.topRisks),
      topQuickWins: JSON.stringify(result.topQuickWins),
      month: result.month,
      status: 'completed',
    },
  });

  return pulseRun.id;
}
