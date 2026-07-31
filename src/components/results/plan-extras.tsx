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
import { AlertTriangle, ArrowLeft, ArrowUpRight, Award, BarChart3, Building2, Calendar, CheckCircle2, Clock, Download, Globe, Info, Loader2, Lock, Palette, RefreshCw, Shield, TrendingUp, XCircle, GitBranch, Plus, UsersRound } from 'lucide-react'

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
    scoring, roadmapPhases, isEnterprise, isCommercialEntity, vocab, router,
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

    {/* The Risk Assessment Matrix was removed here.

        It plotted probability against impact, but probability was
        max(20, 100 - score) and impact was 40 + (60 - score) * 0.8 — both
        straight-line functions of the same number, so every point sat on one
        line. A 2-D chart carrying 1-D data, presenting two independent risk
        dimensions where there was only ever one, with values reachable solely
        by hover. */}

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
