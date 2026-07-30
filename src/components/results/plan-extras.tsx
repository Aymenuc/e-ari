'use client'

/**
 * Roadmap timeline, risk matrix and programme comparison.
 *
 * These are planning artifacts, so they belong beside the leverage moves on
 * Action Plan rather than under Benchmark, where they sat only because the
 * Enterprise sections were written in one run.
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
import type { PlanExtrasProps } from './types'

export function PlanExtras(props: PlanExtrasProps) {
  const {
    scoring, roadmapPhases, riskMatrixData, isEnterprise, isCommercialEntity, vocab, router,
  } = props
  return (
    <>
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
    </>
  )
}
