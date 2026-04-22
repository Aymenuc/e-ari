/**
 * E-ARI Continuous Monitoring Engine
 *
 * Provides drift detection, alerting, and scheduling for ongoing AI readiness
 * monitoring. Tracks per-pillar score changes over time, detects regressions
 * and improvements, surfaces milestone achievements, and recommends monitoring
 * frequency based on risk level.
 *
 * Key concepts:
 * - Drift: difference between current and previous normalized scores per pillar
 *   (+5 or more = improving, -5 or less = regressing, otherwise = stable)
 * - Alerts: triggered for significant regressions, milestone crossings,
 *   certification changes, and benchmark shifts
 * - Scheduling: higher risk levels drive more frequent monitoring cadences
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MonitoringAlert {
  id: string;
  type: 'score_drift' | 'pillar_regression' | 'milestone_achieved' | 'certification_change' | 'benchmark_shift';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  pillarId?: string;
  previousValue: number;
  currentValue: number;
  detectedAt: string;
  recommendation: string;
}

export interface DriftAnalysis {
  overallDrift: number; // positive = improving, negative = regressing
  pillarDrifts: Array<{
    pillarId: string;
    pillarName: string;
    drift: number;
    direction: 'improving' | 'stable' | 'regressing';
    trend: number[]; // last N scores for trend line
  }>;
  alerts: MonitoringAlert[];
  riskLevel: 'low' | 'medium' | 'high';
  summary: string;
}

export interface MonitoringSchedule {
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  nextCheck: string;
  lastCheck: string | null;
  isAutoEnabled: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** The 8 E-ARI pillar IDs in canonical order */
const PILLAR_IDS = [
  'strategy',
  'data',
  'technology',
  'talent',
  'governance',
  'culture',
  'process',
  'security',
] as const;

/** Thresholds used for drift direction classification */
const IMPROVING_THRESHOLD = 5;
const REGRESSING_THRESHOLD = -5;

/** Threshold for pillar regression alerts */
const REGRESSION_ALERT_THRESHOLD = 10;

/** Milestone boundaries that trigger achievements when crossed upward */
const MILESTONE_THRESHOLDS = [25, 50, 75] as const;

/** Certification level boundaries (aligned with maturity bands) */
function getCertificationLevel(score: number): string {
  if (score <= 25) return 'Laggard';
  if (score <= 50) return 'Follower';
  if (score <= 75) return 'Chaser';
  return 'Pacesetter';
}

