'use client'

/**
 * Pieces shared by the results tabs.
 *
 * These were local to results/[id]/page.tsx and became unreachable the moment
 * the tabs moved into their own files. Exported here rather than duplicated,
 * so the tier ladder and the chart accent stay defined once.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Award, Crown, Lock, ArrowUpRight, ChevronDown, CheckCircle2, FileText, ShieldCheck,
  AlertTriangle, Target, Database, Cpu, Users, Shield, Heart, Settings,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { PillarEvidenceChip } from '@/components/shared/pillar-evidence-chip'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { PILLARS } from '@/lib/pillars'
import type { PillarScoreResult } from '@/lib/assessment-engine'
import { Button } from '@/components/ui/button'
import { MATURITY_BANDS, type MaturityBand } from '@/lib/pillars'
import { scoreRamp } from '@/lib/score-ramp'
import { FadeUp } from './fade-up'
import type { UserTier } from './types'

/** Single accent for chart marks — the bright end of the score ramp. */
export const CHART_ACCENT = '#38bdf8'

export const ICON_MAP: Record<string, React.ElementType> = {
  Target,
  Database,
  Cpu,
  Users,
  Shield,
  Heart,
  Settings,
  Lock,
}

export function getMaturityBgClass(band: MaturityBand): string {
  switch (band) {
    case 'laggard': return 'bg-white/[0.05] text-slate-400 border-white/[0.1]'
    case 'follower': return 'bg-white/[0.06] text-slate-300 border-white/[0.12]'
    case 'chaser': return 'bg-sky-400/[0.1] text-sky-300/90 border-sky-400/25'
    case 'pacesetter': return 'bg-sky-400/[0.14] text-sky-300 border-sky-400/35'
    default: return 'bg-muted text-muted-foreground border-border'
  }
}

/** Score → colour. Re-exported from the one ramp the whole product uses; this
 *  file previously carried a third hand-written copy of the same maths. */
export const scoreRampColor = scoreRamp

export function getMaturityBandColor(band: MaturityBand): string {
  return MATURITY_BANDS[band]?.color ?? '#8b949e'
}

export const TIER_CONFIG: Record<UserTier, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ElementType }> = {
  /* One ladder, brightening with the plan. The previous slate/violet/cyan/gold
     set made the billing tier the most colourful thing on a page whose job is
     to communicate a score — and gold on Enterprise was the loudest of all. */
  free: {
    label: 'Free',
    color: 'text-slate-400',
    bgColor: 'bg-white/[0.03]',
    borderColor: 'border-white/[0.08]',
    icon: Zap,
  },
  professional: {
    label: 'Professional',
    color: 'text-slate-300',
    bgColor: 'bg-white/[0.05]',
    borderColor: 'border-white/[0.11]',
    icon: Award,
  },
  growth: {
    label: 'Growth',
    color: 'text-slate-200',
    bgColor: 'bg-white/[0.07]',
    borderColor: 'border-white/[0.15]',
    icon: Award,
  },
  autopilot: {
    label: 'Autopilot',
    color: 'text-slate-100',
    bgColor: 'bg-white/[0.1]',
    borderColor: 'border-white/[0.19]',
    icon: Award,
  },
  enterprise: {
    label: 'Enterprise',
    color: 'text-white',
    bgColor: 'bg-white/[0.13]',
    borderColor: 'border-white/[0.24]',
    icon: Crown,
  },
}

export function BarChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { pillar: string; score: number; band: MaturityBand } }> }) {
  if (!active || !payload || payload.length === 0) return null
  const data = payload[0].payload
  return (
    <div className="bg-navy-800 border border-border/60 rounded-lg px-3 py-2 shadow-xl">
      <p className="font-heading text-sm text-foreground font-semibold">{data.pillar}</p>
      <p className="font-mono text-xs text-muted-foreground">Score: {Math.round(data.score)}%</p>
      <p className="font-mono text-xs" style={{ color: getMaturityBandColor(data.band) }}>
        {MATURITY_BANDS[data.band]?.label}
      </p>
    </div>
  )
}

