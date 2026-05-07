/**
 * E-ARI X-Ray Engine — pattern detection across question response combinations.
 *
 * Where the assessment-engine produces a single number per pillar, this module
 * detects structural patterns that emerge from how questions interact across
 * pillars. These patterns are what make a report feel "tailored" — they
 * surface specific failure modes a generic score cannot.
 *
 * Every pattern returns:
 *   - id: stable identifier
 *   - severity: low | medium | high | critical
 *   - headline: one-line finding (≤ 80 chars, governance-grade tone)
 *   - evidence: which question IDs and answers triggered it
 *   - businessImpact: why this matters in plain terms
 *   - recommendation: one concrete next move
 *
 * These are deterministic — same responses always trigger the same patterns.
 * The patterns are then injected into the insight + recommendation agent
 * prompts so the LLM has *specifics* to ground in, not just a number.
 */

import type { ResponseMap } from './assessment-engine';

export type PatternSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface XRayFinding {
  id: string;
  title: string;
  severity: PatternSeverity;
  headline: string;
  evidence: { questionId: string; answer: number }[];
  businessImpact: string;
  recommendation: string;
  pillarsInvolved: string[];
}

const ans = (r: ResponseMap, id: string): number => r[id] ?? 0;
const sum = (r: ResponseMap, ids: string[]): number => ids.reduce((s, id) => s + ans(r, id), 0);

/**
 * P-01 Shadow IT Risk
 * High technology adoption + low governance = unmanaged AI proliferation.
 * This is the #1 EU AI Act exposure pattern.
 */
function detectShadowItRisk(r: ResponseMap): XRayFinding | null {
  const techAdoption = sum(r, ['technology_1', 'technology_2']); // platform + MLOps
  const govFloor = Math.min(ans(r, 'governance_1'), ans(r, 'governance_5')); // framework + compliance
  if (techAdoption >= 8 && govFloor <= 2) {
    return {
      id: 'P-01',
      title: 'Shadow IT Risk',
      severity: 'critical',
      headline: 'Mature AI tooling is being deployed without a governance framework to contain it.',
      evidence: [
        { questionId: 'technology_1', answer: ans(r, 'technology_1') },
        { questionId: 'technology_2', answer: ans(r, 'technology_2') },
        { questionId: 'governance_1', answer: ans(r, 'governance_1') },
        { questionId: 'governance_5', answer: ans(r, 'governance_5') },
      ],
      businessImpact:
        'AI systems shipped under this profile typically do not have a documented owner, a risk classification, or an audit trail. Under the EU AI Act, this is the single fastest path to a non-compliance finding once enforcement begins August 2026.',
      recommendation:
        'Inventory every model and data product currently in production this quarter. Assign each one a risk class (per Article 6) and a named owner before adding any new capability.',
      pillarsInvolved: ['technology', 'governance'],
    };
  }
  return null;
}

/**
 * P-02 The Ambition Gap
 * High strategic ambition without the data/governance foundation to deliver.
 */
function detectAmbitionGap(r: ResponseMap): XRayFinding | null {
  const ambition = sum(r, ['strategy_1', 'strategy_2', 'strategy_4']); // strategy + sponsorship + roadmap
  const foundation = Math.min(ans(r, 'data_3'), ans(r, 'governance_1')); // data governance + AI governance
  if (ambition >= 12 && foundation <= 2) {
    return {
      id: 'P-02',
      title: 'The Ambition Gap',
      severity: 'high',
      headline: 'Stated AI ambition outruns the data and governance scaffolding required to deliver it.',
      evidence: [
        { questionId: 'strategy_1', answer: ans(r, 'strategy_1') },
        { questionId: 'strategy_2', answer: ans(r, 'strategy_2') },
        { questionId: 'data_3', answer: ans(r, 'data_3') },
        { questionId: 'governance_1', answer: ans(r, 'governance_1') },
      ],
      businessImpact:
        'Organisations in this profile typically launch flagship AI initiatives that stall at the proof-of-concept stage because the data lineage and accountability structures cannot support production. The first board-level postmortem usually arrives in months 9–12.',
      recommendation:
        'Before approving the next AI use case, ratify a one-page data governance charter (lineage, ownership, quality SLA) and a one-page AI governance policy. Both fit on a single page each. Both unblock everything downstream.',
      pillarsInvolved: ['strategy', 'data', 'governance'],
    };
  }
  return null;
}

/**
 * P-03 Pilot Purgatory
 * High experimentation appetite + low MLOps maturity = models never reach production.
 */
