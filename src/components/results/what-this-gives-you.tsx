'use client'

import { useMemo } from 'react'
import { FileCheck, Layers, Repeat, ShieldAlert, Target } from 'lucide-react'
import {
  computeLeverage,
  responsesFromScoring,
  type ScoringResult,
} from '@/lib/assessment-engine'
import { FadeUp } from './fade-up'

/**
 * "What you now have" — the value of the assessment, stated in countable terms.
 *
 * Every figure here is counted from this assessment. Nothing is a projection,
 * an industry average, or a saving we invented: a compliance officer justifying
 * a renewal has to defend these numbers to a finance director, and a single
 * made-up "£X saved" turns the whole page into marketing the moment someone
 * asks where it came from.
 *
 * What is deliberately absent: hours saved, consultancy-cost comparisons, ROI
 * multiples. We have no basis for any of them.
 */
export function WhatThisGivesYou({
  scoring,
  reportPages = 7,
}: {
  scoring: ScoringResult
  reportPages?: number
}) {
  const moves = useMemo(() => {
    try {
      const responses = responsesFromScoring(scoring)
      if (Object.keys(responses).length < 40) return null
      return computeLeverage(responses, scoring.sectorWeighting?.sector)
    } catch {
      return null
    }
  }, [scoring])

  const answers = scoring.pillarScores.reduce(
    (n, p) => n + (p.questionDetails?.length ?? 0),
    0,
  )
  const findings = scoring.xRayFindings?.length ?? 0
  const moveCount = moves?.moves.length ?? 0
  const topGain = moves?.moves[0]?.scoreDelta

  const items = [
    {
      icon: Layers,
      stat: answers > 0 ? `${answers} answers` : '8 areas',
      body: `turned into ${scoring.pillarScores.length} weighted area scores using a published method, with the sector weighting applied and shown.`,
    },
    {
      icon: ShieldAlert,
      stat: `${findings} structural ${findings === 1 ? 'finding' : 'findings'}`,
      body:
        findings > 0
          ? 'detected from how your answers combine — patterns no single question reveals, each carrying the evidence behind it.'
          : 'detected. No cross-cutting failure patterns showed up in how your answers combine.',
    },
    {
      icon: Target,
      stat: moveCount > 0 ? `${moveCount} ranked moves` : 'Ranked moves',
      body:
        topGain != null
          ? `each re-scored through the full pipeline, so the gain is exact rather than estimated. The top one is worth ${topGain.toFixed(1)} points.`
          : 'each re-scored through the full pipeline, so the gain is exact rather than estimated.',
    },
    {
      icon: FileCheck,
      stat: `${reportPages}-page report`,
      body: 'you can hand to a board or an auditor without rewriting it, including the methodology and its limits.',
    },
    {
      icon: Repeat,
      stat: 'Reproducible arithmetic —',
      body: `the same answers always produce the same score, and the version that produced it (${scoring.scoringVersion}) is recorded, so a number you quoted six months ago can still be defended.`,
    },
  ]

  return (
    <FadeUp>
      <section
        aria-label="What this assessment produced"
        className="rounded-2xl border border-white/[0.08] bg-navy-800/40 p-5 sm:p-7"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
          What you now have
        </p>

        <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {items.map(({ icon: Icon, stat, body }) => (
            <div key={stat} className="flex gap-3.5">
              <span
                aria-hidden
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03]"
              >
                <Icon className="h-3.5 w-3.5 text-slate-300" strokeWidth={1.75} />
              </span>
              <p className="font-sans text-[13.5px] leading-relaxed text-slate-300">
                <span className="font-heading font-semibold text-slate-100">{stat}</span>{' '}
                {body}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-5 border-t border-white/[0.06] pt-4 font-sans text-[12.5px] leading-relaxed text-muted-foreground">
          Every figure above is counted from this assessment. We do not estimate hours saved
          or compare against consultancy fees, because we have no basis for either &mdash; and a
          number you cannot source is a number you cannot defend.
        </p>
      </section>
    </FadeUp>
  )
}
