'use client'

/**
 * Compliance tab of the results page.
 *
 * Lifted verbatim out of results/[id]/page.tsx, which carried 2,564 lines of
 * inline JSX for three tabs while the two well-behaved tabs (Overview, Action
 * Plan) were each a single composed component. Same markup, same behaviour —
 * this only moves it behind a boundary so the page file states what it shows
 * instead of spelling out every panel.
 *
 * Props are passed as one bag rather than threaded individually: the compiler
 * then names anything missed at the destructure site instead of at runtime.
 */

import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Activity, AlertOctagon, AlertTriangle, ArrowUpRight, Bell, CheckCircle2,
  ChevronRight, Clock, Landmark, Loader2, Minus, RefreshCw, RotateCcw,
  ShieldCheck, TrendingDown, TrendingUp, Zap,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, PolarAngleAxis, PolarGrid,
  PolarRadiusAxis, Radar, RadarChart, ReferenceLine, ResponsiveContainer, Tooltip,
  XAxis, YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ComplianceOutlook } from '@/components/shared/compliance-outlook'
import { PILLARS } from '@/lib/pillars'
import {
  BarChartTooltip, CHART_ACCENT, LockedSectionCard, getMaturityBandColor, scoreRampColor,
} from './shared'
import type { ComplianceTabProps } from './types'
import { FadeUp } from './fade-up'

