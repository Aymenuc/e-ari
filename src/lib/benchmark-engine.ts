/**
 * E-ARI Benchmark Engine v2
 *
 * Computes anonymous, aggregated benchmark snapshots from consented assessments.
 * Provides percentile ranking, sector-level statistics, and merges real data
 * with curated research-based benchmarks for comprehensive coverage.
 *
 * Improvements over v1:
 * - Weighted average calculations by organization size
 * - Overall score benchmarks (in addition to per-pillar)
 * - Merged real + curated benchmark data
 * - Efficient snapshot storage
 */

import { db } from './db';
import { PILLARS, SCORING_VERSION } from './pillars';
import { getCuratedBenchmark } from './agent';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SectorPillarStats {
  sector: string;
  pillarId: string;
  avgScore: number;
  medianScore: number;
  p25Score: number;
  p75Score: number;
  p90Score: number;
  sampleSize: number;
  scoringVersion: string;
  isRealData: boolean; // true if from real assessments, false if curated fallback
}

export interface PercentileResult {
  sector: string;
  pillarId: string;
  score: number;
  percentile: number;
  sampleSize: number;
}

export interface SectorBenchmarkResult {
  sector: string;
  pillars: SectorPillarStats[];
  overall: SectorPillarStats | null;
}

// ─── Org Size Weights ───────────────────────────────────────────────────────

const ORG_SIZE_WEIGHTS: Record<string, number> = {
  '1-50': 1,
  '51-200': 2,
  '201-1000': 3,
  '1001-5000': 4,
  '5000+': 5,
};

function getOrgSizeWeight(orgSize: string | null): number {
  if (!orgSize) return 1; // Default weight for unknown org size
  return ORG_SIZE_WEIGHTS[orgSize] ?? 1;
}

// ─── Statistical Helpers ────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return Math.round((sorted[lower] * (1 - weight) + sorted[upper] * weight) * 100) / 100;
}

function median(sorted: number[]): number {
  return percentile(sorted, 50);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

function weightedAverage(values: number[], weights: number[]): number {
  if (values.length === 0 || values.length !== weights.length) return average(values);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return average(values);
  const weightedSum = values.reduce((sum, v, i) => sum + v * weights[i], 0);
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

// ─── Core Engine Functions ──────────────────────────────────────────────────

/**
 * Recompute all benchmark snapshots from consented, completed assessments.
 * Uses weighted averages by organization size.
 * Also computes overall score benchmarks.
 */
export async function recomputeBenchmarks(): Promise<number> {
  const consents = await db.benchmarkConsent.findMany({
    where: { consented: true },
    select: { assessmentId: true },
  });

  const consentedIds = new Set(consents.map(c => c.assessmentId));
  if (consentedIds.size === 0) return 0;

  const assessments = await db.assessment.findMany({
    where: {
      id: { in: Array.from(consentedIds) },
      status: 'completed',
      pillarScores: { not: null },
    },
    select: {
      id: true,
      sector: true,
      pillarScores: true,
      overallScore: true,
      userId: true,
    },
  });

  if (assessments.length === 0) return 0;

  // Fetch org sizes for weighted averaging
  const userIds = [...new Set(assessments.map(a => a.userId))];
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, orgSize: true },
  });
  const userOrgSizes = new Map(users.map(u => [u.id, u.orgSize]));

  // Group by sector + pillar, tracking weights
  const grouped: Record<string, Record<string, { scores: number[]; weights: number[] }>> = {};
  const overallGrouped: Record<string, { scores: number[]; weights: number[] }> = {};

  for (const assessment of assessments) {
    const sector = assessment.sector || 'general';
    if (!grouped[sector]) grouped[sector] = {};

    const orgWeight = getOrgSizeWeight(userOrgSizes.get(assessment.userId) ?? null);

    // Overall score
    if (!overallGrouped[sector]) overallGrouped[sector] = { scores: [], weights: [] };
    if (assessment.overallScore !== null) {
      overallGrouped[sector].scores.push(assessment.overallScore);
      overallGrouped[sector].weights.push(orgWeight);
    }

    try {
      const pillarScores = JSON.parse(assessment.pillarScores!) as Array<{
        pillarId: string;
        normalizedScore: number;
      }>;

      for (const ps of pillarScores) {
        if (!grouped[sector][ps.pillarId]) {
          grouped[sector][ps.pillarId] = { scores: [], weights: [] };
        }
        grouped[sector][ps.pillarId].scores.push(ps.normalizedScore);
        grouped[sector][ps.pillarId].weights.push(orgWeight);
      }
    } catch {
      continue;
    }
  }

  // Delete all existing snapshots and recompute
  await db.benchmarkSnapshot.deleteMany({});

  let snapshotCount = 0;

  for (const [sector, pillarData] of Object.entries(grouped)) {
    for (const [pillarId, data] of Object.entries(pillarData)) {
      const sorted = [...data.scores].sort((a, b) => a - b);

      await db.benchmarkSnapshot.create({
        data: {
          sector,
          pillarId,
          avgScore: weightedAverage(data.scores, data.weights),
          medianScore: median(sorted),
          p25Score: percentile(sorted, 25),
          p75Score: percentile(sorted, 75),
          p90Score: percentile(sorted, 90),
          sampleSize: sorted.length,
          scoringVersion: SCORING_VERSION,
        },
      });
      snapshotCount++;
    }
  }

  // Store overall score benchmarks with pillarId = "overall"
  for (const [sector, data] of Object.entries(overallGrouped)) {
    const sorted = [...data.scores].sort((a, b) => a - b);

    await db.benchmarkSnapshot.create({
      data: {
        sector,
        pillarId: 'overall',
        avgScore: weightedAverage(data.scores, data.weights),
        medianScore: median(sorted),
        p25Score: percentile(sorted, 25),
        p75Score: percentile(sorted, 75),
        p90Score: percentile(sorted, 90),
        sampleSize: sorted.length,
        scoringVersion: SCORING_VERSION,
      },
    });
    snapshotCount++;
  }

  return snapshotCount;
}

