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
import { Activity, AlertOctagon, AlertTriangle, ArrowUpRight, Bell, CheckCircle2, ChevronRight, Clock, Landmark, Loader2, Minus, RefreshCw, RotateCcw, ShieldCheck, TrendingDown, TrendingUp, Zap } from 'lucide-react'
import { BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { scoreRamp, plainBand } from '@/lib/score-ramp'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ComplianceOutlook } from '@/components/shared/compliance-outlook'
import { PILLARS } from '@/lib/pillars'
import { CHART_ACCENT, LockedSectionCard, scoreRampColor } from './shared'
import type { ComplianceTabProps } from './types'
import { FadeUp } from './fade-up'

export function ComplianceTab(props: ComplianceTabProps) {
  const {
    isPro, sessionStatus, complianceOutlook, complianceSummary, complianceGaps,
    assessment, assessmentHistory, historyLoading, driftAnalysis, monitoringAlerts,
    monitoringSchedule, pulseData, pulseLoading, barData, benchmarkData,
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
    {/* ─── 4. WHAT TO FIX FIRST ───────────────────────────────────
        Was a radar and a ranked BarChart, one after the other, both
        plotting the same eight numbers the Overview tab already states in
        words — so the reader met the same data three times and had to
        decode two chart grammars to learn nothing new. The radar lives on
        in the PDF, where shape-at-a-glance earns a static page.

        What survives is the one question a list of eight scores is
        actually asked: which of these do I deal with first? Plain rows
        answer it without a tooltip, stay readable on a phone, and carry
        the same words the Overview used. */}
    <FadeUp>
      <Card className="bg-navy-800/90 border-border/50">
        <CardHeader>
          <CardTitle className="font-heading text-2xl font-bold tracking-tight text-foreground">
            What to fix first
          </CardTitle>
          <CardDescription className="font-sans text-sm">
            Your eight areas, weakest first. Start at the top — the areas below
            the halfway mark are the ones that hold your overall score down.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {barData.map((row, i) => (
              <li key={row.pillar} className="flex items-center gap-3 sm:gap-4">
                <span className="w-5 shrink-0 font-mono text-[12px] tabular-nums text-slate-500">
                  {i + 1}
                </span>
                <span className="w-24 shrink-0 truncate font-sans text-sm text-slate-200 sm:w-36">
                  {row.pillar}
                </span>
                <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${row.score}%`, backgroundColor: scoreRamp(row.score) }}
                  />
                </span>
                <span
                  className="w-8 shrink-0 text-right font-mono text-[13px] font-semibold tabular-nums"
                  style={{ color: scoreRamp(row.score) }}
                >
                  {row.score}
                </span>
                <span className="hidden w-28 shrink-0 text-right font-sans text-[11px] text-slate-500 sm:block">
                  {plainBand(row.score)}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-5 border-t border-white/[0.06] pt-4 font-sans text-[12px] leading-relaxed text-slate-500">
            Scores are out of 100 and comparable across assessments — the scale
            does not move, so a change here is a real change.
          </p>
        </CardContent>
      </Card>
    </FadeUp>
    </>
  )
}