/** Frequency intervals in days */
const FREQUENCY_DAYS: Record<MonitoringSchedule['frequency'], number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function isoNow(): string {
  return new Date().toISOString();
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Analyze score drift between current and previous assessment periods.
 *
 * For each pillar, computes the difference (current - previous) and classifies
 * the direction. If optional history is provided, trend lines are populated
 * with the last N scores for that pillar.
 *
 * Risk level is derived from the severity and breadth of regressions:
 * - high:  any single pillar regressed by >15, or 3+ pillars regressing
 * - medium: any pillar regressed by >5, or 1-2 pillars regressing
 * - low:   no regressing pillars
 */
export function analyzeDrift(
  currentScores: Array<{ pillarId: string; pillarName: string; normalizedScore: number }>,
  previousScores: Array<{ pillarId: string; pillarName: string; normalizedScore: number }>,
  history?: Array<{ date: string; overallScore: number; pillarScores: Record<string, number> }>,
): DriftAnalysis {
  // Build lookup maps for quick access
  const currentMap = new Map(currentScores.map((s) => [s.pillarId, s]));
  const previousMap = new Map(previousScores.map((s) => [s.pillarId, s]));

  // Compute overall scores (simple average of all pillar scores)
  const currentOverall = currentScores.reduce((sum, s) => sum + s.normalizedScore, 0) / currentScores.length;
  const previousOverall = previousScores.reduce((sum, s) => sum + s.normalizedScore, 0) / previousScores.length;
  const overallDrift = Math.round((currentOverall - previousOverall) * 100) / 100;

  // Build trend data from history if available
  const trendMap = new Map<string, number[]>();
  if (history && history.length > 0) {
    for (const pillarId of PILLAR_IDS) {
      const trend: number[] = [];
      for (const entry of history) {
        if (entry.pillarScores[pillarId] !== undefined) {
          trend.push(entry.pillarScores[pillarId]);
        }
      }
      trendMap.set(pillarId, trend);
    }
  }

  const pillarDrifts: DriftAnalysis['pillarDrifts'] = [];
  const alerts: MonitoringAlert[] = [];
  let regressingCount = 0;
  let maxRegress = 0;
  const regressingPillars: string[] = [];

  for (const pillarId of PILLAR_IDS) {
    const current = currentMap.get(pillarId);
    const previous = previousMap.get(pillarId);

    if (!current || !previous) continue;

    const drift = Math.round((current.normalizedScore - previous.normalizedScore) * 100) / 100;

    let direction: 'improving' | 'stable' | 'regressing';
    if (drift >= IMPROVING_THRESHOLD) {
      direction = 'improving';
    } else if (drift <= REGRESSING_THRESHOLD) {
      direction = 'regressing';
      regressingCount++;
      regressingPillars.push(current.pillarName);
      if (Math.abs(drift) > maxRegress) {
        maxRegress = Math.abs(drift);
      }
    } else {
      direction = 'stable';
    }

    const trend = trendMap.get(pillarId) ?? [previous.normalizedScore, current.normalizedScore];

    pillarDrifts.push({
      pillarId,
      pillarName: current.pillarName,
      drift,
      direction,
      trend,
    });

    // Generate pillar regression alert if drift < -10
    if (drift <= -REGRESSION_ALERT_THRESHOLD) {
      const severity: MonitoringAlert['severity'] = drift <= -20 ? 'critical' : 'warning';
      alerts.push({
        id: generateAlertId(),
        type: 'pillar_regression',
        severity,
        title: `${current.pillarName} Regression Detected`,
        description: `${current.pillarName} score dropped by ${Math.abs(drift).toFixed(1)} points (from ${previous.normalizedScore.toFixed(1)} to ${current.normalizedScore.toFixed(1)}).`,
        pillarId,
        previousValue: previous.normalizedScore,
        currentValue: current.normalizedScore,
        detectedAt: isoNow(),
        recommendation: getRegressionRecommendation(pillarId, drift),
      });
    }
  }

  // Determine risk level
  let riskLevel: DriftAnalysis['riskLevel'];
  if (maxRegress > 15 || regressingCount >= 3) {
    riskLevel = 'high';
  } else if (maxRegress > 5 || regressingCount >= 1) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  // Build summary
  const improvingPillars = pillarDrifts.filter((p) => p.direction === 'improving');
  const stablePillars = pillarDrifts.filter((p) => p.direction === 'stable');

  const parts: string[] = [];
  if (overallDrift > 0) {
    parts.push(`Overall readiness improved by ${overallDrift.toFixed(1)} points.`);
  } else if (overallDrift < 0) {
    parts.push(`Overall readiness declined by ${Math.abs(overallDrift).toFixed(1)} points.`);
  } else {
    parts.push('Overall readiness remained unchanged.');
  }

  if (improvingPillars.length > 0) {
    parts.push(`${improvingPillars.length} pillar(s) improving: ${improvingPillars.map((p) => p.pillarName).join(', ')}.`);
  }
  if (regressingCount > 0) {
    parts.push(`${regressingCount} pillar(s) regressing: ${regressingPillars.join(', ')}.`);
  }
  if (stablePillars.length > 0) {
    parts.push(`${stablePillars.length} pillar(s) stable.`);
  }

  parts.push(`Risk level: ${riskLevel}.`);

  const summary = parts.join(' ');

  return {
    overallDrift,
    pillarDrifts,
    alerts,
    riskLevel,
    summary,
  };
}

/**
 * Generate monitoring alerts based on drift analysis and additional context.
 *
 * Alert triggers:
 * - pillar_regression: already included in drift analysis (delegated here)
 * - milestone_achieved: overall score crossed a 25/50/75 boundary upward
 * - certification_change: overall score moved between certification levels
 * - score_drift: overall drift magnitude exceeds thresholds
 * - benchmark_shift: significant shift in overall score pattern
 */
export function generateAlerts(
  driftResult: DriftAnalysis,
  currentOverall: number,
  previousOverall: number | null,
  certificationLevel?: string,
): MonitoringAlert[] {
  const alerts: MonitoringAlert[] = [...driftResult.alerts];
  const now = isoNow();

  // Score drift alert (overall)
  if (previousOverall !== null) {
    const overallDrift = Math.round((currentOverall - previousOverall) * 100) / 100;

    if (overallDrift <= -10) {
      alerts.push({
        id: generateAlertId(),
        type: 'score_drift',
        severity: overallDrift <= -20 ? 'critical' : 'warning',
        title: 'Significant Overall Score Decline',
        description: `The overall E-ARI score dropped by ${Math.abs(overallDrift).toFixed(1)} points (from ${previousOverall.toFixed(1)} to ${currentOverall.toFixed(1)}). This may indicate systemic regression in AI readiness.`,
        previousValue: previousOverall,
        currentValue: currentOverall,
        detectedAt: now,
        recommendation: 'Conduct an immediate review of regressing pillars and identify root causes. Prioritize remediation actions before the next assessment cycle.',
      });
    } else if (overallDrift >= 10) {
      alerts.push({
        id: generateAlertId(),
        type: 'score_drift',
        severity: 'info',
        title: 'Significant Overall Score Improvement',
        description: `The overall E-ARI score improved by ${overallDrift.toFixed(1)} points (from ${previousOverall.toFixed(1)} to ${currentOverall.toFixed(1)}). Positive momentum detected across multiple dimensions.`,
        previousValue: previousOverall,
        currentValue: currentOverall,
        detectedAt: now,
        recommendation: 'Validate that improvements are sustainable by tracking key initiatives. Document successful practices for replication across the organization.',
      });
    }

    // Milestone achieved alerts
    for (const threshold of MILESTONE_THRESHOLDS) {
      if (previousOverall < threshold && currentOverall >= threshold) {
        alerts.push({
          id: generateAlertId(),
          type: 'milestone_achieved',
          severity: 'info',
          title: `Milestone: ${threshold}-Point Threshold Crossed`,
          description: `The overall E-ARI score crossed the ${threshold}-point milestone, moving from ${previousOverall.toFixed(1)} to ${currentOverall.toFixed(1)}. This represents a meaningful advancement in AI readiness maturity.`,
          previousValue: previousOverall,
          currentValue: currentOverall,
          detectedAt: now,
          recommendation: getMilestoneRecommendation(threshold),
        });
      }
    }

    // Certification level change
    const currentCert = certificationLevel ?? getCertificationLevel(currentOverall);
    const previousCert = getCertificationLevel(previousOverall);
    if (currentCert !== previousCert) {
      const isUpgrade = currentOverall > previousOverall;
      alerts.push({
        id: generateAlertId(),
        type: 'certification_change',
        severity: isUpgrade ? 'info' : 'warning',
        title: `Certification Level ${isUpgrade ? 'Upgraded' : 'Downgraded'}: ${currentCert}`,
        description: `The AI readiness certification level changed from ${previousCert} to ${currentCert} (overall score: ${previousOverall.toFixed(1)} → ${currentOverall.toFixed(1)}).`,
        previousValue: previousOverall,
        currentValue: currentOverall,
        detectedAt: now,
        recommendation: isUpgrade
          ? `Celebrate this achievement and communicate the upgrade to stakeholders. Continue investing in areas that drove this improvement.`
          : `Investigate the drivers behind this downgrade. Focus remediation on the weakest pillars and consider increasing monitoring frequency.`,
      });
    }
  }

  // Benchmark shift alert: if there are regressing pillars and overall drift is negative
  if (driftResult.overallDrift < -5 && driftResult.pillarDrifts.some((p) => p.direction === 'regressing')) {
    const regressingNames = driftResult.pillarDrifts
      .filter((p) => p.direction === 'regressing')
      .map((p) => p.pillarName)
      .join(', ');

    alerts.push({
      id: generateAlertId(),
      type: 'benchmark_shift',
      severity: driftResult.riskLevel === 'high' ? 'critical' : 'warning',
      title: 'Benchmark Position Shift Detected',
      description: `The organization's relative benchmark position may be shifting. Regressing pillars (${regressingNames}) could affect competitive positioning and industry comparisons.`,
      previousValue: Math.round((currentOverall - driftResult.overallDrift) * 100) / 100,
      currentValue: currentOverall,
      detectedAt: now,
      recommendation: 'Review industry benchmarks and peer comparisons. Identify whether regression is organization-specific or driven by industry-wide changes in expectations.',
    });
  }

  return alerts;
}

/**
 * Recommend a monitoring schedule based on the current overall score and risk level.
 *
 * Logic:
 * - High risk + score ≤ 50 → weekly
 * - High risk + score > 50 → biweekly
 * - Medium risk → biweekly
 * - Low risk + score ≤ 75 → monthly
 * - Low risk + score > 75 → quarterly
 */
export function getRecommendedSchedule(
  overallScore: number,
  riskLevel: DriftAnalysis['riskLevel'],
): MonitoringSchedule {
  let frequency: MonitoringSchedule['frequency'];
  let isAutoEnabled: boolean;

  if (riskLevel === 'high') {
    frequency = overallScore <= 50 ? 'weekly' : 'biweekly';
    isAutoEnabled = true;
  } else if (riskLevel === 'medium') {
    frequency = 'biweekly';
    isAutoEnabled = true;
  } else {
    // low risk
    frequency = overallScore <= 75 ? 'monthly' : 'quarterly';
    isAutoEnabled = overallScore <= 75; // auto-enable for non-pacesetters
  }

  const now = isoNow();
  const nextCheck = addDays(now, FREQUENCY_DAYS[frequency]);

  return {
    frequency,
    nextCheck,
    lastCheck: null,
    isAutoEnabled,
  };
}

/**
 * Generate a markdown-formatted monitoring report summarizing drift analysis
 * and the current monitoring schedule.
 */
export function generateMonitoringReport(drift: DriftAnalysis, schedule: MonitoringSchedule): string {
  const lines: string[] = [];

  lines.push('# E-ARI Monitoring Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Risk Level:** ${drift.riskLevel.toUpperCase()}`);
  lines.push(`**Monitoring Frequency:** ${schedule.frequency}`);
  lines.push(`**Next Check:** ${schedule.nextCheck}`);
  lines.push('');

  // Executive Summary
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(drift.summary);
  lines.push('');

  // Overall Drift
  const driftDirection = drift.overallDrift > 0 ? '📈 Improving' : drift.overallDrift < 0 ? '📉 Regressing' : '➡️ Stable';
  lines.push('## Overall Drift');
  lines.push('');
  lines.push(`**Direction:** ${driftDirection}`);
  lines.push(`**Magnitude:** ${drift.overallDrift > 0 ? '+' : ''}${drift.overallDrift.toFixed(1)} points`);
  lines.push('');

  // Pillar Breakdown
  lines.push('## Pillar Drift Breakdown');
  lines.push('');
  lines.push('| Pillar | Drift | Direction | Current Trend |');
  lines.push('|--------|-------|-----------|---------------|');

  for (const p of drift.pillarDrifts) {
    const directionIcon = p.direction === 'improving' ? '🟢 Improving' : p.direction === 'regressing' ? '🔴 Regressing' : '🟡 Stable';
    const driftStr = p.drift > 0 ? `+${p.drift.toFixed(1)}` : p.drift.toFixed(1);
    const trendPreview = p.trend.length > 0 ? p.trend.slice(-5).map((v) => v.toFixed(0)).join(' → ') : 'N/A';
    lines.push(`| ${p.pillarName} | ${driftStr} | ${directionIcon} | ${trendPreview} |`);
  }
  lines.push('');

  // Alerts
  if (drift.alerts.length > 0) {
    lines.push('## Active Alerts');
    lines.push('');
    for (const alert of drift.alerts) {
      const severityBadge = alert.severity === 'critical' ? '🔴 CRITICAL' : alert.severity === 'warning' ? '🟡 WARNING' : '🔵 INFO';
      lines.push(`### ${severityBadge}: ${alert.title}`);
      lines.push('');
      lines.push(`**Type:** ${alert.type}`);
      if (alert.pillarId) {
        lines.push(`**Pillar:** ${alert.pillarId}`);
      }
      lines.push(`**Previous Value:** ${alert.previousValue.toFixed(1)}`);
      lines.push(`**Current Value:** ${alert.currentValue.toFixed(1)}`);
      lines.push(`**Detected At:** ${alert.detectedAt}`);
      lines.push('');
      lines.push(alert.description);
      lines.push('');
      lines.push(`**Recommendation:** ${alert.recommendation}`);
      lines.push('');
    }
  } else {
    lines.push('## Active Alerts');
    lines.push('');
    lines.push('No alerts detected. AI readiness metrics are stable.');
    lines.push('');
  }

  // Monitoring Schedule
  lines.push('## Monitoring Schedule');
  lines.push('');
  lines.push(`- **Frequency:** ${schedule.frequency}`);
  lines.push(`- **Next Check:** ${schedule.nextCheck}`);
  lines.push(`- **Last Check:** ${schedule.lastCheck ?? 'N/A'}`);
  lines.push(`- **Auto-Monitoring:** ${schedule.isAutoEnabled ? 'Enabled' : 'Disabled'}`);
  lines.push('');

  // Recommendations
  lines.push('## Recommendations');
  lines.push('');
  if (drift.riskLevel === 'high') {
    lines.push('1. **Immediate action required:** Schedule a review with key stakeholders within the next week.');
    lines.push('2. **Root cause analysis:** Investigate the drivers behind pillar regressions and document findings.');
    lines.push('3. **Remediation plan:** Develop targeted improvement initiatives for regressing pillars.');
    lines.push('4. **Increase monitoring:** Consider escalating to weekly assessments until risk level decreases.');
  } else if (drift.riskLevel === 'medium') {
    lines.push('1. **Monitor closely:** Track regressing pillars over the next 1-2 assessment cycles.');
    lines.push('2. **Preventive action:** Address early signs of regression before they become critical.');
    lines.push('3. **Maintain momentum:** Continue investing in improving pillars to sustain positive trends.');
  } else {
    lines.push('1. **Sustain progress:** Continue current strategies that are driving improvements.');
    lines.push('2. **Explore advanced capabilities:** With stable or improving metrics, consider expanding AI initiatives.');
    lines.push('3. **Share best practices:** Document and propagate successful approaches across the organization.');
  }
  lines.push('');

  return lines.join('\n');
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

function getRegressionRecommendation(pillarId: string, drift: number): string {
  const recommendations: Record<string, string> = {
    strategy: 'Revisit AI strategy alignment with business objectives. Engage executive sponsors and reassess investment priorities.',
    data: 'Audit data quality, accessibility, and governance practices. Prioritize data infrastructure improvements before expanding AI workloads.',
    technology: 'Evaluate AI/ML platform maturity and MLOps practices. Ensure deployment pipelines and model monitoring are functioning effectively.',
    talent: 'Assess AI talent gaps and upskilling program effectiveness. Consider targeted hiring or training to address critical skill shortages.',
    governance: 'Strengthen AI governance frameworks and ethical guidelines. Review accountability structures and ensure compliance with emerging regulations.',
    culture: 'Reinforce change management practices and innovation culture. Address employee resistance and improve cross-functional collaboration.',
    process: 'Review AI-powered process integration and automation maturity. Ensure operational teams are equipped for day-to-day AI system management.',
    security: 'Prioritize AI-specific security controls and data privacy protections. Conduct vulnerability assessments and address compliance gaps.',
  };

  const base = recommendations[pillarId] ?? 'Conduct a focused review of this pillar and develop a targeted improvement plan.';

  if (drift <= -20) {
    return `CRITICAL: ${base} Immediate executive attention and resource allocation required.`;
  }

  return base;
}

function getMilestoneRecommendation(threshold: number): string {
  switch (threshold) {
    case 25:
      return 'Foundational readiness achieved. Build on this by formalizing AI strategy, establishing governance, and investing in data infrastructure.';
    case 50:
      return 'Mid-range readiness reached. Focus on scaling successful AI use cases, strengthening MLOps practices, and developing AI talent pipelines.';
    case 75:
      return 'Advanced readiness attained. Shift focus to leading industry practices, frontier AI capabilities, and continuous optimization of AI-driven processes.';
    default:
      return 'Continue investing in AI readiness improvements and track progress against organizational goals.';
  }
}
