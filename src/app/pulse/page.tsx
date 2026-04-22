'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  Zap,
  TrendingUp,
  TrendingDown,
  Loader2,
  Calendar,
  ArrowUpRight,
  RefreshCw,
  ChevronRight,
  Clock,
  Download,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Navigation } from '@/components/shared/navigation'
import { Footer } from '@/components/shared/footer'
import { AIAssistant } from '@/components/shared/ai-assistant'
import { PILLARS } from '@/lib/pillars'

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

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface PulsePillarScore {
  pillarId: string
  pillarName: string
  normalizedScore: number
}

interface PulseScoreChange {
  pillarId: string
  pillarName: string
  previous: number
  current: number
  delta: number
}

interface PulseRun {
  id: string
  month: string
  overallScore: number
  pillarScores: PulsePillarScore[]
  scoreChanges: PulseScoreChange[]
  topRisks: string[]
  topQuickWins: string[]
  createdAt: string
  assessmentId: string | null
}

/* ─── Custom Tooltip for Line Chart ─────────────────────────────────────── */

function PulseLineTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-navy-800 border border-border/60 rounded-lg px-3 py-2 shadow-xl">
      <p className="font-heading text-sm text-foreground font-semibold mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="font-mono text-xs" style={{ color: entry.color }}>
          {entry.dataKey === 'overall' ? 'Overall' : entry.dataKey}: {Math.round(entry.value)}%
        </p>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PULSE PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function PulsePage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()

  const [pulseRuns, setPulseRuns] = useState<PulseRun[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sectorAvg, setSectorAvg] = useState<number | null>(null)

  // Auth gate
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [sessionStatus, router])

  // Fetch pulse history
  const fetchPulseRuns = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/pulse')
      if (res.ok) {
        const data = await res.json()
        setPulseRuns(Array.isArray(data) ? data : [])
      }
    } catch {
      setError('Could not load pulse data. Please try again later.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchPulseRuns()
      // Fetch sector average for trend chart reference line
      const sector = (session?.user as Record<string, unknown>)?.sector as string | undefined
      if (sector) {
        fetch(`/api/benchmark?sector=${encodeURIComponent(sector)}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data?.overall?.avgScore) setSectorAvg(Math.round(data.overall.avgScore))
          })
          .catch(() => {})
      }
    }
  }, [sessionStatus, fetchPulseRuns])

  // Run new pulse
  const handleRunPulse = async () => {
    setRunning(true)
    try {
      const res = await fetch('/api/pulse', { method: 'POST' })
      if (res.ok) {
        const newRun = await res.json()
        setPulseRuns(prev => [newRun, ...prev])
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to run pulse.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setRunning(false)
    }
  }

  // Download pulse report
  const handleDownload = async (pulseId: string, month: string) => {
    try {
      const res = await fetch(`/api/pulse/${pulseId}/download`)
      if (res.ok) {
        // Verify we got a valid DOCX response
        const contentType = res.headers.get('content-type') || ''
        if (!contentType.includes('openxmlformats')) {
          const text = await res.text()
          let errorMsg = 'Unexpected response format from server'
          try {
            const errData = JSON.parse(text)
            if (errData.error) errorMsg = errData.error
          } catch {}
          console.error('Pulse report export error (wrong content type):', contentType, errorMsg)
          alert(`Export failed: ${errorMsg}`)
          return
        }

        const blob = await res.blob()
        if (blob.size < 100) {
          console.error('Pulse report export error: file too small', blob.size, 'bytes')
          alert('Export failed: generated file is too small, please try again.')
          return
        }

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `E-ARI-Pulse-${month}.docx`
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
          try {
            const text = await res.text()
            if (text) errorMsg = `Server error (${res.status}): ${text.slice(0, 200)}`
          } catch {}
        }
        console.error('Pulse report export error:', errorMsg)
        alert(errorMsg)
      }
    } catch (err) {
      console.error('Pulse report export failed:', err)
      alert(`Network error — please check your connection and try again. (${err instanceof Error ? err.message : 'Unknown error'})`)
    }
  }

  // Derived
  const latestPulse = pulseRuns.length > 0 ? pulseRuns[0] : null
  const previousPulse = pulseRuns.length > 1 ? pulseRuns[1] : null
  const overallDelta = latestPulse && previousPulse
    ? Math.round(latestPulse.overallScore - previousPulse.overallScore)
    : null

  // Chart data: overall score over time (reverse to get chronological order)
  const trendData = [...pulseRuns].reverse().map(run => ({
    month: run.month || new Date(run.createdAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    overall: Math.round(run.overallScore),
  }))

  // Session tier
  const sessionTier = (session?.user as Record<string, unknown> | undefined)?.tier as string | undefined
  const userTier: 'free' | 'professional' | 'enterprise' = (sessionTier === 'professional' || sessionTier === 'enterprise') ? sessionTier : 'free'

  /* ─── Loading state ───────────────────────────────────────────────────── */
  if (sessionStatus === 'loading' || (sessionStatus === 'authenticated' && loading)) {
    return (
      <div className="min-h-screen flex flex-col bg-navy-900">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-eari-blue" />
        </main>
      </div>
    )
  }

  if (!session) return null

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">

          {/* ─── Page Header ──────────────────────────────────────────── */}
          <FadeUp>
            <section className="relative">
              <div className="aurora-card rounded-2xl p-[1px]">
                <div className="hero-gradient-mesh rounded-2xl">
                  <div className="relative z-10 bg-navy-800/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-eari-blue/15">
                            <Activity className="h-6 w-6 text-eari-blue-light" />
                          </div>
                          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold gradient-text-blue tracking-tight">
                            AI Pulse
                          </h1>
                        </div>
                        <p className="text-muted-foreground font-sans max-w-lg">
                          Monthly readiness pulse checks that compare your scores over time and surface top risks and quick wins.
                        </p>
                      </div>
                      <Button
                        onClick={handleRunPulse}
                        disabled={running}
                        className="bg-gradient-to-r from-eari-blue to-eari-blue-dark hover:from-eari-blue-dark hover:to-eari-blue text-white font-heading font-semibold h-12 px-6 shadow-lg shadow-eari-blue/20 min-w-[180px]"
                      >
                        {running ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Running Pulse...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Run New Pulse
                          </>
                        )}
                      </Button>
                      {latestPulse && (
                        <Button
                          variant="outline"
                          onClick={() => handleDownload(latestPulse.id, latestPulse.month)}
                          className="border-eari-blue/30 text-eari-blue-light hover:bg-eari-blue/10 font-heading font-semibold h-12 px-5"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Export Report
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </FadeUp>

          {/* Error display */}
          {error && (
            <FadeUp>
              <Card className="bg-navy-800 border-red-500/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-300 font-sans">{error}</p>
                  <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto text-muted-foreground h-8">
                    Dismiss
                  </Button>
                </CardContent>
              </Card>
            </FadeUp>
          )}

          {/* ─── Onboarding (no pulse runs) ────────────────────────────── */}
          {pulseRuns.length === 0 && !loading && (
            <FadeUp delay={0.1}>
              <Card className="bg-navy-800 border-eari-blue/20 hover-lift">
                <CardContent className="p-8 sm:p-12 flex flex-col items-center text-center gap-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-eari-blue/10 border border-eari-blue/20">
                    <Activity className="h-10 w-10 text-eari-blue-light" />
                  </div>
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-foreground mb-3">
                      Run Your First AI Pulse
                    </h2>
                    <p className="text-muted-foreground font-sans max-w-md leading-relaxed">
                      Run your first AI Pulse to start tracking monthly changes. Pulse compares your readiness over time and surfaces the top risks and quick wins.
                    </p>
                  </div>
                  <Button
                    onClick={handleRunPulse}
                    disabled={running}
                    className="bg-gradient-to-r from-eari-blue to-eari-blue-dark hover:from-eari-blue-dark hover:to-eari-blue text-white font-heading font-semibold h-12 px-8 shadow-lg shadow-eari-blue/20"
                  >
                    {running ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Activity className="mr-2 h-4 w-4" />
                    )}
                    {running ? 'Running...' : 'Run First Pulse'}
                  </Button>
                  <p className="text-xs text-muted-foreground/60 font-sans">
                    Requires at least one completed assessment
                  </p>
                </CardContent>
              </Card>
            </FadeUp>
          )}

          {/* ─── Current Month Pulse Card ──────────────────────────────── */}
          {latestPulse && (
            <FadeUp delay={0.1}>
              <div className="aurora-card rounded-2xl p-[1px]">
                <Card className="bg-navy-800/90 backdrop-blur-sm border-0 rounded-2xl hover-lift">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-eari-blue/15">
                          <Activity className="h-5 w-5 text-eari-blue-light" />
                        </div>
                        <div>
                          <CardTitle className="font-heading text-xl font-bold text-foreground">
                            Current Month Pulse
                          </CardTitle>
                          <CardDescription className="font-sans text-sm">
                            {latestPulse.month || new Date(latestPulse.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-heading text-4xl font-extrabold text-foreground">
                          {Math.round(latestPulse.overallScore)}
                        </span>
                        <span className="text-sm text-muted-foreground">%</span>
                        {overallDelta !== null && (
                          <Badge
                            variant="outline"
                            className={`font-mono text-xs ${
                              overallDelta >= 0
                                ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                                : 'border-red-500/30 text-red-400 bg-red-500/10'
                            }`}
                          >
                            {overallDelta >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                            {overallDelta >= 0 ? '+' : ''}{overallDelta}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Top Risks */}
                      <div className="p-4 rounded-xl bg-navy-700/40 border border-amber-500/10">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="h-4 w-4 text-amber-400" />
                          <h3 className="font-heading text-sm font-semibold text-amber-400">Top Risks</h3>
                        </div>
                        {latestPulse.topRisks && latestPulse.topRisks.length > 0 ? (
                          <ul className="space-y-2">
                            {latestPulse.topRisks.map((risk, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-foreground font-sans">
                                <span className="text-amber-400 mt-1 flex-shrink-0">&#8226;</span>
                                <span>{risk}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted-foreground font-sans">No significant risks identified.</p>
                        )}
                      </div>

                      {/* Top Quick Wins */}
                      <div className="p-4 rounded-xl bg-navy-700/40 border border-emerald-500/10">
                        <div className="flex items-center gap-2 mb-3">
                          <Zap className="h-4 w-4 text-emerald-400" />
                          <h3 className="font-heading text-sm font-semibold text-emerald-400">Top Quick Wins</h3>
                        </div>
                        {latestPulse.topQuickWins && latestPulse.topQuickWins.length > 0 ? (
                          <ul className="space-y-2">
                            {latestPulse.topQuickWins.map((win, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-foreground font-sans">
                                <span className="text-emerald-400 mt-1 flex-shrink-0">&#8226;</span>
                                <span>{win}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted-foreground font-sans">No quick wins identified this month.</p>
                        )}
                      </div>
                    </div>

                    {/* Pillar Score Changes mini-table */}
                    {latestPulse.scoreChanges && latestPulse.scoreChanges.length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-heading text-sm font-semibold text-foreground mb-3">Pillar Score Changes</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {latestPulse.scoreChanges.map((change) => {
                            const pillarDef = PILLARS.find(p => p.id === change.pillarId)
                            const pillarColor = pillarDef?.color ?? '#8b949e'
                            return (
                              <div key={change.pillarId} className="p-3 rounded-lg bg-navy-700/40 border border-border/20">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pillarColor }} />
                                  <span className="font-heading text-xs text-foreground truncate">{pillarDef?.shortName || change.pillarName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-muted-foreground">{Math.round(change.previous)}%</span>
                                  <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                                  <span className="font-mono text-xs text-foreground font-semibold">{Math.round(change.current)}%</span>
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] font-mono px-1 py-0 ${
                                      change.delta >= 0
                                        ? 'border-emerald-500/30 text-emerald-400'
                                        : 'border-red-500/30 text-red-400'
                                    }`}
                                  >
                                    {change.delta >= 0 ? '+' : ''}{Math.round(change.delta)}%
                                  </Badge>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </FadeUp>
          )}

          {/* Section separator */}
          {pulseRuns.length > 0 && <div className="section-gradient-separator" />}

          {/* ─── Monthly Trend Chart ─────────────────────────────────── */}
          {pulseRuns.length > 1 && (
            <FadeUp delay={0.15}>
              <Card className="bg-navy-800/90 border-border/50 hover-lift results-grid-pattern">
                <CardHeader>
                  <CardTitle className="font-heading text-xl font-bold tracking-tight text-foreground">
                    Monthly Trend
                  </CardTitle>
                  <CardDescription className="font-sans text-sm">
                    Overall readiness score over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-[300px] sm:h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(48,57,74,0.3)" />
                        <XAxis
                          dataKey="month"
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
                        <Tooltip content={<PulseLineTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="overall"
                          stroke="#2563eb"
                          strokeWidth={3}
                          dot={{ fill: '#2563eb', r: 5, strokeWidth: 2, stroke: '#161b22' }}
                          activeDot={{ r: 7, fill: '#3b82f6', stroke: '#161b22', strokeWidth: 2 }}
                          animationDuration={1200}
                        />
                        {/* Sector average reference line */}
                        {sectorAvg !== null && (
                          <ReferenceLine
                            y={sectorAvg}
                            stroke="#f59e0b"
                            strokeDasharray="6 3"
                            strokeWidth={1.5}
                            label={{
                              value: `Sector Avg: ${sectorAvg}%`,
                              position: 'right',
                              fill: '#f59e0b',
                              fontSize: 10,
                            }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </FadeUp>
          )}

          {/* Section separator */}
          {pulseRuns.length > 1 && <div className="section-gradient-separator" />}

          {/* ─── Pulse History Timeline ─────────────────────────────── */}
          {pulseRuns.length > 0 && (
            <FadeUp delay={0.2}>
              <Card className="bg-navy-800 border-border/50 hover-lift">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-eari-blue-light" />
                    <CardTitle className="font-heading text-xl font-bold tracking-tight text-foreground">
                      Pulse History
                    </CardTitle>
                    <Badge variant="outline" className="ml-auto text-[10px] font-mono border-border text-muted-foreground">
                      Last 12 months
                    </Badge>
                  </div>
                  <CardDescription className="font-sans text-sm">
                    Timeline of your monthly pulse runs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-eari-blue/40 via-cyan-500/30 to-transparent" />
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {pulseRuns.slice(0, 12).map((run, i) => {
                        const delta = i < pulseRuns.length - 1
                          ? Math.round(run.overallScore - pulseRuns[i + 1].overallScore)
                          : null
                        return (
                          <div key={run.id} className="flex gap-4 relative">
                            {/* Timeline dot */}
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-eari-blue/15 border border-eari-blue/30 flex-shrink-0 z-10">
                              <span className="font-heading text-xs font-bold text-eari-blue-light">
                                {run.month ? run.month.split('-')[1] : new Date(run.createdAt).toLocaleDateString('en-US', { month: 'short' }).slice(0, 3)}
                              </span>
                            </div>
                            {/* Content */}
                            <div className="flex-1 pb-2 min-w-0">
                              <div className="flex items-center gap-3">
                                <p className="font-heading text-sm font-semibold text-foreground">
                                  {run.month ? new Date(run.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : new Date(run.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </p>
                                <span className="font-mono text-sm font-bold text-foreground">{Math.round(run.overallScore)}%</span>
                                {delta !== null && (
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-mono ${
                                      delta >= 0
                                        ? 'border-emerald-500/30 text-emerald-400'
                                        : 'border-red-500/30 text-red-400'
                                    }`}
                                  >
                                    {delta >= 0 ? '+' : ''}{delta}%
                                  </Badge>
                                )}
                                <button
                                  onClick={() => handleDownload(run.id, run.month)}
                                  className="ml-1 p-1 rounded hover:bg-navy-700/60 text-muted-foreground hover:text-eari-blue-light transition-colors"
                                  title="Download report"
                                >
                                  <Download className="h-3 w-3" />
                                </button>
                              </div>
                              {run.topRisks && run.topRisks.length > 0 && (
                                <p className="text-xs text-muted-foreground font-sans mt-1 truncate">
                                  {run.topRisks.length} risk{run.topRisks.length !== 1 ? 's' : ''} &middot; {run.topQuickWins?.length || 0} quick win{run.topQuickWins?.length !== 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeUp>
          )}

        </div>
      </main>

      <Footer />
      <AIAssistant userTier={userTier} />
    </div>
  )
}
