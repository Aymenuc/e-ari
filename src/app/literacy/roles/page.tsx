'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Crown,
  Cpu,
  DollarSign,
  Shield,
  Users,
  Settings,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Target,
  Zap,
  ArrowLeft,
  Lightbulb,
  Loader2,
} from 'lucide-react';
import { Navigation } from '@/components/shared/navigation';
import { Footer } from '@/components/shared/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

/* ─── Animation Helpers ────────────────────────────────────────────────── */

function FadeUp({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Role Definitions ─────────────────────────────────────────────────── */

type RoleId = 'ceo' | 'cto' | 'cfo' | 'ciso' | 'chro' | 'coo';

interface RoleDefinition {
  id: RoleId;
  title: string;
  shortLabel: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  description: string;
  metrics: { label: string; value: string; trend: 'up' | 'down' | 'neutral'; description: string }[];
  focusAreas: { title: string; description: string; priority: 'critical' | 'high' | 'medium'; color: string }[];
  keyInsight: string;
  recommendations: string[];
}

const ROLES: RoleDefinition[] = [
  {
    id: 'ceo',
    title: 'Chief Executive Officer',
    shortLabel: 'CEO',
    subtitle: 'Strategic AI Vision & Investment',
    icon: Crown,
    color: '#d4a853',
    description: 'High-level view of AI readiness across the organization. Focus on strategic alignment, competitive positioning, and investment ROI to drive board-level decisions.',
    metrics: [
      { label: 'AI Readiness Score', value: '62%', trend: 'up', description: 'Overall organizational readiness across 8 pillars' },
      { label: 'Investment ROI', value: '2.4x', trend: 'up', description: 'Projected return on AI investment over 24 months' },
      { label: 'Competitive Position', value: 'Chaser', trend: 'up', description: 'Position relative to industry peers' },
      { label: 'Risk Exposure', value: 'Moderate', trend: 'down', description: 'Aggregate risk from governance and security gaps' },
    ],
    focusAreas: [
      { title: 'Strategic Alignment', description: 'AI initiatives are only partially aligned with business objectives. A formal AI strategy with executive sponsorship is needed to prevent resource dilution across disconnected pilot projects.', priority: 'critical', color: '#ef4444' },
      { title: 'Competitive Differentiation', description: 'Your organization is in the "Chaser" band — actively investing but not yet leading. Targeted investment in 2-3 high-impact use cases could accelerate competitive advantage within 6-12 months.', priority: 'high', color: '#f59e0b' },
      { title: 'Governance Framework', description: 'Without a formal governance framework, AI deployments risk regulatory non-compliance and reputational damage. This is a foundational prerequisite for scaling AI responsibly.', priority: 'critical', color: '#ef4444' },
    ],
    keyInsight: 'Your organization has strong technical foundations but governance gaps create significant risk. Investing in an AI governance framework before scaling technology investment will accelerate sustainable value creation.',
    recommendations: [
      'Establish a formal AI governance board with cross-functional representation within 90 days',
      'Prioritize 2-3 high-ROI use cases for accelerated investment and board-level progress reporting',
      'Commission an AI regulatory readiness assessment aligned with EU AI Act requirements',
      'Develop a 24-month AI investment roadmap with quarterly milestone reviews',
      'Implement executive AI literacy program to ensure informed decision-making at board level',
    ],
  },
  {
    id: 'cto',
    title: 'Chief Technology Officer',
    shortLabel: 'CTO',
    subtitle: 'Technical Architecture & MLOps',
    icon: Cpu,
    color: '#3b82f6',
    description: 'Deep dive into technical readiness, infrastructure gaps, MLOps maturity, and platform architecture recommendations for production AI at scale.',
    metrics: [
      { label: 'Technology Score', value: '65%', trend: 'up', description: 'Maturity of AI/ML platforms and tooling' },
      { label: 'MLOps Maturity', value: 'Level 2', trend: 'neutral', description: 'Automated training and basic monitoring in place' },
      { label: 'Tech Debt Index', value: 'High', trend: 'down', description: 'Significant technical debt in data infrastructure' },
      { label: 'Platform Coverage', value: '45%', trend: 'up', description: 'Percentage of AI workloads on standardized platform' },
    ],
    focusAreas: [
      { title: 'MLOps Pipeline', description: 'Current MLOps practices are at Level 2 — automated training exists but model monitoring, drift detection, and automated retraining are inconsistent. Moving to Level 3 requires investment in model registries and canary deployments.', priority: 'critical', color: '#ef4444' },
      { title: 'Data Infrastructure', description: 'Data pipeline infrastructure is fragmented across teams. A unified data platform with standardized ETL, feature stores, and real-time streaming capabilities would reduce model development cycle time by an estimated 40%.', priority: 'high', color: '#f59e0b' },
      { title: 'Security Architecture', description: 'AI-specific security controls are minimal. Model protection, adversarial robustness testing, and secure inference endpoints need immediate attention before expanding production deployments.', priority: 'critical', color: '#ef4444' },
    ],
    keyInsight: 'Your technology platform has solid foundations but MLOps maturity is insufficient for production scale. Prioritize model monitoring, drift detection, and automated retraining pipelines before expanding AI workload coverage.',
    recommendations: [
      'Implement a model registry with version control and lineage tracking within 60 days',
      'Deploy model monitoring infrastructure with drift detection alerts for all production models',
      'Establish feature store to reduce feature engineering duplication across teams',
      'Implement canary deployment strategy for model updates to reduce production risk',
      'Conduct AI security audit and implement adversarial robustness testing in CI/CD pipeline',
    ],
  },
  {
    id: 'cfo',
    title: 'Chief Financial Officer',
    shortLabel: 'CFO',
    subtitle: 'AI Investment & Cost Optimization',
    icon: DollarSign,
    color: '#22c55e',
    description: 'Financial perspective on AI investments, cost optimization opportunities, ROI modeling, and budget allocation recommendations for sustainable AI adoption.',
    metrics: [
      { label: 'AI Budget Utilization', value: '78%', trend: 'up', description: 'Current budget utilization against planned AI spend' },
      { label: 'Projected 24-Month ROI', value: '2.4x', trend: 'up', description: 'Projected return based on current investment trajectory' },
      { label: 'Cost per AI Use Case', value: '$340K', trend: 'down', description: 'Average total cost per deployed AI use case' },
      { label: 'Technical Debt Cost', value: '$1.2M', trend: 'down', description: 'Estimated annual cost of technical debt remediation' },
    ],
    focusAreas: [
      { title: 'ROI Optimization', description: 'Current AI investments show positive ROI but are concentrated in low-complexity use cases. Rebalancing toward high-impact, moderate-complexity use cases could increase aggregate ROI from 2.4x to 3.8x within 18 months.', priority: 'high', color: '#f59e0b' },
      { title: 'Cost of Inaction', description: 'Delayed investment in data governance and MLOps infrastructure is accumulating technical debt at an estimated $1.2M annually. Each quarter of delay increases remediation costs by approximately 15%.', priority: 'critical', color: '#ef4444' },
      { title: 'Budget Allocation', description: 'Current budget allocation overweights technology acquisition (45%) and underweights talent development (12%) and governance (8%). Industry benchmarks suggest 30% technology, 25% talent, 15% governance for optimal outcomes.', priority: 'medium', color: '#3b82f6' },
    ],
    keyInsight: 'AI investments are generating positive returns but budget allocation misalignment and technical debt accumulation are constraining value. Rebalancing toward governance and talent would unlock significantly higher ROI.',
    recommendations: [
      'Rebalance AI budget allocation: 30% technology, 25% talent, 15% governance, 30% operations',
      'Invest $400K in data governance infrastructure to eliminate $1.2M annual technical debt',
      'Implement AI project ROI tracking with quarterly board reporting',
      'Establish dedicated AI budget line item with 3-year commitment to prevent investment volatility',
      'Commission TCO analysis for cloud vs. hybrid AI infrastructure options',
    ],
  },
  {
    id: 'ciso',
    title: 'Chief Information Security Officer',
    shortLabel: 'CISO',
    subtitle: 'AI Security & Compliance Posture',
    icon: Shield,
    color: '#ef4444',
    description: 'Security-focused assessment of AI-specific risks, compliance gaps, threat landscape, and recommended controls for protecting AI systems and data.',
    metrics: [
      { label: 'Security Score', value: '48%', trend: 'down', description: 'AI-specific security control maturity' },
      { label: 'Compliance Posture', value: 'Partial', trend: 'neutral', description: 'Regulatory compliance readiness status' },
      { label: 'Attack Surface', value: 'High', trend: 'down', description: 'AI-specific attack surface assessment' },
      { label: 'Incident Readiness', value: 'Low', trend: 'down', description: 'AI incident response capability maturity' },
    ],
    focusAreas: [
      { title: 'AI Attack Surface', description: 'Production AI models lack adversarial robustness testing. Prompt injection, model extraction, and data poisoning vulnerabilities are unaddressed. Immediate penetration testing of critical AI endpoints is recommended.', priority: 'critical', color: '#ef4444' },
      { title: 'Regulatory Compliance', description: 'EU AI Act high-risk system requirements are not yet addressed. Gap analysis reveals missing documentation for risk management systems, data governance, transparency, and human oversight — all required within 12 months.', priority: 'critical', color: '#ef4444' },
      { title: 'Data Privacy', description: 'AI training data handling lacks privacy-preserving techniques. Differential privacy, federated learning, and data anonymization controls need implementation before scaling models that process personal data.', priority: 'high', color: '#f59e0b' },
    ],
    keyInsight: 'AI-specific security controls are significantly below enterprise standards. The attack surface is expanding faster than defensive capabilities, creating material risk of data breaches and regulatory non-compliance.',
    recommendations: [
      'Commission AI security penetration testing for all production models within 30 days',
      'Implement adversarial robustness testing in model CI/CD pipelines',
      'Establish AI-specific incident response playbooks with defined escalation paths',
      'Deploy model access controls and audit logging for all AI system endpoints',
      'Begin EU AI Act gap analysis and compliance roadmap development immediately',
    ],
  },
  {
    id: 'chro',
    title: 'Chief Human Resources Officer',
    shortLabel: 'CHRO',
    subtitle: 'Workforce Readiness & AI Literacy',
    icon: Users,
    color: '#ec4899',
    description: 'People-focused view of AI readiness including workforce skills gaps, training needs, organizational change readiness, and talent strategy.',
    metrics: [
      { label: 'Talent Score', value: '44%', trend: 'down', description: 'AI workforce readiness and skills availability' },
      { label: 'AI Literacy Rate', value: '32%', trend: 'up', description: 'Percentage of workforce with basic AI understanding' },
      { label: 'Attrition Risk', value: 'High', trend: 'down', description: 'Risk of losing key AI talent to competitors' },
      { label: 'Change Readiness', value: 'Moderate', trend: 'neutral', description: 'Organizational readiness for AI-driven change' },
    ],
    focusAreas: [
      { title: 'AI Skills Gap', description: 'Only 32% of the workforce has basic AI literacy, creating a significant adoption barrier. Engineering and data science teams have adequate skills, but business functions (marketing, operations, legal) lack foundational understanding of AI capabilities and limitations.', priority: 'critical', color: '#ef4444' },
      { title: 'Talent Retention', description: 'Key AI/ML specialists report low satisfaction with career development opportunities. Without structured career paths and competitive retention packages, the organization risks losing critical talent to competitors offering 25-40% salary premiums.', priority: 'high', color: '#f59e0b' },
      { title: 'Change Management', description: 'Employee surveys indicate 45% resistance to AI-driven process changes, primarily driven by fear of role displacement. A structured change management program with clear communication about AI augmentation (not replacement) is essential.', priority: 'medium', color: '#3b82f6' },
    ],
    keyInsight: 'The talent and skills gap is the single largest barrier to AI readiness. Without foundational AI literacy across the organization and structured retention strategies for AI specialists, technology investments will underperform.',
    recommendations: [
      'Launch enterprise-wide AI literacy program targeting 70% basic proficiency within 12 months',
      'Establish AI career paths with competitive compensation bands for ML engineers and data scientists',
      'Implement AI change management program with role-specific communication about AI augmentation',
      'Create AI communities of practice to facilitate cross-functional knowledge sharing',
      'Develop internal AI apprenticeship program to build pipeline of AI-capable talent',
    ],
  },
  {
    id: 'coo',
    title: 'Chief Operating Officer',
    shortLabel: 'COO',
    subtitle: 'Process Automation & Operations',
    icon: Settings,
    color: '#14b8a6',
    description: 'Operational perspective on AI integration, process automation potential, workflow optimization, and performance measurement for AI-powered operations.',
    metrics: [
      { label: 'Process Score', value: '55%', trend: 'up', description: 'AI process integration and automation maturity' },
      { label: 'Automation Potential', value: '38%', trend: 'up', description: 'Percentage of processes suitable for AI automation' },
      { label: 'Operational Efficiency', value: '+12%', trend: 'up', description: 'Efficiency gain from current AI deployments' },
      { label: 'KPI Coverage', value: 'Partial', trend: 'neutral', description: 'AI process performance measurement coverage' },
    ],
    focusAreas: [
      { title: 'Process Identification', description: 'Only 38% of suitable processes have been identified for AI automation. A systematic process audit using value-stream mapping would uncover additional high-ROI automation opportunities in supply chain, scheduling, and quality control.', priority: 'high', color: '#f59e0b' },
      { title: 'Human-in-the-Loop Design', description: 'Current AI deployments lack consistent human-in-the-loop controls. Critical operational decisions require oversight mechanisms to prevent automation errors from cascading through production systems.', priority: 'critical', color: '#ef4444' },
      { title: 'Performance Measurement', description: 'AI-powered processes lack standardized KPIs and feedback loops. Without measurable outcomes, it is impossible to determine whether AI integration improves or degrades operational performance.', priority: 'medium', color: '#3b82f6' },
    ],
    keyInsight: 'Operational AI integration shows positive results but is limited to a small fraction of potential use cases. Expanding process identification and establishing human-in-the-loop controls would accelerate value capture while managing operational risk.',
    recommendations: [
      'Conduct systematic process audit to identify all AI automation opportunities across operations',
      'Implement human-in-the-loop controls for all AI-driven operational decisions with defined escalation paths',
      'Establish standardized KPIs for AI-powered processes with automated performance dashboards',
      'Deploy pilot AI quality control system in highest-volume production line',
      'Create operational AI playbook with standard procedures for common AI-related operational scenarios',
    ],
  },
];

/* ─── Assessment-Driven Metrics Derivation ──────────────────────────────── */

function deriveRoleMetrics(role: RoleDefinition, data: { overallScore: number; maturityBand: string; pillarScores: Array<{ pillarId: string; normalizedScore: number }> } | null): RoleDefinition['metrics'] {
  if (!data || data.pillarScores.length === 0) return role.metrics;

  const getScore = (pillarId: string) => {
    const p = data.pillarScores.find(ps => ps.pillarId === pillarId);
    return p ? Math.round(p.normalizedScore) : null;
  };

  const maturityLabel = data.maturityBand === 'pacesetter' ? 'Pacesetter' : data.maturityBand === 'chaser' ? 'Chaser' : data.maturityBand === 'follower' ? 'Follower' : 'Laggard';

  switch (role.id) {
    case 'ceo':
      return [
        { label: 'AI Readiness Score', value: `${Math.round(data.overallScore)}%`, trend: data.overallScore >= 50 ? 'up' : 'down', description: 'Overall organizational readiness across 8 pillars' },
        { label: 'Investment ROI', value: data.overallScore >= 60 ? '3.2x' : data.overallScore >= 40 ? '2.4x' : '1.6x', trend: data.overallScore >= 50 ? 'up' : 'down', description: 'Projected return on AI investment over 24 months' },
        { label: 'Competitive Position', value: maturityLabel, trend: data.overallScore >= 50 ? 'up' : 'down', description: 'Position relative to industry peers' },
        { label: 'Risk Exposure', value: data.overallScore >= 60 ? 'Low' : data.overallScore >= 40 ? 'Moderate' : 'High', trend: data.overallScore >= 50 ? 'up' : 'down', description: 'Aggregate risk from governance and security gaps' },
      ];
    case 'cto': {
      const techScore = getScore('technology') ?? 65;
      const dataScore = getScore('data') ?? 55;
      return [
        { label: 'Technology Score', value: `${techScore}%`, trend: techScore >= 50 ? 'up' : 'down', description: 'Maturity of AI/ML platforms and tooling' },
        { label: 'MLOps Maturity', value: techScore >= 70 ? 'Level 3' : techScore >= 50 ? 'Level 2' : 'Level 1', trend: techScore >= 50 ? 'neutral' : 'down', description: 'Automated training and monitoring maturity' },
        { label: 'Data Readiness', value: `${dataScore}%`, trend: dataScore >= 50 ? 'up' : 'down', description: 'Data infrastructure and pipeline maturity' },
        { label: 'Platform Coverage', value: `${Math.round(data.overallScore * 0.7)}%`, trend: data.overallScore >= 50 ? 'up' : 'down', description: 'Percentage of AI workloads on standardized platform' },
      ];
    }
    case 'cfo': {
      const stratScore = getScore('strategy') ?? 50;
      return [
        { label: 'AI Budget Utilization', value: `${Math.round(data.overallScore * 1.1)}%`, trend: data.overallScore >= 50 ? 'up' : 'down', description: 'Current budget utilization against planned AI spend' },
        { label: 'Projected ROI', value: data.overallScore >= 60 ? '3.2x' : data.overallScore >= 40 ? '2.4x' : '1.6x', trend: data.overallScore >= 50 ? 'up' : 'down', description: 'Projected return over 24 months' },
        { label: 'Strategy Score', value: `${stratScore}%`, trend: stratScore >= 50 ? 'up' : 'down', description: 'Strategic alignment maturity' },
        { label: 'Cost Efficiency', value: data.overallScore >= 60 ? 'High' : data.overallScore >= 40 ? 'Moderate' : 'Low', trend: data.overallScore >= 50 ? 'up' : 'down', description: 'AI cost optimization effectiveness' },
      ];
    }
    case 'ciso': {
      const secScore = getScore('security') ?? 48;
      const govScore = getScore('governance') ?? 45;
      return [
        { label: 'Security Score', value: `${secScore}%`, trend: secScore >= 50 ? 'up' : 'down', description: 'AI-specific security control maturity' },
        { label: 'Compliance Posture', value: govScore >= 60 ? 'Strong' : govScore >= 40 ? 'Partial' : 'Weak', trend: govScore >= 50 ? 'up' : 'down', description: 'Regulatory compliance readiness' },
        { label: 'Attack Surface', value: secScore >= 60 ? 'Low' : secScore >= 40 ? 'Moderate' : 'High', trend: secScore >= 50 ? 'up' : 'down', description: 'AI-specific attack surface assessment' },
        { label: 'Incident Readiness', value: secScore >= 60 ? 'High' : secScore >= 40 ? 'Moderate' : 'Low', trend: secScore >= 50 ? 'up' : 'down', description: 'AI incident response capability maturity' },
      ];
    }
    case 'chro': {
      const peopleScore = getScore('people') ?? 44;
      const ethicsScore = getScore('ethics') ?? 50;
      return [
        { label: 'Talent Score', value: `${peopleScore}%`, trend: peopleScore >= 50 ? 'up' : 'down', description: 'AI workforce readiness and skills availability' },
        { label: 'AI Literacy Rate', value: `${Math.round(peopleScore * 0.73)}%`, trend: peopleScore >= 50 ? 'up' : 'down', description: 'Estimated workforce AI understanding' },
        { label: 'Culture Readiness', value: ethicsScore >= 60 ? 'Strong' : ethicsScore >= 40 ? 'Moderate' : 'Weak', trend: ethicsScore >= 50 ? 'up' : 'down', description: 'Organizational culture readiness for AI' },
        { label: 'Change Readiness', value: data.overallScore >= 60 ? 'High' : data.overallScore >= 40 ? 'Moderate' : 'Low', trend: data.overallScore >= 50 ? 'up' : 'down', description: 'Organizational readiness for AI-driven change' },
      ];
    }
    case 'coo': {
      const opsScore = getScore('operations') ?? 55;
      const techScore2 = getScore('technology') ?? 50;
      return [
        { label: 'Process Score', value: `${opsScore}%`, trend: opsScore >= 50 ? 'up' : 'down', description: 'AI process integration and automation maturity' },
        { label: 'Automation Potential', value: `${Math.round(opsScore * 0.7)}%`, trend: opsScore >= 50 ? 'up' : 'down', description: 'Percentage of processes suitable for AI automation' },
        { label: 'Operational Efficiency', value: `+${Math.round(data.overallScore * 0.2)}%`, trend: data.overallScore >= 50 ? 'up' : 'down', description: 'Efficiency gain from current AI deployments' },
        { label: 'KPI Coverage', value: techScore2 >= 60 ? 'Complete' : techScore2 >= 40 ? 'Partial' : 'Minimal', trend: techScore2 >= 50 ? 'up' : 'down', description: 'AI process performance measurement coverage' },
      ];
    }
    default:
      return role.metrics;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function RoleInsightsPage() {
  const { data: session } = useSession();
  const [selectedRole, setSelectedRole] = useState<RoleId>('ceo');
  const [assessmentData, setAssessmentData] = useState<{
    overallScore: number;
    maturityBand: string;
    pillarScores: Array<{ pillarId: string; pillarName: string; normalizedScore: number }>;
  } | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    async function fetchLatest() {
      try {
        const res = await fetch('/api/assessment');
        if (res.ok) {
          const assessments = await res.json();
          const completed = Array.isArray(assessments)
            ? assessments.filter((a: any) => a.status === 'completed' && a.overallScore !== null)
            : [];
          if (completed.length > 0) {
            const latest = completed[0];
            let pillarScores = latest.pillarScores;
            if (typeof pillarScores === 'string') {
              try { pillarScores = JSON.parse(pillarScores); } catch { pillarScores = []; }
            }
            setAssessmentData({
              overallScore: latest.overallScore,
              maturityBand: latest.maturityBand || 'follower',
              pillarScores: Array.isArray(pillarScores) ? pillarScores : [],
            });
          }
        }
      } catch {
        // Assessment data is optional — fall back to defaults
      } finally {
        setDataLoading(false);
      }
    }
    fetchLatest();
  }, []);

  const activeRole = ROLES.find((r) => r.id === selectedRole)!;
  const ActiveIcon = activeRole.icon;
  const displayMetrics = deriveRoleMetrics(activeRole, assessmentData);

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />

      <main className="flex-1">
        {dataLoading && (
          <div className="flex items-center justify-center py-4 gap-2 text-sm text-muted-foreground font-sans">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading assessment data...
          </div>
        )}
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-8">
          {/* ─── Header ───────────────────────────────────────────────────── */}
          <FadeUp>
            <div>
              <Link href="/literacy" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-sans mb-4 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to AI Literacy
              </Link>
              <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                Role-Specific{' '}
                <span className="gradient-text-blue">Insights</span>
              </h1>
              <p className="mt-3 text-muted-foreground font-sans max-w-xl leading-relaxed">
                Different stakeholders need different perspectives on AI readiness. Select a role to see tailored metrics and recommendations.
              </p>
            </div>
          </FadeUp>

          {/* ─── Role Selector ────────────────────────────────────────────── */}
          <FadeUp delay={0.1}>
            <div className="flex gap-2 flex-wrap">
              {ROLES.map((role) => {
                const Icon = role.icon;
                const isActive = selectedRole === role.id;
                return (
                  <motion.button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-navy-800 shadow-sm'
                        : 'bg-navy-800/25 hover:bg-navy-800/50'
                    }`}
                    style={isActive ? { boxShadow: `0 0 0 1px ${role.color}30` } : undefined}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${role.color}${isActive ? '20' : '10'}` }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: role.color }} />
                    </div>
                    <span className={`text-sm font-heading font-semibold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {role.shortLabel}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </FadeUp>

          {/* Assessment Data Indicator */}
          {assessmentData && !dataLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-sans">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Showing insights from your latest assessment (Score: {Math.round(assessmentData.overallScore)}%)</span>
            </div>
          )}
          {!assessmentData && !dataLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60 font-sans">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span>Complete an assessment to see personalized insights — showing example data</span>
            </div>
          )}

          {/* ─── Role Content ─────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedRole}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="space-y-8"
            >
              {/* Role Header */}
              <div className="flex items-center gap-4 pt-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${activeRole.color}15` }}>
                  <ActiveIcon className="h-6 w-6" style={{ color: activeRole.color }} />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-foreground">{activeRole.title}</h2>
                  <p className="text-sm text-muted-foreground font-sans">{activeRole.subtitle}</p>
                </div>
              </div>

              <p className="text-muted-foreground font-sans leading-relaxed">{activeRole.description}</p>

              {/* Key Metrics - Clean grid without card borders */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {displayMetrics.map((metric, i) => (
                  <FadeUp key={metric.label} delay={i * 0.06}>
                    <div className="p-4 rounded-xl bg-navy-800/30 hover:bg-navy-800/50 transition-colors">
                      <p className="text-[10px] text-muted-foreground/70 font-heading uppercase tracking-wider mb-2">
                        {metric.label}
                      </p>
                      <div className="flex items-end gap-2">
                        <span className="font-heading text-2xl font-bold text-foreground">
                          {metric.value}
                        </span>
                        {metric.trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-emerald-400 mb-1" />}
                        {metric.trend === 'down' && <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mb-1" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground/50 font-sans mt-1.5">{metric.description}</p>
                    </div>
                  </FadeUp>
                ))}
              </div>

              {/* Focus Areas - Clean list with left accent */}
              <div>
                <h3 className="font-heading text-sm font-semibold text-foreground mb-4 flex items-center gap-2 uppercase tracking-wider">
                  <Target className="h-4 w-4" style={{ color: activeRole.color }} />
                  Priority Focus Areas
                </h3>
                <div className="space-y-3">
                  {activeRole.focusAreas.map((area, i) => (
                    <FadeUp key={area.title} delay={i * 0.08}>
                      <div className="flex items-start gap-4 p-4 rounded-xl bg-navy-800/20 hover:bg-navy-800/35 transition-colors"
                        style={{ borderLeft: `3px solid ${area.color}40` }}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0 mt-0.5" style={{ backgroundColor: `${area.color}12` }}>
                          {area.priority === 'critical' ? (
                            <AlertTriangle className="h-4 w-4" style={{ color: area.color }} />
                          ) : area.priority === 'high' ? (
                            <Zap className="h-4 w-4" style={{ color: area.color }} />
                          ) : (
                            <Lightbulb className="h-4 w-4" style={{ color: area.color }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h4 className="font-heading text-sm font-semibold text-foreground">{area.title}</h4>
                            <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 h-4" style={{ color: area.color, borderColor: `${area.color}30` }}>
                              {area.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground font-sans leading-relaxed">{area.description}</p>
                        </div>
                      </div>
                    </FadeUp>
                  ))}
                </div>
              </div>

              {/* Key Insight - Subtle accent */}
              <FadeUp>
                <div className="p-5 rounded-xl bg-navy-800/20"
                  style={{ borderLeft: `3px solid ${activeRole.color}` }}
                >
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" style={{ color: activeRole.color }} />
                    <div>
                      <h4 className="font-heading text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">Key Insight</h4>
                      <p className="text-sm text-muted-foreground font-sans leading-relaxed">{activeRole.keyInsight}</p>
                    </div>
                  </div>
                </div>
              </FadeUp>

              {/* Recommendations - Numbered list without card */}
              <FadeUp>
                <div>
                  <h3 className="font-heading text-sm font-semibold text-foreground mb-4 flex items-center gap-2 uppercase tracking-wider">
                    <CheckCircle2 className="h-4 w-4" style={{ color: activeRole.color }} />
                    Strategic Recommendations
                  </h3>
                  <ol className="space-y-3">
                    {activeRole.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-navy-800/15 hover:bg-navy-800/25 transition-colors">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-mono font-bold" style={{ backgroundColor: `${activeRole.color}15`, color: activeRole.color }}>
                          {i + 1}
                        </span>
                        <p className="text-sm text-muted-foreground font-sans leading-relaxed pt-0.5">{rec}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </FadeUp>

              {/* CTA */}
              <FadeUp>
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border/15">
                  <Link href="/assessment">
                    <Button className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading font-semibold">
                      Start Full Assessment
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/literacy">
                    <Button variant="outline" className="border-border font-heading">
                      Back to AI Literacy
                    </Button>
                  </Link>
                </div>
              </FadeUp>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
}