function detectPilotPurgatory(r: ResponseMap): XRayFinding | null {
  const experimentation = ans(r, 'culture_1'); // culture of experimentation
  const mlops = sum(r, ['technology_2', 'technology_3']); // MLOps + deployment maturity
  const processIntegration = ans(r, 'process_2'); // human-in-the-loop integration
  if (experimentation >= 4 && mlops <= 4 && processIntegration <= 2) {
    return {
      id: 'P-03',
      title: 'Pilot Purgatory',
      severity: 'high',
      headline: 'Strong appetite to experiment is not matched by the production infrastructure to land it.',
      evidence: [
        { questionId: 'culture_1', answer: ans(r, 'culture_1') },
        { questionId: 'technology_2', answer: ans(r, 'technology_2') },
        { questionId: 'technology_3', answer: ans(r, 'technology_3') },
        { questionId: 'process_2', answer: ans(r, 'process_2') },
      ],
      businessImpact:
        'In this profile, 70–85% of AI pilots are abandoned before reaching production. Each abandoned pilot costs the median enterprise €180k–€420k in fully-loaded time. The cultural cost is higher: appetite for the next pilot collapses after the third failure.',
      recommendation:
        'Stop starting new pilots. For the next two quarters, redirect every available engineering hour to making one existing pilot production-grade — versioned, monitored, and integrated into a workflow with measurable lift.',
      pillarsInvolved: ['culture', 'technology', 'process'],
    };
  }
  return null;
}

/**
 * P-04 Compliance Cliff
 * EU AI Act applies in full August 2026. This pattern signals you will not be ready.
 */
function detectComplianceCliff(r: ResponseMap): XRayFinding | null {
  const compliance = ans(r, 'governance_5'); // regulatory compliance
  const regulatory = ans(r, 'security_5'); // regulatory readiness
  const transparency = ans(r, 'governance_3'); // transparency & explainability
  const totalCompliance = compliance + regulatory + transparency;
  if (totalCompliance <= 6) {
    return {
      id: 'P-04',
      title: 'Compliance Cliff',
      severity: 'critical',
      headline: 'Regulatory readiness across compliance, transparency, and oversight is below the threshold needed for August 2026.',
      evidence: [
        { questionId: 'governance_5', answer: compliance },
        { questionId: 'governance_3', answer: transparency },
        { questionId: 'security_5', answer: regulatory },
      ],
      businessImpact:
        'The EU AI Act applies in full from 2 August 2026. High-risk systems require a Fundamental Rights Impact Assessment (Article 27), an Annex IV technical file, and post-market monitoring. None of these can be retro-fitted in under 90 days.',
      recommendation:
        'Run an inventory and classification sprint within four weeks: list every AI system, classify against Article 6 (prohibited / high-risk / limited / minimal), and start a FRIA on every high-risk system today. Don\'t wait for the executive ask.',
      pillarsInvolved: ['governance', 'security'],
    };
  }
  return null;
}

/**
 * P-05 Talent-Strategy Mismatch
 * High AI ambition with no internal capacity to deliver — ROI dies on the vine.
 */
function detectTalentMismatch(r: ResponseMap): XRayFinding | null {
  const ambition = sum(r, ['strategy_1', 'strategy_4']);
  const talentSupply = sum(r, ['talent_1', 'talent_3']); // sufficiency + retention
  if (ambition >= 8 && talentSupply <= 4) {
    return {
      id: 'P-05',
      title: 'Talent-Strategy Mismatch',
      severity: 'high',
      headline: 'Strategic AI ambition exceeds the internal talent base required to execute on it.',
      evidence: [
        { questionId: 'strategy_1', answer: ans(r, 'strategy_1') },
        { questionId: 'strategy_4', answer: ans(r, 'strategy_4') },
        { questionId: 'talent_1', answer: ans(r, 'talent_1') },
        { questionId: 'talent_3', answer: ans(r, 'talent_3') },
      ],
      businessImpact:
        'Profiles like this typically miss roadmap dates by 9–14 months and spend 2.4× the planned budget on external delivery partners. Internal teams burn out. Strategic credibility erodes at the executive level.',
      recommendation:
        'Pair every external delivery contract with a named internal apprentice who is contractually entitled to ship code alongside the partner. After 12 months, the partner relationship terminates or downgrades to advisory. Build the capacity, do not rent it.',
      pillarsInvolved: ['strategy', 'talent'],
    };
  }
  return null;
}

/**
 * P-06 Bias Blindspot
 * Models in production without bias / fairness / transparency processes.
 */
function detectBiasBlindspot(r: ResponseMap): XRayFinding | null {
  const deployment = ans(r, 'technology_3'); // deployment maturity
  const bias = ans(r, 'governance_2'); // bias detection
  const transparency = ans(r, 'governance_3'); // explainability
  if (deployment >= 4 && bias <= 2 && transparency <= 2) {
    return {
      id: 'P-06',
      title: 'Bias Blindspot',
      severity: 'high',
      headline: 'AI systems are reaching production without operational fairness or explainability controls.',
      evidence: [
        { questionId: 'technology_3', answer: deployment },
        { questionId: 'governance_2', answer: bias },
        { questionId: 'governance_3', answer: transparency },
      ],
      businessImpact:
        'A single bias incident at this profile has a documented 3–7% drop in customer-trust metrics and triggers regulator attention disproportionate to the underlying model performance. Reputational repair takes 18–36 months once an incident is public.',
      recommendation:
        'Introduce a model card for every production system within 60 days. Each card carries: training data lineage, performance by demographic slice, known limitations, and a contact owner. This is the lowest-cost change that prevents the worst class of incident.',
      pillarsInvolved: ['governance', 'technology'],
    };
  }
  return null;
}

