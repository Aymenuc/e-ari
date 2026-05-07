/**
 * Sector-specific pillar weight modifiers.
 *
 * Default weights live in pillars.ts. This module re-weights them per sector
 * so a healthcare org's overall score reflects what *actually matters* in
 * healthcare AI (governance & risk dominate) versus a retail org (data &
 * process dominate).
 *
 * Multipliers are applied to the base weights, then the result is
 * re-normalised so weights sum to 1.0. This keeps the overall score on the
 * 0–100 scale while changing how pillars contribute.
 *
 * The output is deterministic and is recorded on the assessment as
 * `sectorWeighting` so reports can show the user *why* their score moved
 * relative to the unweighted baseline.
 */

import { PILLARS } from './pillars';

export interface SectorWeightProfile {
  sector: string;
  rationale: string;
  multipliers: Record<string, number>;
}

/**
 * Multipliers per sector. Default = 1.0 (no change). Calibrated to reflect
 * the pillars that drive enterprise AI outcomes in each sector based on
 * regulatory exposure, operational dependency, and incident-class history.
 */
export const SECTOR_WEIGHT_PROFILES: Record<string, SectorWeightProfile> = {
  healthcare: {
    sector: 'healthcare',
    rationale: 'Patient safety and clinical governance dominate. Bias, transparency and risk controls are not optional. Data quality is foundational.',
    multipliers: {
      governance: 1.35,
      security: 1.25,
      data: 1.20,
      process: 1.05,
      strategy: 0.95,
      technology: 0.90,
      culture: 0.90,
      talent: 0.95,
    },
  },
  finance: {
    sector: 'finance',
    rationale: 'Regulatory exposure (DORA, MiCA, AI Act high-risk) plus model risk management dominate. Data quality determines model performance.',
    multipliers: {
      governance: 1.30,
      security: 1.25,
      data: 1.20,
      strategy: 1.05,
      process: 1.00,
      technology: 0.95,
      talent: 0.90,
      culture: 0.85,
    },
  },
  manufacturing: {
    sector: 'manufacturing',
    rationale: 'Operational technology integration, process maturity and shop-floor data quality dominate AI value capture.',
    multipliers: {
      process: 1.30,
      data: 1.20,
      technology: 1.15,
      security: 1.10,
      strategy: 1.00,
      governance: 0.95,
      talent: 0.90,
      culture: 0.85,
    },
  },
  retail: {
    sector: 'retail',
    rationale: 'Personalisation, supply chain and demand forecasting all live or die on data quality and process integration.',
    multipliers: {
      data: 1.30,
      process: 1.20,
      technology: 1.10,
      strategy: 1.05,
      culture: 1.00,
      talent: 0.95,
      governance: 0.90,
      security: 0.95,
    },
  },
  technology: {
    sector: 'technology',
    rationale: 'Engineering capacity, MLOps maturity and shipping velocity dominate. Governance becomes critical late.',
    multipliers: {
      technology: 1.25,
      talent: 1.20,
      strategy: 1.10,
      data: 1.05,
      culture: 1.00,
      process: 0.95,
      governance: 0.90,
      security: 0.95,
    },
  },
  government: {
    sector: 'government',
    rationale: 'Public-trust requirements make transparency, governance and security non-negotiable; talent constraints are structural.',
    multipliers: {
      governance: 1.35,
      security: 1.25,
      data: 1.10,
      process: 1.05,
      strategy: 1.00,
      talent: 0.90,
      culture: 0.90,
      technology: 0.95,
    },
  },
  energy: {
    sector: 'energy',
    rationale: 'Critical-infrastructure security, sensor data quality and reliable operations engineering dominate. Cultural change is slow but essential.',
    multipliers: {
      security: 1.30,
      data: 1.20,
      process: 1.15,
      technology: 1.10,
      governance: 1.05,
      strategy: 1.00,
      talent: 0.90,
      culture: 0.90,
    },
  },
  education: {
    sector: 'education',
    rationale: 'High-risk under the AI Act, with strong fairness/transparency obligations and a culture-first change profile.',
    multipliers: {
      governance: 1.25,
      culture: 1.20,
      security: 1.10,
      data: 1.05,
      strategy: 1.00,
      process: 0.95,
      technology: 0.95,
      talent: 0.95,
    },
  },
  general: {
    sector: 'general',
    rationale: 'No sector specified — using balanced cross-industry weighting.',
    multipliers: {
      strategy: 1.0,
      data: 1.0,
      technology: 1.0,
      talent: 1.0,
      governance: 1.0,
      culture: 1.0,
      process: 1.0,
      security: 1.0,
    },
  },
};

export interface SectorWeightedPillar {
  pillarId: string;
  baseWeight: number;
  multiplier: number;
  weightedRaw: number;
  finalWeight: number;
}

export interface SectorWeightingApplication {
  sector: string;
  rationale: string;
  pillars: SectorWeightedPillar[];
}

/**
 * Apply sector multipliers to base pillar weights and renormalise to 1.0.
 * Returns a fully-formed application record (deterministic, persistable).
 */
export function applySectorWeighting(sector: string): SectorWeightingApplication {
  const profile = SECTOR_WEIGHT_PROFILES[sector] ?? SECTOR_WEIGHT_PROFILES.general;
  const pillars = PILLARS.map(p => {
    const multiplier = profile.multipliers[p.id] ?? 1.0;
    return {
      pillarId: p.id,
      baseWeight: p.weight,
      multiplier,
      weightedRaw: p.weight * multiplier,
    };
  });
  const sumRaw = pillars.reduce((s, p) => s + p.weightedRaw, 0);
  const final: SectorWeightedPillar[] = pillars.map(p => ({
    ...p,
    finalWeight: Math.round((p.weightedRaw / sumRaw) * 10000) / 10000,
  }));
  return {
    sector: profile.sector,
    rationale: profile.rationale,
    pillars: final,
  };
}

/**
 * Look up the renormalised weight for a pillar in a given sector.
 */
export function getSectorWeight(sector: string, pillarId: string): number {
  const application = applySectorWeighting(sector);
  return application.pillars.find(p => p.pillarId === pillarId)?.finalWeight ?? 0;
}
