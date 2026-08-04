'use client'

/**
 * The dashboard's four numbers.
 *
 * The strip this replaces read: total assessments, completed, average score,
 * current tier. Three of those are trivia — how many times you have used the
 * product is not a fact about your compliance — and the average was worse than
 * trivia: averaging repeat assessments of the same organisation mixes a
 * baseline with the improvements made since, so a company that improved could
 * watch its "average" sit still. Meanwhile the score, the thing the whole
 * platform computes, was a small ring in the corner.
 *
 * These four are the ones a compliance lead is actually asked about: where you
 * stand, whether it moved, when the next review is due, and how much of what
 * applies to you can be evidenced.
 */

import Link from 'next/link'
import { AlertTriangle, CalendarClock, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { scoreRamp, plainBand } from '@/lib/score-ramp'

export const REVIEW_CYCLE_DAYS = 90

type Tone = 'neutral' | 'good' | 'warn' | 'bad'

const TONE: Record<Tone, string> = {
  neutral: 'text-slate-100',
  good: 'text-emerald-400',
  warn: 'text-amber-400',
  bad: 'text-red-400',
}

function Tile({
  label, value, unit, detail, tone = 'neutral', icon: Icon, href, accent,
}: {
  label: string
  value: string
  unit?: string
  detail?: string
  tone?: Tone
  icon?: typeof Minus
  href?: string
  /** Overrides the tone colour — used to tie the score to the ramp. */
  accent?: string
}) {
  const body = (
    <>
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-3.5 w-3.5 text-slate-500" aria-hidden /> : null}
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      </div>
      <p
        className={`mt-2 font-heading text-[32px] font-semibold leading-none tracking-[-0.03em] tabular-nums ${accent ? '' : TONE[tone]}`}
        style={accent ? { color: accent } : undefined}
      >
        {value}
        {unit ? <span className="ml-1 text-base font-medium text-slate-500">{unit}</span> : null}
      </p>
      {detail ? <p className="mt-1.5 font-sans text-[11px] text-slate-500">{detail}</p> : null}
    </>
  )
  const cls =
    'block rounded-xl border border-border/50 bg-navy-800/70 p-4 transition-colors sm:p-5'
  return href ? (
    <Link href={href} className={`${cls} hover:border-border`}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export function StatusStrip({
  score, previousScore, completedAt, obligationsApplicable, obligationsEvidenced, resultHref,
}: {
  score: number | null
  previousScore: number | null
  completedAt: string | null
  obligationsApplicable: number
  obligationsEvidenced: number
  resultHref: string | null
}) {
  // ── Movement. One assessment means nothing to compare against, and "0"
  //    would read as "no change" rather than "not measurable yet".
  const delta = score !== null && previousScore !== null ? score - previousScore : null
  const movement =
    delta === null
      ? { value: 'Not yet', detail: 'Needs a second assessment', tone: 'neutral' as Tone, Icon: Minus }
      : delta > 0
        ? { value: `+${delta.toFixed(1)}`, detail: 'Since your previous assessment', tone: 'good' as Tone, Icon: TrendingUp }
        : delta < 0
          ? { value: delta.toFixed(1), detail: 'Since your previous assessment', tone: 'bad' as Tone, Icon: TrendingDown }
          : { value: 'No change', detail: 'Since your previous assessment', tone: 'neutral' as Tone, Icon: Minus }

  // ── Next review.
  const daysLeft = completedAt
    ? Math.ceil((new Date(completedAt).getTime() + REVIEW_CYCLE_DAYS * 86_400_000 - Date.now()) / 86_400_000)
    : null
  const review =
    daysLeft === null
      ? { value: '—', detail: 'After your first assessment', tone: 'neutral' as Tone }
      : daysLeft <= 0
        ? { value: 'Overdue', detail: 'Re-run to refresh your score', tone: 'bad' as Tone }
        : { value: String(daysLeft), unit: 'days', detail: 'Until the next review', tone: (daysLeft <= 14 ? 'warn' : 'neutral') as Tone }

  // ── Obligations. Zero applicable is not zero coverage — it means nothing is
  //    classified yet, which is a different problem and a different next step.
  const coverage =
    obligationsApplicable === 0
      ? { value: 'Not classified', detail: 'Classify a system to see what applies', tone: 'warn' as Tone }
      : {
          value: `${obligationsEvidenced}/${obligationsApplicable}`,
          detail: obligationsEvidenced === obligationsApplicable ? 'All evidenced' : 'Obligations evidenced',
          tone: (obligationsEvidenced === obligationsApplicable ? 'good' : obligationsEvidenced === 0 ? 'bad' : 'warn') as Tone,
        }

  return (
    <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        label="Readiness score"
        value={score === null ? '—' : String(Math.round(score))}
        unit={score === null ? undefined : '/100'}
        detail={score === null ? 'No completed assessment' : plainBand(score)}
        accent={score === null ? undefined : scoreRamp(score)}
        href={resultHref ?? undefined}
      />
      <Tile
        label="Movement"
        value={movement.value}
        unit={delta !== null && delta !== 0 ? 'pts' : undefined}
        detail={movement.detail}
        tone={movement.tone}
        icon={movement.Icon}
      />
      <Tile
        label="Next review"
        value={review.value}
        unit={review.unit}
        detail={review.detail}
        tone={review.tone}
        icon={CalendarClock}
      />
      <Tile
        label="Obligation coverage"
        value={coverage.value}
        detail={coverage.detail}
        tone={coverage.tone}
        icon={AlertTriangle}
        href="/portal/use-cases"
      />
    </section>
  )
}
