'use client'

/**
 * HowScoringWorks — the eight-step deterministic pipeline as a living
 * timeline. A spine draws itself down the section as you scroll; each step's
 * node ignites in sequence, its card slides in, and hovering any step lights
 * it in the pipeline's gradient. Step 08 (Simulate) closes with the exact-
 * gain chip — the product's signature claim, planted in the methodology.
 */

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ClipboardList, Scale, SlidersHorizontal, ScanSearch, Building2, Calculator, Tag, TrendingUp,
} from 'lucide-react'

interface PipelineStep {
  icon: typeof ClipboardList
  label: string
  desc: string
  chip?: string
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    icon: ClipboardList,
    label: 'Capture',
    desc: 'Forty Likert items (1–5), five per pillar — validated complete before scoring runs.',
  },
  {
    icon: Scale,
    label: 'Normalize',
    desc: 'Each pillar mapped to 0–100 from its raw total using fixed bounds — transparent formula, no black box.',
  },
  {
    icon: SlidersHorizontal,
    label: 'Adjust',
    desc: 'Six documented cross-pillar rules fire — weak governance reins technology, weak data reins strategy, weak culture reins process, and three more.',
  },
  {
    icon: ScanSearch,
    label: 'X-Ray',
    desc: 'Eight structural detectors scan the response combinations for failure patterns — Shadow IT Risk, Compliance Cliff, Pilot Purgatory, Ambition Gap, and more. Each finding carries evidence and a concrete next move.',
  },
  {
    icon: Building2,
    label: 'Sector-weight',
    desc: 'Pillar weights are re-balanced for your sector — healthcare emphasises governance and risk, retail emphasises data and process. Renormalised so weights still sum to 1.',
  },
  {
    icon: Calculator,
    label: 'Composite',
    desc: 'Sector-weighted pillars combine into one E-ARI composite, alongside the unweighted baseline so you can see how sector context moved the number.',
  },
  {
    icon: Tag,
    label: 'Classify',
    desc: 'Overall maturity band — Laggard through Pacesetter — and every X-Ray finding is then handed to the agents as the grounding evidence for your tailored report.',
  },
  {
    icon: TrendingUp,
    label: 'Simulate',
    desc: 'The pipeline re-runs with each answer improved one step, computing the exact score gain per move. Your results rank the highest-leverage improvements and the shortest simulated path to the next maturity band — reproducible arithmetic, not analyst opinion.',
    chip: 'exact gains · e.g. +2.4 pts',
  },
]

function FadeUpBlock({
  children,
  className,
  delay = 0,
  reducedMotion,
}: {
  children: ReactNode
  className?: string
  delay?: number
  reducedMotion: boolean | null
}) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-48px' }}
      transition={
        reducedMotion ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay }
      }
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function HowScoringWorks() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <FadeUpBlock reducedMotion={prefersReducedMotion}>
        <div className="text-center max-w-2xl mx-auto">
          <div className="mb-5 flex items-center justify-center gap-3">
            <span aria-hidden className="h-px w-8 bg-gradient-to-r from-eari-blue/10 via-eari-blue/70 to-violet-400/70" />
            <span
              id="how-scoring-works-heading"
              className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400"
            >
              Deterministic engine
            </span>
            <span aria-hidden className="h-px w-8 bg-gradient-to-r from-eari-blue/10 via-eari-blue/70 to-violet-400/70" />
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-slate-50">
            How Scoring Works
          </h2>
          <p className="mt-4 text-[17px] text-slate-400 font-sans leading-relaxed">
            Eight steps from your answers to a defensible score. Every one of them is published,
            versioned, and reproducible &mdash; the same inputs always produce the same number.
          </p>
        </div>
      </FadeUpBlock>

      <div role="region" aria-labelledby="how-scoring-works-heading" className="relative mx-auto mt-14 max-w-3xl lg:mt-16">
        {/* The spine — draws itself down the timeline as it enters view */}
        <div aria-hidden className="absolute left-[19px] top-2 bottom-2 w-px bg-white/[0.05]" />
        <motion.div
          aria-hidden
          className="absolute left-[19px] top-2 w-px origin-top bg-gradient-to-b from-sky-400/70 via-indigo-400/50 to-violet-400/40"
          style={{ bottom: 8 }}
          initial={{ scaleY: prefersReducedMotion ? 1 : 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, margin: '-15% 0px -35% 0px' }}
          transition={{ duration: prefersReducedMotion ? 0 : 2.2, ease: [0.22, 1, 0.36, 1] }}
        />

        <ol className="space-y-2">
          {PIPELINE_STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <FadeUpBlock key={step.label} reducedMotion={prefersReducedMotion} delay={i * 0.08}>
                <li className="group relative flex gap-5 rounded-lg py-3.5 pl-1 pr-3 transition-colors duration-200 hover:bg-white/[0.02]">
                  {/* Node */}
                  <div className="relative z-[1] flex-shrink-0">
                    <motion.div
                      className="flex h-10 w-10 items-center justify-center rounded-lg border bg-[#0c1220] transition-colors duration-200 group-hover:border-eari-blue/50"
                      initial={prefersReducedMotion ? false : { borderColor: 'rgba(255,255,255,0.07)' }}
                      whileInView={prefersReducedMotion ? {} : { borderColor: ['rgba(255,255,255,0.07)', 'rgba(96,165,250,0.65)', 'rgba(255,255,255,0.12)'] }}
                      viewport={{ once: true, margin: '-25% 0px -25% 0px' }}
                      transition={{ duration: 1.1, times: [0, 0.4, 1], delay: i * 0.05 }}
                    >
                      <Icon className="h-[18px] w-[18px] text-slate-400 transition-colors duration-200 group-hover:text-sky-300" strokeWidth={1.75} aria-hidden />
                    </motion.div>
                  </div>

                  {/* Copy */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span className="font-mono text-[10px] font-bold tabular-nums text-slate-400">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h3 className="font-heading text-[15px] font-semibold tracking-tight text-slate-100 transition-colors duration-200 group-hover:text-white">
                        {step.label}
                      </h3>
                      {step.chip && (
                        <span className="rounded-full border border-emerald-500/25 bg-emerald-500/[0.07] px-2 py-0.5 font-mono text-[9px] text-emerald-300">
                          {step.chip}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-sans text-[13px] leading-relaxed text-muted-foreground/88">
                      {step.desc}
                    </p>
                  </div>
                </li>
              </FadeUpBlock>
            )
          })}
        </ol>

        <FadeUpBlock reducedMotion={prefersReducedMotion} delay={0.2}>
          <p className="mt-10 text-center text-xs text-muted-foreground/50 font-mono tracking-wide">
            Same answers in, same score out — versioned v5.3, auditable end to end.
          </p>
        </FadeUpBlock>
      </div>
    </div>
  )
}