export function ComplianceTab(props: ComplianceTabProps) {
  const {
    isPro, sessionStatus, complianceOutlook, complianceSummary, complianceGaps,
    assessment, assessmentHistory, historyLoading, driftAnalysis, monitoringAlerts,
    monitoringSchedule, pulseData, pulseLoading, barData, benchmarkData, radarData,
    handleRerun, rerunning, router, id, scoring,
  } = props

  return (
    <>
    {isPro && sessionStatus === 'authenticated' && complianceOutlook ? (
      <FadeUp>
        <ComplianceOutlook
          outlook={complianceOutlook}
          baselineHref="/portal/use-cases"
          createUseCaseHref={
            assessment?.id
              ? `/portal/use-cases/systems/new?assessmentId=${assessment.id}`
              : undefined
          }
        />
      </FadeUp>
    ) : null}
    <div id="sec-compliance" className="scroll-mt-24" />
    {/* ─── REGULATORY COMPLIANCE SECTION (Pro+, locked for Free) ────── */}
    {isPro ? (
      <FadeUp>
        <div className="aurora-card rounded-2xl p-[1px]">
          <Card className="bg-navy-800/40 border-0 rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.07]">
                  <Landmark className="h-5 w-5 text-slate-300" />
                </div>
                <div>
                  <CardTitle className="font-heading text-xl font-bold tracking-tight text-foreground">
                    Regulatory Compliance
                  </CardTitle>
                  <CardDescription className="font-sans text-sm">
                    Gap analysis against EU AI Act, NIST AI RMF, and ISO 42001
                  </CardDescription>
                </div>
                <Badge variant="outline" className="ml-auto text-[10px] font-mono border-eari-blue/30 text-slate-300">
                  Professional
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* 3 Regulation Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {complianceSummary.map(summary => {
                  /* Peer frameworks, no rank between them — one accent, the
                      name does the distinguishing. */
                  const regColor = '#7d93ad'
                  const regGaps = complianceGaps.filter(g => g.regulation === summary.regulation)
                  return (
                    <div key={summary.regulation} className="p-4 rounded-lg bg-navy-700/40 border border-border/20">
                      <div className="flex items-center gap-2 mb-3">
                        <ShieldCheck className="h-4 w-4" style={{ color: regColor }} />
                        <span className="font-heading text-sm font-semibold text-foreground">
                          {summary.regulation}
                        </span>
                      </div>
                      {/* Compliance Rate */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground font-sans">Compliance Rate</span>
                          <span className="font-mono text-sm font-bold" style={{ color: regColor }}>
                            {summary.complianceRate != null ? `${summary.complianceRate}%` : '—'}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-navy-700 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: regColor }}
                            initial={{ width: 0 }}
                            animate={{
                              width: `${summary.complianceRate ?? 0}%`,
                            }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                          />
                        </div>
                      </div>
                      {/* Stats row */}
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground font-sans">
                          {summary.totalRelevant > 0
                            ? `${summary.compliantCount}/${summary.totalRelevant} checks passed`
                            : 'No mapped pillar scores'}
                        </span>
                        {summary.criticalGaps > 0 && (
                          <Badge variant="outline" className="text-[9px] font-mono border-red-500/30 text-red-400 px-1.5 py-0">
                            {summary.criticalGaps} critical
                          </Badge>
                        )}
                      </div>
                      {/* Expandable gaps */}
                      {regGaps.length > 0 && (
                        <Collapsible className="mt-3">
                          <CollapsibleTrigger asChild>
                            <button className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-eari-blue font-heading transition-colors w-full">
                              <ChevronRight className="h-3 w-3" />
                              View {regGaps.length} gap{regGaps.length > 1 ? 's' : ''}
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                              {regGaps.map((gap, gi) => (
                                <div key={gi} className="p-2 rounded-md bg-navy-800/60 border border-border/10">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge
                                      variant="outline"
                                      className={`text-[8px] font-mono px-1 py-0 ${
                                        gap.severity === 'critical'
                                          ? 'border-red-500/30 text-red-400'
                                          : gap.severity === 'high'
                                            ? 'border-amber-500/30 text-amber-400'
                                            : 'border-slate-500/30 text-slate-400'
                                      }`}
                                    >
                                      {gap.severity}
                                    </Badge>
                                    <span className="font-mono text-[9px] text-muted-foreground">
                                      {gap.article}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-foreground font-sans leading-snug">
                                    {gap.title}
                                  </p>
                                  <p className="text-[9px] text-muted-foreground font-sans mt-0.5 leading-snug">
                                    Gap: {gap.gap} pts ({Math.round(gap.pillarScore)} → {gap.minRequired})
                                  </p>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Overall compliance summary */}
              {complianceGaps.length > 0 && (
                <div className="p-4 rounded-lg bg-navy-700/30 border border-border/20">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="font-heading text-sm font-semibold text-foreground">
                      Priority Compliance Gaps
                    </span>
                    <Badge variant="outline" className="text-[9px] font-mono border-amber-500/30 text-amber-400 ml-auto">
                      {complianceGaps.length} total gaps
                    </Badge>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {complianceGaps.slice(0, 6).map((gap, gi) => (
                      <div key={gi} className="flex items-start gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                          gap.severity === 'critical' ? 'bg-red-400' : gap.severity === 'high' ? 'bg-amber-400' : 'bg-slate-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground font-sans leading-snug">
                            <span className="font-mono text-[9px] text-muted-foreground mr-1">{gap.regulation} {gap.article}:</span>
                            {gap.title}
                          </p>
                        </div>
                      </div>
                    ))}
                    {complianceGaps.length > 6 && (
                      <p className="text-[10px] text-muted-foreground font-sans text-center mt-2">
                        +{complianceGaps.length - 6} more gaps — expand regulation cards above for details
                      </p>
                    )}
                  </div>
                </div>
              )}
              {complianceGaps.length === 0 && (
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="font-heading text-sm font-semibold text-emerald-400">
                      All regulatory requirements met — no compliance gaps detected
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </FadeUp>
    ) : (
      <LockedSectionCard
        title="Regulatory Compliance"
        description="Map your AI readiness against EU AI Act, NIST AI RMF, and ISO 42001 requirements. Identify critical compliance gaps and get actionable recommendations."
        requiredTier="professional"
        onUpgrade={() => router.push('/pricing')}
        previewContent={
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="h-20 bg-navy-700 rounded-lg" />
              <div className="h-20 bg-navy-700 rounded-lg" />
              <div className="h-20 bg-navy-700 rounded-lg" />
            </div>
            <div className="h-4 w-3/4 bg-navy-700 rounded" />
            <div className="h-4 w-1/2 bg-navy-700 rounded" />
          </div>
        }
      />
    )}


    <div id="sec-monitoring" className="scroll-mt-24" />
    {/* ─── READINESS OVER TIME (Feature 1) ──────────────────────── */}
    <FadeUp delay={0.08}>
      <div className="aurora-card rounded-2xl p-[1px]">
        <Card className="bg-navy-800/40 border-0 rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.07]">
                <Activity className="h-5 w-5 text-slate-300" />
              </div>
              <div>
                <CardTitle className="font-heading text-xl font-bold tracking-tight text-foreground">
                  Readiness Over Time
                </CardTitle>
                <CardDescription className="font-sans text-sm">
                  Track your AI readiness progress across assessments
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
              </div>
            ) : assessmentHistory.length <= 1 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-eari-blue/10 border border-eari-blue/20">
                  <TrendingUp className="h-8 w-8 text-slate-300/50" />
                </div>
                <div className="text-center">
                  <p className="font-heading font-semibold text-foreground text-lg mb-2">Unlock Trend Tracking</p>
                  <p className="text-sm text-muted-foreground font-sans max-w-md leading-relaxed">
                    {assessmentHistory.length === 0
                      ? "Complete your first assessment to establish a baseline score. Future assessments will show your progress over time."
                      : "Complete another assessment to unlock trend tracking. Your previous answers will be pre-filled for quick updating, and you'll see how your readiness has evolved."}
                  </p>
                </div>
                <Button
                  onClick={handleRerun}
                  disabled={rerunning}
                  variant="outline"
                  className="border-eari-blue/30 text-slate-300 hover:bg-eari-blue/10 font-heading text-sm mt-2"
                >
                  {rerunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                  Re-run Assessment
                </Button>
                <p className="text-[10px] text-muted-foreground/50 font-sans">
                  We recommend quarterly re-assessments to track your AI readiness journey
                </p>
              </div>
            ) : (
              <>
                {/* Line Chart */}
                <div className="w-full h-[300px] sm:h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={assessmentHistory.map(a => {
                        const entry: Record<string, string | number> = {
                          date: a.completedAt
                            ? new Date(a.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : 'N/A',
                          overall: Math.round(a.overallScore ?? 0),
                        }
                        if (a.pillarScores && Array.isArray(a.pillarScores)) {
                          a.pillarScores.forEach(ps => {
                            entry[ps.pillarId] = Math.round(ps.normalizedScore)
                          })
                        }
                        return entry
                      })}
                      margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(48,57,74,0.3)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#8b949e', fontSize: 11 }}
                        axisLine={{ stroke: 'rgba(48,57,74,0.4)' }}
                        tickLine={{ stroke: 'rgba(48,57,74,0.4)' }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: '#8b949e', fontSize: 11 }}
                        axisLine={{ stroke: 'rgba(48,57,74,0.4)' }}
                        tickLine={{ stroke: 'rgba(48,57,74,0.4)' }}
                      />
                      <Tooltip
                        contentStyle={{ background: '#161b22', border: '1px solid rgba(48,57,74,0.6)', borderRadius: '8px', fontSize: '12px' }}
                        labelStyle={{ color: '#e6edf3', fontWeight: 600 }}
                      />
                      <Line type="monotone" dataKey="overall" name="Overall" stroke={CHART_ACCENT} strokeWidth={3} dot={{ fill: CHART_ACCENT, r: 4 }} activeDot={{ r: 6 }} />
                      {/* Sector average reference line */}
                      {benchmarkData?.overall && benchmarkData.overall.avgScore > 0 && (
                        <ReferenceLine
                          y={Math.round(benchmarkData.overall.avgScore)}
                          stroke="#f59e0b"
                          strokeDasharray="6 3"
                          strokeWidth={1.5}
                          label={{
                            value: `Sector Avg: ${Math.round(benchmarkData.overall.avgScore)}%`,
                            position: 'right',
                            fill: '#f59e0b',
                            fontSize: 10,
                            fontFamily: 'var(--font-plus-jakarta)',
                          }}
                        />
                      )}
                      {PILLARS.map((pillar, pi) => (
                        <Line
                          key={pillar.id}
                          type="monotone"
                          dataKey={pillar.id}
                          name={pillar.shortName}
                          stroke={scoreRampColor(40 + (pi / (PILLARS.length - 1)) * 45)}
                          strokeWidth={1.5}
                          strokeDasharray="4 2"
                          dot={false}
                          activeDot={{ r: 3 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-border/30">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-0.5 bg-eari-blue rounded" />
                    <span className="text-xs text-muted-foreground font-sans font-medium">Overall</span>
                  </div>
                  {PILLARS.map(p => (
                    <div key={p.id} className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 rounded" style={{ backgroundColor: p.color, borderStyle: 'dashed' }} />
                      <span className="text-[10px] text-muted-foreground font-sans">{p.shortName}</span>
                    </div>
                  ))}
                </div>

                {/* Score Changes Cards */}
                {assessmentHistory.length >= 2 && (() => {
                  const current = assessmentHistory[assessmentHistory.length - 1]
                  const previous = assessmentHistory[assessmentHistory.length - 2]
                  if (!current.pillarScores || !previous.pillarScores) return null
                  const changes = current.pillarScores.map(ps => {
                    const prevPs = previous.pillarScores?.find(pp => pp.pillarId === ps.pillarId)
                    const delta = prevPs ? Math.round(ps.normalizedScore - prevPs.normalizedScore) : 0
                    return { pillarId: ps.pillarId, delta, currentScore: ps.normalizedScore }
                  }).filter(c => c.delta !== 0)
                  if (changes.length === 0) return null
                  return (
                    <div className="mt-4">
                      <h4 className="font-heading text-sm font-semibold text-foreground mb-3">Score Changes</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {changes.map(change => {
                          const pillarDef = PILLARS.find(p => p.id === change.pillarId)
                          return (
                            <div key={change.pillarId} className="p-2.5 rounded-lg bg-navy-700/40 border border-border/20">
                              <div className="flex items-center gap-1.5 mb-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(148,163,184,0.55)' }} />
                                <span className="font-heading text-xs text-foreground">{pillarDef?.shortName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-foreground font-semibold">{Math.round(change.currentScore)}%</span>
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] font-mono px-1 py-0 ${
                                    change.delta > 0
                                      ? 'border-emerald-500/30 text-emerald-400'
                                      : 'border-red-500/30 text-red-400'
                                  }`}
                                >
                                  {change.delta > 0 ? <TrendingUp className="h-2.5 w-2.5 mr-0.5" /> : <TrendingDown className="h-2.5 w-2.5 mr-0.5" />}
                                  {change.delta > 0 ? '+' : ''}{change.delta}%
                                </Badge>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </FadeUp>


    {/* ─── MONITORING / READINESS TRACKING SECTION (Pro+) ─────────── */}
    {isPro ? (
      <FadeUp>
        <div className="aurora-card rounded-2xl p-[1px]">
          <Card className="bg-navy-800/40 border-0 rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.07]">
                  <Activity className="h-5 w-5 text-slate-300" />
                </div>
                <div>
                  <CardTitle className="font-heading text-xl font-bold tracking-tight text-foreground">
                    Readiness Monitoring
                  </CardTitle>
                  <CardDescription className="font-sans text-sm">
                    Drift detection, risk tracking, and monitoring schedule
                  </CardDescription>
                </div>
                <Badge variant="outline" className="ml-auto text-[10px] font-mono border-eari-blue/30 text-slate-300">
                  Professional
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {driftAnalysis ? (
                <div className="space-y-5">
                  {/* Overall Drift Direction */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-navy-700/40 border border-border/20 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        {driftAnalysis.overallDrift >= 5 ? (
                          <TrendingUp className="h-5 w-5 text-emerald-400" />
                        ) : driftAnalysis.overallDrift <= -5 ? (
                          <TrendingDown className="h-5 w-5 text-red-400" />
                        ) : (
                          <Minus className="h-5 w-5 text-amber-400" />
                        )}
                        <span className="font-heading text-sm font-semibold text-foreground">Overall Drift</span>
                      </div>
                      <p className={`font-heading text-2xl font-semibold tabular-nums ${
                        driftAnalysis.overallDrift >= 5 ? 'text-emerald-400'
                          : driftAnalysis.overallDrift <= -5 ? 'text-red-400'
                            : 'text-amber-400'
                      }`}>
                        {driftAnalysis.overallDrift > 0 ? '+' : ''}{driftAnalysis.overallDrift.toFixed(1)}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-sans mt-1">points since last assessment</p>
                    </div>

                    {/* Risk Level */}
                    <div className="p-4 rounded-lg bg-navy-700/40 border border-border/20 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <AlertOctagon className={`h-5 w-5 ${
                          driftAnalysis.riskLevel === 'high' ? 'text-red-400'
                            : driftAnalysis.riskLevel === 'medium' ? 'text-amber-400'
                              : 'text-emerald-400'
                        }`} />
                        <span className="font-heading text-sm font-semibold text-foreground">Risk Level</span>
                      </div>
                      <Badge className={`text-xs font-heading font-semibold border ${
                        driftAnalysis.riskLevel === 'high'
                          ? 'bg-red-500/15 text-red-400 border-red-500/30'
                          : driftAnalysis.riskLevel === 'medium'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {driftAnalysis.riskLevel.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Monitoring Schedule */}
                    {monitoringSchedule && (
                      <div className="p-4 rounded-lg bg-navy-700/40 border border-border/20 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Clock className="h-5 w-5 text-slate-300" />
                          <span className="font-heading text-sm font-semibold text-foreground">Schedule</span>
                        </div>
                        <p className="font-heading text-lg font-bold text-slate-300 capitalize">
                          {monitoringSchedule.frequency}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-sans mt-1">
                          Auto-monitoring {monitoringSchedule.isAutoEnabled ? 'enabled' : 'disabled'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Per-Pillar Drift Chips */}
                  <div>
                    <h4 className="font-heading text-sm font-semibold text-foreground mb-3">Pillar Drift Breakdown</h4>
                    <div className="flex flex-wrap gap-2">
                      {driftAnalysis.pillarDrifts.map(pd => {
                        const pillarDef = PILLARS.find(p => p.id === pd.pillarId)
                        const chipColor = pd.direction === 'improving'
                          ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                          : pd.direction === 'regressing'
                            ? 'border-red-500/30 text-red-400 bg-red-500/10'
                            : 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                        const DirectionIcon = pd.direction === 'improving' ? TrendingUp : pd.direction === 'regressing' ? TrendingDown : Minus
                        return (
                          <div key={pd.pillarId} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${chipColor}`}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(148,163,184,0.55)' }} />
                            <span className="font-heading text-[11px] font-semibold">{pillarDef?.shortName ?? pd.pillarName}</span>
                            <DirectionIcon className="h-3 w-3" />
                            <span className="font-mono text-[10px]">{pd.drift > 0 ? '+' : ''}{pd.drift.toFixed(1)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Alerts */}
                  {monitoringAlerts && monitoringAlerts.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Bell className="h-4 w-4 text-slate-300" />
                        <h4 className="font-heading text-sm font-semibold text-foreground">
                          Active Alerts
                        </h4>
                        <Badge variant="outline" className="text-[9px] font-mono border-eari-blue/30 text-slate-300">
                          {monitoringAlerts.length}
                        </Badge>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                        {monitoringAlerts.map(alert => (
                          <div key={alert.id} className={`p-3 rounded-lg border ${
                            alert.severity === 'critical'
                              ? 'bg-red-500/10 border-red-500/20'
                              : alert.severity === 'warning'
                                ? 'bg-amber-500/10 border-amber-500/20'
                                : 'bg-eari-blue/10 border-eari-blue/20'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={`text-[8px] font-mono px-1 py-0 ${
                                alert.severity === 'critical' ? 'border-red-500/30 text-red-400'
                                  : alert.severity === 'warning' ? 'border-amber-500/30 text-amber-400'
                                    : 'border-eari-blue/30 text-slate-300'
                              }`}>
                                {alert.severity}
                              </Badge>
                              <span className="font-heading text-xs font-semibold text-foreground">{alert.title}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-sans leading-snug">{alert.description}</p>
                            <p className="text-[9px] text-slate-300/70 font-sans mt-1">→ {alert.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="p-4 rounded-lg bg-navy-700/30 border border-border/20">
                    <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                      {driftAnalysis.summary}
                    </p>
                  </div>
                </div>
              ) : (
                /* No drift analysis available - only 1 assessment */
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-eari-blue/10 border border-eari-blue/20">
                    <Activity className="h-8 w-8 text-slate-300/50" />
                  </div>
                  <div className="text-center">
                    <p className="font-heading font-semibold text-foreground text-lg mb-2">Unlock Drift Tracking</p>
                    <p className="text-sm text-muted-foreground font-sans max-w-md leading-relaxed">
                      Take another assessment to unlock drift tracking. You&apos;ll see how your readiness changes over time, get risk alerts, and receive a recommended monitoring schedule.
                    </p>
                  </div>
                  <Button
                    onClick={handleRerun}
                    disabled={rerunning}
                    variant="outline"
                    className="border-eari-blue/30 text-slate-300 hover:bg-eari-blue/10 font-heading text-sm mt-2"
                  >
                    {rerunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                    Re-run Assessment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </FadeUp>
    ) : (
      <LockedSectionCard
        title="Readiness Monitoring"
        description="Track score drift across assessments, detect regressions early, and get recommended monitoring schedules based on your risk level."
        requiredTier="professional"
        onUpgrade={() => router.push('/pricing')}
        previewContent={
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="h-16 bg-navy-700 rounded-lg" />
              <div className="h-16 bg-navy-700 rounded-lg" />
              <div className="h-16 bg-navy-700 rounded-lg" />
            </div>
            <div className="h-4 w-2/3 bg-navy-700 rounded" />
          </div>
        }
      />
    )}


    {/* ─── AI PULSE: CONTINUOUS MONITORING ──────────────────────────────── */}
    <FadeUp delay={0.08}>
      <div className="aurora-card rounded-2xl p-[1px]">
        <Card className="bg-navy-800/40 border-0 rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.07] relative">
                <Activity className="h-5 w-5 text-slate-300" />
                {/* Pulse dot */}
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-eari-blue-light ring-2 ring-eari-blue/30" />
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="font-heading text-xl font-bold tracking-tight text-foreground">
                    AI Pulse
                  </CardTitle>
                  <Badge variant="outline" className="text-[9px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1" />
                    LIVE
                  </Badge>
                </div>
                <CardDescription className="font-sans text-sm">
                  Continuous readiness monitoring with monthly pulse checks
                </CardDescription>
              </div>
              <Link href="/pulse">
                <Button className="btn-brand font-heading font-semibold h-9 px-4 text-sm shadow-md shadow-eari-blue/15">
                  <Activity className="mr-1.5 h-3.5 w-3.5" />
                  Open AI Pulse
                  <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {pulseLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
              </div>
            ) : pulseData ? (
              <div className="space-y-4">
                {/* Pulse Score Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-navy-700/40 border border-border/20 text-center">
                    <p className="font-heading text-3xl font-semibold tabular-nums text-slate-300">{Math.round(pulseData.overallScore)}%</p>
                    <p className="text-xs text-muted-foreground font-sans mt-1">Pulse Score</p>
                    <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{pulseData.month}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-navy-700/40 border border-border/20 text-center">
                    {typeof pulseData.overallDelta === 'number' && Number.isFinite(pulseData.overallDelta) ? (
                      <>
                        <p className={`font-heading text-3xl font-semibold tabular-nums ${pulseData.overallDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {pulseData.overallDelta > 0 ? '+' : ''}{pulseData.overallDelta.toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground font-sans mt-1">vs Previous</p>
                      </>
                    ) : (
                      <>
                        <p className="font-heading text-lg font-bold text-muted-foreground">Baseline</p>
                        <p className="text-xs text-muted-foreground font-sans mt-1">First pulse</p>
                      </>
                    )}
                  </div>
                  <div className="p-4 rounded-xl bg-navy-700/40 border border-border/20 text-center">
                    <p className="font-heading text-3xl font-semibold tabular-nums text-amber-400">{pulseData.scoreChanges.length}</p>
                    <p className="text-xs text-muted-foreground font-sans mt-1">Score Changes</p>
                  </div>
                </div>

                {/* Score Changes from Pulse */}
                {pulseData.scoreChanges.length > 0 && (
                  <div>
                    <h4 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-slate-300" />
                      Pillar Score Changes
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {pulseData.scoreChanges.map(sc => {
                        const pillarDef = PILLARS.find(p => p.id === sc.pillarId)
                        const chipColor = sc.delta > 0
                          ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                          : sc.delta < 0
                            ? 'border-red-500/30 text-red-400 bg-red-500/10'
                            : 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                        const DirIcon = sc.delta > 0 ? TrendingUp : sc.delta < 0 ? TrendingDown : Minus
                        return (
                          <div key={sc.pillarId} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${chipColor}`}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(148,163,184,0.55)' }} />
                            <span className="font-heading text-[11px] font-semibold">{pillarDef?.shortName ?? sc.pillarName}</span>
                            <DirIcon className="h-3 w-3" />
                            <span className="font-mono text-[10px]">
                              {typeof sc.delta === 'number' && Number.isFinite(sc.delta)
                                ? `${sc.delta > 0 ? '+' : ''}${sc.delta.toFixed(1)}`
                                : '—'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Top Risks from Pulse */}
                {pulseData.topRisks.length > 0 && (
                  <div>
                    <h4 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      Top Risks
                    </h4>
                    <div className="space-y-2">
                      {pulseData.topRisks.map((risk, i) => (
                        <div key={i} className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                          <p className="text-xs text-foreground font-sans leading-relaxed">{risk}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Wins from Pulse */}
                {pulseData.topQuickWins.length > 0 && (
                  <div>
                    <h4 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-emerald-400" />
                      Quick Win Opportunities
                    </h4>
                    <div className="space-y-2">
                      {pulseData.topQuickWins.map((qw, i) => (
                        <div key={i} className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-xs text-foreground font-sans leading-relaxed">{qw}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : driftAnalysis ? (
              /* No pulse data but have drift analysis from monitoring engine */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-navy-700/40 border border-border/20">
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw className="h-4 w-4 text-slate-300" />
                      <span className="font-heading text-sm font-semibold text-foreground">Monthly Pulse Checks</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                      Run monthly readiness pulses that compare your scores over time, tracking progress against your AI transformation goals.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-navy-700/40 border border-border/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      <span className="font-heading text-sm font-semibold text-foreground">Drift Detection</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                      Automatic detection of readiness score drift with risk-level classification and recommended monitoring frequency.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-navy-700/40 border border-border/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-emerald-400" />
                      <span className="font-heading text-sm font-semibold text-foreground">Quick Win Alerts</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                      Get monthly alerts highlighting your top risks and the quickest improvement opportunities for maximum impact.
                    </p>
                  </div>
                </div>
                {/* Drift Risk from monitoring engine */}
                <div className="p-4 rounded-lg bg-navy-700/50 border border-border/20 flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: driftAnalysis.riskLevel === 'high' ? '#ef444420' : driftAnalysis.riskLevel === 'medium' ? '#f59e0b20' : '#22c55e20' }}>
                    <Activity className="h-5 w-5" style={{ color: driftAnalysis.riskLevel === 'high' ? '#ef4444' : driftAnalysis.riskLevel === 'medium' ? '#f59e0b' : '#22c55e' }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-sm font-semibold text-foreground">Drift Risk Level:</span>
                      <Badge variant="outline" className="text-[10px] font-mono" style={{
                        color: driftAnalysis.riskLevel === 'high' ? '#ef4444' : driftAnalysis.riskLevel === 'medium' ? '#f59e0b' : '#22c55e',
                        borderColor: driftAnalysis.riskLevel === 'high' ? '#ef444440' : driftAnalysis.riskLevel === 'medium' ? '#f59e0b40' : '#22c55e40',
                      }}>
                        {driftAnalysis.riskLevel.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-sans mt-1">
                      Recommended monitoring: {monitoringSchedule?.frequency || 'quarterly'} &middot; Next review: {monitoringSchedule?.nextCheck || 'schedule pending'}
                    </p>
                  </div>
                  <Link href="/pulse">
                    <Button variant="outline" size="sm" className="border-eari-blue/30 text-slate-300 hover:bg-eari-blue/10 font-heading text-xs h-8">
                      View Full Pulse
                      <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              /* No pulse data and no drift analysis - first time */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-navy-700/40 border border-border/20">
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw className="h-4 w-4 text-slate-300" />
                      <span className="font-heading text-sm font-semibold text-foreground">Monthly Pulse Checks</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                      Run monthly readiness pulses that compare your scores over time, tracking progress against your AI transformation goals.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-navy-700/40 border border-border/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      <span className="font-heading text-sm font-semibold text-foreground">Drift Detection</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                      Automatic detection of readiness score drift with risk-level classification and recommended monitoring frequency.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-navy-700/40 border border-border/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-emerald-400" />
                      <span className="font-heading text-sm font-semibold text-foreground">Quick Win Alerts</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                      Get monthly alerts highlighting your top risks and the quickest improvement opportunities for maximum impact.
                    </p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-navy-700/50 border border-eari-blue/20 flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.07]">
                    <Activity className="h-5 w-5 text-slate-300" />
                  </div>
                  <div className="flex-1">
                    <p className="font-heading text-sm font-semibold text-foreground">Start tracking your readiness over time</p>
                    <p className="text-xs text-muted-foreground font-sans mt-0.5">
                      Run your first AI Pulse to establish a baseline and enable drift detection with monthly monitoring.
                    </p>
                  </div>
                  <Link href="/pulse">
                    <Button variant="outline" size="sm" className="border-eari-blue/30 text-slate-300 hover:bg-eari-blue/10 font-heading text-xs h-8">
                      Run First Pulse
                      <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FadeUp>


    {/* ─── 4. RADAR CHART — Holographic Display ──────────────────── */}
    <FadeUp>
      <div className="aurora-card rounded-2xl p-[1px]">
        <Card className="bg-navy-800/40 border-0 rounded-2xl">
          <CardHeader>
            <CardTitle className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Readiness Radar
            </CardTitle>
            <CardDescription className="font-sans text-sm">
              Visual overview of scores across all 8 pillars
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[350px] sm:h-[400px] relative radar-holographic-glow">
              {/* Scan line overlay */}
              <div className="scan-line-overlay" />
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="rgba(139, 148, 158, 0.15)" />
                  <PolarAngleAxis
                    dataKey="pillar"
                    tick={{ fill: '#8b949e', fontSize: 11 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: '#8b949e', fontSize: 10 }}
                    axisLine={false}
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke={CHART_ACCENT}
                    fill={CHART_ACCENT}
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </FadeUp>


    {/* ─── 5. PILLAR BAR CHART — Premium Visualization ──────────── */}
    <FadeUp>
      <Card className="bg-navy-800/90 border-border/50 hover-lift results-grid-pattern">
        <CardHeader>
          <CardTitle className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Pillar Comparison
          </CardTitle>
          <CardDescription className="font-sans text-sm">
            Scores ranked from lowest to highest, color-coded by maturity band
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[350px] sm:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 5, right: 50, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(48,57,74,0.3)" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: '#8b949e', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(48,57,74,0.4)' }}
                  tickLine={{ stroke: 'rgba(48,57,74,0.4)' }}
                />
                <YAxis
                  type="category"
                  dataKey="pillar"
                  tick={{ fill: '#8b949e', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(48,57,74,0.4)' }}
                  tickLine={false}
                  width={75}
                />
                <Tooltip content={<BarChartTooltip />} cursor={{ fill: 'rgba(48,57,74,0.2)' }} />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={24} animationBegin={0} animationDuration={1200} animationEasing="ease-out">
                  {barData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`url(#barGradient-${index})`}
                    />
                  ))}
                  {/* Custom label renderer for values */}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* SVG defs for gradient fills - rendered outside chart */}
          <svg width="0" height="0" className="absolute">
            <defs>
              {barData.map((entry, index) => {
                const baseColor = getMaturityBandColor(entry.band)
                return (
                  <linearGradient key={`barGrad-${index}`} id={`barGradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={baseColor} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={baseColor} stopOpacity={1} />
                  </linearGradient>
                )
              })}
            </defs>
          </svg>
        </CardContent>
      </Card>
    </FadeUp>
    </>
  )
}
