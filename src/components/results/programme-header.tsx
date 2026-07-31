'use client'

/**
 * Programme status strip — the operate tier's persistent element.
 *
 * Every other block on this page describes one assessment. This one describes
 * the programme that assessment belongs to: when it was last measured, whether
 * the score is moving, when the next review is due, and how many findings are
 * still open. It sits above the tabs and does not change when you switch them,
 * which is the whole point — a report is something you read once, a status
 * strip is something you check.
 *
 * Nothing here is new analysis. Every value is already computed elsewhere on
 * the page (analyzeDrift, getRecommendedSchedule, the assessment history, the
 * X-ray findings); this only stops them from being buried three tabs deep.
 */

import { AlertTriangle, CalendarClock, History, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import type { analyzeDrift, getRecommendedSchedule } from '@/lib/monitoring-engine'

type Drift = ReturnType<typeof analyzeDrift> | null
type Schedule = ReturnType<typeof getRecommendedSchedule> | null

/** Whole days between two dates, negative when the target is in the past. */
function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

function Cell({
  icon: Icon, label, value, detail, tone = 'neutral',
}: {
  icon: typeof History
  label: string
  value: string
  detail?: string
  tone?: 'neutral' | 'good' | 'warn' | 'bad'
}) {
  const valueColour =
    tone === 'good' ? 'text-emerald-400'
      : tone === 'warn' ? 'text-amber-400'
        : tone === 'bad' ? 'text-red-400'
          : 'text-slate-100'
  return (
    <div className="flex items-start gap-3 px-4 py-3 sm:px-5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
          {label}
        </p>
        <p className={`mt-1 font-heading text-base font-semibold tracking-tight ${valueColour}`}>
          {value}
        </p>
        {detail ? (
          <p className="mt-0.5 truncate font-sans text-[11px] text-slate-500">{detail}</p>
        ) : null}
      </div>
    </div>
  )
}

export function ProgrammeHeader({
  completedAt, assessmentCount, drift, schedule, openFindings,
}: {
  completedAt: string | null
  assessmentCount: number
  drift: Drift
  schedule: Schedule
  openFindings: number
}) {
  const now = new Date()
  const last = completedAt ? new Date(completedAt) : null
  const lastValid = last && !Number.isNaN(last.getTime()) ? last : null
  const sinceDays = lastValid ? -daysBetween(now, lastValid) : null

  // ── Movement. With one assessment there is nothing to compare, and saying
  //    "0" would read as "no change" rather than "not yet measurable".
  const d = drift?.overallDrift ?? null
  const canCompare = assessmentCount >= 2 && d !== null
  const movement = !canCompare
    ? { value: 'Not yet', detail: 'Needs a second assessment', tone: 'neutral' as const }
    : d > 0
      ? { value: `+${d.toFixed(1)} pts`, detail: 'Since your previous assessment', tone: 'good' as const }
      : d < 0
        ? { value: `${d.toFixed(1)} pts`, detail: 'Since your previous assessment', tone: 'bad' as const }
        : { value: 'No change', detail: 'Since your previous assessment', tone: 'neutral' as const }
  const MovementIcon = !canCompare || d === 0 ? Minus : d! > 0 ? TrendingUp : TrendingDown

  // ── Next review.
  const next = schedule?.nextCheck ? new Date(schedule.nextCheck) : null
  const nextValid = next && !Number.isNaN(next.getTime()) ? next : null
  const untilDays = nextValid ? daysBetween(now, nextValid) : null
  const review = untilDays === null
    ? { value: 'Not scheduled', detail: undefined, tone: 'neutral' as const }
    : untilDays < 0
      ? { value: `${Math.abs(untilDays)} days overdue`, detail: schedule?.frequency, tone: 'bad' as const }
      : untilDays === 0
        ? { value: 'Due today', detail: schedule?.frequency, tone: 'warn' as const }
        : { value: `In ${untilDays} days`, detail: schedule?.frequency, tone: untilDays <= 7 ? 'warn' as const : 'neutral' as const }

  return (
    <section
      aria-label="Programme status"
      className="mb-6 overflow-hidden rounded-xl border border-white/[0.08] bg-navy-800/60"
    >
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2 sm:px-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
          Programme status
        </p>
        <p className="font-mono text-[10px] text-slate-600">
          {assessmentCount} assessment{assessmentCount === 1 ? '' : 's'} on record
        </p>
      </div>
      {/* Two up on a phone rather than a four-row stack: at one column the
          strip ran 379px of an 812px screen, so the status pushed the content
          it is meant to frame off the first screen entirely. */}
      <div className="grid grid-cols-2 divide-x divide-white/[0.06] lg:grid-cols-4">
        <Cell
          icon={History}
          label="Last assessed"
          value={sinceDays === null ? '—' : sinceDays === 0 ? 'Today' : `${sinceDays} days ago`}
          detail={lastValid?.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        />
        <Cell
          icon={MovementIcon}
          label="Movement"
          value={movement.value}
          detail={movement.detail}
          tone={movement.tone}
        />
        <Cell
          icon={CalendarClock}
          label="Next review"
          value={review.value}
          detail={review.detail}
          tone={review.tone}
        />
        <Cell
          icon={AlertTriangle}
          label="Open findings"
          value={openFindings === 0 ? 'None' : String(openFindings)}
          detail={openFindings === 0 ? 'Nothing outstanding' : 'From this assessment'}
          tone={openFindings === 0 ? 'good' : openFindings > 3 ? 'bad' : 'warn'}
        />
      </div>
    </section>
  )
}
