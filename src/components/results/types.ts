/**
 * Shared shapes for the results page and its tab components.
 *
 * These were inline `useState<{...}>` annotations in results/[id]/page.tsx.
 * Now that the tabs live in their own files they need the same shapes, and a
 * second hand-written copy would drift the first time a field changed. The
 * page imports these too, so there is exactly one definition of each.
 */

import type { ScoringResult } from '@/lib/assessment-engine'
import type { AIInsightResult } from '@/lib/ai-insights'
import type { ComplianceOutlook } from '@/lib/compliance-outlook'
import type { XRayFinding } from '@/lib/scoring-patterns'
import type { EntityVocab } from '@/lib/entity-types'
import type { MaturityBand } from '@/lib/pillars'
import type { CertificationResult } from '@/lib/certification'
import type { getCertificationBadge } from '@/lib/certification'

export type UserTier = 'free' | 'professional' | 'growth' | 'autopilot' | 'enterprise'

export interface ResultsAssessment {
  id: string
  status: string
  sector: string
  completedAt: string | null
  createdAt: string
  scoringResult: ScoringResult | null
}

export interface PulseSnapshot {
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
}

export type AssessmentHistoryEntry = {
  id: string
  completedAt: string | null
  overallScore: number | null
  pillarScores: Array<{ pillarId: string; normalizedScore: number }> | null
}

export interface BenchmarkData {
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
}

/**
 * Everything a tab can read, passed as one bag.
 *
 * Threading ~25 props per tab by hand is how a refactor this size loses a
 * value silently; with a single bag the compiler names anything missing at the
 * destructure site. Tabs take the subset they need via Pick<>.
 */
export interface ResultsContext {
  // identity + routing
  id: string
  assessment: ResultsAssessment
  scoring: ScoringResult
  router: { push: (href: string) => void }
  sessionStatus: 'loading' | 'authenticated' | 'unauthenticated'

  // tier gates
  userTier: UserTier
  isPro: boolean
  isEnterprise: boolean
  isCommercialEntity: boolean
  vocab: EntityVocab

  // insights
  insights: AIInsightResult | null
  insightsLoading: boolean
  insightsFallback: boolean
  insightsUpgradeMessage: string | null
  fetchInsights: () => void

  // compliance
  complianceOutlook: ComplianceOutlook | null
  complianceSummary: ReturnType<typeof import('@/lib/regulatory-mapping').getComplianceSummary>
  complianceGaps: ReturnType<typeof import('@/lib/regulatory-mapping').assessComplianceGaps>
  complianceSystemsForAssessment: Array<{ id: string; name: string }>
  pillarEvidenceCounts: Record<string, number>

  // history + monitoring
  assessmentHistory: AssessmentHistoryEntry[]
  historyLoading: boolean
  historicalData: Array<{ label: string; score: number; date: string }>
  driftAnalysis: ReturnType<typeof import('@/lib/monitoring-engine').analyzeDrift> | null
  monitoringAlerts: ReturnType<typeof import('@/lib/monitoring-engine').generateAlerts> | null
  monitoringSchedule: ReturnType<typeof import('@/lib/monitoring-engine').getRecommendedSchedule> | null
  pulseData: PulseSnapshot | null
  pulseLoading: boolean

  // charts
  barData: Array<{ pillar: string; score: number; band: MaturityBand }>
  radarData: Array<Record<string, unknown>>
  priorityMatrixData: Array<Record<string, unknown>>
  riskMatrixData: Array<Record<string, unknown>>

  // benchmark + certification
  benchmarkData: BenchmarkData | null
  benchmarkLoading: boolean
  benchmarkConsented: boolean
  setBenchmarkConsented: (v: boolean) => void
  certificationResult: CertificationResult
  certificationBadge: ReturnType<typeof getCertificationBadge>
  roadmapPhases: Array<{
    label: string
    subtitle: string
    color: string
    bgColor: string
    borderColor: string
    items: string[]
  }>
  xrayFindings: XRayFinding[]

  // actions
  handleRerun: () => void
  rerunning: boolean
  handleExportPDF: (format?: 'pdf' | 'docx') => void
  exporting: boolean
  agentOpen: boolean
  setAgentOpen: (v: boolean) => void
}

export type ComplianceTabProps = Pick<
  ResultsContext,
  | 'isPro' | 'sessionStatus' | 'complianceOutlook' | 'complianceSummary' | 'complianceGaps'
  | 'assessment' | 'assessmentHistory' | 'historyLoading' | 'driftAnalysis' | 'monitoringAlerts'
  | 'monitoringSchedule' | 'pulseData' | 'pulseLoading' | 'barData' | 'benchmarkData'
  | 'radarData' | 'handleRerun' | 'rerunning' | 'router' | 'id' | 'scoring'
>

export type FindingsTabProps = Pick<
  ResultsContext,
  | 'scoring' | 'assessment' | 'insights' | 'insightsLoading' | 'insightsFallback'
  | 'insightsUpgradeMessage' | 'fetchInsights' | 'isPro' | 'isEnterprise'
  | 'isCommercialEntity' | 'vocab' | 'historicalData' | 'priorityMatrixData'
  | 'pillarEvidenceCounts' | 'complianceSystemsForAssessment' | 'router' | 'id'
>

export type BenchmarkTabProps = Pick<
  ResultsContext,
  | 'scoring' | 'assessment' | 'benchmarkData' | 'benchmarkLoading'
  | 'benchmarkConsented' | 'setBenchmarkConsented' | 'isPro' | 'vocab' | 'router' | 'id'
>

export type CertificationTabProps = Pick<
  ResultsContext,
  | 'scoring' | 'assessment' | 'assessmentHistory' | 'certificationResult' | 'certificationBadge'
  | 'isPro' | 'isEnterprise' | 'userTier' | 'agentOpen' | 'setAgentOpen'
  | 'handleExportPDF' | 'exporting' | 'router' | 'id'
>

export type PlanExtrasProps = Pick<
  ResultsContext,
  'scoring' | 'roadmapPhases' | 'riskMatrixData' | 'isEnterprise' | 'isCommercialEntity' | 'vocab' | 'router'
>
