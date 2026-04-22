/**
 * E-ARI Regulatory Compliance Mapping
 *
 * Maps the 8-Pillar AI Readiness scores to specific requirements from:
 * - EU AI Act (Regulation 2024/1689)
 * - NIST AI Risk Management Framework (AI RMF 1.0)
 * - ISO/IEC 42001:2023 (AI Management System)
 *
 * Each mapping links pillar scores to regulatory articles with minimum
 * compliance thresholds and actionable recommendations.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegulatoryMapping {
  regulation: string;
  article: string;
  title: string;
  description: string;
  relevantPillars: string[];
  minScoreThreshold: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ComplianceGap {
  regulation: string;
  article: string;
  title: string;
  pillarId: string;
  pillarScore: number;
  minRequired: number;
  gap: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface ComplianceSummary {
  regulation: string;
  compliantCount: number;
  totalRelevant: number;
  complianceRate: number;
  criticalGaps: number;
}

// ─── Mappings ─────────────────────────────────────────────────────────────────

export const REGULATORY_MAPPINGS: RegulatoryMapping[] = [
  // ── EU AI Act ─────────────────────────────────────────────────────────────
  {
    regulation: 'EU AI Act',
    article: 'Article 9',
    title: 'Risk Management System',
    description: 'Providers of high-risk AI systems must establish, implement, document, and maintain a risk management system that identifies, analyzes, and mitigates risks throughout the system lifecycle.',
    relevantPillars: ['governance', 'process', 'security'],
    minScoreThreshold: 55,
    severity: 'critical',
  },
  {
    regulation: 'EU AI Act',
    article: 'Article 10',
    title: 'Data and Data Governance',
    description: 'High-risk AI systems must use training, validation, and testing datasets that are relevant, representative, free of errors, and complete. Data governance practices must ensure quality and traceability.',
    relevantPillars: ['data', 'governance'],
    minScoreThreshold: 60,
    severity: 'critical',
  },
  {
    regulation: 'EU AI Act',
    article: 'Article 13',
    title: 'Transparency and Information Provision',
    description: 'AI systems must be designed with sufficient transparency to enable deployers to interpret outputs and use them appropriately. Documentation and logging must be maintained.',
    relevantPillars: ['governance', 'culture', 'process'],
    minScoreThreshold: 50,
    severity: 'high',
  },
  {
    regulation: 'EU AI Act',
    article: 'Article 14',
    title: 'Human Oversight',
    description: 'High-risk AI systems must be designed to allow effective human oversight during use, including the ability to understand outputs, override decisions, and intervene when necessary.',
    relevantPillars: ['culture', 'talent', 'process'],
    minScoreThreshold: 50,
    severity: 'high',
  },
  {
    regulation: 'EU AI Act',
    article: 'Article 15',
    title: 'Accuracy, Robustness, and Cybersecurity',
    description: 'High-risk AI systems must achieve appropriate levels of accuracy, robustness, and cybersecurity throughout their lifecycle, with documented performance metrics and resilience measures.',
    relevantPillars: ['technology', 'security', 'data'],
    minScoreThreshold: 60,
    severity: 'critical',
  },
  {
    regulation: 'EU AI Act',
    article: 'Article 16',
    title: 'Obligations of Providers',
    description: 'Providers must ensure quality management, maintain technical documentation, implement corrective actions, and demonstrate conformity before placing AI systems on the market.',
    relevantPillars: ['governance', 'process', 'strategy'],
    minScoreThreshold: 55,
    severity: 'high',
  },
  {
    regulation: 'EU AI Act',
    article: 'Article 26',
    title: 'Obligations of Deployers',
    description: 'Organizations deploying high-risk AI must assign competent persons for oversight, ensure input data is relevant, monitor performance, and report serious incidents.',
    relevantPillars: ['talent', 'process', 'governance'],
    minScoreThreshold: 45,
    severity: 'high',
  },

  // ── NIST AI RMF ────────────────────────────────────────────────────────────
  {
    regulation: 'NIST AI RMF',
    article: 'GOV 1.1',
    title: 'Legal and Regulatory Understanding',
    description: 'Organizations must have legal and regulatory understanding of AI risk. This requires documented policies, awareness of applicable laws, and cross-functional governance structures.',
    relevantPillars: ['governance', 'strategy'],
    minScoreThreshold: 50,
    severity: 'high',
  },
  {
    regulation: 'NIST AI RMF',
    article: 'GOV 2.1',
    title: 'AI Risk Accountability',
    description: 'Clear roles and responsibilities for AI risk must be defined. Accountability structures should include executive sponsorship, risk owners, and escalation paths.',
    relevantPillars: ['governance', 'culture'],
    minScoreThreshold: 45,
    severity: 'medium',
  },
  {
    regulation: 'NIST AI RMF',
    article: 'MAP 1.1',
    title: 'Context Understanding',
    description: 'Organizations must understand and document the context in which AI systems operate, including business goals, stakeholder impacts, and operating environment constraints.',
    relevantPillars: ['strategy', 'process', 'data'],
    minScoreThreshold: 40,
    severity: 'medium',
  },
  {
    regulation: 'NIST AI RMF',
    article: 'MAP 2.1',
    title: 'AI System Categorization',
    description: 'AI systems must be categorized by risk level and function. This includes documenting system capabilities, limitations, and intended use cases for appropriate risk management.',
    relevantPillars: ['governance', 'technology'],
    minScoreThreshold: 45,
    severity: 'medium',
  },
  {
    regulation: 'NIST AI RMF',
    article: 'MEASURE 1.1',
    title: 'AI Risk Assessment',
    description: 'Organizations must identify, assess, and document AI risks using systematic methods. This includes evaluating model performance, bias, security vulnerabilities, and failure modes.',
    relevantPillars: ['technology', 'security', 'data'],
    minScoreThreshold: 50,
    severity: 'high',
  },
  {
    regulation: 'NIST AI RMF',
    article: 'MEASURE 2.1',
    title: 'AI Performance Monitoring',
    description: 'Ongoing monitoring of AI system performance against defined metrics is required. This includes tracking accuracy drift, data quality degradation, and emerging risks over time.',
    relevantPillars: ['process', 'technology', 'data'],
    minScoreThreshold: 45,
    severity: 'medium',
  },
  {
    regulation: 'NIST AI RMF',
    article: 'MANAGE 1.1',
    title: 'AI Risk Mitigation',
    description: 'Organizations must implement risk mitigation strategies proportionate to identified AI risks. This includes technical safeguards, operational controls, and incident response plans.',
    relevantPillars: ['security', 'process', 'technology'],
    minScoreThreshold: 50,
    severity: 'high',
  },

  // ── ISO/IEC 42001 ──────────────────────────────────────────────────────────
  {
    regulation: 'ISO 42001',
    article: 'Clause 4',
    title: 'Context of the Organization',
    description: 'Organizations must determine external and internal issues relevant to their AI management system purpose and strategic direction, including stakeholder requirements and regulatory landscape.',
    relevantPillars: ['strategy', 'governance'],
    minScoreThreshold: 50,
    severity: 'high',
  },
  {
    regulation: 'ISO 42001',
    article: 'Clause 5',
    title: 'Leadership and Commitment',
    description: 'Top management must demonstrate leadership and commitment to the AI management system by establishing policy, ensuring integration with business processes, and allocating resources.',
    relevantPillars: ['strategy', 'culture', 'talent'],
    minScoreThreshold: 45,
    severity: 'high',
  },
  {
    regulation: 'ISO 42001',
    article: 'Clause 6.1',
    title: 'AI Risk Assessment',
    description: 'Organizations must establish, implement, and maintain a process for AI risk assessment including risk identification, analysis, evaluation, and treatment aligned with the AI policy.',
    relevantPillars: ['governance', 'security', 'process'],
    minScoreThreshold: 55,
    severity: 'critical',
  },
  {
    regulation: 'ISO 42001',
    article: 'Clause 7.1',
    title: 'Resources for AI Systems',
    description: 'The organization must determine and provide the resources needed for the AI management system, including data infrastructure, computational resources, and qualified personnel.',
    relevantPillars: ['technology', 'talent', 'data'],
    minScoreThreshold: 50,
    severity: 'high',
  },
  {
    regulation: 'ISO 42001',
    article: 'Clause 7.2',
    title: 'Competence and Awareness',
    description: 'Personnel affecting AI performance must be competent based on education, training, or experience. The organization must ensure awareness of AI policy, objectives, and contribution to effectiveness.',
    relevantPillars: ['talent', 'culture'],
    minScoreThreshold: 45,
    severity: 'medium',
  },
  {
    regulation: 'ISO 42001',
    article: 'Clause 8.1',
    title: 'AI System Development and Deployment',
    description: 'Organizations must plan, control, and document AI system development and deployment processes. This includes requirements specification, design, verification, validation, and deployment procedures.',
    relevantPillars: ['process', 'technology', 'data'],
    minScoreThreshold: 55,
    severity: 'critical',
  },
  {
    regulation: 'ISO 42001',
    article: 'Clause 9.1',
    title: 'Performance Evaluation',
    description: 'Organizations must monitor, measure, analyze, and evaluate the AI management system. This includes internal audits, management reviews, and tracking conformity to AI policy objectives.',
    relevantPillars: ['process', 'governance'],
    minScoreThreshold: 50,
    severity: 'high',
  },
  {
    regulation: 'ISO 42001',
    article: 'Clause 10.1',
    title: 'Continual Improvement',
    description: 'Organizations must continually improve the suitability, adequacy, and effectiveness of the AI management system. This includes acting on nonconformities, implementing corrective actions, and adapting to changes.',
    relevantPillars: ['culture', 'strategy', 'process'],
    minScoreThreshold: 40,
    severity: 'medium',
  },
];

// ─── Functions ────────────────────────────────────────────────────────────────

const PILLAR_NAMES: Record<string, string> = {
  strategy: 'AI Strategy',
  data: 'Data Readiness',
  technology: 'Technology Infrastructure',
  talent: 'Talent & Skills',
  governance: 'AI Governance',
  culture: 'Organizational Culture',
  process: 'Operational Processes',
  security: 'Security & Privacy',
};

export function assessComplianceGaps(
  pillarScores: Array<{ pillarId: string; normalizedScore: number }>
): ComplianceGap[] {
  const scoreMap = new Map(pillarScores.map(ps => [ps.pillarId, ps.normalizedScore]));
  const gaps: ComplianceGap[] = [];

  for (const mapping of REGULATORY_MAPPINGS) {
    for (const pillarId of mapping.relevantPillars) {
      const score = scoreMap.get(pillarId);
      if (score === undefined) continue;

      if (score < mapping.minScoreThreshold) {
        gaps.push({
          regulation: mapping.regulation,
          article: mapping.article,
          title: mapping.title,
          pillarId,
          pillarScore: score,
          minRequired: mapping.minScoreThreshold,
          gap: Math.round(mapping.minScoreThreshold - score),
          severity: mapping.severity,
          recommendation: generateRecommendation(mapping, pillarId, score),
        });
      }
    }
  }

  // Sort by severity then gap size
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  gaps.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.gap - a.gap;
  });

  return gaps;
}

export function getComplianceSummary(
  pillarScores: Array<{ pillarId: string; normalizedScore: number }>
): ComplianceSummary[] {
  const scoreMap = new Map(pillarScores.map(ps => [ps.pillarId, ps.normalizedScore]));
  const regulations = [...new Set(REGULATORY_MAPPINGS.map(m => m.regulation))];

  return regulations.map(regulation => {
    const mappings = REGULATORY_MAPPINGS.filter(m => m.regulation === regulation);
    let compliantCount = 0;
    let totalRelevant = 0;
    let criticalGaps = 0;

    for (const mapping of mappings) {
      for (const pillarId of mapping.relevantPillars) {
        const score = scoreMap.get(pillarId);
        if (score === undefined) continue;
        totalRelevant++;
        if (score >= mapping.minScoreThreshold) {
          compliantCount++;
        } else {
          if (mapping.severity === 'critical') criticalGaps++;
        }
      }
    }

    return {
      regulation,
      compliantCount,
      totalRelevant,
      complianceRate: totalRelevant > 0 ? Math.round((compliantCount / totalRelevant) * 100) : 100,
      criticalGaps,
    };
  });
}

function generateRecommendation(
  mapping: RegulatoryMapping,
  pillarId: string,
  currentScore: number
): string {
  const pillarName = PILLAR_NAMES[pillarId] || pillarId;
  const gap = mapping.minScoreThreshold - currentScore;

  if (gap >= 30) {
    return `${pillarName} requires significant investment to meet ${mapping.regulation} ${mapping.article} requirements. Prioritize establishing foundational policies and governance structures before pursuing advanced AI initiatives.`;
  }
  if (gap >= 15) {
    return `${pillarName} has moderate gaps against ${mapping.regulation} ${mapping.article}. Focus on documented processes, training programs, and establishing clear accountability for AI risk management.`;
  }
  return `${pillarName} is close to meeting ${mapping.regulation} ${mapping.article} requirements. Targeted improvements in documentation, monitoring, and stakeholder communication should close the remaining gap.`;
}
