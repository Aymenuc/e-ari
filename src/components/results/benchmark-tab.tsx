'use client'

/**
 * BenchmarkTab — how this organisation compares to its sector.
 *
 * Split out of the old combined tab. A benchmark is a comparison; a
 * certification is a status you hold. They shared a tab because there was a
 * slot free, which made a 5,400px page out of two unrelated ideas.
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
    scoring, assessment, benchmarkData, benchmarkLoading,
    benchmarkConsented, setBenchmarkConsented, isPro, vocab, router, id,
  } = props

  // One definition, used by the badge and the description — they disagreed
  // before, so a tab could say "Live Data" above a modelled figure.
  const hasRealBenchmark = Boolean(
    benchmarkData?.pillars?.some((p: { isRealData?: boolean }) => p.isRealData),
  );
  return (
    <>
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
                {/* The heading promised a comparison and, before enough
                    assessments exist in a sector, delivered a request for the
                    reader's data instead. Promising what is not there is how a
                    paid tab reads as broken; naming the state costs nothing and
                    keeps the modelled figures honest about what they are. */}
                <CardDescription className="font-sans text-sm">
                  {hasRealBenchmark
                    ? 'How you compare to other organisations in your sector'
                    : 'Modelled sector positioning — not yet enough assessments in your sector for observed comparison'}
                </CardDescription>
              </div>
              {/* Data source badge */}
              {benchmarkData && (
                <Badge variant="outline" className={`ml-auto text-[10px] font-mono ${
                  hasRealBenchmark
                    ? 'border-emerald-500/30 text-emerald-400'
                    : 'border-amber-500/30 text-amber-400'
                }`}>
                  {hasRealBenchmark ? 'Observed' : 'Modelled'}
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
    </>
  )
}
