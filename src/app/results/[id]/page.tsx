'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  Target,
  Database,
  Cpu,
  Users,
  Shield,
  Heart,
  Settings,
  Lock,
  ChevronDown,
  Download,
  Plus,
  ArrowLeft,
  Info,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Loader2,
  Briefcase,
  Clock,
  BarChart3,
  FileText,
  Building2,
  Zap,
  Crown,
  ArrowUpRight,
  Palette,
  Globe,
  GitBranch,
  Calendar,
  AlertOctagon,
  Landmark,
  Award,
  UsersRound,
  Brain,
  RotateCcw,
  RefreshCw,
  Activity,
  ChevronRight,
  Bell,
  ShieldCheck,
  Minus,
  Scale,
} from 'lucide-react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Navigation } from '@/components/shared/navigation'
import { Footer } from '@/components/shared/footer'
import { AIAssistant } from '@/components/shared/ai-assistant'
import { AgentPanel } from '@/components/shared/agent-panel'
import { PipelineStatus } from '@/components/shared/pipeline-status'
import { AdvancedInsights } from '@/components/shared/advanced-insights'
import { PILLARS, MATURITY_BANDS, type MaturityBand } from '@/lib/pillars'
import { getSectorById } from '@/lib/sectors'
import type { ScoringResult, PillarScoreResult, AdjustmentRecord } from '@/lib/assessment-engine'
import type { AIInsightResult } from '@/lib/ai-insights'
import { assessCertification, getCertificationBadge } from '@/lib/certification'
import { assessComplianceGaps, getComplianceSummary } from '@/lib/regulatory-mapping'
import { analyzeDrift, generateAlerts, getRecommendedSchedule } from '@/lib/monitoring-engine'

/* ─── Deterministic pseudo-random (avoids hydration mismatch) ─────────── */

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49297
  return x - Math.floor(x)
}

/* ─── Tier Types ──────────────────────────────────────────────────────── */

type UserTier = 'free' | 'professional' | 'enterprise'

const TIER_CONFIG: Record<UserTier, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ElementType }> = {
  free: {
    label: 'Free',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/15',
    borderColor: 'border-slate-500/30',
    icon: Zap,
  },
  professional: {
    label: 'Professional',
    color: 'text-eari-blue-light',
    bgColor: 'bg-eari-blue/15',
    borderColor: 'border-eari-blue/30',
    icon: Award,
  },
  enterprise: {
    label: 'Enterprise',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
    borderColor: 'border-amber-500/30',
    icon: Crown,
  },
}

/* ─── Icon map ─────────────────────────────────────────────────────────── */

const ICON_MAP: Record<string, React.ElementType> = {
  Target,
  Database,
  Cpu,
  Users,
  Shield,
  Heart,
  Settings,
  Lock,
}

/* ─── Animation helpers ────────────────────────────────────────────────── */

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

/* ─── Maturity helpers ─────────────────────────────────────────────────── */

function getMaturityBandColor(band: MaturityBand): string {
  return MATURITY_BANDS[band]?.color ?? '#8b949e'
}

function getMaturityBandDescription(band: MaturityBand): string {
  return MATURITY_BANDS[band]?.description ?? ''
}

function getMaturityBgClass(band: MaturityBand): string {
  switch (band) {
    case 'laggard': return 'bg-red-500/15 text-red-400 border-red-500/30'
    case 'follower': return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    case 'chaser': return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    case 'pacesetter': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    default: return 'bg-muted text-muted-foreground border-border'
  }
}

/* ─── Custom Tooltip for Bar Chart ─────────────────────────────────────── */

function BarChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { pillar: string; score: number; band: MaturityBand } }> }) {
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

/* ─── Score Ring Component ──────────────────────────────────────────────── */

function ScoreRing({ score, maturityColor, pillarScores }: { score: number; maturityColor: string; pillarScores?: PillarScoreResult[] }) {
  const circumference = 2 * Math.PI * 90
  const offset = circumference - (circumference * score) / 100

  // Top 3 metrics for floating badges
  const topMetrics = pillarScores
    ? [...pillarScores].sort((a, b) => b.normalizedScore - a.normalizedScore).slice(0, 3)
    : []

  const badgePositions = [
    { top: '-8px', right: '-12px' },
    { bottom: '20px', left: '-16px' },
    { bottom: '-4px', right: '8px' },
  ]

  return (
    <div className="relative inline-flex items-center justify-center score-ring-glow">
      {/* Outer glow rings */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${maturityColor}15 0%, transparent 70%)`,
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1.3, opacity: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      <svg width="220" height="220" viewBox="0 0 220 220" aria-label={`Overall readiness score: ${Math.round(score)}%`}>
        <defs>
          <linearGradient id="scoreRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={maturityColor} />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <filter id="scoreGlowFilter">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Background track */}
        <circle cx="110" cy="110" r="90" fill="none" stroke="rgba(48,57,74,0.3)" strokeWidth="10" />
        {/* Subtle tick marks */}
        {[0, 25, 50, 75].map((pct) => {
          const angle = (pct / 100) * 360 - 90
          const rad = (angle * Math.PI) / 180
          const x1 = 110 + 78 * Math.cos(rad)
          const y1 = 110 + 78 * Math.sin(rad)
          const x2 = 110 + 82 * Math.cos(rad)
          const y2 = 110 + 82 * Math.sin(rad)
          return <line key={pct} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(139,148,158,0.25)" strokeWidth="1.5" />
        })}
        {/* Animated score circle with gradient */}
        <motion.circle
          cx="110"
          cy="110"
          r="90"
          fill="none"
          stroke="url(#scoreRingGradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 2, ease: 'easeOut', delay: 0.3 }}
          transform="rotate(-90 110 110)"
          filter="url(#scoreGlowFilter)"
        />
        {/* Score number */}
        <motion.text
          x="110"
          y="98"
          textAnchor="middle"
          fill="#e6edf3"
          fontSize="48"
          fontWeight="800"
          fontFamily="var(--font-plus-jakarta)"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
        >
          {Math.round(score)}
        </motion.text>
        <motion.text
          x="110"
          y="128"
          textAnchor="middle"
          fill="#8b949e"
          fontSize="13"
          fontFamily="var(--font-inter)"
          letterSpacing="0.05em"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.2 }}
        >
          out of 100
        </motion.text>
      </svg>

      {/* Floating metric badges */}
      {topMetrics.map((metric, i) => {
        const pillarDef = PILLARS.find(p => p.id === metric.pillarId)
        const color = pillarDef?.color ?? '#8b949e'
        const pos = badgePositions[i]
        return (
          <motion.div
            key={metric.pillarId}
            className={`absolute metric-badge-float ${i === 1 ? 'metric-badge-float-delay-1' : i === 2 ? 'metric-badge-float-delay-2' : ''}`}
            style={pos}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.5 + i * 0.15, type: 'spring', stiffness: 200 }}
          >
            <div className="glass-card rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 shadow-lg" style={{ borderColor: `${color}40` }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="font-mono text-[10px] text-muted-foreground">{pillarDef?.shortName}</span>
              <span className="font-heading text-xs font-bold" style={{ color }}>{Math.round(metric.normalizedScore)}%</span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

/* ─── Locked Section Card ─────────────────────────────────────────────── */

function LockedSectionCard({
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
        {/* Animated gradient border */}
        <div className="absolute inset-0 rounded-xl shimmer-border" />
        <Card className="relative bg-navy-800 border-0 rounded-xl">
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
                <p className="mt-2 text-xs font-mono uppercase tracking-wider text-eari-blue-light/60">
                  What you&apos;re missing — unlock to reveal full insights
                </p>
              </div>
              <Button
                onClick={onUpgrade}
                className={`font-heading font-semibold h-11 px-6 bg-gradient-to-r from-eari-blue to-eari-blue-dark hover:from-eari-blue-dark hover:to-eari-blue text-white shadow-lg shadow-eari-blue/20 shimmer-button`}
                style={{
                  backgroundSize: '200% auto',
                  backgroundImage: 'linear-gradient(90deg, #2563eb, #06b6d4, #2563eb)',
                }}
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

/* ─── Pillar Card Component ────────────────────────────────────────────── */

function PillarCard({
  pillar,
  index,
  showDetails,
  evidenceClauseCount,
  complianceSystemId,
}: {
  pillar: PillarScoreResult
  index: number
  showDetails: boolean
  evidenceClauseCount?: number
  complianceSystemId?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const pillarDef = PILLARS.find(p => p.id === pillar.pillarId)
  const Icon = pillarDef ? ICON_MAP[pillarDef.icon] || Target : Target
  const pillarColor = pillarDef?.color ?? '#8b949e'
  // Lighter version for gradient end
  const pillarColorLight = pillarColor === '#2563eb' ? '#06b6d4' : pillarColor === '#ef4444' ? '#f59e0b' : `${pillarColor}99`

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
                      <span className="font-heading text-xl font-extrabold text-foreground">
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
                      <p className="text-[10px] font-heading uppercase tracking-wide text-eari-blue-light">
                        Compliance evidence vault
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/35 text-emerald-400">
                          Evidence: {evidenceClauseCount} clause{evidenceClauseCount !== 1 ? 's' : ''}
                        </Badge>
                        <Link
                          href={`/compliance/systems/${complianceSystemId}/evidence`}
                          className="text-[11px] text-eari-blue-light hover:text-eari-blue font-heading underline underline-offset-2"
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

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN RESULTS PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function ResultsPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()

  const [assessment, setAssessment] = useState<{
    id: string
    status: string
    sector: string
    completedAt: string | null
    createdAt: string
    scoringResult: ScoringResult | null
  } | null>(null)
  const [insights, setInsights] = useState<AIInsightResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [agentOpen, setAgentOpen] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [pulseData, setPulseData] = useState<{
    id: string
    overallScore: number
    previousOverallScore: number | null
    overallDelta: number | null
    pillarScores: Array<{ pillarId: string; pillarName: string; normalizedScore: number; weight: number }>
    scoreChanges: Array<{ pillarId: string; pillarName: string; previous: number; current: number; delta: number }>
    topRisks: string[]
    topQuickWins: string[]
    month: string
    assessmentId: string
  } | null>(null)
  const [pulseLoading, setPulseLoading] = useState(true)
  const [rerunning, setRerunning] = useState(false)
  const [assessmentHistory, setAssessmentHistory] = useState<Array<{
    id: string
    completedAt: string | null
    overallScore: number | null
    pillarScores: Array<{ pillarId: string; normalizedScore: number }> | null
  }>>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [benchmarkData, setBenchmarkData] = useState<{
    sector: string
    pillars: Array<{
      pillarId: string
      avgScore: number
      p75Score: number
      p90Score: number
      sampleSize: number
      isRealData: boolean
    }>
    overall: {
      avgScore: number
      medianScore: number
      p25Score: number
      p75Score: number
      p90Score: number
      sampleSize: number
      isRealData: boolean
    } | null
  } | null>(null)
  const [benchmarkLoading, setBenchmarkLoading] = useState(true)
  const [benchmarkConsented, setBenchmarkConsented] = useState(false)
  const [pillarEvidenceCounts, setPillarEvidenceCounts] = useState<Record<string, number>>({})
  const [complianceSystemsForAssessment, setComplianceSystemsForAssessment] = useState<Array<{ id: string; name: string }>>([])

  /* ─── Tier from authoritative session source ─────────────────────────── */
  // Tier is read ONLY from the server-side session JWT, never client-switchable.
  // This prevents UI/feature bypass; all paid features are enforced server-side too.
  const sessionTier = (session?.user as Record<string, unknown> | undefined)?.tier as string | undefined
  const userTier: UserTier = (sessionTier === 'professional' || sessionTier === 'enterprise') ? sessionTier : 'free'

  const isPro = userTier === 'professional' || userTier === 'enterprise'
  const isEnterprise = userTier === 'enterprise'

  /* ─── Fetch assessment data ──────────────────────────────────────────── */
  const fetchAssessment = useCallback(async () => {
    try {
      const res = await fetch(`/api/assessment/${id}`)
      if (res.status === 401) {
        setError('Please sign in to view this assessment.')
        return
      }
      if (res.status === 403) {
        setError('You do not have permission to view this assessment.')
        return
      }
      if (res.status === 404) {
        setError('Assessment not found.')
        return
      }
      if (!res.ok) {
        setError('Failed to load assessment.')
        return
      }
      const data = await res.json()
      if (!data.scoringResult) {
        setError('This assessment has not been completed yet.')
        return
      }
      setAssessment(data)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [id])

  /* ─── Fetch AI insights (Free tier gets 1 limited summary; Pro+ gets full insights) */
  const [insightsLimited, setInsightsLimited] = useState(false)
  const [insightsUpgradeMessage, setInsightsUpgradeMessage] = useState<string | null>(null)
  const [insightsFallback, setInsightsFallback] = useState(false)

  const fetchInsights = useCallback(async () => {
    setInsightsLoading(true)
    try {
      const res = await fetch(`/api/assessment/${id}/insights`)
      if (res.ok) {
        const data = await res.json()
        setInsights(data.insights)
        setInsightsLimited(data.limited === true)
        setInsightsFallback(data.fallback === true)
        setInsightsUpgradeMessage(data.upgradeMessage || null)
      }
      // 403 = still tier gated for some reason — insights are optional
      // All other errors also silently fail (insights are optional)
    } catch {
      // Insights are optional — silently fail
    } finally {
      setInsightsLoading(false)
    }
  }, [id])

  /* ─── Fetch assessment history ──────────────────────────────────────── */
  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true)
      const res = await fetch('/api/assessment/history')
      if (res.ok) {
        const data = await res.json()
        setAssessmentHistory(data.assessments || [])
      }
    } catch {
      // History is optional
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  /* ─── Fetch benchmark data ──────────────────────────────────────────── */
  const fetchBenchmark = useCallback(async (sector: string) => {
    try {
      setBenchmarkLoading(true)
      const res = await fetch(`/api/benchmark?sector=${encodeURIComponent(sector)}`)
      if (res.ok) {
        const data = await res.json()
        // Check if any pillar has actual data (sampleSize > 0)
        const hasData = data.pillars?.some((p: { sampleSize: number }) => p.sampleSize > 0)
        setBenchmarkData(hasData ? data : null)
      }
    } catch {
      // Benchmark is optional
    } finally {
      setBenchmarkLoading(false)
    }
  }, [])

  /* ─── Fetch pulse data ────────────────────────────────────────────── */
  const fetchPulse = useCallback(async () => {
    try {
      setPulseLoading(true)
      const res = await fetch('/api/pulse')
      if (res.ok) {
        const data = await res.json()
        // Pulse API returns an array, take the latest
        if (Array.isArray(data) && data.length > 0) {
          setPulseData(data[0])
        }
      }
    } catch {
      // Pulse is optional
    } finally {
      setPulseLoading(false)
    }
  }, [])

  /* ─── Rerun assessment handler ─────────────────────────────────────── */
  const handleRerun = async () => {
    setRerunning(true)
    try {
      const res = await fetch(`/api/assessment/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rerun' }),
      })
      if (res.ok) {
        const data = await res.json()
        router.push(`/assessment?prefill=${data.id}`)
      }
    } catch {
      // Silently fail
    } finally {
      setRerunning(false)
    }
  }

  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (sessionStatus === 'unauthenticated') {
      setError('Please sign in to view this assessment.')
      setLoading(false)
      return
    }
    fetchAssessment()
    fetchInsights()
    fetchHistory()
    fetchPulse()
  }, [sessionStatus, fetchAssessment, fetchInsights, fetchHistory, fetchPulse])

  /* ─── Fetch benchmark data when assessment loads ─────────────────────── */
  useEffect(() => {
    if (assessment?.sector) {
      fetchBenchmark(assessment.sector)
    }
  }, [assessment?.sector, fetchBenchmark])

  useEffect(() => {
    if (!assessment?.id || sessionStatus !== 'authenticated') return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/compliance/assessment/${assessment.id}/evidence-by-pillar`)
        if (!res.ok) return
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        setPillarEvidenceCounts(typeof data.pillarCounts === 'object' && data.pillarCounts ? data.pillarCounts : {})
        setComplianceSystemsForAssessment(Array.isArray(data.systems) ? data.systems : [])
      } catch {
        /* optional enrichment */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [assessment?.id, sessionStatus])

  /* ─── Scroll progress tracking ────────────────────────────────────────── */
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight
      setScrollProgress(totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  /* ─── Export Report handler ──────────────────────────────────────────── */
  const handleExportPDF = async () => {
    if (!isPro) return
    setExporting(true)
    try {
      const res = await fetch(`/api/assessment/${id}/pdf`)
      if (res.ok) {
        // Verify we got a valid DOCX response (not an HTML error page)
        const contentType = res.headers.get('content-type') || ''
        if (!contentType.includes('openxmlformats')) {
          // Server returned OK but wrong content type — likely an error page
          const text = await res.text()
          let errorMsg = 'Unexpected response format from server'
          try {
            const errData = JSON.parse(text)
            if (errData.error) errorMsg = errData.error
          } catch {}
          console.error('Report export error (wrong content type):', contentType, errorMsg)
          alert(`Export failed: ${errorMsg}`)
          return
        }

        const blob = await res.blob()
        if (blob.size < 100) {
          console.error('Report export error: file too small', blob.size, 'bytes')
          alert('Export failed: generated file is too small, please try again.')
          return
        }

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `E-ARI-Report-${id.slice(0, 8)}.docx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        let errorMsg = `Export failed (HTTP ${res.status})`
        try {
          const errData = await res.json()
          if (errData.error) errorMsg = errData.error
        } catch {
          // Response wasn't JSON — try to read as text
          try {
            const text = await res.text()
            if (text) errorMsg = `Server error (${res.status}): ${text.slice(0, 200)}`
          } catch {}
        }
        console.error('Report export error:', errorMsg)
        alert(errorMsg)
      }
    } catch (err) {
      console.error('Report export failed:', err)
      alert(`Network error — please check your connection and try again. (${err instanceof Error ? err.message : 'Unknown error'})`)
    } finally {
      setExporting(false)
    }
  }

  /* ─── Loading state ──────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-navy-900">
        <Navigation />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <div className="space-y-8">
              <Skeleton className="h-10 w-72 bg-navy-700" />
              <div className="flex flex-col md:flex-row items-center gap-8">
                <Skeleton className="h-48 w-48 rounded-full bg-navy-700" />
                <div className="space-y-4 flex-1 w-full">
                  <Skeleton className="h-8 w-64 bg-navy-700" />
                  <Skeleton className="h-6 w-48 bg-navy-700" />
                  <Skeleton className="h-16 w-full bg-navy-700" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-36 w-full bg-navy-700 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  /* ─── Error state ────────────────────────────────────────────────────── */
  if (error || !assessment?.scoringResult) {
    return (
      <div className="min-h-screen flex flex-col bg-navy-900">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 mx-auto mb-6">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground mb-3">
              Unable to Load Results
            </h1>
            <p className="text-muted-foreground font-sans mb-8">
              {error || 'Something went wrong loading this assessment.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/portal">
                <Button variant="outline" className="border-border hover:bg-navy-700 text-foreground font-heading w-full sm:w-auto">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Portal
                </Button>
              </Link>
              <Link href="/assessment">
                <Button className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading w-full sm:w-auto">
                  Start New Assessment
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const scoring = assessment.scoringResult

  /* ─── Chart data ─────────────────────────────────────────────────────── */
  const radarData = scoring.pillarScores.map(p => ({
    pillar: PILLARS.find(pd => pd.id === p.pillarId)?.shortName ?? p.pillarId,
    score: Math.round(p.normalizedScore),
    fullMark: 100,
  }))

  const barData = [...scoring.pillarScores]
    .sort((a, b) => a.normalizedScore - b.normalizedScore)
    .map(p => ({
      pillar: PILLARS.find(pd => pd.id === p.pillarId)?.shortName ?? p.pillarId,
      score: Math.round(p.normalizedScore),
      band: p.maturityBand,
    }))

  const completedDate = assessment.completedAt
    ? new Date(assessment.completedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A'

  /* ─── Derived data for tier-specific sections ────────────────────────── */

  // Recommendation Priority Matrix data (Pro+)
  const priorityMatrixData = scoring.pillarScores.map(p => ({
    pillar: PILLARS.find(pd => pd.id === p.pillarId)?.shortName ?? p.pillarId,
    impact: 100 - p.normalizedScore, // Lower score = higher impact potential
    effort: Math.round(30 + seededRandom(p.normalizedScore * 7.3) * 40), // Estimated effort derived from score patterns
    score: Math.round(p.normalizedScore),
    fullLabel: p.pillarName,
  }))

  // Benchmark comparison data — now uses real benchmark API data when available
  // Falls back to curated research-based sector averages
  const benchmarkComparisonData = scoring.pillarScores.map(p => {
    const benchPillar = benchmarkData?.pillars?.find(bp => bp.pillarId === p.pillarId)
    return {
      pillar: PILLARS.find(pd => pd.id === p.pillarId)?.shortName ?? p.pillarId,
      yourScore: Math.round(p.normalizedScore),
      industryAvg: benchPillar ? Math.round(benchPillar.avgScore) : null,
      isRealData: benchPillar?.isRealData ?? false,
      sampleSize: benchPillar?.sampleSize ?? 0,
      fullLabel: p.pillarName,
    }
  })

  // Risk assessment matrix data (Enterprise)
  const riskMatrixData = scoring.pillarScores
    .filter(p => p.normalizedScore < 60)
    .map(p => ({
      pillar: PILLARS.find(pd => pd.id === p.pillarId)?.shortName ?? p.pillarId,
      probability: Math.round(Math.max(20, 100 - p.normalizedScore)),
      impact: Math.round(40 + (60 - p.normalizedScore) * 0.8),
      fullLabel: p.pillarName,
      score: Math.round(p.normalizedScore),
    }))

  // Roadmap timeline data (Enterprise)
  const roadmapPhases = [
    {
      label: '0-3 Months',
      subtitle: 'Quick Wins & Foundation',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/15',
      borderColor: 'border-emerald-500/30',
      items: scoring.pillarScores
        .filter(p => p.normalizedScore < 40)
        .slice(0, 2)
        .map(p => `Address critical gaps in ${p.pillarName} (${Math.round(p.normalizedScore)}%)`),
    },
    {
      label: '3-6 Months',
      subtitle: 'Building Capability',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/15',
      borderColor: 'border-amber-500/30',
      items: scoring.pillarScores
        .filter(p => p.normalizedScore >= 40 && p.normalizedScore < 65)
        .slice(0, 3)
        .map(p => `Strengthen ${p.pillarName} capabilities (${Math.round(p.normalizedScore)}%)`),
    },
    {
      label: '6-12 Months',
      subtitle: 'Scaling & Optimization',
      color: 'text-eari-blue-light',
      bgColor: 'bg-eari-blue/15',
      borderColor: 'border-eari-blue/30',
      items: scoring.pillarScores
        .filter(p => p.normalizedScore >= 65)
        .slice(0, 3)
        .map(p => `Scale and optimize ${p.pillarName} practices (${Math.round(p.normalizedScore)}%)`),
    },
  ]

  // Historical comparison — uses real assessment history when available
  const historicalData = [
    { label: 'Current', score: Math.round(scoring.overallScore), date: completedDate },
    ...(assessmentHistory.length >= 2 ? [{
      label: 'Previous',
      score: Math.round(assessmentHistory[assessmentHistory.length - 2].overallScore ?? 0),
      date: assessmentHistory[assessmentHistory.length - 2].completedAt
        ? new Date(assessmentHistory[assessmentHistory.length - 2].completedAt!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : 'N/A'
    }] : []),
    ...(assessmentHistory.length >= 3 ? [{
      label: 'First Assessment',
      score: Math.round(assessmentHistory[0].overallScore ?? 0),
      date: assessmentHistory[0].completedAt
        ? new Date(assessmentHistory[0].completedAt!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : 'N/A'
    }] : []),
  ]

  const tierConfig = TIER_CONFIG[userTier]
  const TierIcon = tierConfig.icon

  /* ─── Engine-derived data ───────────────────────────────────────────── */

  // Certification result (all tiers)
  const certificationResult = assessCertification(scoring.overallScore, scoring.pillarScores)
  const certificationBadge = getCertificationBadge(certificationResult.level)

  // Regulatory compliance (Pro+)
  const complianceGaps = assessComplianceGaps(scoring.pillarScores)
  const complianceSummary = getComplianceSummary(scoring.pillarScores)

  // Monitoring drift analysis (Pro+, requires 2+ assessments)
  const previousPillarScoresForDrift = assessmentHistory.length >= 2 && assessmentHistory[assessmentHistory.length - 2].pillarScores
    ? assessmentHistory[assessmentHistory.length - 2].pillarScores!.map(ps => {
        const pDef = PILLARS.find(p => p.id === ps.pillarId)
        return { pillarId: ps.pillarId, pillarName: pDef?.name ?? ps.pillarId, normalizedScore: ps.normalizedScore }
      })
    : null
  const driftAnalysis = previousPillarScoresForDrift ? analyzeDrift(
    scoring.pillarScores.map(p => ({ pillarId: p.pillarId, pillarName: p.pillarName, normalizedScore: p.normalizedScore })),
    previousPillarScoresForDrift
  ) : null
  const monitoringSchedule = driftAnalysis ? getRecommendedSchedule(scoring.overallScore, driftAnalysis.riskLevel) : null
  const monitoringAlerts = driftAnalysis ? generateAlerts(
    driftAnalysis,
    scoring.overallScore,
    assessmentHistory.length >= 2 ? assessmentHistory[assessmentHistory.length - 2].overallScore : null,
    certificationResult.certification.label
  ) : null

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      {/* Scroll progress indicator */}
      <div className="scroll-progress-bar" style={{ width: `${scrollProgress}%` }} />

      <Navigation />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">

          {/* ─── 1. HEADER SECTION — Premium Hero ──────────────────────── */}
          <FadeUp>
            <section className="relative">
              {/* Aurora border wrapper */}
              <div className="aurora-card rounded-2xl p-[1px]">
                <div className="hero-gradient-mesh rounded-2xl">
                  <div className="relative z-10 bg-navy-800/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 md:p-10">
                    <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                      <ScoreRing score={scoring.overallScore} maturityColor={scoring.maturityColor} pillarScores={scoring.pillarScores} />

                      <div className="text-center md:text-left flex-1">
                        <h1 className="font-heading text-4xl sm:text-5xl font-extrabold gradient-text-blue tracking-tight">
                          Assessment Results
                        </h1>
                        <p className="mt-2 text-muted-foreground font-sans">
                          Completed on {completedDate}
                        </p>
                        <div className="mt-4 flex items-center gap-3 justify-center md:justify-start flex-wrap">
                          <Badge className={`text-sm px-3 py-1 font-heading font-semibold border ${getMaturityBgClass(scoring.maturityBand)}`}>
                            {scoring.maturityLabel}
                          </Badge>
                          {assessment?.sector && assessment.sector !== 'general' && (
                            <Badge variant="outline" className="text-sm px-3 py-1 font-heading border-eari-blue/30 text-eari-blue-light">
                              <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                              {getSectorById(assessment.sector)?.name || assessment.sector}
                            </Badge>
                          )}
                          {/* Tier badge */}
                          <Badge variant="outline" className={`text-sm px-3 py-1 font-heading ${tierConfig.color} ${tierConfig.borderColor} ${tierConfig.bgColor}`}>
                            <TierIcon className="h-3.5 w-3.5 mr-1.5" />
                            {tierConfig.label} Plan
                          </Badge>
                          <span className="font-mono text-xs text-muted-foreground">
                            Scoring v{scoring.scoringVersion}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground font-sans leading-relaxed max-w-lg">
                          {getMaturityBandDescription(scoring.maturityBand)}
                        </p>
                        {/* Action buttons row */}
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <Button
                            onClick={handleRerun}
                            disabled={rerunning}
                            className="bg-gradient-to-r from-eari-blue to-cyan-600 hover:from-eari-blue-dark hover:to-cyan-700 text-white font-heading font-semibold h-10 px-5 text-sm shadow-lg shadow-eari-blue/20"
                            title="Pre-filled with your previous answers for quick updating"
                          >
                            {rerunning ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="mr-2 h-4 w-4" />
                            )}
                            Re-run Assessment
                          </Button>
                          <Link href={`/compliance/systems/new?assessmentId=${assessment.id}`}>
                            <Button
                              variant="outline"
                              className="border-eari-blue/40 text-eari-blue-light hover:bg-eari-blue/10 font-heading font-semibold h-10 px-5 text-sm"
                            >
                              <Scale className="mr-2 h-4 w-4" />
                              Move from readiness to compliance
                              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5 opacity-70" />
                            </Button>
                          </Link>
                          {/* Quarterly Review Countdown */}
                          {assessment.completedAt && (
                            <Badge
                              variant="outline"
                              className={`text-xs px-3 py-1.5 font-heading ${
                                (() => {
                                  const completedDate = new Date(assessment.completedAt)
                                  const nextReview = new Date(completedDate.getTime() + 90 * 24 * 60 * 60 * 1000)
                                  const daysLeft = Math.ceil((nextReview.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                                  if (daysLeft <= 0) return 'border-red-500/40 text-red-400 bg-red-500/10'
                                  if (daysLeft <= 14) return 'border-amber-500/40 text-amber-400 bg-amber-500/10'
                                  return 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                                })()
                              }`}
                            >
                              <Calendar className="h-3 w-3 mr-1.5" />
                              {(() => {
                                const completedDate = new Date(assessment.completedAt)
                                const nextReview = new Date(completedDate.getTime() + 90 * 24 * 60 * 60 * 1000)
                                const daysLeft = Math.ceil((nextReview.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                                return daysLeft <= 0
                                  ? 'Review overdue — re-run now'
                                  : `${daysLeft} days until next review`
                              })()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </FadeUp>

          {/* Section separator */}
          <div className="section-gradient-separator" />

          {/* ─── CERTIFICATION BADGE SECTION (All Tiers) ─────────────────── */}
          <FadeUp>
            <div className="aurora-card rounded-2xl p-[1px]">
              <Card className="bg-navy-800/90 backdrop-blur-sm border-0 rounded-2xl hover-lift">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-eari-blue/15">
                      <Award className="h-5 w-5 text-eari-blue-light" />
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
                            <span className="font-heading text-2xl font-extrabold" style={{ color: certificationResult.certification.color }}>
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
                            <TrendingUp className="h-4 w-4 text-eari-blue-light" />
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
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pillarDef?.color ?? '#8b949e' }} />
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
                        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 mt-3">
                          <div className="flex items-center gap-2">
                            <Award className="h-4 w-4 text-purple-400" />
                            <span className="font-heading text-sm font-semibold text-purple-400">
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

          {/* Section separator */}
          <div className="section-gradient-separator" />

          {/* ─── READINESS OVER TIME (Feature 1) ──────────────────────── */}
          <FadeUp delay={0.08}>
            <div className="aurora-card rounded-2xl p-[1px]">
              <Card className="bg-navy-800/90 backdrop-blur-sm border-0 rounded-2xl hover-lift">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-eari-blue/15">
                      <Activity className="h-5 w-5 text-eari-blue-light" />
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
                      <Loader2 className="h-6 w-6 animate-spin text-eari-blue-light" />
                    </div>
                  ) : assessmentHistory.length <= 1 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-eari-blue/10 border border-eari-blue/20">
                        <TrendingUp className="h-8 w-8 text-eari-blue-light/50" />
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
                        className="border-eari-blue/30 text-eari-blue-light hover:bg-eari-blue/10 font-heading text-sm mt-2"
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
                            <Line type="monotone" dataKey="overall" name="Overall" stroke="#2563eb" strokeWidth={3} dot={{ fill: '#2563eb', r: 4 }} activeDot={{ r: 6 }} />
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
                            {PILLARS.map(pillar => (
                              <Line
                                key={pillar.id}
                                type="monotone"
                                dataKey={pillar.id}
                                name={pillar.shortName}
                                stroke={pillar.color}
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
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pillarDef?.color ?? '#8b949e' }} />
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

          {/* Section separator */}
          <div className="section-gradient-separator" />

          {/* ─── TIER BADGE (read-only, from session) ───────────────────── */}
          <FadeUp delay={0.05}>
            <Card className="bg-navy-800/60 border-border/60 hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground font-sans">Your plan:</span>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-semibold ${tierConfig.bgColor} ${tierConfig.color} ${tierConfig.borderColor} border`}>
                    <TierIcon className="h-3.5 w-3.5" />
                    {tierConfig.label}
                  </div>
                  {userTier === 'free' && (
                    <Link href="/checkout?plan=professional" className="ml-auto">
                      <Button size="sm" className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading text-xs h-8 px-3">
                        <ArrowUpRight className="mr-1 h-3 w-3" />
                        Upgrade
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </FadeUp>

          {/* ─── AI AGENT PIPELINE STATUS ────────────────────────────────── */}
          {isPro && (
            <FadeUp delay={0.07}>
              <PipelineStatus assessmentId={id} />
            </FadeUp>
          )}

          {/* ─── FREE TIER UPGRADE BANNER ────────────────────────────────── */}
          {!isPro && (
            <FadeUp delay={0.1}>
              <div className="relative rounded-xl overflow-hidden hover-lift">
                <div className="absolute inset-0 rounded-xl p-[1px] bg-gradient-to-r from-eari-blue/30 via-amber-500/30 to-emerald-500/30" />
                <Card className="relative bg-navy-800 border-0 rounded-xl">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-eari-blue/15 flex-shrink-0">
                        <Sparkles className="h-5 w-5 text-eari-blue-light" />
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <p className="font-heading font-semibold text-foreground text-sm">
                          Unlock all 6 AI agents with Professional at $29/month
                        </p>
                        <p className="text-xs text-muted-foreground font-sans mt-0.5">
                          Get unlimited assessments, full AI narrative insights, PDF reports, benchmarking, and the interactive AI Assistant.
                        </p>
                      </div>
                      <Link href="/checkout?plan=professional">
                        <Button className="bg-gradient-to-r from-eari-blue to-eari-blue-dark hover:from-eari-blue-dark hover:to-eari-blue text-white font-heading font-semibold h-10 px-5 text-sm shadow-lg shadow-eari-blue/20 flex-shrink-0">
                          <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />
                          Upgrade to Pro
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </FadeUp>
          )}

          {/* ─── 2. MATURITY BAND — Aurora Card ──────────────────────────── */}
          <FadeUp delay={0.1}>
            <div className="aurora-card rounded-2xl p-[1px]">
              <Card className="bg-navy-800/90 backdrop-blur-sm border-0 rounded-2xl hover-lift">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-xl flex-shrink-0"
                      style={{ backgroundColor: `${scoring.maturityColor}20` }}
                    >
                      <span className="font-heading font-extrabold text-3xl count-up-animate" style={{ color: scoring.maturityColor }}>
                        {Math.round(scoring.overallScore)}
                      </span>
                    </div>
                    <div className="text-center sm:text-left flex-1">
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <h2 className="font-heading text-2xl font-bold text-foreground tracking-tight">
                          Maturity Classification: <span className="gradient-text-gold">{scoring.maturityLabel}</span>
                        </h2>
                        <Badge variant="outline" className="font-mono text-[10px] border-border text-muted-foreground">
                          {scoring.maturityBand === 'laggard' && '0-25'}
                          {scoring.maturityBand === 'follower' && '26-50'}
                          {scoring.maturityBand === 'chaser' && '51-75'}
                          {scoring.maturityBand === 'pacesetter' && '76-100'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground font-sans leading-relaxed">
                        {getMaturityBandDescription(scoring.maturityBand)}
                      </p>
                      {/* Band position progress bar */}
                      <div className="mt-3 max-w-md">
                        <div className="h-2 rounded-full maturity-band-progress overflow-hidden relative">
                          <motion.div
                            className="absolute top-0 h-full w-3 rounded-full bg-white/80 shadow-lg"
                            style={{ left: '0%' }}
                            initial={{ left: '0%' }}
                            animate={{ left: `${Math.min(97, Math.max(1, scoring.overallScore - 2))}%` }}
                            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="font-mono text-[9px] text-muted-foreground">0</span>
                          <span className="font-mono text-[9px] text-muted-foreground">25</span>
                          <span className="font-mono text-[9px] text-muted-foreground">50</span>
                          <span className="font-mono text-[9px] text-muted-foreground">75</span>
                          <span className="font-mono text-[9px] text-muted-foreground">100</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </FadeUp>

          {/* Section separator */}
          <div className="section-gradient-separator" />

          {/* ─── ENTERPRISE: EXECUTIVE SUMMARY (Print-Ready) ────────────── */}
          {isEnterprise && (
            <FadeUp>
              <Card className="bg-navy-800 border-amber-500/20 ring-1 ring-amber-500/10 hover-lift print:border-black print:bg-white print:text-black">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Landmark className="h-5 w-5 text-amber-400" />
                      <CardTitle className="font-heading text-2xl font-bold tracking-tight text-foreground">
                        Executive Summary
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] border-amber-500/30 text-amber-400">
                      Enterprise Exclusive
                    </Badge>
                  </div>
                  <CardDescription className="font-sans text-sm">
                    Print-ready executive overview for board and C-suite presentations
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                      <div>
                        <h4 className="font-heading text-sm font-semibold text-foreground mb-2">Overall Assessment</h4>
                        <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                          {insights?.executiveSummary ?? `Your organization's overall AI readiness score is ${Math.round(scoring.overallScore)}%, classified as "${scoring.maturityLabel}". This assessment reveals ${scoring.pillarScores.filter(p => p.normalizedScore >= 50).length} pillars at or above the developing threshold and ${scoring.pillarScores.filter(p => p.normalizedScore < 50).length} pillars requiring focused attention.`}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-navy-700/50">
                          <p className="text-[10px] text-muted-foreground font-heading uppercase tracking-wider">Strongest Pillar</p>
                          <p className="font-heading text-sm font-semibold text-emerald-400 mt-1">
                            {[...scoring.pillarScores].sort((a, b) => b.normalizedScore - a.normalizedScore)[0]?.pillarName}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-navy-700/50">
                          <p className="text-[10px] text-muted-foreground font-heading uppercase tracking-wider">Weakest Pillar</p>
                          <p className="font-heading text-sm font-semibold text-red-400 mt-1">
                            {[...scoring.pillarScores].sort((a, b) => a.normalizedScore - b.normalizedScore)[0]?.pillarName}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="text-center p-4 rounded-lg bg-navy-700/50">
                        <p className="font-heading text-4xl font-bold" style={{ color: scoring.maturityColor }}>
                          {Math.round(scoring.overallScore)}
                        </p>
                        <p className="text-xs text-muted-foreground font-sans mt-1">Overall Score</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-navy-700/50">
                        <p className="font-heading text-sm font-semibold text-foreground">{scoring.maturityLabel}</p>
                        <p className="text-[10px] text-muted-foreground font-sans mt-0.5">Maturity Band</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeUp>
          )}

          {/* ─── 3. PILLAR SCORE CARDS ──────────────────────────────────── */}
          <section>
            <FadeUp>
              <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground mb-6">
                Pillar Scores
              </h2>
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
                />
              ))}
            </div>
          </section>

          {/* Section separator */}
          <div className="section-gradient-separator" />

          {/* ─── REGULATORY COMPLIANCE SECTION (Pro+, locked for Free) ────── */}
          {isPro ? (
            <FadeUp>
              <div className="aurora-card rounded-2xl p-[1px]">
                <Card className="bg-navy-800/90 backdrop-blur-sm border-0 rounded-2xl hover-lift">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-eari-blue/15">
                        <Landmark className="h-5 w-5 text-eari-blue-light" />
                      </div>
                      <div>
                        <CardTitle className="font-heading text-xl font-bold tracking-tight text-foreground">
                          Regulatory Compliance
                        </CardTitle>
                        <CardDescription className="font-sans text-sm">
                          Gap analysis against EU AI Act, NIST AI RMF, and ISO 42001
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="ml-auto text-[10px] font-mono border-eari-blue/30 text-eari-blue-light">
                        Professional
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* 3 Regulation Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      {complianceSummary.map(summary => {
                        const regColor = summary.regulation === 'EU AI Act'
                          ? '#3b82f6'
                          : summary.regulation === 'NIST AI RMF'
                            ? '#8b5cf6'
                            : '#06b6d4'
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
                                  {summary.complianceRate}%
                                </span>
                              </div>
                              <div className="h-2 rounded-full bg-navy-700 overflow-hidden">
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: regColor }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${summary.complianceRate}%` }}
                                  transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                                />
                              </div>
                            </div>
                            {/* Stats row */}
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-muted-foreground font-sans">
                                {summary.compliantCount}/{summary.totalRelevant} compliant
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
                                  <button className="flex items-center gap-1 text-[10px] text-eari-blue-light hover:text-eari-blue font-heading transition-colors w-full">
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

          {/* Section separator */}
          <div className="section-gradient-separator" />

          {/* ─── MONITORING / READINESS TRACKING SECTION (Pro+) ─────────── */}
          {isPro ? (
            <FadeUp>
              <div className="aurora-card rounded-2xl p-[1px]">
                <Card className="bg-navy-800/90 backdrop-blur-sm border-0 rounded-2xl hover-lift">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-eari-blue/15">
                        <Activity className="h-5 w-5 text-eari-blue-light" />
                      </div>
                      <div>
                        <CardTitle className="font-heading text-xl font-bold tracking-tight text-foreground">
                          Readiness Monitoring
                        </CardTitle>
                        <CardDescription className="font-sans text-sm">
                          Drift detection, risk tracking, and monitoring schedule
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="ml-auto text-[10px] font-mono border-eari-blue/30 text-eari-blue-light">
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
                            <p className={`font-heading text-2xl font-extrabold ${
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
                                <Clock className="h-5 w-5 text-eari-blue-light" />
                                <span className="font-heading text-sm font-semibold text-foreground">Schedule</span>
                              </div>
                              <p className="font-heading text-lg font-bold text-eari-blue-light capitalize">
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
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pillarDef?.color ?? '#8b949e' }} />
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
                              <Bell className="h-4 w-4 text-eari-blue-light" />
                              <h4 className="font-heading text-sm font-semibold text-foreground">
                                Active Alerts
                              </h4>
                              <Badge variant="outline" className="text-[9px] font-mono border-eari-blue/30 text-eari-blue-light">
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
                                          : 'border-eari-blue/30 text-eari-blue-light'
                                    }`}>
                                      {alert.severity}
                                    </Badge>
                                    <span className="font-heading text-xs font-semibold text-foreground">{alert.title}</span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground font-sans leading-snug">{alert.description}</p>
                                  <p className="text-[9px] text-eari-blue-light/70 font-sans mt-1">💡 {alert.recommendation}</p>
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
                          <Activity className="h-8 w-8 text-eari-blue-light/50" />
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
                          className="border-eari-blue/30 text-eari-blue-light hover:bg-eari-blue/10 font-heading text-sm mt-2"
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

          {/* Section separator */}
          <div className="section-gradient-separator" />

          {/* ─── AI PULSE: CONTINUOUS MONITORING ──────────────────────────────── */}
          <FadeUp delay={0.08}>
            <div className="aurora-card rounded-2xl p-[1px]">
              <Card className="bg-navy-800/90 backdrop-blur-sm border-0 rounded-2xl hover-lift">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-eari-blue/15 relative">
                      <Activity className="h-5 w-5 text-eari-blue-light" />
                      {/* Pulse dot */}
                      <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-eari-blue-light opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-eari-blue-light" />
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
                      <Button className="bg-gradient-to-r from-eari-blue to-eari-blue-dark hover:from-eari-blue-dark hover:to-eari-blue text-white font-heading font-semibold h-9 px-4 text-sm shadow-lg shadow-eari-blue/20">
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
                      <Loader2 className="h-6 w-6 animate-spin text-eari-blue-light" />
                    </div>
                  ) : pulseData ? (
                    <div className="space-y-4">
                      {/* Pulse Score Summary */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-navy-700/40 border border-border/20 text-center">
                          <p className="font-heading text-3xl font-extrabold text-eari-blue-light">{Math.round(pulseData.overallScore)}%</p>
                          <p className="text-xs text-muted-foreground font-sans mt-1">Pulse Score</p>
                          <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{pulseData.month}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-navy-700/40 border border-border/20 text-center">
                          {typeof pulseData.overallDelta === 'number' && Number.isFinite(pulseData.overallDelta) ? (
                            <>
                              <p className={`font-heading text-3xl font-extrabold ${pulseData.overallDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
                          <p className="font-heading text-3xl font-extrabold text-amber-400">{pulseData.scoreChanges.length}</p>
                          <p className="text-xs text-muted-foreground font-sans mt-1">Score Changes</p>
                        </div>
                      </div>

                      {/* Score Changes from Pulse */}
                      {pulseData.scoreChanges.length > 0 && (
                        <div>
                          <h4 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 text-eari-blue-light" />
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
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pillarDef?.color ?? '#8b949e' }} />
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
                            <RefreshCw className="h-4 w-4 text-eari-blue-light" />
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
                          <Button variant="outline" size="sm" className="border-eari-blue/30 text-eari-blue-light hover:bg-eari-blue/10 font-heading text-xs h-8">
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
                            <RefreshCw className="h-4 w-4 text-eari-blue-light" />
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-eari-blue/15">
                          <Activity className="h-5 w-5 text-eari-blue-light" />
                        </div>
                        <div className="flex-1">
                          <p className="font-heading text-sm font-semibold text-foreground">Start tracking your readiness over time</p>
                          <p className="text-xs text-muted-foreground font-sans mt-0.5">
                            Run your first AI Pulse to establish a baseline and enable drift detection with monthly monitoring.
                          </p>
                        </div>
                        <Link href="/pulse">
                          <Button variant="outline" size="sm" className="border-eari-blue/30 text-eari-blue-light hover:bg-eari-blue/10 font-heading text-xs h-8">
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

          {/* Section separator */}
          <div className="section-gradient-separator" />

          {/* ─── 4. RADAR CHART — Holographic Display ──────────────────── */}
          <FadeUp>
            <div className="aurora-card rounded-2xl p-[1px]">
              <Card className="bg-navy-800/90 backdrop-blur-sm border-0 rounded-2xl hover-lift">
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
                          stroke="#3b82f6"
                          fill="#3b82f6"
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

          {/* Section separator */}
          <div className="section-gradient-separator" />

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

          {/* Section separator */}
          <div className="section-gradient-separator" />

          {/* ─── 6. AI STRATEGIC INSIGHTS SECTION ───────────────────────── */}
          <section>
            <FadeUp>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                  Strategic Insights
                </h2>
                {insights && isPro && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono ${
                      insights.isAIGenerated
                        ? 'border-eari-blue/40 text-eari-blue-light'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    {insights.isAIGenerated ? 'AI-Assisted Narrative' : 'Calculated from Responses'}
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
                            <Info className="h-4 w-4 text-eari-blue-light" />
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

                    {/* Recommended Next Steps */}
                    <FadeUp delay={0.25}>
                      <Card className="bg-navy-800 border-border/50 hover-lift">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-2 mb-4">
                            <h3 className="font-heading font-semibold text-foreground tracking-tight">
                              Recommended Next Steps
                            </h3>
                            {insightsFallback && (
                              <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-400">
                                Fallback Analysis
                              </Badge>
                            )}
                          </div>
                          <ol className="space-y-3">
                            {insights.nextSteps.map((step, i) => (
                              <li key={i} className="flex items-start gap-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-eari-blue/15 text-eari-blue-light font-heading text-xs font-semibold flex-shrink-0 mt-0.5">
                                  {i + 1}
                                </span>
                                <span className="text-sm text-foreground font-sans leading-relaxed">
                                  {step}
                                </span>
                              </li>
                            ))}
                          </ol>
                        </CardContent>
                      </Card>
                    </FadeUp>

                    {/* Pillar Drilldown — per-pillar strongest/weakest questions */}
                    {insights.pillarDrilldown && insights.pillarDrilldown.length > 0 && (
                      <FadeUp delay={0.3}>
                        <Card className="bg-navy-800 border-border/50 hover-lift">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                              <Brain className="h-4 w-4 text-eari-blue-light" />
                              <h3 className="font-heading font-semibold text-foreground tracking-tight">
                                Pillar Drilldown
                              </h3>
                              <span className="text-xs text-muted-foreground font-sans ml-1">
                                — Strongest & weakest questions per pillar
                              </span>
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
                          className="border-eari-blue/30 text-eari-blue-light hover:bg-eari-blue/10 font-heading text-xs mt-2"
                        >
                          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
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
                          <Sparkles className="h-4 w-4 text-eari-blue-light" />
                          <h3 className="font-heading font-semibold text-foreground tracking-tight">
                            AI Insight Summary
                          </h3>
                          <Badge variant="outline" className="ml-auto text-[10px] font-mono border-eari-blue/30 text-eari-blue-light">
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

          {/* Section separator */}
          <div className="section-gradient-separator" />

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
                  <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground mb-6">
                    Interdependency Adjustments
                  </h2>
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
                                <Badge variant="outline" className="font-mono text-[10px] border-amber-500/30 text-amber-400">
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

          {/* ─── AI LITERACY SCORE INTEGRATION ──────────────────────── */}
          {(isPro || userTier === 'free') && (
            <FadeUp>
              <Card className="bg-navy-800 border-eari-blue/20 hover-lift">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-eari-blue-light" />
                    <CardTitle className="font-heading text-lg text-foreground">
                      AI Literacy Assessment
                    </CardTitle>
                    <Badge variant="outline" className="ml-auto text-[10px] font-mono border-eari-blue/30 text-eari-blue-light">
                      {isPro ? 'Professional' : 'Starter'}
                    </Badge>
                  </div>
                  <CardDescription className="font-sans text-sm">
                    Measure your team&apos;s understanding of AI capabilities and limitations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Derive literacy scores from relevant pillar scores */}
                  {(() => {
                    const literacyCategories = [
                      { label: 'AI Fundamentals', pillarId: 'technology', color: '#3b82f6', description: 'Based on Technology & Infrastructure readiness' },
                      { label: 'AI in Practice', pillarId: 'process', color: '#8b5cf6', description: 'Based on Process & Workflow maturity' },
                      { label: 'AI Ethics & Governance', pillarId: 'governance', color: '#06b6d4', description: 'Based on Governance & Compliance posture' },
                      { label: 'Data & Infrastructure', pillarId: 'data', color: '#14b8a6', description: 'Based on Data & Analytics readiness' },
                      { label: 'AI Strategy & Leadership', pillarId: 'strategy', color: '#d4a853', description: 'Based on Strategy & Vision alignment' },
                    ]
                    const categoryScores = literacyCategories.map(cat => {
                      const pillarScore = scoring.pillarScores.find(p => p.pillarId === cat.pillarId)
                      return { ...cat, score: pillarScore ? Math.round(pillarScore.normalizedScore) : 0 }
                    })
                    const avgScore = Math.round(categoryScores.reduce((s, c) => s + c.score, 0) / categoryScores.length)
                    const weakestCat = [...categoryScores].sort((a, b) => a.score - b.score)[0]
                    return (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-6">
                          {categoryScores.map((item) => (
                            <div key={item.label} className="p-3 rounded-lg bg-navy-700/50 border border-border/20">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-heading text-[10px] font-semibold text-foreground truncate" title={item.label}>{item.label}</p>
                                <span className="font-mono text-xs font-bold" style={{ color: item.color }}>{item.score}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-navy-700 overflow-hidden">
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: item.color }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.score}%` }}
                                  transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                                />
                              </div>
                              <p className="text-[9px] text-muted-foreground/60 font-sans mt-1" title={item.description}>{item.pillarId}</p>
                            </div>
                          ))}
                        </div>
                        {/* Overall literacy summary */}
                        <div className="p-4 rounded-lg bg-navy-700/30 border border-eari-blue/10 flex items-center gap-4 mb-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-eari-blue/15">
                            <span className="font-heading text-lg font-extrabold text-eari-blue-light">{avgScore}</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-heading text-sm font-semibold text-foreground">Overall AI Literacy Score: {avgScore}%</p>
                            <p className="text-xs text-muted-foreground font-sans">
                              Weakest area: <span style={{ color: weakestCat.color }}>{weakestCat.label}</span> at {weakestCat.score}% — targeted training recommended.
                            {weakestCat.score < 50 && ' This gap may be contributing to lower readiness scores across related pillars.'}
                            </p>
                          </div>
                        </div>
                      </>
                    )
                  })()}
                  {(() => {
                    // Build literacy URL with weak pillar context for targeted training
                    const literacyCategories = [
                      { label: 'AI Fundamentals', pillarId: 'technology', quizId: 'fundamentals', color: '#3b82f6' },
                      { label: 'AI in Practice', pillarId: 'process', quizId: 'practice', color: '#8b5cf6' },
                      { label: 'AI Ethics & Governance', pillarId: 'governance', quizId: 'ethics', color: '#06b6d4' },
                      { label: 'Data & Infrastructure', pillarId: 'data', quizId: 'data', color: '#14b8a6' },
                      { label: 'AI Strategy & Leadership', pillarId: 'strategy', quizId: 'strategy', color: '#d4a853' },
                    ]
                    const catScores = literacyCategories.map(cat => {
                      const ps = scoring.pillarScores.find(p => p.pillarId === cat.pillarId)
                      return { ...cat, score: ps ? Math.round(ps.normalizedScore) : 0 }
                    })
                    const weakPillars = catScores
                      .filter(c => c.score < 60)
                      .sort((a, b) => a.score - b.score)
                      .map(c => c.quizId)
                    const weakestQuiz = [...catScores].sort((a, b) => a.score - b.score)[0]
                    const focusParam = weakPillars.length > 0 ? `&focus=${weakPillars.join(',')}` : `&focus=${weakestQuiz.quizId}`
                    const literacyUrl = `/literacy?from=results&weak=${weakestQuiz.quizId}${focusParam}`
                    return (
                      <div className="flex items-center gap-3">
                        <Link href={literacyUrl}>
                          <Button variant="outline" className="border-eari-blue/30 text-eari-blue-light hover:bg-eari-blue/10 font-heading text-sm">
                            <Brain className="mr-2 h-4 w-4" />
                            Take AI Literacy Quiz
                          </Button>
                        </Link>
                        <Link href="/literacy/roles">
                          <Button variant="ghost" className="text-muted-foreground hover:text-foreground font-heading text-sm">
                            <UsersRound className="mr-2 h-4 w-4" />
                            Role-Based Insights
                          </Button>
                        </Link>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            </FadeUp>
          )}

          {/* ─── ENTERPRISE: ROLE-SPECIFIC EXECUTIVE BRIEF ────────────────── */}
          {isEnterprise && (
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
                      { role: 'CEO', insight: strategyScore < 50 ? `Strategic alignment at ${Math.round(strategyScore)}% — invest in governance framework before scaling technology for estimated ${govScore < 50 ? '2.4x' : '3.8x'} ROI within 18 months` : `Strategy at ${Math.round(strategyScore)}% — strong foundation. Scale investment in 2-3 high-impact use cases to accelerate competitive advantage`, color: '#d4a853', score: strategyScore },
                      { role: 'CTO', insight: techScore < 60 ? `Technology at ${Math.round(techScore)}% — MLOps maturity gaps in model monitoring and drift detection. Prioritize feature store and canary deployments` : `Technology at ${Math.round(techScore)}% — solid platform. Focus on expanding workload coverage and automating retraining pipelines`, color: '#3b82f6', score: techScore },
                      { role: 'CFO', insight: `AI budget alignment: ${govScore < 50 ? 'governance' : 'technology'} and ${talentScore < 50 ? 'talent' : 'data'} are ${govScore < 50 || talentScore < 50 ? 'underweighted vs. benchmarks' : 'well-allocated'}. Rebalancing could increase ROI by 40-60%`, color: '#22c55e', score: Math.round((strategyScore + govScore + talentScore) / 3) },
                      { role: 'CISO', insight: secScore < 60 ? `Security at ${Math.round(secScore)}% — AI attack surface is high. Adversarial testing and model access controls needed before expanding deployments` : `Security at ${Math.round(secScore)}% — adequate controls. Maintain vigilance with ongoing AI-specific security assessments`, color: '#ef4444', score: secScore },
                      { role: 'CHRO', insight: talentScore < 50 ? `Talent at ${Math.round(talentScore)}% — AI literacy gaps are the single largest readiness barrier. Launch enterprise-wide training targeting 70% proficiency` : `Talent at ${Math.round(talentScore)}% — develop AI career paths and retention strategies to maintain competitive advantage`, color: '#ec4899', score: talentScore },
                      { role: 'COO', insight: procScore < 50 ? `Process at ${Math.round(procScore)}% — limited AI process integration. Systematic audit could identify ${Math.round(100 - procScore)}% more automation opportunities` : `Process at ${Math.round(procScore)}% — expand human-in-the-loop controls and standardize KPIs for AI-powered operations`, color: '#14b8a6', score: procScore },
                    ]
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {roleInsights.map((item) => (
                          <div key={item.role} className="p-3 rounded-lg bg-navy-700/50 border border-border/20 hover:border-border/40 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-heading text-xs font-bold" style={{ color: item.color }}>{item.role}</span>
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

          {/* ─── PRO: HISTORICAL COMPARISON ──────────────────────────────── */}
          {isPro && (
            <FadeUp>
              <Card className="bg-navy-800 border-border/50 hover-lift">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-eari-blue-light" />
                    <CardTitle className="font-heading text-lg text-foreground">
                      Historical Comparison
                    </CardTitle>
                    <Badge variant="outline" className="ml-auto text-[10px] font-mono border-eari-blue/30 text-eari-blue-light">
                      Professional
                    </Badge>
                  </div>
                  <CardDescription className="font-sans text-sm">
                    Track your AI readiness progress over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {historicalData.map((entry, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-28 flex-shrink-0">
                          <p className="font-heading text-sm font-semibold text-foreground">{entry.label}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{entry.date}</p>
                        </div>
                        <div className="flex-1">
                          <div className="h-8 rounded-lg bg-navy-700 overflow-hidden relative">
                            <motion.div
                              className="h-full rounded-lg flex items-center px-3"
                              style={{
                                backgroundColor: i === 0 ? `${scoring.maturityColor}30` : 'rgba(139,148,158,0.15)',
                              }}
                              initial={{ width: 0 }}
                              animate={{ width: `${entry.score}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 + i * 0.15 }}
                            >
                              <span className="font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                                {entry.score}%
                              </span>
                            </motion.div>
                          </div>
                        </div>
                        {i === 0 && historicalData.length > 1 && (
                          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 font-mono flex-shrink-0">
                            +{entry.score - historicalData[1].score}%
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </FadeUp>
          )}

          {/* ─── Free: Locked Historical Comparison ──────────────────────── */}
          {!isPro && (
            <LockedSectionCard
              title="Historical Comparison"
              description="Compare your current scores against previous assessments to track your AI readiness progress over time."
              requiredTier="professional"
              onUpgrade={() => router.push('/pricing')}
              previewContent={
                <div className="space-y-3">
                  <div className="h-6 w-24 bg-navy-700 rounded" />
                  <div className="h-8 w-full bg-navy-700 rounded-lg" />
                  <div className="h-6 w-20 bg-navy-700 rounded" />
                  <div className="h-8 w-3/4 bg-navy-700 rounded-lg" />
                </div>
              }
            />
          )}

          {/* ─── PRO: RECOMMENDATION PRIORITY MATRIX ────────────────────── */}
          {isPro && (
            <FadeUp>
              <Card className="bg-navy-800 border-border/50 hover-lift">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-eari-blue-light" />
                    <CardTitle className="font-heading text-lg text-foreground">
                      Recommendation Priority Matrix
                    </CardTitle>
                    <Badge variant="outline" className="ml-auto text-[10px] font-mono border-eari-blue/30 text-eari-blue-light">
                      Professional
                    </Badge>
                  </div>
                  <CardDescription className="font-sans text-sm">
                    Pillars plotted by improvement impact vs. estimated implementation effort
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-[350px] sm:h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(48,57,74,0.4)" />
                        <XAxis
                          type="number"
                          dataKey="impact"
                          name="Impact"
                          domain={[0, 100]}
                          tick={{ fill: '#8b949e', fontSize: 11 }}
                          axisLine={{ stroke: 'rgba(48,57,74,0.4)' }}
                          tickLine={{ stroke: 'rgba(48,57,74,0.4)' }}
                          label={{ value: 'Impact →', position: 'insideBottomRight', offset: -5, fill: '#8b949e', fontSize: 11 }}
                        />
                        <YAxis
                          type="number"
                          dataKey="effort"
                          name="Effort"
                          domain={[0, 100]}
                          tick={{ fill: '#8b949e', fontSize: 11 }}
                          axisLine={{ stroke: 'rgba(48,57,74,0.4)' }}
                          tickLine={{ stroke: 'rgba(48,57,74,0.4)' }}
                          label={{ value: '← Effort', angle: -90, position: 'insideBottomLeft', offset: 10, fill: '#8b949e', fontSize: 11 }}
                        />
                        <ZAxis type="number" dataKey="score" range={[80, 400]} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload || payload.length === 0) return null
                            const d = payload[0].payload as { fullLabel: string; score: number; impact: number; effort: number }
                            return (
                              <div className="bg-navy-800 border border-border/60 rounded-lg px-3 py-2 shadow-xl">
                                <p className="font-heading text-sm text-foreground font-semibold">{d.fullLabel}</p>
                                <p className="font-mono text-xs text-muted-foreground">Score: {d.score}%</p>
                                <p className="font-mono text-xs text-muted-foreground">Impact: {d.impact}</p>
                                <p className="font-mono text-xs text-muted-foreground">Effort: {d.effort}</p>
                              </div>
                            )
                          }}
                        />
                        <Scatter data={priorityMatrixData} fill="#3b82f6" fillOpacity={0.7} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Quadrant labels */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <p className="font-heading text-xs font-semibold text-emerald-400">High Impact, Low Effort</p>
                      <p className="text-[10px] text-muted-foreground font-sans mt-0.5">Quick wins — prioritize first</p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="font-heading text-xs font-semibold text-amber-400">High Impact, High Effort</p>
                      <p className="text-[10px] text-muted-foreground font-sans mt-0.5">Strategic investments — plan carefully</p>
                    </div>
                    <div className="p-3 rounded-lg bg-navy-700/50 border border-border/30">
                      <p className="font-heading text-xs font-semibold text-muted-foreground">Low Impact, Low Effort</p>
                      <p className="text-[10px] text-muted-foreground font-sans mt-0.5">Fill-in tasks — address when convenient</p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="font-heading text-xs font-semibold text-red-400">Low Impact, High Effort</p>
                      <p className="text-[10px] text-muted-foreground font-sans mt-0.5">Deprioritize — limited ROI</p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-navy-700/30 border border-border/20">
                    <div className="flex items-start gap-2">
                      <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-[10px] text-muted-foreground font-sans leading-relaxed">
                        Effort estimates are derived from your score profile and industry patterns. Impact is calculated as improvement potential (100 minus current score). Actual implementation effort may vary based on organizational context.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeUp>
          )}

          {/* ─── SECTOR BENCHMARK SECTION (Enhanced) ────────────────────────── */}
          <FadeUp>
            <div className="aurora-card rounded-2xl p-[1px]">
              <Card className="bg-navy-800/90 backdrop-blur-sm border-0 rounded-2xl hover-lift">
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
                      <div className="p-5 bg-gradient-to-r from-eari-blue/5 to-cyan-500/5">
                        <div className="flex items-start gap-3 mb-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-eari-blue/15 flex-shrink-0">
                            <Shield className="h-5 w-5 text-eari-blue-light" />
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
                            className="bg-gradient-to-r from-eari-blue to-eari-blue-dark hover:from-eari-blue-dark hover:to-eari-blue text-white font-heading font-semibold h-9 px-5 text-sm shadow-lg shadow-eari-blue/20"
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
                      <Loader2 className="h-6 w-6 animate-spin text-eari-blue-light" />
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
                          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/5 to-eari-blue/5 border border-amber-500/15">
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
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pillarDef?.color ?? '#8b949e' }} />
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
                                  style={{ backgroundColor: pillarDef?.color ?? '#8b949e' }}
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
                          className="bg-gradient-to-r from-eari-blue to-eari-blue-dark hover:from-eari-blue-dark hover:to-eari-blue text-white font-heading font-semibold h-9 px-5 text-sm shadow-lg shadow-eari-blue/20"
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
                    <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/40 via-amber-500/40 to-eari-blue/40" />

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

          {/* ─── ENTERPRISE: TEAM / ORG COMPARISON ───────────────────────── */}
          {isEnterprise && (
            <FadeUp>
              <Card className="bg-navy-800 border-amber-500/20 hover-lift">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <UsersRound className="h-5 w-5 text-amber-400" />
                    <CardTitle className="font-heading text-lg text-foreground">
                      Multi-Organization Comparison
                    </CardTitle>
                    <Badge variant="outline" className="ml-auto text-[10px] font-mono border-amber-500/30 text-amber-400">
                      Enterprise
                    </Badge>
                  </div>
                  <CardDescription className="font-sans text-sm">
                    Compare readiness across your organization&apos;s business units or teams
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
                  onClick={handleExportPDF}
                  disabled={exporting}
                  className="bg-gradient-to-r from-eari-blue to-eari-blue-dark hover:from-eari-blue-dark hover:to-eari-blue text-white font-heading font-semibold h-12 px-6 shadow-lg shadow-eari-blue/20"
                >
                  {exporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Export Report (.docx)
                </Button>
              ) : (
                <Button
                  disabled
                  className="bg-navy-700 text-muted-foreground font-heading font-semibold h-12 px-6 cursor-not-allowed relative group"
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Export Report
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-navy-800 text-eari-blue-light text-[10px] font-sans px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-eari-blue/20">
                    Upgrade to Professional
                  </span>
                </Button>
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

        </div>
      </main>

      <Footer />

      {/* AI Agent Assistant Panel */}
      <AgentPanel
        sector={assessment?.sector || 'general'}
        pillarScores={scoring.pillarScores.map((p) => ({
          pillarId: p.pillarId,
          score: Math.round(p.normalizedScore),
          maturityLabel: p.maturityLabel,
        }))}
        overallScore={Math.round(scoring.overallScore)}
        orgContext={assessment ? undefined : undefined}
        isOpen={agentOpen}
        onOpenChange={setAgentOpen}
      />

      <AIAssistant userTier={userTier} />
    </div>
  )
}