/**
 * Recompute benchmarks for a specific sector only.
 */
export async function recomputeSectorBenchmarks(sector: string): Promise<number> {
  const consents = await db.benchmarkConsent.findMany({
    where: { consented: true },
    select: { assessmentId: true },
  });

  const consentedIds = new Set(consents.map(c => c.assessmentId));
  if (consentedIds.size === 0) {
    await db.benchmarkSnapshot.deleteMany({ where: { sector } });
    return 0;
  }

  const assessments = await db.assessment.findMany({
    where: {
      id: { in: Array.from(consentedIds) },
      status: 'completed',
      sector,
      pillarScores: { not: null },
    },
    select: {
      id: true,
      sector: true,
      pillarScores: true,
      overallScore: true,
      userId: true,
    },
  });

  if (assessments.length === 0) {
    await db.benchmarkSnapshot.deleteMany({ where: { sector } });
    return 0;
  }

  // Fetch org sizes
  const userIds = [...new Set(assessments.map(a => a.userId))];
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, orgSize: true },
  });
  const userOrgSizes = new Map(users.map(u => [u.id, u.orgSize]));

  const pillarScoresMap: Record<string, { scores: number[]; weights: number[] }> = {};
  const overallScores: { scores: number[]; weights: number[] } = { scores: [], weights: [] };

  for (const assessment of assessments) {
    const orgWeight = getOrgSizeWeight(userOrgSizes.get(assessment.userId) ?? null);

    if (assessment.overallScore !== null) {
      overallScores.scores.push(assessment.overallScore);
      overallScores.weights.push(orgWeight);
    }

    try {
      const pillarScores = JSON.parse(assessment.pillarScores!) as Array<{
        pillarId: string;
        normalizedScore: number;
      }>;

      for (const ps of pillarScores) {
        if (!pillarScoresMap[ps.pillarId]) {
          pillarScoresMap[ps.pillarId] = { scores: [], weights: [] };
        }
        pillarScoresMap[ps.pillarId].scores.push(ps.normalizedScore);
        pillarScoresMap[ps.pillarId].weights.push(orgWeight);
      }
    } catch {
      continue;
    }
  }

  await db.benchmarkSnapshot.deleteMany({ where: { sector } });

  let snapshotCount = 0;

  for (const [pillarId, data] of Object.entries(pillarScoresMap)) {
    const sorted = [...data.scores].sort((a, b) => a - b);

    await db.benchmarkSnapshot.create({
      data: {
        sector,
        pillarId,
        avgScore: weightedAverage(data.scores, data.weights),
        medianScore: median(sorted),
        p25Score: percentile(sorted, 25),
        p75Score: percentile(sorted, 75),
        p90Score: percentile(sorted, 90),
        sampleSize: sorted.length,
        scoringVersion: SCORING_VERSION,
      },
    });
    snapshotCount++;
  }

  // Overall score benchmark
  if (overallScores.scores.length > 0) {
    const sorted = [...overallScores.scores].sort((a, b) => a - b);
    await db.benchmarkSnapshot.create({
      data: {
        sector,
        pillarId: 'overall',
        avgScore: weightedAverage(overallScores.scores, overallScores.weights),
        medianScore: median(sorted),
        p25Score: percentile(sorted, 25),
        p75Score: percentile(sorted, 75),
        p90Score: percentile(sorted, 90),
        sampleSize: sorted.length,
        scoringVersion: SCORING_VERSION,
      },
    });
    snapshotCount++;
  }

  return snapshotCount;
}

/**
 * Get the user's percentile ranking for a specific pillar within their sector.
 */
