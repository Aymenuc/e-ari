'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
  Sparkles,
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
import { ComplianceOutlook } from '@/components/shared/compliance-outlook'
import { PillarEvidenceChip } from '@/components/shared/pillar-evidence-chip'
import type { ProgressionState } from '@/lib/progression'
import type { ComplianceOutlook as ComplianceOutlookModel } from '@/lib/compliance-outlook'
import { AdvancedInsights } from '@/components/shared/advanced-insights'
import { PILLARS, MATURITY_BANDS, type MaturityBand } from '@/lib/pillars'
import { getSectorById } from '@/lib/sectors'
import type { ScoringResult, PillarScoreResult, AdjustmentRecord } from '@/lib/assessment-engine'
import type { XRayFinding, PatternSeverity } from '@/lib/scoring-patterns'
import type { AIInsightResult } from '@/lib/ai-insights'
import { assessCertification, getCertificationBadge } from '@/lib/certification'
import { assessComplianceGaps, getComplianceSummary } from '@/lib/regulatory-mapping'
import { analyzeDrift, generateAlerts, getRecommendedSchedule } from '@/lib/monitoring-engine'
import { getVocab, type EntityType } from '@/lib/entity-types'
import { LeverageMoves } from '@/components/shared/leverage-moves'
import { ResultsTabs } from '@/components/shared/results-tabs'
import { OverviewSpread } from '@/components/shared/overview-spread'
import { WhatThisMeans } from '@/components/results/what-this-means'
import { WhatThisGivesYou } from '@/components/results/what-this-gives-you'
import { RegisterSystems } from '@/components/results/register-systems'
import {
  TIER_CONFIG, ICON_MAP, PillarCard, LockedSectionCard, BarChartTooltip,
  getMaturityBandColor, getMaturityBgClass, scoreRampColor,
} from '@/components/results/shared'
import { ComplianceTab } from '@/components/results/compliance-tab'
import { MonitoringTab } from '@/components/results/monitoring-tab'
import { ProgrammeHeader } from '@/components/results/programme-header'
import { FindingsTab } from '@/components/results/findings-tab'
import { BenchmarkTab } from '@/components/results/benchmark-tab'
import { CertificationTab } from '@/components/results/certification-tab'
import { PlanExtras } from '@/components/results/plan-extras'
import { scoreRamp } from '@/lib/score-ramp'

/** Single accent for chart marks — the bright end of the score ramp, so
    charts and score bars read as one visual language. */
const CHART_ACCENT = '#38bdf8'

/* ─── Report views — one reader-job per tab (replaces the 18k-px scroll) ── */
const RESULTS_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'action', label: 'Action Plan' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'findings', label: 'Insights & Findings' },
  { id: 'benchmark', label: 'Benchmark' },
  { id: 'certification', label: 'Certification' },
]

/** Operate-tier tab, inserted after Compliance. */
const MONITORING_TAB = { id: 'monitoring', label: 'Monitoring' }

/* ─── Tier Types ──────────────────────────────────────────────────────── */

type UserTier = 'free' | 'professional' | 'growth' | 'autopilot' | 'enterprise'

/**
 * What a tier is allowed to do, as a rank rather than a name.
 *
 * The page used to gate on `isPro`, one boolean spanning every paid tier, so
 * there were two experiences for five tiers — and a second gate that tested
 * `userTier === 'enterprise'` by name, which silently excluded `autopilot`
 * even though autopilot outranks growth and costs considerably more. Comparing
 * rank means a new tier slots in by editing this map alone.
 *
 * The three ranks are the product promise, not arbitrary numbers:
 *   0 read    — understand where you stand          (a mirror)
 *   1 map     — know what to fix, and what it wins  (a map)
 *   2 operate — run it over time and prove it moved (a control panel)
 */
const TIER_RANK: Record<UserTier, number> = {
  free: 0, professional: 1, growth: 1, autopilot: 2, enterprise: 2,
}


/* ─── Icon map ─────────────────────────────────────────────────────────── */


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


/* Score → colour on one cool ramp (matches the methodology radar):
   40 → muted steel, 85 → bright cyan. Replaces the eight per-pillar hues. */

/* ─── Maturity helpers ─────────────────────────────────────────────────── */


function getMaturityBandDescription(band: MaturityBand): string {
  return MATURITY_BANDS[band]?.description ?? ''
}

const REVIEW_CYCLE_DAYS = 90

