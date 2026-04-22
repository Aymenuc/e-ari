'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Shield,
  Award,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Landmark,
  FileCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Eye,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PILLARS } from '@/lib/pillars'
import { assessComplianceGaps, getComplianceSummary, type ComplianceGap, type ComplianceSummary } from '@/lib/regulatory-mapping'
import { assessCertification, getCertificationBadge, type CertificationResult } from '@/lib/certification'
import { analyzeDrift, getRecommendedSchedule, generateAlerts, type DriftAnalysis, type MonitoringAlert, type MonitoringSchedule } from '@/lib/monitoring-engine'

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
  )
}

const SEVERITY_CONFIG = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30', icon: XCircle },
  high: { color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30', icon: AlertTriangle },
  medium: { color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30', icon: Eye },
  low: { color: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-500/30', icon: CheckCircle2 },
}

const DIRECTION_CONFIG = {
  improving: { color: 'text-emerald-400', icon: TrendingUp, label: 'Improving' },
  stable: { color: 'text-blue-400', icon: Minus, label: 'Stable' },
  regressing: { color: 'text-red-400', icon: TrendingDown, label: 'Regressing' },
}

interface AdvancedInsightsProps {
  pillarScores: Array<{
    pillarId: string
    pillarName: string
    normalizedScore: number
  }>
  overallScore: number
  previousPillarScores?: Array<{
    pillarId: string
    pillarName: string
    normalizedScore: number
  }>
  previousOverallScore?: number | null
  isPro: boolean
  isEnterprise: boolean
}

export function AdvancedInsights({
  pillarScores,
  overallScore,
  previousPillarScores,
  previousOverallScore,
  isPro,
  isEnterprise,
}: AdvancedInsightsProps) {

  // ─── Compute all advanced insights ────────────────────────────────────────
  const complianceGaps = useMemo(() => assessComplianceGaps(pillarScores), [pillarScores])
  const complianceSummary = useMemo(() => getComplianceSummary(pillarScores), [pillarScores])
  const certification = useMemo(() => assessCertification(overallScore, pillarScores), [overallScore, pillarScores])
  const badge = useMemo(() => getCertificationBadge(certification.level), [certification.level])

  const drift: DriftAnalysis | null = useMemo(() => {
    if (!previousPillarScores) return null
    return analyzeDrift(pillarScores, previousPillarScores)
  }, [pillarScores, previousPillarScores])

  const alerts: MonitoringAlert[] = useMemo(() => {
    if (!drift) return []
    return generateAlerts(drift, overallScore, previousOverallScore ?? null, certification.level)
  }, [drift, overallScore, previousOverallScore, certification.level])

  const schedule: MonitoringSchedule = useMemo(() => {
    return getRecommendedSchedule(overallScore, drift?.riskLevel ?? 'low')
  }, [overallScore, drift])

  // ─── Certification Section (Free+ with upsell) ────────────────────────────
  const renderCertification = () => (
    <FadeUp>
      <Card className="bg-navy-800 border-border/50 hover:border-eari-blue/30 transition-colors duration-300">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-eari-blue/15">
              <Award className="h-5 w-5 text-eari-blue-light" />
            </div>
            <div>
              <CardTitle className="font-heading text-lg text-foreground">AI Readiness Certification</CardTitle>
              <CardDescription className="text-muted-foreground font-sans text-sm">
                Your E-ARI certification level based on assessment scores
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Badge SVG */}
            <div
              className="flex-shrink-0"
              dangerouslySetInnerHTML={{ __html: badge.svg }}
            />
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-xl font-bold" style={{ color: certification.certification.color }}>
                  {certification.certification.label}
                </h3>
                {certification.isCertified && (
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-mono">
                    CERTIFIED
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                {certification.certification.description}
              </p>

              {/* Gap analysis */}
              {certification.pillarGaps.length > 0 && (
                <div className="space-y-2 mt-3">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Gaps to current level
                  </p>
                  {certification.pillarGaps.slice(0, 3).map(gap => (
                    <div key={gap.pillarId} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground font-sans">{gap.pillarName}</span>
                      <span className="font-mono text-xs text-amber-400">
                        {gap.current}% / {gap.required}%
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-navy-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500/60"
                          style={{ width: `${Math.min(100, (gap.current / gap.required) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Next level */}
              {certification.nextLevel && isPro && (
                <div className="mt-3 p-3 rounded-lg bg-eari-blue/10 border border-eari-blue/20">
                  <p className="text-xs font-mono text-eari-blue-light uppercase tracking-wider mb-1">
                    Next: {certification.nextLevel.label}
                  </p>
                  {certification.nextLevelGaps.slice(0, 2).map(gap => (
                    <p key={gap.pillarId} className="text-xs text-muted-foreground font-sans">
                      {gap.pillarName}: {gap.current}% → {gap.required}% (+{gap.required - gap.current}%)
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </FadeUp>
  )

  // ─── Regulatory Compliance Section (Pro+) ─────────────────────────────────
  const renderRegulatory = () => {
    if (!isPro) {
      return (
        <FadeUp>
          <Card className="bg-navy-800 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-eari-blue/15">
                  <Landmark className="h-6 w-6 text-eari-blue-light" />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    Regulatory Compliance Mapping
                  </h3>
                  <p className="text-sm text-muted-foreground font-sans">
                    See how your scores map to EU AI Act, NIST AI RMF, and ISO 42001 requirements.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-mono border-eari-blue/30 text-eari-blue-light">
                  PRO
                </Badge>
              </div>
            </CardContent>
          </Card>
        </FadeUp>
      )
    }

    return (
      <FadeUp>
        <Card className="bg-navy-800 border-border/50 hover:border-eari-blue/30 transition-colors duration-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-eari-blue/15">
                <Landmark className="h-5 w-5 text-eari-blue-light" />
              </div>
              <div>
                <CardTitle className="font-heading text-lg text-foreground">Regulatory Compliance Mapping</CardTitle>
                <CardDescription className="text-muted-foreground font-sans text-sm">
                  Your scores mapped to EU AI Act, NIST AI RMF, and ISO 42001 requirements
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Compliance summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {complianceSummary.map(cs => (
                <div key={cs.regulation} className="p-4 rounded-lg bg-navy-700/50 border border-border/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-heading text-sm font-semibold text-foreground">{cs.regulation}</span>
                    {cs.criticalGaps > 0 && (
                      <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px] font-mono">
                        {cs.criticalGaps} critical
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-navy-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${cs.complianceRate >= 75 ? 'bg-emerald-500' : cs.complianceRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${cs.complianceRate}%` }}
                      />
                    </div>
                    <span className="font-mono text-sm font-bold text-foreground">{cs.complianceRate}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-sans mt-1">
                    {cs.compliantCount} of {cs.totalRelevant} requirements met
                  </p>
                </div>
              ))}
            </div>

            {/* Top compliance gaps */}
            {complianceGaps.length > 0 && (
              <div>
                <h4 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Priority Compliance Gaps
                </h4>
                <div className="space-y-2">
                  {complianceGaps.slice(0, 5).map((gap, i) => {
                    const sev = SEVERITY_CONFIG[gap.severity]
                    const SevIcon = sev.icon
                    return (
                      <div key={`${gap.regulation}-${gap.article}-${gap.pillarId}`} className="flex items-start gap-3 p-3 rounded-lg bg-navy-700/30 border border-border/20">
                        <SevIcon className={`h-4 w-4 ${sev.color} mt-0.5 flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-heading text-xs font-semibold text-foreground">{gap.regulation}</span>
                            <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 border-border/40 text-muted-foreground">
                              {gap.article}
                            </Badge>
                            <Badge className={`text-[10px] font-mono px-1.5 py-0 ${sev.bg} ${sev.color} ${sev.border}`}>
                              {gap.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-sans mt-1">{gap.title}</p>
                          <p className="text-[11px] text-muted-foreground/70 font-sans mt-0.5 line-clamp-2">
                            {gap.recommendation}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="font-mono text-xs text-red-400">-{gap.gap}%</span>
                          <p className="text-[10px] text-muted-foreground font-sans">{gap.pillarScore}% / {gap.minRequired}%</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeUp>
    )
  }

  // ─── Continuous Monitoring Section ────────────────────────────────────────
  const renderMonitoring = () => (
    <FadeUp>
      <Card className="bg-navy-800 border-border/50 hover:border-eari-blue/30 transition-colors duration-300">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-eari-blue/15">
              <Activity className="h-5 w-5 text-eari-blue-light" />
            </div>
            <div>
              <CardTitle className="font-heading text-lg text-foreground">Continuous Monitoring</CardTitle>
              <CardDescription className="text-muted-foreground font-sans text-sm">
                Track AI readiness drift and get alerted on regressions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Risk level + schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-navy-700/50 border border-border/30">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Risk Level</p>
              <div className="flex items-center gap-2">
                <Badge className={`text-sm font-heading font-semibold ${
                  drift?.riskLevel === 'high' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                  drift?.riskLevel === 'medium' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                }`}>
                  {drift?.riskLevel?.toUpperCase() ?? 'LOW'}
                </Badge>
                {drift && (
                  <span className="font-mono text-xs text-muted-foreground">
                    Drift: {drift.overallDrift >= 0 ? '+' : ''}{drift.overallDrift}
                  </span>
                )}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-navy-700/50 border border-border/30">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Recommended Schedule</p>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-eari-blue-light" />
                <span className="font-heading text-sm font-semibold text-foreground capitalize">{schedule.frequency}</span>
                {schedule.isAutoEnabled && (
                  <Badge className="text-[10px] font-mono bg-eari-blue/15 text-eari-blue-light border-eari-blue/30">
                    AUTO
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Pillar drift table */}
          {drift && (
            <div>
              <h4 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Pillar Drift Analysis
              </h4>
              <div className="space-y-2">
                {drift.pillarDrifts.map(pd => {
                  const dir = DIRECTION_CONFIG[pd.direction]
                  const DirIcon = dir.icon
                  return (
                    <div key={pd.pillarId} className="flex items-center gap-3 p-2.5 rounded-lg bg-navy-700/30">
                      <DirIcon className={`h-4 w-4 ${dir.color} flex-shrink-0`} />
                      <span className="font-heading text-sm text-foreground flex-1">{pd.pillarName}</span>
                      <span className={`font-mono text-sm font-bold ${dir.color}`}>
                        {pd.drift >= 0 ? '+' : ''}{pd.drift}
                      </span>
                      <Badge variant="outline" className={`text-[10px] font-mono px-1.5 py-0 ${dir.color} border-current/20`}>
                        {dir.label}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Active alerts */}
          {alerts.length > 0 && (
            <div>
              <h4 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Active Alerts
              </h4>
              <div className="space-y-2">
                {alerts.slice(0, 4).map(alert => {
                  const sev = SEVERITY_CONFIG[alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'high' : 'medium']
                  return (
                    <div key={alert.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-navy-700/20 border border-border/10">
                      <AlertTriangle className={`h-3.5 w-3.5 ${sev.color} mt-0.5 flex-shrink-0`} />
                      <div>
                        <p className="text-xs font-heading font-semibold text-foreground">{alert.title}</p>
                        <p className="text-[11px] text-muted-foreground font-sans">{alert.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!drift && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground font-sans">
                Run another assessment to enable drift detection and monitoring.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </FadeUp>
  )

  // ─── Render all sections ──────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      <div className="section-gradient-separator" />
      <Separator className="bg-border/40" />

      <FadeUp>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-eari-blue/20 to-cyan-500/10">
            <FileCheck className="h-4 w-4 text-eari-blue-light" />
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
            Advanced Insights
          </h2>
          <Badge variant="outline" className="font-mono text-[10px] border-eari-blue/30 text-eari-blue-light">
            NEW
          </Badge>
        </div>
        <p className="text-muted-foreground font-sans text-sm max-w-2xl">
          Certification, regulatory compliance mapping, and continuous monitoring — powered by your assessment data.
        </p>
      </FadeUp>

      {renderCertification()}
      {renderRegulatory()}
      {renderMonitoring()}
    </div>
  )
}