export async function getPercentile(
  sector: string,
  pillarId: string,
  score: number
): Promise<PercentileResult | null> {
  const snapshot = await db.benchmarkSnapshot.findFirst({
    where: { sector, pillarId },
    orderBy: { computedAt: 'desc' },
  });

  if (!snapshot) return null;

  let estimatedPercentile: number;

  if (score <= snapshot.p25Score) {
    if (snapshot.p25Score > 0) {
      estimatedPercentile = Math.round((score / snapshot.p25Score) * 25 * 100) / 100;
    } else {
      estimatedPercentile = 0;
    }
  } else if (score <= snapshot.medianScore) {
    const range = snapshot.medianScore - snapshot.p25Score;
    estimatedPercentile = range > 0 ? 25 + ((score - snapshot.p25Score) / range) * 25 : 25;
  } else if (score <= snapshot.p75Score) {
    const range = snapshot.p75Score - snapshot.medianScore;
    estimatedPercentile = range > 0 ? 50 + ((score - snapshot.medianScore) / range) * 25 : 50;
  } else if (score <= snapshot.p90Score) {
    const range = snapshot.p90Score - snapshot.p75Score;
    estimatedPercentile = range > 0 ? 75 + ((score - snapshot.p75Score) / range) * 15 : 75;
  } else {
    estimatedPercentile = 90 + Math.min(10, ((score - snapshot.p90Score) / 10) * 10);
  }

  estimatedPercentile = Math.max(0, Math.min(100, Math.round(estimatedPercentile * 100) / 100));

  return {
    sector,
    pillarId,
    score,
    percentile: estimatedPercentile,
    sampleSize: snapshot.sampleSize,
  };
}

/**
 * Get all pillar benchmark statistics for a given sector.
 * Merges real assessment data with curated research-based benchmarks.
 * Real data takes priority where sampleSize >= 5.
 */
export async function getSectorStats(sector: string): Promise<SectorBenchmarkResult> {
  const snapshots = await db.benchmarkSnapshot.findMany({
    where: { sector },
    orderBy: { computedAt: 'desc' },
  });

  // Keep only the latest snapshot per pillarId
  const latestByPillar = new Map<string, typeof snapshots[0]>();
  for (const s of snapshots) {
    if (!latestByPillar.has(s.pillarId)) {
      latestByPillar.set(s.pillarId, s);
    }
  }

  // Get curated benchmarks as fallback
  const curated = getCuratedBenchmark(sector);

  const MIN_SAMPLE_FOR_REAL_DATA = 3;

  const pillarStats: SectorPillarStats[] = PILLARS.map(pillar => {
    const snapshot = latestByPillar.get(pillar.id);
    if (snapshot && snapshot.sampleSize >= MIN_SAMPLE_FOR_REAL_DATA) {
      return {
        sector,
        pillarId: snapshot.pillarId,
        avgScore: snapshot.avgScore,
        medianScore: snapshot.medianScore,
        p25Score: snapshot.p25Score,
        p75Score: snapshot.p75Score,
        p90Score: snapshot.p90Score,
        sampleSize: snapshot.sampleSize,
        scoringVersion: snapshot.scoringVersion,
        isRealData: true,
      };
    }
    // Fall back to curated data
    const curatedAvg = curated.pillarAverages[pillar.id] ?? 35;
    return {
      sector,
      pillarId: pillar.id,
      avgScore: curatedAvg,
      medianScore: curatedAvg,
      p25Score: Math.round(Math.max(0, curatedAvg - 12)),
      p75Score: Math.round(Math.min(100, curatedAvg + 15)),
      p90Score: Math.round(Math.min(100, curatedAvg + 22)),
      sampleSize: 0, // 0 indicates curated/estimated
      scoringVersion: SCORING_VERSION,
      isRealData: false,
    };
  });

  // Overall benchmark
  const overallSnapshot = latestByPillar.get('overall');
  let overall: SectorPillarStats | null = null;
  if (overallSnapshot && overallSnapshot.sampleSize >= MIN_SAMPLE_FOR_REAL_DATA) {
    overall = {
      sector,
      pillarId: 'overall',
      avgScore: overallSnapshot.avgScore,
      medianScore: overallSnapshot.medianScore,
      p25Score: overallSnapshot.p25Score,
      p75Score: overallSnapshot.p75Score,
      p90Score: overallSnapshot.p90Score,
      sampleSize: overallSnapshot.sampleSize,
      scoringVersion: overallSnapshot.scoringVersion,
      isRealData: true,
    };
  } else {
    overall = {
      sector,
      pillarId: 'overall',
      avgScore: curated.averageScore,
      medianScore: curated.averageScore,
      p25Score: curated.bottomQuartile,
      p75Score: curated.topQuartile,
      p90Score: Math.round(Math.min(100, curated.topQuartile + 10)),
      sampleSize: 0,
      scoringVersion: SCORING_VERSION,
      isRealData: false,
    };
  }

  return {
    sector,
    pillars: pillarStats,
    overall,
  };
}

/**
 * Get overall sector benchmark stats.
 */
export async function getOverallSectorStats(sector: string): Promise<SectorPillarStats | null> {
  const result = await getSectorStats(sector);
  return result.overall;
}