/**
 * Next-review chip. Colour is spent only on urgency that is actually
 * actionable — overdue, or close enough to plan around. A review three months
 * out is simply not news, so the default state stays neutral rather than
 * congratulating the user in green for having done nothing yet.
 */
function reviewStatus(completedAt: string | Date): { cls: string; label: string } {
  const due = new Date(completedAt).getTime() + REVIEW_CYCLE_DAYS * 86_400_000
  const daysLeft = Math.ceil((due - Date.now()) / 86_400_000)
  if (daysLeft <= 0) return { cls: 'border-red-500/40 text-red-400 bg-red-500/10', label: 'Review overdue — re-run now' }
  if (daysLeft <= 14) return { cls: 'border-amber-500/40 text-amber-400 bg-amber-500/10', label: `${daysLeft} days until next review` }
  return { cls: 'border-white/[0.12] text-slate-400 bg-white/[0.03]', label: `${daysLeft} days until next review` }
}

/* The band pill sits inches from the score ring and the pillar bars, which
   both draw from the cool ordinal ramp. Giving it a red/amber/blue/green
   traffic light made one number look like it had two colour systems. */

/* ─── Custom Tooltip for Bar Chart ─────────────────────────────────────── */


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
          background: `radial-gradient(circle, ${maturityColor}12 0%, transparent 72%)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      {/* Shares view-transition-name with the scoring overlay's figure, so a
          browser that supports the API morphs the number into this ring rather
          than cutting between two pages. Ignored everywhere else. */}
      <svg
        width="220" height="220" viewBox="0 0 220 220"
        style={{ viewTransitionName: 'eari-score' }}
        aria-label={`Overall readiness score: ${Math.round(score)} out of 100`}
      >
        <defs>
          <linearGradient id="scoreRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={maturityColor} />
            <stop offset="100%" stopColor={maturityColor} stopOpacity={0.82} />
          </linearGradient>
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
        />
        {/* Score number */}
        <motion.text
          x="110"
          y="98"
          textAnchor="middle"
          fill="#e6edf3"
          fontSize="48"
          fontWeight="700"
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
        // Colour by SCORE (same cool ramp as the methodology radar), not by
        // the pillar's brand colour — Governance's red brand hue made a
        // top-3 strength chip read as an alarm.
        const t = Math.max(0, Math.min(1, (metric.normalizedScore - 40) / 45))
        const color = `rgb(${Math.round(0x3a + (0x38 - 0x3a) * t)}, ${Math.round(0x52 + (0xbd - 0x52) * t)}, ${Math.round(0x74 + (0xf8 - 0x74) * t)})`
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


/* ─── Pillar Card Component ────────────────────────────────────────────── */


/* ═══════════════════════════════════════════════════════════════════════════
   MAIN RESULTS PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * The whole results experience, as a component.
 *
 * It used to be a route and nothing else, which is why finishing an assessment
 * meant leaving the page you were working in. Taking the id as a prop lets the
 * assessment hub render it inline the moment scoring lands, while /results/[id]
 * keeps rendering exactly the same thing — so the link you send a board still
 * resolves, and there is one implementation rather than two that drift.
 *
 * `chrome` is false when embedded: the hub already supplies the nav, the
 * footer and the page frame.
 */
export function ResultsView({
  assessmentId,
  chrome = true,
}: {
  assessmentId: string
  chrome?: boolean
}) {
  const id = assessmentId
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
  const [activeTab, setActiveTab] = useState('overview')
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
  const [progressionState, setProgressionState] = useState<ProgressionState | null>(null)
  const [complianceOutlook, setComplianceOutlook] = useState<ComplianceOutlookModel | null>(null)

  /* ─── Tier from authoritative session source ─────────────────────────── */
  // Tier is read ONLY from the server-side session JWT, never client-switchable.
  // This prevents UI/feature bypass; all paid features are enforced server-side too.
  const sessionTier = (session?.user as Record<string, unknown> | undefined)?.tier as string | undefined
  const userTier: UserTier = (sessionTier === 'professional' || sessionTier === 'growth' || sessionTier === 'autopilot' || sessionTier === 'enterprise') ? sessionTier : 'free'

  const tierRank = TIER_RANK[userTier]
  /** Can see what to fix and what each fix is worth. */
  const canMap = tierRank >= 1
  /** Can see whether it moved, what changed, and prove it. */
  const canOperate = tierRank >= 2
  // Monitoring is inserted rather than locked. A locked tab would hand the
  // operate tier the same shape as the map tier with a padlock on it, which is
  // the shape this rebuild set out to remove.
  const visibleTabs = canOperate
    ? [...RESULTS_TABS.slice(0, 3), MONITORING_TAB, ...RESULTS_TABS.slice(3)]
    : RESULTS_TABS
  // Kept as aliases so the tab components read the same prop names; the
  // meaning is now "rank at least map/operate", not "is exactly this tier".
  const isPro = canMap
  const isEnterprise = canOperate

  // Entity-type-aware vocab. Persisted on the Assessment row at submit
  // time from the orgContext returned by ContextEnrichment. Defaults to
  // 'unknown' which uses neutral language and hides commercial-only modules.
  const entityType: EntityType = ((assessment as unknown as { entityType?: string })?.entityType ??
    'unknown') as EntityType
  const vocab = getVocab(entityType)
  const isCommercialEntity = entityType === 'commercial'

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

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/compliance/progression')
        if (!res.ok) return
        const raw = await res.json()
        if (cancelled) return
        const assessed = raw?.assessed ?? {}
        setProgressionState({
          ...raw,
          assessed: {
            ...assessed,
            completedAt: assessed.completedAt ? new Date(String(assessed.completedAt)) : null,
          },
        } as ProgressionState)
      } catch {
        /* optional */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionStatus])

  useEffect(() => {
    if (!assessment?.id || sessionStatus !== 'authenticated') return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/compliance/outlook?assessmentId=${encodeURIComponent(assessment.id)}`)
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        setComplianceOutlook(data as ComplianceOutlookModel)
      } catch {
        /* optional */
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
  const handleExportPDF = async (format: 'pdf' | 'docx' = 'pdf') => {
    if (!isPro) return
    setExporting(true)
    try {
      const res = await fetch(`/api/assessment/${id}/pdf${format === 'docx' ? '?format=docx' : ''}`)
      if (res.ok) {
        // Verify we got the expected binary (not an HTML error page)
        const contentType = res.headers.get('content-type') || ''
        const expected = format === 'docx' ? 'openxmlformats' : 'application/pdf'
        if (!contentType.includes(expected)) {
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
        a.download = `E-ARI-Report-${id.slice(0, 8)}.${format}`
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
      <div className={chrome ? "min-h-screen flex flex-col bg-navy-900" : "flex flex-col"}>
        {chrome && <Navigation />}
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
        {chrome && <Footer />}
      </div>
    )
  }

  /* ─── Error state ────────────────────────────────────────────────────── */
  if (error || !assessment?.scoringResult) {
    return (
      <div className={chrome ? "min-h-screen flex flex-col bg-navy-900" : "flex flex-col"}>
        {chrome && <Navigation />}
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
                <Button className="btn-brand font-heading w-full sm:w-auto">
                  Start New Assessment
                </Button>
              </Link>
            </div>
          </div>
        </main>
        {chrome && <Footer />}
      </div>
    )
  }

  const scoring = assessment.scoringResult

  /* ─── Chart data ─────────────────────────────────────────────────────── */
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
  // Roadmap timeline data (Enterprise)
  const questionText = (pillarId: string, questionId: string): string | null => {
    const def = PILLARS.find(d => d.id === pillarId)
    const q = def?.questions.find(q => q.id === questionId)
    if (!q) return null
    return q.text.length > 96 ? `${q.text.slice(0, 93)}…` : q.text
  }
  const weakestItem = (p: PillarScoreResult, verb: string): string => {
    const qd = [...(p.questionDetails ?? [])].sort((a, b) => a.answer - b.answer)[0]
    const text = qd ? questionText(p.pillarId, qd.questionId) : null
    return text
      ? `${p.pillarName} — ${verb}: “${text}” (currently ${qd!.answer}/5)`
      : `${p.pillarName} at ${Math.round(p.normalizedScore)}%`
  }
  const strongestItem = (p: PillarScoreResult): string => {
    const qd = [...(p.questionDetails ?? [])].sort((a, b) => b.answer - a.answer)[0]
    const text = qd ? questionText(p.pillarId, qd.questionId) : null
    return text
      ? `${p.pillarName} — extend the working practice behind “${text}” (${qd!.answer}/5) across ${vocab.scalingNoun}`
      : `Scale ${p.pillarName} practices (${Math.round(p.normalizedScore)}%)`
  }
  const roadmapPhases = [
    {
      label: '0-3 Months',
      subtitle: 'Quick Wins & Foundation',
      /* Horizons are a sequence, not a severity scale — the nearest one is
         brightest because it is next, not because later work is worse. */
      color: 'text-slate-100',
      bgColor: 'bg-white/[0.07]',
      borderColor: 'border-white/[0.16]',
      items: scoring.pillarScores
        .filter(p => p.normalizedScore < 40)
        .slice(0, 2)
        .map(p => weakestItem(p, 'close the failing control')),
    },
    {
      label: '3-6 Months',
      subtitle: 'Building Capability',
      color: 'text-slate-300',
      bgColor: 'bg-white/[0.05]',
      borderColor: 'border-white/[0.11]',
      items: scoring.pillarScores
        .filter(p => p.normalizedScore >= 40 && p.normalizedScore < 65)
        .slice(0, 3)
        .map(p => weakestItem(p, 'lift the weakest practice')),
    },
    {
      label: '6-12 Months',
      subtitle: 'Scaling & Optimization',
      color: 'text-slate-400',
      bgColor: 'bg-white/[0.03]',
      borderColor: 'border-white/[0.08]',
      items: scoring.pillarScores
        .filter(p => p.normalizedScore >= 65)
        .slice(0, 3)
        .map(p => strongestItem(p)),
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
    <div className={chrome ? "min-h-screen flex flex-col bg-navy-900" : "flex flex-col"}>
      {/* Scroll progress indicator */}
      <div className="scroll-progress-bar" style={{ width: `${scrollProgress}%` }} />

      {chrome && <Navigation />}

      <main className="flex-1">
        <div className="mx-auto w-full max-w-[1200px] space-y-8 px-4 pb-8 pt-6 sm:px-6 sm:pb-12 lg:px-8">
          {/* Persistent across every tab: the operate tier is looking at a
              programme, not at one document. */}
          {canOperate && (
            <ProgrammeHeader
              completedAt={assessment?.completedAt ?? null}
              assessmentCount={assessmentHistory.length}
              drift={driftAnalysis}
              schedule={monitoringSchedule}
              openFindings={scoring.xRayFindings?.length ?? 0}
            />
          )}
          <ResultsTabs tabs={visibleTabs} active={activeTab} onChange={setActiveTab} />
          {activeTab === 'overview' && (<>
          <div id="sec-score" className="scroll-mt-24" />

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
                        <h1 className="font-heading text-4xl sm:text-5xl font-semibold tracking-tight text-slate-100">
                          Assessment Results
                        </h1>
                        <p className="mt-2 text-muted-foreground font-sans">
                          Completed on {completedDate}
                        </p>
                        <div className="mt-4 flex items-center gap-3 justify-center md:justify-start flex-wrap">
                          <Badge className={`text-sm px-3 py-1 font-heading font-semibold border ${getMaturityBgClass(scoring.maturityBand)}`}>
                            {scoring.maturityLabel}
                            <span className="ml-1.5 font-sans font-normal text-[11px] opacity-70">
                              {MATURITY_BANDS[scoring.maturityBand]?.min}&ndash;{MATURITY_BANDS[scoring.maturityBand]?.max}
                            </span>
                          </Badge>
                          {assessment?.sector && assessment.sector !== 'general' && (
                            <Badge variant="outline" className="text-sm px-3 py-1 font-heading border-eari-blue/30 text-slate-300">
                              <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                              {getSectorById(assessment.sector)?.name || assessment.sector}
                            </Badge>
                          )}
                          {/* Tier badge */}
                          <Badge variant="outline" className={`text-sm px-3 py-1 font-heading ${tierConfig.color} ${tierConfig.borderColor} ${tierConfig.bgColor}`}>
                            <TierIcon className="h-3.5 w-3.5 mr-1.5" />
                            {tierConfig.label} Plan
                          </Badge>
                        </div>
                        {/* Action buttons row */}
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <Button
                            onClick={handleRerun}
                            disabled={rerunning}
                            className="btn-brand font-heading font-semibold h-10 px-5 text-sm shadow-md shadow-eari-blue/15"
                            title="Pre-filled with your previous answers for quick updating"
                          >
                            {rerunning ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="mr-2 h-4 w-4" />
                            )}
                            Re-run Assessment
                          </Button>
                          <Link href={`/portal/use-cases/systems/new?assessmentId=${assessment.id}`}>
                            <Button
                              variant="outline"
                              className="border-eari-blue/40 text-slate-300 hover:bg-eari-blue/10 font-heading font-semibold h-10 px-5 text-sm"
                            >
                              <Scale className="mr-2 h-4 w-4" />
                              Register an AI system
                              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5 opacity-70" />
                            </Button>
                          </Link>
                          {/* Quarterly Review Countdown */}
                          {assessment.completedAt && (
                            <Badge
                              variant="outline"
                              className={`text-xs px-3 py-1.5 font-heading ${reviewStatus(assessment.completedAt).cls}`}
                            >
                              <Calendar className="h-3 w-3 mr-1.5" />
                              {reviewStatus(assessment.completedAt).label}
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



          {/* ─── FREE TIER UPGRADE BANNER ────────────────────────────────── */}
          {!isPro && (
            <FadeUp delay={0.1}>
              <div className="relative rounded-xl overflow-hidden hover-lift">
                <div className="absolute inset-0 rounded-xl p-[1px] bg-eari-blue/25" />
                <Card className="relative bg-navy-800 border-0 rounded-xl">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.07] flex-shrink-0">
                        <Sparkles className="h-5 w-5 text-slate-300" />
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <p className="font-heading font-semibold text-foreground text-sm">
                          Unlock all 6 AI agents with Professional at €49/month
                        </p>
                        <p className="text-xs text-muted-foreground font-sans mt-0.5">
                          Get unlimited assessments, full AI narrative insights, PDF reports, benchmarking, and the interactive AI Assistant.
                        </p>
                      </div>
                      <Link href="/checkout?plan=professional">
                        <Button className="btn-brand font-heading font-semibold h-10 px-5 text-sm shadow-md shadow-eari-blue/15 flex-shrink-0">
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

          <div id="sec-summary" className="scroll-mt-24" />
          {/* Plain-language read first, charts second. An officer needs to know
              what the number means before being shown how it was composed. */}
          <WhatThisMeans scoring={scoring} />

          {/* ─── Composed state-of-readiness spread ─────────────────────── */}
          <FadeUp>
            <OverviewSpread scoring={scoring} onGoTo={setActiveTab} />
          </FadeUp>

          {/* What the subscription actually bought, in counted terms. Placed
              after the substance rather than before it: value claimed ahead of
              the result reads as a pitch. */}
          <WhatThisGivesYou scoring={scoring} />

          {/* The score is about the organisation; every obligation attaches to
              a system. This is where that hand-off happens — and it is the
              step that turns a one-off diagnostic into an inventory worth
              coming back to. */}
          <RegisterSystems
            assessmentId={id}
            sector={assessment?.sector ?? null}
            alreadyRegistered={complianceSystemsForAssessment.length}
          />

          {/* ─── ENTERPRISE: EXECUTIVE SUMMARY (Print-Ready) ────────────── */}
          {isEnterprise && (
            <FadeUp>
              <Card className="bg-navy-800 border-white/[0.12] ring-1 ring-white/[0.05] hover-lift print:border-black print:bg-white print:text-black">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Landmark className="h-5 w-5 text-slate-300" />
                      <CardTitle className="font-heading text-2xl font-bold tracking-tight text-foreground">
                        Executive Summary
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] border-white/[0.16] text-slate-300">
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
                      {/* The full Executive Summary prose lives in the
                          "Strategic Insights" card further down the page.
                          Duplicating it here was the loudest source of the
                          "page feels repetitive / generic" complaint —
                          the same paragraph rendered twice across two
                          cards. Keep this Enterprise card as a tight
                          structured snapshot (strongest/weakest pillar +
                          headline score) and let Strategic Insights carry
                          the prose. */}
                      <div>
                        <h4 className="font-heading text-sm font-semibold text-foreground mb-2">Snapshot</h4>
                        <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                          {Math.round(scoring.overallScore)}% overall ({scoring.maturityLabel}). {scoring.pillarScores.filter(p => p.normalizedScore >= 50).length} of {scoring.pillarScores.length} pillars at or above the developing threshold. Full narrative in Strategic Insights below.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-navy-700/50">
                          <p className="text-[10px] text-muted-foreground font-heading uppercase tracking-wider">Strongest Pillar</p>
                          <p className="font-heading text-sm font-semibold mt-1" style={{ color: scoreRamp([...scoring.pillarScores].sort((a, b) => b.normalizedScore - a.normalizedScore)[0]?.normalizedScore ?? 0) }}>
                            {[...scoring.pillarScores].sort((a, b) => b.normalizedScore - a.normalizedScore)[0]?.pillarName}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-navy-700/50">
                          <p className="text-[10px] text-muted-foreground font-heading uppercase tracking-wider">Weakest Pillar</p>
                          <p className="font-heading text-sm font-semibold mt-1" style={{ color: scoreRamp([...scoring.pillarScores].sort((a, b) => a.normalizedScore - b.normalizedScore)[0]?.normalizedScore ?? 0) }}>
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

          </>)}
          {activeTab === 'action' && (<>
          <div id="sec-action" className="scroll-mt-24" />
          {/* ─── HIGHEST-LEVERAGE MOVES (map tier) ─────────────────────────
              This is the map tier's whole argument: not "governance is weak"
              but "governance is worth 6.2 points, more than the next two
              combined". Gains come from computeLeverage(), which re-runs the
              scoring pipeline per answer, so each figure traces to an input. */}
          {canMap ? (
            <FadeUp>
              <LeverageMoves scoring={scoring} topN={5} />
            </FadeUp>
          ) : (
            <FadeUp>
              <LockedSectionCard
                title="Highest-leverage moves"
                description="The five changes that move your score most, each with the exact points it is worth — calculated by re-running the full scoring pipeline against every answer."
                requiredTier="growth"
                onUpgrade={() => router.push('/pricing')}
                previewContent={
                  <div className="space-y-3">
                    <div className="h-6 w-2/3 rounded bg-navy-700" />
                    <div className="h-6 w-1/2 rounded bg-navy-700" />
                    <div className="h-6 w-3/5 rounded bg-navy-700" />
                  </div>
                }
              />
            </FadeUp>
          )}
          <PlanExtras
            scoring={scoring} roadmapPhases={roadmapPhases}
            isEnterprise={isEnterprise} isCommercialEntity={isCommercialEntity}
            vocab={vocab} router={router}
          />


          </>)}
          {activeTab === 'compliance' && (
            <ComplianceTab
              isPro={isPro} sessionStatus={sessionStatus} complianceOutlook={complianceOutlook}
              complianceSummary={complianceSummary} complianceGaps={complianceGaps}
              assessment={assessment} assessmentHistory={assessmentHistory} historyLoading={historyLoading}
              driftAnalysis={driftAnalysis} monitoringAlerts={monitoringAlerts}
              monitoringSchedule={monitoringSchedule} pulseData={pulseData} pulseLoading={pulseLoading}
              barData={barData} benchmarkData={benchmarkData}
              handleRerun={handleRerun} rerunning={rerunning} router={router} id={id} scoring={scoring}
            />
          )}
          {activeTab === 'monitoring' && canOperate && (
            <MonitoringTab
              isPro={isPro} sessionStatus={sessionStatus} complianceOutlook={complianceOutlook}
              complianceSummary={complianceSummary} complianceGaps={complianceGaps}
              assessment={assessment} assessmentHistory={assessmentHistory} historyLoading={historyLoading}
              driftAnalysis={driftAnalysis} monitoringAlerts={monitoringAlerts}
              monitoringSchedule={monitoringSchedule} pulseData={pulseData} pulseLoading={pulseLoading}
              barData={barData} benchmarkData={benchmarkData}
              handleRerun={handleRerun} rerunning={rerunning} router={router} id={id} scoring={scoring}
            />
          )}
          {activeTab === 'findings' && (
            <FindingsTab
              scoring={scoring} assessment={assessment} insights={insights}
              insightsLoading={insightsLoading} insightsFallback={insightsFallback}
              insightsUpgradeMessage={insightsUpgradeMessage} fetchInsights={fetchInsights}
              isPro={isPro} isEnterprise={isEnterprise} isCommercialEntity={isCommercialEntity}
              vocab={vocab} historicalData={historicalData}
              pillarEvidenceCounts={pillarEvidenceCounts}
              complianceSystemsForAssessment={complianceSystemsForAssessment}
              router={router} id={id}
            />
          )}
          {activeTab === 'certification' && (
            <CertificationTab
              scoring={scoring} assessment={assessment} assessmentHistory={assessmentHistory}
              certificationResult={certificationResult} certificationBadge={certificationBadge}
              isPro={isPro} isEnterprise={isEnterprise} userTier={userTier}
              agentOpen={agentOpen} setAgentOpen={setAgentOpen}
              handleExportPDF={handleExportPDF} exporting={exporting}
              router={router} id={id}
            />
          )}
          {activeTab === 'benchmark' && (
            <BenchmarkTab
              scoring={scoring} assessment={assessment}
              benchmarkData={benchmarkData} benchmarkLoading={benchmarkLoading}
              benchmarkConsented={benchmarkConsented} setBenchmarkConsented={setBenchmarkConsented}
              isPro={isPro} vocab={vocab} router={router} id={id}
            />
          )}

        </div>
      </main>

      {chrome && <Footer />}

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