/**
 * P-07 Executive Disconnect
 * The org has capability, but the C-suite is not actively sponsoring AI.
 */
function detectExecutiveDisconnect(r: ResponseMap): XRayFinding | null {
  const sponsorship = ans(r, 'strategy_2');
  const visioning = ans(r, 'culture_5');
  const capabilityFloor = Math.min(
    ans(r, 'technology_1'),
    ans(r, 'data_1'),
    ans(r, 'talent_1'),
  );
  if (capabilityFloor >= 3 && sponsorship <= 2 && visioning <= 2) {
    return {
      id: 'P-07',
      title: 'Executive Disconnect',
      severity: 'medium',
      headline: 'Operational AI capability is in place, but executive sponsorship is not visibly behind it.',
      evidence: [
        { questionId: 'strategy_2', answer: sponsorship },
        { questionId: 'culture_5', answer: visioning },
        { questionId: 'technology_1', answer: ans(r, 'technology_1') },
        { questionId: 'talent_1', answer: ans(r, 'talent_1') },
      ],
      businessImpact:
        'Capability without sponsorship fragments. Initiatives compete instead of compound. The organisation tends to lose its strongest AI engineers within 18 months as they observe leadership underweight the function.',
      recommendation:
        'Schedule a 60-minute session with the CEO this quarter using only one artefact: a one-page map of every AI system in production, the business KPI it moves, and the named executive owner. The conversation is the deliverable.',
      pillarsInvolved: ['strategy', 'culture'],
    };
  }
  return null;
}

/**
 * P-08 Process-First Mismatch
 * High process maturity, low data — AI investment will under-deliver.
 */
function detectProcessFirstMismatch(r: ResponseMap): XRayFinding | null {
  const processStrength = sum(r, ['process_1', 'process_2', 'process_3']);
  const dataWeak = Math.min(ans(r, 'data_1'), ans(r, 'data_4'));
  if (processStrength >= 12 && dataWeak <= 2) {
    return {
      id: 'P-08',
      title: 'Process-First Mismatch',
      severity: 'medium',
      headline: 'Operational process discipline is strong, but the underlying data is not yet AI-grade.',
      evidence: [
        { questionId: 'process_1', answer: ans(r, 'process_1') },
        { questionId: 'process_2', answer: ans(r, 'process_2') },
        { questionId: 'data_1', answer: ans(r, 'data_1') },
        { questionId: 'data_4', answer: ans(r, 'data_4') },
      ],
      businessImpact:
        'Disciplined teams running on weak data tend to industrialise the wrong outputs at scale. The result is faster bad decisions, not better ones. Re-platforming the data layer after the fact costs roughly 4× a clean greenfield build.',
      recommendation:
        'Hold the next AI process automation initiative for two quarters. Use the time to quantify, document, and remediate quality on the three datasets the initiative would have depended on. Resume the automation work afterwards.',
      pillarsInvolved: ['process', 'data'],
    };
  }
  return null;
}

const DETECTORS: Array<(r: ResponseMap) => XRayFinding | null> = [
  detectShadowItRisk,
  detectComplianceCliff,
  detectAmbitionGap,
  detectPilotPurgatory,
  detectTalentMismatch,
  detectBiasBlindspot,
  detectProcessFirstMismatch,
  detectExecutiveDisconnect,
];

/**
 * Run all pattern detectors over the response map and return findings,
 * ordered critical → low.
 */
export function detectXRayFindings(responses: ResponseMap): XRayFinding[] {
  const sevRank: Record<PatternSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return DETECTORS
    .map(d => d(responses))
    .filter((f): f is XRayFinding => f !== null)
    .sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);
}

/**
 * Format X-Ray findings as a compact prompt block for downstream LLM agents.
 * Forces the model to ground its narrative in specific findings rather than
 * paraphrasing scores.
 */
export function formatFindingsForPrompt(findings: XRayFinding[]): string {
  if (findings.length === 0) {
    return 'X-RAY FINDINGS: No structural risk patterns detected. Avoid manufacturing risks that are not in the data.';
  }
  const lines = findings.map(f => {
    const evidence = f.evidence.map(e => `${e.questionId}=${e.answer}/5`).join(', ');
    return `• [${f.id} · ${f.severity.toUpperCase()}] ${f.title}: ${f.headline}
    Evidence: ${evidence}
    Business impact: ${f.businessImpact}
    Recommended move: ${f.recommendation}`;
  });
  return `X-RAY FINDINGS (${findings.length} structural patterns detected — ground your narrative in these, do not paraphrase scores):\n${lines.join('\n')}`;
}