export function LockedSectionCard({
  title,
  description,
  requiredTier,
  onUpgrade,
  previewContent,
}: {
  title: string
  description: string
  requiredTier: UserTier
  onUpgrade: () => void
  previewContent?: React.ReactNode
}) {
  const config = TIER_CONFIG[requiredTier]
  const TierIcon = config.icon

  return (
    <FadeUp>
      <div className="relative rounded-xl overflow-hidden hover-lift">
        <Card className="relative bg-navy-800 border border-eari-blue/20 rounded-xl shadow-sm shadow-black/20">
          {/* Blurred preview behind the lock */}
          {previewContent && (
            <div className="absolute inset-0 blurred-preview overflow-hidden rounded-xl p-6">
              {previewContent}
            </div>
          )}
          <CardContent className="relative p-6">
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${config.bgColor}`}>
                <TierIcon className={`h-7 w-7 ${config.color}`} />
              </div>
              <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Lock className="h-4 w-4 text-muted-foreground lock-pulse" />
                  <h3 className="font-heading font-semibold text-foreground text-lg">{title}</h3>
                </div>
                <p className="text-sm text-muted-foreground font-sans max-w-md leading-relaxed">
                  {description}
                </p>
                <p className="mt-2 text-xs font-mono uppercase tracking-wider text-slate-300/60">
                  What you&apos;re missing — unlock to reveal full insights
                </p>
              </div>
              <Button
                onClick={onUpgrade}
                className="font-heading font-semibold h-11 px-6 btn-brand shadow-md shadow-eari-blue/15"
              >
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Upgrade to {config.label}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </FadeUp>
  )
}

export function PillarCard({
  pillar,
  index,
  showDetails,
  evidenceClauseCount,
  complianceSystemId,
  evidenceVaultHref,
}: {
  pillar: PillarScoreResult
  index: number
  showDetails: boolean
  evidenceClauseCount?: number
  complianceSystemId?: string
  evidenceVaultHref?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const pillarDef = PILLARS.find(p => p.id === pillar.pillarId)
  const Icon = pillarDef ? ICON_MAP[pillarDef.icon] || Target : Target
  const pillarColor = scoreRampColor(pillar.normalizedScore)
  const pillarColorLight = `${pillarColor.slice(0, -1)}, 0.65)`.replace('rgb', 'rgba')

  return (
    <FadeUp delay={index * 0.06}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card
          className="pillar-gradient-border bg-navy-800 border-border/50 hover:border-border transition-all duration-300 hover-lift"
          style={{ '--pillar-color': pillarColor, '--pillar-color-light': pillarColorLight } as React.CSSProperties}
        >
          <CollapsibleTrigger asChild>
            <button className="w-full text-left" aria-label={`Expand ${pillar.pillarName} details`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 icon-float"
                      style={{ backgroundColor: `${pillarColor}20` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: pillarColor }} />
                    </div>
                    <div>
                      <CardTitle className="font-heading text-sm text-foreground tracking-tight">
                        {pillar.pillarName}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 font-mono ${getMaturityBgClass(pillar.maturityBand)}`}
                        >
                          {pillar.maturityLabel}
                        </Badge>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          Weight: {Math.round(pillar.weight * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-heading text-xl font-semibold tabular-nums text-foreground">
                        {Math.round(pillar.normalizedScore)}
                      </span>
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    {showDetails && (
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      >
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    )}
                  </div>
                </div>
              </CardHeader>
            </button>
          </CollapsibleTrigger>

          {/* Gradient progress bar with shimmer */}
          <div className="px-6 pb-3 pl-9">
            <div className="h-2 rounded-full bg-navy-700 overflow-hidden relative">
              <motion.div
                className="h-full rounded-full gradient-progress-fill"
                style={{ '--pillar-color': pillarColor, '--pillar-color-light': pillarColorLight } as React.CSSProperties}
                initial={{ width: 0 }}
                animate={{ width: `${pillar.normalizedScore}%` }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 + index * 0.06 }}
              />
            </div>
          </div>

          <PillarEvidenceChip count={evidenceClauseCount ?? 0} vaultHref={evidenceVaultHref} />

          {showDetails && (
            <CollapsibleContent>
              <div className="px-6 pb-4 pl-9">
                <Separator className="mb-4 bg-border/40" />
                <div className="space-y-2">
                  {pillar.questionDetails.map((qd, qi) => {
                    const questionDef = pillarDef?.questions.find(q => q.id === qd.questionId)
                    return (
                      <div key={qd.questionId} className="flex items-start gap-3 text-sm">
                        <span className="font-mono text-xs text-muted-foreground mt-0.5 w-5 flex-shrink-0">
                          {qi + 1}.
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-muted-foreground font-sans text-xs leading-relaxed truncate">
                            {questionDef?.text ?? qd.questionId}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-xs text-foreground">
                              {qd.contribution}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              (Answer: {qd.answer}/5)
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {(evidenceClauseCount ?? 0) > 0 && complianceSystemId ? (
                    <div className="mt-4 rounded-lg border border-eari-blue/25 bg-eari-blue/5 p-3 space-y-2">
                      <p className="text-[10px] font-heading uppercase tracking-wide text-slate-300">
                        Compliance evidence vault
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/35 text-emerald-400">
                          Evidence: {evidenceClauseCount} clause{evidenceClauseCount !== 1 ? 's' : ''}
                        </Badge>
                        <Link
                          href={
                            evidenceVaultHref ??
                            (complianceSystemId
                              ? `/portal/use-cases/systems/${complianceSystemId}/evidence`
                              : '#')
                          }
                          className="text-[11px] text-slate-300 hover:text-eari-blue font-heading underline underline-offset-2"
                        >
                          View backing documents
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </div>
                {pillar.adjustments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {pillar.adjustments.map((adj, ai) => (
                      <div key={ai} className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-300/90 font-sans">{adj.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          )}
        </Card>
      </Collapsible>
    </FadeUp>
  )
}
