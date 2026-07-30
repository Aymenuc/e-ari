'use client'

import { AlertTriangle, CalendarClock, Eye, Target } from 'lucide-react'
import type { ScoringResult } from '@/lib/assessment-engine'
import { buildPlainSummary } from '@/lib/plain-summary'
import { FadeUp } from './fade-up'

/**
 * "What this means" — the first thing on the results page.
 *
 * Before this, the page opened with a number, an invented rank name, a version
 * string and a weighting delta. All four are meaningful to whoever built the
 * engine and opaque to the officer who has to act on the result, so the reader
 * had to get nine screens in before anything told them what to do.
 *
 * Everything here is derived from the same scores the charts below use, so the
 * prose can never drift from the numbers. No model call, so it is identical on
 * every load and safe to read aloud in a meeting.
 */
export function WhatThisMeans({ scoring }: { scoring: ScoringResult }) {
  const s = buildPlainSummary(scoring)

  const rows = [
    { icon: Target, label: 'Where you stand', text: s.headline },
    { icon: AlertTriangle, label: 'What is holding it back', text: s.constraint },
    { icon: Eye, label: 'What a reviewer sees first', text: s.regulatorView },
    { icon: CalendarClock, label: 'How long you have', text: s.timing },
  ].filter((r) => r.text)

  return (
    <FadeUp>
      <section
        aria-label="What this result means"
        className="rounded-2xl border border-white/[0.08] bg-navy-800/40 p-5 sm:p-7"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
          What this means
        </p>

        <div className="mt-4 space-y-4">
          {rows.map(({ icon: Icon, label, text }) => (
            <div key={label} className="flex gap-3.5">
              <span
                aria-hidden
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03]"
              >
                <Icon className="h-3.5 w-3.5 text-slate-300" strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <p className="font-heading text-[12.5px] font-semibold text-slate-300">{label}</p>
                <p className="mt-0.5 font-sans text-[14.5px] leading-relaxed text-slate-100">
                  {text}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-5 border-t border-white/[0.06] pt-4 font-sans text-[12.5px] leading-relaxed text-muted-foreground">
          This is a readiness measurement, not a legal opinion. It tells you where your
          controls stand against the practices the EU AI Act expects — it does not determine
          whether you are compliant, which depends on how your specific systems are classified.
        </p>
      </section>
    </FadeUp>
  )
}
