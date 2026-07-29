'use client'

/**
 * BenchmarkTab — lifted verbatim out of results/[id]/page.tsx.
 *
 * Structural move only: same markup, same behaviour, same render. The page
 * file was carrying 2,564 lines of inline JSX for three tabs while Overview
 * and Action Plan were each one composed component.
 */

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  AlertTriangle, ArrowLeft, ArrowUpRight, Award, BarChart3, Building2, Calendar,
  CheckCircle2, Clock, Download, Globe, Info, Loader2, Lock, Palette, RefreshCw,
  Shield, TrendingUp, XCircle, AlertOctagon, GitBranch, Plus, UsersRound,
} from 'lucide-react'
import {
  CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { AdvancedInsights } from '@/components/shared/advanced-insights'
import { PILLARS } from '@/lib/pillars'
import { getSectorById } from '@/lib/sectors'
import { scoreRamp } from '@/lib/score-ramp'
import { CHART_ACCENT, LockedSectionCard } from './shared'
import { FadeUp } from './fade-up'
import type { BenchmarkTabProps } from './types'

export function BenchmarkTab(props: BenchmarkTabProps) {
  const {
    scoring, assessment, assessmentHistory, benchmarkData, benchmarkLoading,
    benchmarkConsented, setBenchmarkConsented, certificationResult, certificationBadge,
    roadmapPhases, riskMatrixData, isPro, isEnterprise, isCommercialEntity, vocab,
    userTier, handleExportPDF, exporting, agentOpen, setAgentOpen, router, id,
  } = props
  return (
    <>
    <div id="sec-benchmark" className="scroll-mt-24" />
    {/* ─── SECTOR BENCHMARK SECTION (Enhanced) ────────────────────────── */}
    <FadeUp>
      <div className="aurora-card rounded-2xl p-[1px]">
        <Card className="bg-navy-800/40 border-0 rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
                <Globe className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <CardTitle className="font-heading text-xl font-bold tracking-tight text-foreground">
                  Sector Benchmark
                </CardTitle>
                <CardDescription className="font-sans text-sm">
                  How you compare to other organizations in your sector
                </CardDescription>
              </div>
              {/* Data source badge */}
              {benchmarkData && (
                <Badge variant="outline" className={`ml-auto text-[10px] font-mono ${
                  benchmarkData.pillars?.some((p: any) => p.isRealData)
                    ? 'border-emerald-500/30 text-emerald-400'
                    : 'border-amber-500/30 text-amber-400'
                }`}>
                  {benchmarkData.pillars?.some((p: any) => p.isRealData) ? 'Live Data' : 'Research-Based'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* ─── Professional Consent Banner ──────────────────────── */}
            {!benchmarkConsented && (
              <div className="mb-6 rounded-xl overflow-hidden border border-eari-blue/20">
                {/* Main consent content */}
                <div className="p-5 bg-eari-blue/[0.04] border border-white/[0.06] rounded-xl">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.07] flex-shrink-0">
                      <Shield className="h-5 w-5 text-slate-300" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold text-foreground text-sm mb-1">
                        Help Build the Industry&apos;s Most Trusted AI Readiness Benchmarks
                      </h3>
                      <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                        Your anonymous assessment data helps organizations across your sector understand where they stand.
                        The more contributions, the more accurate and valuable benchmarks become for everyone — including you.
                      </p>
                    </div>
                  </div>

                  {/* Privacy details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-navy-800/60">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[11px] font-semibold text-foreground font-sans">Fully Anonymous</p>
                        <p className="text-[10px] text-muted-foreground font-sans">No company names, emails, or identifying data — only sector-level aggregated scores</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-navy-800/60">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[11px] font-semibold text-foreground font-sans">Aggregated by Sector</p>
                        <p className="text-[10px] text-muted-foreground font-sans">Your scores are combined with others in your sector — no individual results are ever exposed</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-navy-800/60">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[11px] font-semibold text-foreground font-sans">Revocable Anytime</p>
                        <p className="text-[10px] text-muted-foreground font-sans">You can withdraw consent at any time from your portal settings</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-navy-800/60">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[11px] font-semibold text-foreground font-sans">Statistical Measures Only</p>
                        <p className="text-[10px] text-muted-foreground font-sans">Only averages, medians, and percentiles are stored — never raw assessment responses</p>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      className="btn-brand font-heading font-semibold h-9 px-5 text-sm shadow-md shadow-eari-blue/15"
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/benchmark/consent', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ assessmentId: id, consented: true }),
                          })
                          if (res.ok) setBenchmarkConsented(true)
                        } catch { /* silently fail */ }
                      }}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Contribute Anonymously
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-muted-foreground font-sans h-9 text-sm"
                      onClick={async () => {
                        // Properly decline consent (save as false)
                        try {
                          await fetch('/api/benchmark/consent', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ assessmentId: id, consented: false }),
                          })
                        } catch { /* silently fail */ }
                        setBenchmarkConsented(true) // Dismiss banner
                      }}
                    >
                      No thanks, maybe later
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {benchmarkLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
              </div>
            ) : benchmarkData && (benchmarkData.pillars?.some((p: any) => p.sampleSize > 0) || benchmarkData.pillars?.some((p: any) => p.avgScore > 0)) ? (
              <>
                {/* Overall percentile badge */}
                {(() => {
                  const overallBench = benchmarkData.overall
                  const realPillarCount = benchmarkData.pillars?.filter((p: any) => p.isRealData).length ?? 0
                  const totalSample = overallBench?.sampleSize ?? Math.round(benchmarkData.pillars.reduce((sum: number, p: any) => sum + p.sampleSize, 0) / Math.max(1, benchmarkData.pillars.length))
                  const sectorName = getSectorById(assessment.sector)?.name || assessment.sector

                  // Compute percentile using overall benchmark if available, otherwise average pillar percentiles
                  let avgPercentile = 50
                  if (overallBench && overallBench.avgScore > 0) {
                    const score = scoring.overallScore
                    if (score <= overallBench.p25Score) {
                      avgPercentile = overallBench.p25Score > 0 ? Math.round((score / overallBench.p25Score) * 25) : 5
                    } else if (score <= overallBench.medianScore) {
                      const range = overallBench.medianScore - overallBench.p25Score
                      avgPercentile = range > 0 ? Math.round(25 + ((score - overallBench.p25Score) / range) * 25) : 25
                    } else if (score <= overallBench.p75Score) {
                      const range = overallBench.p75Score - overallBench.medianScore
                      avgPercentile = range > 0 ? Math.round(50 + ((score - overallBench.medianScore) / range) * 25) : 50
                    } else if (score <= overallBench.p90Score) {
                      const range = overallBench.p90Score - overallBench.p75Score
                      avgPercentile = range > 0 ? Math.round(75 + ((score - overallBench.p75Score) / range) * 15) : 75
                    } else {
                      avgPercentile = Math.round(Math.min(99, 90 + ((score - overallBench.p90Score) / 10) * 10))
                    }
                  } else {
                    avgPercentile = Math.round(benchmarkData.pillars.reduce((sum: number, bp: any) => {
                      const ps = scoring.pillarScores.find(s => s.pillarId === bp.pillarId)
                      if (!ps || bp.avgScore <= 0) return sum + 50
                      return sum + Math.min(99, Math.max(1, Math.round((ps.normalizedScore / bp.avgScore) * 50)))
                    }, 0) / benchmarkData.pillars.length)
                  }

                  return (
                    <div className="mb-6 p-4 rounded-xl bg-navy-800/60 border border-white/[0.08]">
                      <div className="flex items-center gap-3">
                        <Award className="h-6 w-6 text-amber-400 flex-shrink-0" />
                        <div>
                          <p className="font-heading text-lg font-bold text-foreground">
                            Top {100 - avgPercentile}% of {sectorName} organizations
                          </p>
                          <p className="text-xs text-muted-foreground font-sans">
                            Your score places you in the {avgPercentile >= 75 ? 'upper quartile' : avgPercentile >= 50 ? 'top half' : avgPercentile >= 25 ? 'bottom half' : 'lower quartile'} of your sector
                            {totalSample > 0 && <span className="ml-1">&middot; Based on {totalSample} organization{totalSample !== 1 ? 's' : ''}</span>}
                          </p>
                        </div>
                        {realPillarCount > 0 && (
                          <Badge variant="outline" className="ml-auto text-[9px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                            Live Data
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* Per-pillar comparison bars */}
                <div className="space-y-3 mb-6">
                  {scoring.pillarScores.map(ps => {
                    const benchPillar = benchmarkData.pillars.find((bp: any) => bp.pillarId === ps.pillarId)
                    const pillarDef = PILLARS.find(p => p.id === ps.pillarId)
                    const yourScore = Math.round(ps.normalizedScore)
                    const sectorAvg = benchPillar ? Math.round(benchPillar.avgScore) : 0
                    const sectorP75 = benchPillar ? Math.round(benchPillar.p75Score) : 0
                    const sampleSize = benchPillar?.sampleSize ?? 0
                    const isRealData = benchPillar?.isRealData ?? false
                    const vsSectorDelta = sectorAvg > 0 ? yourScore - sectorAvg : 0
                    return (
                      <div key={ps.pillarId} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(148,163,184,0.55)' }} />
                            <span className="font-heading text-xs text-foreground">{pillarDef?.shortName}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="font-mono text-foreground font-semibold">{yourScore}%</span>
                            <span className="text-muted-foreground font-sans">vs</span>
                            <span className="font-mono text-amber-400">{sectorAvg}% avg</span>
                            {sectorP75 > 0 && <span className="font-mono text-emerald-400">{sectorP75}% p75</span>}
                            {vsSectorDelta !== 0 && (
                              <Badge
                                variant="outline"
                                className={`text-[9px] font-mono px-1 py-0 ${
                                  vsSectorDelta > 0 ? 'border-emerald-500/30 text-emerald-400' : 'border-red-500/30 text-red-400'
                                }`}
                              >
                                {vsSectorDelta > 0 ? '+' : ''}{vsSectorDelta}
                              </Badge>
                            )}
                            {!isRealData && (
                              <span className="text-muted-foreground font-mono text-[9px] italic">research-based</span>
                            )}
                            {isRealData && sampleSize > 0 && (
                              <span className="text-muted-foreground font-mono text-[10px]">n={sampleSize}</span>
                            )}
                          </div>
                        </div>
                        <div className="relative h-3 rounded-full bg-navy-700 overflow-hidden">
                          {sectorP75 > 0 && (
                            <div className="absolute top-0 h-full rounded-full bg-emerald-500/20" style={{ width: `${Math.min(100, sectorP75)}%` }} />
                          )}
                          <div className="absolute top-0 h-full rounded-full bg-amber-500/30" style={{ width: `${Math.min(100, sectorAvg)}%` }} />
                          <motion.div
                            className="absolute top-0 h-full rounded-full"
                            style={{ backgroundColor: 'rgba(148,163,184,0.55)' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${yourScore}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm bg-eari-blue" />
                    <span className="text-muted-foreground font-sans">Your Score</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm bg-amber-500/40" />
                    <span className="text-muted-foreground font-sans">Sector Average</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500/30" />
                    <span className="text-muted-foreground font-sans">Sector P75</span>
                  </div>
                </div>

                {/* Data methodology note */}
                {(() => {
                  const hasRealData = benchmarkData.pillars?.some((p: any) => p.isRealData)
                  const hasCuratedData = benchmarkData.pillars?.some((p: any) => !p.isRealData && p.avgScore > 0)
                  if (!hasCuratedData) return null
                  return (
                    <div className="mt-4 p-3 rounded-lg bg-navy-700/30 border border-border/20">
                      <div className="flex items-start gap-2">
                        <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-[10px] text-muted-foreground font-sans leading-relaxed">
                          {hasRealData
                            ? 'Benchmarks combine real assessment data (where available) with research-based estimates from McKinsey, Gartner, and WEF AI Readiness Index. Indicators marked "research-based" use estimated sector averages; those with "n=X" are from real consented assessments.'
                            : 'Current benchmarks are research-based estimates derived from McKinsey Global AI Survey, Gartner AI Readiness Assessments, and the World Economic Forum AI Readiness Index. As more organizations contribute, benchmarks will shift to live assessment data with actual percentiles.'}
                        </p>
                      </div>
                    </div>
                  )
                })()}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <Globe className="h-8 w-8 text-amber-400/50" />
                </div>
                <div className="text-center">
                  <p className="font-heading font-semibold text-foreground text-lg mb-2">Benchmark Data Growing</p>
                  <p className="text-sm text-muted-foreground font-sans max-w-md leading-relaxed">
                    Sector benchmarks are built from anonymous, consented assessment data. Contribute your data to help build the most accurate benchmarks for your industry.
                  </p>
                </div>
                {!benchmarkConsented && (
                  <Button
                    className="btn-brand font-heading font-semibold h-9 px-5 text-sm shadow-md shadow-eari-blue/15"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/benchmark/consent', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ assessmentId: id, consented: true }),
                        })
                        if (res.ok) setBenchmarkConsented(true)
                      } catch { /* silently fail */ }
                    }}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Contribute Anonymously
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FadeUp>

    {/* ─── ENTERPRISE: ROADMAP TIMELINE ───────────────────────────── */}
    {isEnterprise && (
      <FadeUp>
        <Card className="bg-navy-800 border-amber-500/20 hover-lift">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-400" />
              <CardTitle className="font-heading text-lg text-foreground">
                Roadmap Timeline
              </CardTitle>
              <Badge variant="outline" className="ml-auto text-[10px] font-mono border-amber-500/30 text-amber-400">
                Enterprise
              </Badge>
            </div>
            <CardDescription className="font-sans text-sm">
              Phased implementation plan based on your assessment results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-eari-blue/25" />

              <div className="space-y-6">
                {roadmapPhases.map((phase, i) => (
                  <div key={i} className="flex gap-4 relative">
                    {/* Timeline dot */}
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${phase.bgColor} border ${phase.borderColor} flex-shrink-0 z-10`}>
                      <span className={`font-heading text-[10px] font-bold ${phase.color}`}>{phase.label}</span>
                    </div>
                    {/* Phase content */}
                    <div className="flex-1 pb-2">
                      <h4 className={`font-heading text-sm font-semibold ${phase.color}`}>
                        {phase.subtitle}
                      </h4>
                      <ul className="mt-2 space-y-1.5">
                        {phase.items.length > 0 ? phase.items.map((item, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-foreground font-sans">
                            <GitBranch className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        )) : (
                          <li className="text-sm text-muted-foreground font-sans italic">
                            No items in this phase — your readiness is well-balanced
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeUp>
    )}

    {/* ─── ENTERPRISE: RISK ASSESSMENT MATRIX ─────────────────────── */}
    {isEnterprise && riskMatrixData.length > 0 && (
      <FadeUp>
        <Card className="bg-navy-800 border-amber-500/20 hover-lift">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-amber-400" />
              <CardTitle className="font-heading text-lg text-foreground">
                Risk Assessment Matrix
              </CardTitle>
              <Badge variant="outline" className="ml-auto text-[10px] font-mono border-amber-500/30 text-amber-400">
                Enterprise
              </Badge>
            </div>
            <CardDescription className="font-sans text-sm">
              Identified risks plotted by probability vs. impact
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[350px] sm:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(48,57,74,0.4)" />
                  <XAxis
                    type="number"
                    dataKey="probability"
                    name="Probability"
                    domain={[0, 100]}
                    tick={{ fill: '#8b949e', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(48,57,74,0.4)' }}
                    tickLine={{ stroke: 'rgba(48,57,74,0.4)' }}
                    label={{ value: 'Probability →', position: 'insideBottomRight', offset: -5, fill: '#8b949e', fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="impact"
                    name="Impact"
                    domain={[0, 100]}
                    tick={{ fill: '#8b949e', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(48,57,74,0.4)' }}
                    tickLine={{ stroke: 'rgba(48,57,74,0.4)' }}
                    label={{ value: '← Impact', angle: -90, position: 'insideBottomLeft', offset: 10, fill: '#8b949e', fontSize: 11 }}
                  />
                  <ZAxis type="number" dataKey="score" range={[100, 500]} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null
                      const d = payload[0].payload as { fullLabel: string; score: number; probability: number; impact: number }
                      return (
                        <div className="bg-navy-800 border border-border/60 rounded-lg px-3 py-2 shadow-xl">
                          <p className="font-heading text-sm text-foreground font-semibold">{d.fullLabel}</p>
                          <p className="font-mono text-xs text-red-400">Score: {d.score}%</p>
                          <p className="font-mono text-xs text-muted-foreground">Probability: {d.probability}%</p>
                          <p className="font-mono text-xs text-muted-foreground">Impact: {d.impact}</p>
                        </div>
                      )
                    }}
                  />
                  <Scatter data={riskMatrixData} fill="#ef4444" fillOpacity={0.7} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="font-heading text-xs font-semibold text-red-400">High Probability, High Impact</p>
                <p className="text-[10px] text-muted-foreground font-sans mt-0.5">Critical risks — mitigate immediately</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="font-heading text-xs font-semibold text-amber-400">Monitor Closely</p>
                <p className="text-[10px] text-muted-foreground font-sans mt-0.5">Risks to watch — develop contingency plans</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeUp>
    )}

    {/* ─── ENTERPRISE: MULTI-ENTITY / PROGRAMME COMPARISON ──────────
        The vocab swap below ("business units or teams" → vocab.scalingNoun)
        keeps this useful for public-sector directorates, academic
        departments, multilateral programmes, and corporate BUs alike.
        Hidden entirely for nonprofit and international_body where
        showMultiOrgModule is false (single-team scope). */}
    {isEnterprise && vocab.showMultiOrgModule && (
      <FadeUp>
        <Card className="bg-navy-800 border-amber-500/20 hover-lift">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-amber-400" />
              <CardTitle className="font-heading text-lg text-foreground">
                {isCommercialEntity ? 'Multi-Organization Comparison' : `Cross-${vocab.scalingNoun.split(' ')[0]} Comparison`}
              </CardTitle>
              <Badge variant="outline" className="ml-auto text-[10px] font-mono border-amber-500/30 text-amber-400">
                Enterprise
              </Badge>
            </div>
            <CardDescription className="font-sans text-sm">
              Compare readiness across your {vocab.scalingNoun}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
                <Building2 className="h-8 w-8 text-amber-400/50" />
              </div>
              <div className="text-center">
                <p className="font-heading font-semibold text-foreground">No organizations linked yet</p>
                <p className="text-sm text-muted-foreground font-sans mt-1 max-w-sm">
                  Connect multiple business units or subsidiaries to compare AI readiness across your organization.
                  Includes admin dashboard and SSO/SAML integration.
                </p>
              </div>
              <Button variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 font-heading h-10">
                <Building2 className="mr-2 h-4 w-4" />
                Add Organization
              </Button>
            </div>
          </CardContent>
        </Card>
      </FadeUp>
    )}

    <div id="sec-certification" className="scroll-mt-24" />
    {/* ─── CERTIFICATION BADGE SECTION (All Tiers) ─────────────────── */}
    <FadeUp>
      <div className="aurora-card rounded-2xl p-[1px]">
        <Card className="bg-navy-800/40 border-0 rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.07]">
                <Award className="h-5 w-5 text-slate-300" />
              </div>
              <div>
                <CardTitle className="font-heading text-xl font-bold tracking-tight text-foreground">
                  E-ARI Certification
                </CardTitle>
                <CardDescription className="font-sans text-sm">
                  Your AI readiness certification level
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="ml-auto text-[10px] font-mono"
                style={{
                  borderColor: `${certificationBadge.color}40`,
                  color: certificationBadge.color,
                  backgroundColor: `${certificationBadge.color}15`,
                }}
              >
                {certificationBadge.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* SVG Badge */}
              <div className="flex-shrink-0" dangerouslySetInnerHTML={{ __html: certificationBadge.svg }} />

              <div className="flex-1 text-center md:text-left">
                {certificationResult.isCertified ? (
                  <>
                    <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                      <span className="font-heading text-2xl font-semibold tabular-nums" style={{ color: certificationResult.certification.color }}>
                        {certificationResult.certification.label} Certified
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground font-sans leading-relaxed mb-4">
                      {certificationResult.certification.description}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                      <span className="font-heading text-2xl font-extrabold text-muted-foreground">
                        Not Yet Certified
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground font-sans leading-relaxed mb-4">
                      {certificationResult.certification.description}
                    </p>
                  </>
                )}

                {/* Next level path */}
                {certificationResult.nextLevel && (
                  <div className="p-4 rounded-lg bg-navy-700/50 border border-border/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-slate-300" />
                      <span className="font-heading text-sm font-semibold text-foreground">
                        Path to {certificationResult.nextLevel.label}
                      </span>
                    </div>
                    {certificationResult.nextLevelGaps.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-sans">
                          Improve these pillars to reach {certificationResult.nextLevel.label}:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {certificationResult.nextLevelGaps.map(gap => {
                            const pillarDef = PILLARS.find(p => p.id === gap.pillarId)
                            return (
                              <div key={gap.pillarId} className="flex items-center gap-2 p-2 rounded-md bg-navy-800/60">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(148,163,184,0.55)' }} />
                                <span className="text-xs text-foreground font-sans">{gap.pillarName}</span>
                                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                                  {Math.round(gap.current)} → {gap.required}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                        {scoring.overallScore < certificationResult.nextLevel.minOverallScore && (
                          <p className="text-xs text-muted-foreground font-sans mt-2">
                            Overall score needs to reach {certificationResult.nextLevel.minOverallScore} (currently {Math.round(scoring.overallScore)})
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground font-sans">
                        Overall score needs to reach {certificationResult.nextLevel.minOverallScore} (currently {Math.round(scoring.overallScore)})
                      </p>
                    )}
                  </div>
                )}

                {certificationResult.isCertified && certificationResult.level === 'platinum' && (
                  <div className="p-3 rounded-lg bg-white/[0.06] border border-white/[0.14] mt-3">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-slate-200" />
                      <span className="font-heading text-sm font-semibold text-slate-100">
                        Highest certification achieved — maintain excellence
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FadeUp>


    {/* ─── Advanced Insights: Certification, Regulatory, Monitoring ──── */}
    <AdvancedInsights
      pillarScores={scoring.pillarScores.map(p => ({ pillarId: p.pillarId, pillarName: p.pillarName, normalizedScore: p.normalizedScore }))}
      overallScore={scoring.overallScore}
      previousPillarScores={assessmentHistory.length >= 2 && assessmentHistory[assessmentHistory.length - 2].pillarScores
        ? assessmentHistory[assessmentHistory.length - 2].pillarScores!.map(ps => {
            const pDef = PILLARS.find(p => p.id === ps.pillarId)
            return { pillarId: ps.pillarId, pillarName: pDef?.name ?? ps.pillarId, normalizedScore: ps.normalizedScore }
          })
        : undefined}
      previousOverallScore={assessmentHistory.length >= 2 ? assessmentHistory[assessmentHistory.length - 2].overallScore : null}
      isPro={isPro}
      isEnterprise={isEnterprise}
    />

    {/* ─── Free/Pro: Locked Enterprise sections ────────────────────── */}
    {!isEnterprise && (
      <LockedSectionCard
        title="Enterprise Features"
        description="Unlock industry benchmarks, risk assessment matrix, roadmap timeline, multi-organization comparison, custom branding, and dedicated account management."
        requiredTier="enterprise"
        onUpgrade={() => router.push('/pricing')}
        previewContent={
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="h-20 bg-navy-700 rounded-lg" />
              <div className="h-20 bg-navy-700 rounded-lg" />
            </div>
            <div className="h-32 bg-navy-700 rounded-lg" />
            <div className="grid grid-cols-3 gap-3">
              <div className="h-12 bg-navy-700 rounded-lg" />
              <div className="h-12 bg-navy-700 rounded-lg" />
              <div className="h-12 bg-navy-700 rounded-lg" />
            </div>
          </div>
        }
      />
    )}

    {/* ─── 8. ACTIONS ──────────────────────────────────────────────── */}
    <FadeUp>
      <div className="section-gradient-separator mb-6" />
      <Separator className="bg-border/40" />
      <div className="flex flex-col sm:flex-row gap-4 pt-6">
        {isPro ? (
          <Button
            onClick={() => handleExportPDF('pdf')}
            disabled={exporting}
            className="btn-brand font-heading font-semibold h-12 px-6 shadow-md shadow-eari-blue/15"
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export Report (PDF)
          </Button>
        ) : (
          <Button
            disabled
            className="bg-navy-700 text-muted-foreground font-heading font-semibold h-12 px-6 cursor-not-allowed relative group"
          >
            <Lock className="mr-2 h-4 w-4" />
            Export Report
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-navy-800 text-slate-300 text-[10px] font-sans px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-eari-blue/20">
              Upgrade to Professional
            </span>
          </Button>
        )}
        {isPro && (
          <button
            onClick={() => handleExportPDF('docx')}
            disabled={exporting}
            className="self-center font-sans text-xs text-slate-400 hover:text-slate-100 transition-colors underline underline-offset-4"
          >
            Word version (editable)
          </button>
        )}
        <Link href="/assessment">
          <Button className="bg-navy-700 hover:bg-navy-600 text-foreground font-heading font-semibold h-12 px-6 w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Start New Assessment
          </Button>
        </Link>
        <Link href="/portal">
          <Button variant="outline" className="border-border hover:bg-navy-700 text-foreground font-heading font-semibold h-12 px-6 w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Portal
          </Button>
        </Link>
      </div>

      {/* Enterprise: Custom branding option in export */}
      {isEnterprise && (
        <div className="mt-4 p-4 rounded-lg bg-navy-800 border border-amber-500/20">
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-amber-400" />
            <div className="flex-1">
              <p className="font-heading text-sm font-semibold text-foreground">Custom Branding</p>
              <p className="text-xs text-muted-foreground font-sans">Apply your organization&apos;s logo and colors to exported reports</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/branding'}
              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 font-heading"
            >
              <Palette className="mr-2 h-3.5 w-3.5" />
              Configure
            </Button>
          </div>
        </div>
      )}
    </FadeUp>
    </>
  )
}
