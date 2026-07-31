'use client'

/**
 * FindingsTab — lifted verbatim out of results/[id]/page.tsx.
 *
 * Structural move only: same markup, same behaviour, same render. The page
 * file was carrying 2,564 lines of inline JSX for three tabs while Overview
 * and Action Plan were each one composed component.
 */

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { AlertOctagon, AlertTriangle, ArrowUpRight, Award, Brain, Calendar, CheckCircle2, Clock, GitBranch, Globe, Info, Loader2, Plus, RefreshCw, Shield, TrendingUp, UsersRound, XCircle } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { PipelineStatus } from '@/components/shared/pipeline-status'
import { AdvancedInsights } from '@/components/shared/advanced-insights'
import { PILLARS } from '@/lib/pillars'
import { getSectorById } from '@/lib/sectors'
import { scoreRamp } from '@/lib/score-ramp'
import type { AdjustmentRecord } from '@/lib/assessment-engine'
import type { XRayFinding, PatternSeverity } from '@/lib/scoring-patterns'
import { CHART_ACCENT, LockedSectionCard, PillarCard } from './shared'
import { FadeUp } from './fade-up'
import type { FindingsTabProps } from './types'

export function FindingsTab(props: FindingsTabProps) {
  const {
    scoring, assessment, insights, insightsLoading, insightsFallback,
    insightsUpgradeMessage, fetchInsights, isPro, isEnterprise, isCommercialEntity,
    vocab, historicalData, pillarEvidenceCounts,
    complianceSystemsForAssessment, router, id,
  } = props
  return (
    <>
    <div id="sec-pillars" className="scroll-mt-24" />
    {/* ─── 3. PILLAR SCORE CARDS ──────────────────────────────────── */}
    <section>
      <FadeUp>
        <div className="mb-6">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Each area in detail
          </h2>
          <p className="mt-2 max-w-3xl font-sans text-sm leading-relaxed text-muted-foreground">
            The eight areas you were scored on, with what sits behind each score.
            Open one to see the individual answers that produced it.
          </p>
        </div>
      </FadeUp>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {scoring.pillarScores.map((pillar, i) => (
          <PillarCard
            key={pillar.pillarId}
            pillar={pillar}
            index={i}
            showDetails={isPro}
            evidenceClauseCount={pillarEvidenceCounts[pillar.pillarId]}
            complianceSystemId={complianceSystemsForAssessment[0]?.id}
            evidenceVaultHref={
              isPro && complianceSystemsForAssessment[0]?.id
                ? `/portal/use-cases/systems/${complianceSystemsForAssessment[0].id}/evidence`
                : undefined
            }
          />
        ))}
      </div>
    </section>

    <div id="sec-insights" className="scroll-mt-24" />
    {/* ─── 6. AI STRATEGIC INSIGHTS SECTION ───────────────────────── */}
    <section>
      <FadeUp>
        <div className="flex items-center gap-3 mb-6">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            What this means for you
          </h2>
          {insights && isPro && (
            <Badge
              variant="outline"
              className={`text-[10px] font-mono ${
                insights.isAIGenerated
                  ? 'border-eari-blue/40 text-slate-300'
                  : 'border-border text-muted-foreground'
              }`}
            >
              <Brain className="h-3 w-3 mr-1" aria-hidden />
              {insights.isAIGenerated ? 'Written by AI from your scores' : 'Calculated from your answers'}
            </Badge>
          )}
        </div>
      </FadeUp>

      {isPro ? (
        <>
          {insightsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full bg-navy-700 rounded-lg" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full bg-navy-700 rounded-lg" />
                ))}
              </div>
            </div>
          ) : insights ? (
            <div className="space-y-6">
              {/* Executive Summary */}
              <FadeUp>
                <Card className="bg-navy-800 border-eari-blue/20 ring-1 ring-eari-blue/10 hover-lift">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="h-4 w-4 text-slate-300" />
                      <h3 className="font-heading font-semibold text-foreground text-lg tracking-tight">
                        Executive Summary
                      </h3>
                      <Badge variant="outline" className="ml-auto text-[10px] font-mono border-border text-muted-foreground">
                        {insights.isAIGenerated ? 'AI-generated' : 'Calculated from your responses'}
                      </Badge>
                    </div>
                    <p className="text-foreground font-sans leading-relaxed">
                      {insights.executiveSummary}
                    </p>
                  </CardContent>
                </Card>
              </FadeUp>

              {/* 2x2 Grid: Strengths, Gaps, Risks, Opportunities */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Strengths */}
                <FadeUp delay={0.05}>
                  <Card className="bg-navy-800 border-emerald-500/20 h-full hover-lift">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <h3 className="font-heading font-semibold text-emerald-400 text-sm">
                          Strengths
                        </h3>
                      </div>
                      <ul className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                        {insights.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground font-sans">
                            <span className="text-emerald-400 mt-1 flex-shrink-0">&#8226;</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </FadeUp>

                {/* Gaps */}
                <FadeUp delay={0.1}>
                  <Card className="bg-navy-800 border-amber-500/20 h-full hover-lift">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        <h3 className="font-heading font-semibold text-amber-400 text-sm">
                          Gaps
                        </h3>
                      </div>
                      <ul className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                        {insights.gaps.map((g, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground font-sans">
                            <span className="text-amber-400 mt-1 flex-shrink-0">&#8226;</span>
                            <span>{g}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </FadeUp>

                {/* Risks */}
                <FadeUp delay={0.15}>
                  <Card className="bg-navy-800 border-red-500/20 h-full hover-lift">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <XCircle className="h-4 w-4 text-red-400" />
                        <h3 className="font-heading font-semibold text-red-400 text-sm">
                          Risks
                        </h3>
                      </div>
                      <ul className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                        {insights.risks.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground font-sans">
                            <span className="text-red-400 mt-1 flex-shrink-0">&#8226;</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </FadeUp>

                {/* Opportunities */}
                <FadeUp delay={0.2}>
                  <Card className="bg-navy-800 border-blue-500/20 h-full hover-lift">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-4 w-4 text-blue-400" />
                        <h3 className="font-heading font-semibold text-blue-400 text-sm">
                          Opportunities
                        </h3>
                      </div>
                      <ul className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                        {insights.opportunities.map((o, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground font-sans">
                            <span className="text-blue-400 mt-1 flex-shrink-0">&#8226;</span>
                            <span>{o}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </FadeUp>
              </div>

              {/* The LLM "Recommended Next Steps" block was removed here.
                  It was a genuinely distinct layer, not a duplicate of the
                  Action Plan — but two different lists of "steps" on one page
                  makes the reader arbitrate between them, and only the
                  deterministic one can be traced back to an answer. */}

              {/* Pillar Drilldown — per-pillar strongest/weakest questions */}
              {insights.pillarDrilldown && insights.pillarDrilldown.length > 0 && (
                <FadeUp delay={0.3}>
                  <Card className="bg-navy-800 border-border/50 hover-lift">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Brain className="h-4 w-4 text-slate-300" />
                        <h3 className="font-heading font-semibold text-foreground tracking-tight">
                          Your best and worst answer in each area
                        </h3>
                      </div>
                      <div className="space-y-4">
                        {insights.pillarDrilldown.map((pd, i) => {
                          const pillarDef = PILLARS.find(p => p.id === pd.pillarId)
                          const pillarColor = pillarDef?.color ?? '#8b949e'
                          return (
                            <div key={pd.pillarId} className="p-4 rounded-lg bg-navy-700/40 border border-border/20">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pillarColor }} />
                                  <span className="font-heading text-sm font-semibold text-foreground">{pd.pillarName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-heading text-sm font-bold" style={{ color: pillarColor }}>{pd.score}%</span>
                                  <Badge variant="outline" className="text-[10px] font-mono border-border text-muted-foreground">{pd.maturityLabel}</Badge>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <h5 className="text-[10px] font-heading font-semibold text-emerald-400 uppercase tracking-wider mb-2">Strongest</h5>
                                  {pd.strongestQuestions.map((sq, qi) => (
                                    <div key={qi} className="flex items-start gap-2 mb-1.5">
                                      <CheckCircle2 className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-foreground font-sans leading-snug">{sq.questionTopic}</p>
                                        <p className="text-[10px] text-muted-foreground font-mono">{sq.answer}/5 ({sq.answerLabel})</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div>
                                  <h5 className="text-[10px] font-heading font-semibold text-red-400 uppercase tracking-wider mb-2">Weakest</h5>
                                  {pd.weakestQuestions.map((wq, qi) => (
                                    <div key={qi} className="flex items-start gap-2 mb-1.5">
                                      <XCircle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-foreground font-sans leading-snug">{wq.questionTopic}</p>
                                        <p className="text-[10px] text-muted-foreground font-mono">{wq.answer}/5 ({wq.answerLabel})</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </FadeUp>
              )}
            </div>
          ) : (
            <Card className="bg-navy-800 border-border/50 hover-lift">
              <CardContent className="p-6 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15">
                    <AlertTriangle className="h-6 w-6 text-amber-400" />
                  </div>
                  <p className="text-muted-foreground font-sans">
                    Insights could not be loaded. Your calculated scores are still available above.
                  </p>
                  <Button
                    onClick={() => fetchInsights()}
                    variant="outline"
                    size="sm"
                    className="border-eari-blue/30 text-slate-300 hover:bg-eari-blue/10 font-heading text-xs mt-2"
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    Retry Loading Insights
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        /* Free tier: show AI Insight summary (1 limited) + locked full insights */
        <>
          {/* AI Insight summary for free tier (1 limited summary from Insight Agent) */}
          {insightsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full bg-navy-700 rounded-lg" />
            </div>
          ) : insights ? (
            <FadeUp>
              <Card className="bg-navy-800 border-eari-blue/15 ring-1 ring-eari-blue/5 hover-lift">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="h-4 w-4 text-slate-300" aria-hidden />
                    <h3 className="font-heading font-semibold text-foreground tracking-tight">
                      AI Insight Summary
                    </h3>
                    <Badge variant="outline" className="ml-auto text-[10px] font-mono border-eari-blue/30 text-slate-300">
                      1 of 5 insights included
                    </Badge>
                  </div>
                  <p className="text-foreground font-sans leading-relaxed mb-4">
                    {insights.executiveSummary}
                  </p>
                  {/* Strengths & Gaps quick summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-heading text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wider">Top Strengths</h4>
                      <ul className="space-y-1.5">
                        {insights.strengths.slice(0, 2).map((s, i) => (
                          <li key={i} className="text-sm text-foreground font-sans flex items-start gap-2">
                            <span className="text-emerald-400 mt-1 flex-shrink-0">&#8226;</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-heading text-xs font-semibold text-amber-400 mb-2 uppercase tracking-wider">Key Gaps</h4>
                      <ul className="space-y-1.5">
                        {insights.gaps.slice(0, 2).map((g, i) => (
                          <li key={i} className="text-sm text-foreground font-sans flex items-start gap-2">
                            <span className="text-amber-400 mt-1 flex-shrink-0">&#8226;</span>
                            <span>{g}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/30">
                    <p className="text-xs text-muted-foreground font-sans">
                      {insightsUpgradeMessage || 'Upgrade to Professional for full AI narrative insights, cross-pillar analysis, risk identification, and detailed recommendations.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </FadeUp>
          ) : (
            /* Fallback: score-based insights if API didn't return insights */
            <FadeUp>
              <Card className="bg-navy-800 border-border/50 hover-lift">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-heading font-semibold text-foreground tracking-tight">
                      Score-Based Insights
                    </h3>
                    <Badge variant="outline" className="ml-auto text-[10px] font-mono border-border text-muted-foreground">
                      Calculated from Responses
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-heading text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wider">Strengths</h4>
                      <ul className="space-y-1.5">
                        {scoring.pillarScores
                          .filter(p => p.normalizedScore >= 50)
                          .sort((a, b) => b.normalizedScore - a.normalizedScore)
                          .slice(0, 3)
                          .map(p => (
                            <li key={p.pillarId} className="text-sm text-foreground font-sans flex items-start gap-2">
                              <span className="text-emerald-400 mt-1 flex-shrink-0">&#8226;</span>
                              <span>{p.pillarName} at {Math.round(p.normalizedScore)}%</span>
                            </li>
                          ))}
                        {scoring.pillarScores.filter(p => p.normalizedScore >= 50).length === 0 && (
                          <li className="text-sm text-muted-foreground font-sans">No pillars above developing threshold yet.</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-heading text-xs font-semibold text-amber-400 mb-2 uppercase tracking-wider">Gaps</h4>
                      <ul className="space-y-1.5">
                        {scoring.pillarScores
                          .filter(p => p.normalizedScore < 50)
                          .sort((a, b) => a.normalizedScore - b.normalizedScore)
                          .slice(0, 3)
                          .map(p => (
                            <li key={p.pillarId} className="text-sm text-foreground font-sans flex items-start gap-2">
                              <span className="text-amber-400 mt-1 flex-shrink-0">&#8226;</span>
                              <span>{p.pillarName} at {Math.round(p.normalizedScore)}% — needs improvement</span>
                            </li>
                          ))}
                        {scoring.pillarScores.filter(p => p.normalizedScore < 50).length === 0 && (
                          <li className="text-sm text-muted-foreground font-sans">No critical gaps identified.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeUp>
          )}

          {/* Locked full AI insights for free tier */}
          <LockedSectionCard
            title="Full AI Strategic Insights"
            description="Unlock complete AI-powered analysis including risk identification, opportunity mapping, cross-pillar correlation, and prioritized next steps with the Professional plan."
            requiredTier="professional"
            onUpgrade={() => router.push('/pricing')}
            previewContent={
              <div className="space-y-3">
                <div className="h-4 w-3/4 bg-navy-700 rounded" />
                <div className="h-4 w-full bg-navy-700 rounded" />
                <div className="h-4 w-5/6 bg-navy-700 rounded" />
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="h-24 bg-navy-700 rounded-lg" />
                  <div className="h-24 bg-navy-700 rounded-lg" />
                </div>
              </div>
            }
          />
        </>
      )}
    </section>

    <div id="sec-findings" className="scroll-mt-24" />
    {/* ─── 6.5 X-RAY FINDINGS ──────────────────────────────────────── */}
    {scoring.xRayFindings && scoring.xRayFindings.length > 0 && (
      <section>
        <FadeUp>
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-3">
              <span aria-hidden className="h-px w-6 bg-eari-blue/60" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">
                X-Ray findings
              </span>
            </div>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Patterns across your answers
            </h2>
            <p className="mt-2 max-w-3xl font-sans text-sm leading-relaxed text-muted-foreground/90">
              These come from how your answers combine, not from any single
              answer — which is why they are not visible in the scores above.
              Each one shows the evidence behind it, what it costs you, and one
              concrete thing to do about it.
            </p>
          </div>
        </FadeUp>

        <div className="space-y-4">
          {scoring.xRayFindings.map((finding: XRayFinding, i: number) => {
            const sevColor: Record<PatternSeverity, { border: string; bg: string; text: string; icon: string }> = {
              critical: { border: 'border-red-500/35', bg: 'bg-red-500/12', text: 'text-red-400', icon: 'text-red-400' },
              high:     { border: 'border-amber-500/35', bg: 'bg-amber-500/12', text: 'text-amber-400', icon: 'text-amber-400' },
              medium:   { border: 'border-eari-blue/35', bg: 'bg-white/[0.04] border border-white/[0.07]', text: 'text-slate-300', icon: 'text-slate-300' },
              low:      { border: 'border-slate-500/30', bg: 'bg-slate-500/10', text: 'text-slate-300', icon: 'text-slate-400' },
            }
            const c = sevColor[finding.severity]
            return (
              <FadeUp key={finding.id} delay={i * 0.05}>
                <Card className={`bg-navy-800 ${c.border} hover-lift`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.bg} flex-shrink-0 mt-0.5`}>
                        <AlertTriangle className={`h-4 w-4 ${c.icon}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`font-mono text-[10px] ${c.border} ${c.text}`}>
                            {finding.id}
                          </Badge>
                          <Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-wider ${c.border} ${c.text}`}>
                            {finding.severity}
                          </Badge>
                          <span className="font-heading text-sm font-semibold text-foreground">
                            {finding.title}
                          </span>
                        </div>
                        <p className="mt-2 font-sans text-sm text-foreground/90 leading-relaxed">
                          {finding.headline}
                        </p>

                        <div className="mt-3 grid gap-2 font-sans text-[13px] leading-relaxed text-muted-foreground/95 sm:grid-cols-2">
                          <div>
                            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-1">Business impact</div>
                            <p>{finding.businessImpact}</p>
                          </div>
                          <div>
                            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-1">Recommended move</div>
                            <p>{finding.recommendation}</p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">Evidence:</span>
                          {finding.evidence.map(e => (
                            <Badge
                              key={e.questionId}
                              variant="outline"
                              className="font-mono text-[10px] border-border/60 text-muted-foreground"
                            >
                              {e.questionId} = {e.answer}/5
                            </Badge>
                          ))}
                        </div>

                        {finding.pillarsInvolved.length > 0 && (
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">Pillars:</span>
                            {finding.pillarsInvolved.map(pid => (
                              <span key={pid} className="font-mono text-[10px] text-muted-foreground/85 capitalize">
                                {PILLARS.find(p => p.id === pid)?.name ?? pid}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FadeUp>
            )
          })}
        </div>
      </section>
    )}

    {/* Section separator */}
    {scoring.xRayFindings && scoring.xRayFindings.length > 0 && (
      <div className="section-gradient-separator" />
    )}

    {/* ─── 7. INTERDEPENDENCY ADJUSTMENTS ──────────────────────────── */}
    <AnimatePresence>
      {scoring.adjustments.length > 0 && (
        <motion.section
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.4 }}
        >
          <FadeUp>
            <div className="mb-6">
              <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                Why some scores were adjusted
              </h2>
              <p className="mt-2 max-w-3xl font-sans text-sm leading-relaxed text-muted-foreground">
                Some areas depend on others. Strong tooling without governance to
                match, for example, does not count for as much as tooling alone
                would suggest. Each adjustment below shows what was changed and
                on what basis, so the arithmetic stays open to challenge.
              </p>
            </div>
          </FadeUp>
          <div className="space-y-4">
            {scoring.adjustments.map((adj: AdjustmentRecord, i: number) => (
              <FadeUp key={`${adj.type}-${i}`} delay={i * 0.05}>
                <Card className="bg-navy-800 border-amber-500/20 hover-lift">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 flex-shrink-0 mt-0.5">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono text-[10px] border-white/[0.16] text-slate-300">
                            {adj.type}
                          </Badge>
                          <span className="font-heading text-sm font-semibold text-foreground">
                            {PILLARS.find(p => p.id === adj.pillarAffected)?.name ?? adj.pillarAffected}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground font-sans">
                          {adj.description}
                        </p>
                        <div className="mt-3 flex items-center gap-2 font-mono text-xs">
                          <span className="text-muted-foreground">Original:</span>
                          <span className="text-foreground font-semibold">{Math.round(adj.originalScore)}%</span>
                          <span className="text-muted-foreground mx-1">&rarr;</span>
                          <span className="text-amber-400 font-semibold">{Math.round(adj.adjustedScore)}%</span>
                          <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400 ml-2">
                            {adj.delta < 0 ? '' : '+'}{Math.round(adj.delta)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FadeUp>
            ))}
          </div>
        </motion.section>
      )}
    </AnimatePresence>

    {/* AI Literacy Assessment section removed 2026-05-09: it derived
        pseudo-"literacy" scores from the same pillar numbers shown above
        under different labels — pure duplication that made the page feel
        generic, and it collided with the real Article 4 literacy module
        at /portal/literacy-compliance. */}

    {/* ─── ENTERPRISE: ROLE-SPECIFIC EXECUTIVE BRIEF ─────────────────
        Gated on commercial entities only. The C-suite framing
        (CEO/CFO/CTO/CISO/CHRO/COO + ROI math) doesn't fit public-
        sector bodies, NGOs, academic institutions, or UN agencies.
        For those entity types the executive summary above already
        speaks to their reader (Director / Director-General / VC /
        Executive Director) using vocab.topRole. */}
    {isEnterprise && isCommercialEntity && (
      <FadeUp>
        <Card className="bg-navy-800 border-amber-500/20 hover-lift">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-400" />
              <CardTitle className="font-heading text-lg text-foreground">
                Executive Role Brief
              </CardTitle>
              <Badge variant="outline" className="ml-auto text-[10px] font-mono border-amber-500/30 text-amber-400">
                Enterprise
              </Badge>
            </div>
            <CardDescription className="font-sans text-sm">
              Tailored perspectives for different C-suite stakeholders based on your assessment data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              // Derive role insights from actual pillar scores
              const strategyScore = scoring.pillarScores.find(p => p.pillarId === 'strategy')?.normalizedScore ?? 0
              const techScore = scoring.pillarScores.find(p => p.pillarId === 'technology')?.normalizedScore ?? 0
              const talentScore = scoring.pillarScores.find(p => p.pillarId === 'talent')?.normalizedScore ?? 0
              const govScore = scoring.pillarScores.find(p => p.pillarId === 'governance')?.normalizedScore ?? 0
              const secScore = scoring.pillarScores.find(p => p.pillarId === 'security')?.normalizedScore ?? 0
              const procScore = scoring.pillarScores.find(p => p.pillarId === 'process')?.normalizedScore ?? 0
              const roleInsights = [
                { role: 'CEO', insight: strategyScore < 50 ? `Strategy at ${Math.round(strategyScore)}% is the binding constraint: without a documented multi-year case, initiatives compete quarter to quarter and stall at budget reviews. First move: charter the AI investment case before adding pilots.` : `Strategy at ${Math.round(strategyScore)}% gives you the mandate. The leadership question is sequencing — commit to the 2-3 use cases whose evidence trail you can defend to the board.`, score: strategyScore },
                { role: 'CTO', insight: techScore < 60 ? `Technology at ${Math.round(techScore)}% — model versioning, monitoring, and drift detection are the gaps that surface in production first. Put them in place before widening the deployment surface.` : `Technology at ${Math.round(techScore)}% — the platform holds. Next bottleneck is operational: automate retraining triggers and expand monitored workload coverage.`, score: techScore },
                { role: 'CFO', insight: `The weakest funded capability is ${[{n:'strategy',s:strategyScore},{n:'governance',s:govScore},{n:'talent',s:talentScore}].sort((a,b)=>a.s-b.s)[0].n} at ${Math.round([strategyScore,govScore,talentScore].sort((a,b)=>a-b)[0])}%. Spend on new use cases is outpacing the controls that keep them auditable — rebalance toward the constraint before the next funding cycle.`, score: Math.round((strategyScore + govScore + talentScore) / 3) },
                { role: 'CISO', insight: secScore < 60 ? `Security at ${Math.round(secScore)}% — AI-specific controls (model access, prompt-injection defence, adversarial testing) trail the deployment surface. Close that gap before expansion; generic SOC controls don't cover it.` : `Security at ${Math.round(secScore)}% — controls are adequate today. The residual exposure is adversarial robustness; schedule AI-specific red-teaming rather than relying on standard assessments.`, score: secScore },
                { role: 'CHRO', insight: talentScore < 50 ? `Talent at ${Math.round(talentScore)}% — internal capacity caps delivery before budget does. Formalise AI roles and mandatory literacy training; Article 4 of the AI Act already makes staff literacy a legal duty, not a perk.` : `Talent at ${Math.round(talentScore)}% — you can deliver in-house. The risk shifts to retention: specialists at this maturity read the ceiling above them within months, so career paths matter more than hiring.`, score: talentScore },
                { role: 'COO', insight: procScore < 50 ? `Process at ${Math.round(procScore)}% — AI outputs aren't wired into operational workflows with tracked human oversight, so adoption stalls at the pilot boundary. Pick one workflow and instrument the human-in-the-loop step end to end.` : `Process at ${Math.round(procScore)}% — operations absorb AI outputs reliably. Standardise oversight KPIs so you can prove, not just assert, how often humans override the models.`, score: procScore },
              ]
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {roleInsights.map((item) => (
                    <div key={item.role} className="p-3 rounded-lg bg-navy-700/50 border border-border/20 hover:border-border/40 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-heading text-xs font-bold" style={{ color: scoreRamp(item.score) }}>{item.role}</span>
                        <Badge variant="outline" className={`text-[9px] font-mono ml-auto px-1 py-0 ${item.score >= 65 ? 'border-emerald-500/30 text-emerald-400' : item.score >= 40 ? 'border-amber-500/30 text-amber-400' : 'border-red-500/30 text-red-400'}`}>
                          {Math.round(item.score)}%
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">{item.insight}</p>
                    </div>
                  ))}
                </div>
              )
            })()}
            <div className="mt-4">
              <Link href="/literacy/roles">
                <Button variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 font-heading text-sm">
                  View Full Role Dashboards
                  <ArrowUpRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </FadeUp>
    )}

    {/* Historical Comparison was removed here — the bar list rebuilt the same
        assessmentHistory series that the Readiness Over Time chart already
        plots, so the same question was answered twice on two different tabs.
        The time dimension now lives in one place: the Monitoring tab. */}

    {/* The Recommendation Priority Matrix was removed here.

        Its effort axis was seededRandom(score * 7.3) scaled into 30–70 — a
        hash of the score, not a property of the organisation. Two companies
        with the same pillar score got the same "effort", and the footnote
        claimed it came from "your score profile and industry patterns". A
        compliance officer could have sequenced a remediation programme on it.

        Deleting it costs nothing: the Action Plan tab answers the same
        question with computeLeverage(), which re-runs the whole scoring
        pipeline per answer and reports the exact points each move is worth. */}

    {/* ─── AI AGENT PIPELINE STATUS ────────────────────────────────────
        Moved to the foot of the tab. This is a diagnostics readout of how the
        analysis ran; it sat above every finding, so the first thing a reader
        met on the Insights tab was machine status rather than what the machine
        found. */}
    {isPro && (
      <FadeUp delay={0.07}>
        <PipelineStatus assessmentId={id} />
      </FadeUp>
    )}
    </>
  )
}
