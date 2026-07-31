'use client'

/**
 * CertificationTab — the badge, the level held, and the path to the next one.
 *
 * Previously the back half of the Benchmark tab, nine screens below the
 * comparison charts it had nothing to do with.
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
import type { CertificationTabProps } from './types'

export function CertificationTab(props: CertificationTabProps) {
  const {
    scoring, assessment, assessmentHistory, certificationResult, certificationBadge,
    isPro, isEnterprise, userTier, agentOpen, setAgentOpen,
    handleExportPDF, exporting, router, id,
  } = props
  return (
    <>
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
        {/* The editable Word file is the board-pack format — it goes out
            under the organisation's own cover, not ours. That is an operate-
            tier deliverable; the map tier gets the branded PDF above. */}
        {isEnterprise && (
          <button
            onClick={() => handleExportPDF('docx')}
            disabled={exporting}
            className="self-center font-sans text-xs text-slate-400 hover:text-slate-100 transition-colors underline underline-offset-4"
          >
            Word version (editable, unbranded)
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
