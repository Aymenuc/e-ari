'use client'

import type { ElementType, ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ClipboardList,
  Scale,
  Weight,
  SlidersHorizontal,
  Calculator,
  Tag,
} from 'lucide-react'

type PipelineStep = {
  icon: ElementType
  label: string
  desc: string
}

const PIPELINE_STEPS: PipelineStep[] = [
  { icon: ClipboardList, label: 'Questionnaire', desc: '40 Likert-scale questions across 8 pillars' },
  { icon: Scale, label: 'Normalize', desc: 'Raw scores normalized to 0-100 scale per pillar' },
  { icon: Weight, label: 'Weight', desc: 'Apply calibrated pillar weights (sum = 1.0)' },
  { icon: SlidersHorizontal, label: 'Adjust', desc: 'Cross-pillar correlation and boundary adjustments' },
  { icon: Calculator, label: 'Score', desc: 'Weighted aggregate E-ARI composite score' },
  { icon: Tag, label: 'Classify', desc: 'Assign maturity band: Laggard → Pacesetter' },
]

/** Single accent family — avoids rainbow chrome competing across steps (aligned with spotlight discipline). */
const ACCENT = '#38bdf8'
const ACCENT_SOFT = 'rgba(56, 189, 248, 0.12)'

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
      initial={reducedMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-48px' }}
      transition={
        reducedMotion ? { duration: 0 } : { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }
      }
      className={className}
    >
      {children}
    </motion.div>
  )
}

function PipelineStepIconWell({
  index,
  Icon,
  prefersReducedMotion,
}: {
  index: number
  Icon: ElementType
  prefersReducedMotion: boolean | null
}) {
  return (
    <motion.div
      className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/[0.07] md:h-[3.75rem] md:w-[3.75rem]"
      style={{
        background: `linear-gradient(135deg, ${ACCENT_SOFT}, transparent)`,
        boxShadow: `0 8px 28px -10px ${ACCENT}33`,
      }}
      whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <Icon className="h-6 w-6 md:h-7 md:w-7" style={{ color: ACCENT }} aria-hidden />
      <span
        className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-eari-blue/95 px-1 font-mono text-[10px] font-semibold tabular-nums tracking-wide text-white shadow-[0_4px_12px_-4px_rgba(37,99,235,0.45)]"
        aria-hidden
      >
        {String(index + 1).padStart(2, '0')}
      </span>
    </motion.div>
  )
}

export function HowScoringWorks() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <div
          className="absolute left-1/2 top-0 h-[360px] w-[min(100%,640px)] -translate-x-1/2 opacity-[0.055]"
          style={{
            background:
              'radial-gradient(ellipse 78% 52% at 50% 0%, rgb(56, 189, 248) 0%, transparent 68%)',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeUpBlock reducedMotion={prefersReducedMotion}>
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="mb-3 inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-eari-blue-light/80">
              Pipeline
            </span>
            <h2
              id="how-scoring-works-heading"
              className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              How Scoring Works
            </h2>
            <p className="mt-3 max-w-prose mx-auto font-sans text-base leading-relaxed text-muted-foreground/90 sm:text-lg sm:leading-relaxed">
              Six deterministic steps from raw responses to maturity classification. Every stage is auditable,
              versioned, and reproducible.
            </p>
          </div>
        </FadeUpBlock>

        <FadeUpBlock delay={0.06} reducedMotion={prefersReducedMotion}>
          <div
            className="relative mx-auto max-w-5xl rounded-[1.75rem] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(15,23,42,0.92)_0%,rgba(17,24,39,0.85)_45%,rgba(15,23,42,0.95)_100%)] p-[1px] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.65)] backdrop-blur-xl"
            role="region"
            aria-labelledby="how-scoring-works-heading"
          >
            <div
              className="relative overflow-hidden rounded-[1.7rem] bg-navy-900/40 px-6 pb-11 pt-11 sm:px-10 sm:pb-14 sm:pt-14"
              style={{
                boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.04), inset 0 -72px 100px -72px ${ACCENT_SOFT}`,
              }}
            >
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl"
                style={{ background: ACCENT, opacity: 0.055 }}
                aria-hidden
              />

              <ol className="relative m-0 grid list-none grid-cols-1 items-stretch gap-4 p-0 sm:grid-cols-2 sm:gap-4 md:gap-5 lg:grid-cols-3 xl:grid-cols-6">
                {PIPELINE_STEPS.map((step, i) => {
                  const Icon = step.icon
                  const isLast = i === PIPELINE_STEPS.length - 1
                  return (
                    <li
                      key={step.label}
                      className="relative h-full min-h-[10.5rem] sm:min-h-[9.5rem] md:min-h-[12rem]"
                    >
                      {/* Narrow screens only — stacked vertical spine */}
                      {!isLast ? (
                        <div
                          className="absolute bottom-0 left-[27px] top-[3.75rem] z-0 w-px bg-gradient-to-b from-white/[0.12] via-white/[0.06] to-transparent max-sm:block sm:hidden"
                          aria-hidden
                        />
                      ) : null}

                      <div
                        className="relative z-[1] flex h-full min-h-0 flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] sm:flex-row sm:items-stretch sm:gap-4 sm:px-5 sm:py-5 md:flex-col md:items-center md:gap-0 md:px-5 md:py-6 md:text-center"
                        style={{
                          boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.03), 0 8px 28px -16px rgba(0,0,0,0.35)`,
                        }}
                      >
                        <div className="flex shrink-0 sm:items-start sm:pt-0.5 md:items-center md:pt-0">
                          <PipelineStepIconWell
                            index={i}
                            Icon={Icon}
                            prefersReducedMotion={prefersReducedMotion}
                          />
                        </div>

                        <div className="flex min-h-0 min-w-0 flex-1 flex-col sm:justify-between md:w-full md:justify-start">
                          <h3 className="font-heading text-base font-semibold leading-snug tracking-tight text-foreground sm:pt-0.5 md:pt-1">
                            {step.label}
                          </h3>
                          <p className="mt-2 max-w-prose font-sans text-base leading-relaxed text-muted-foreground/90 sm:mt-3 md:mx-auto md:mt-auto md:pt-3">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>

              <div className="mt-8 border-t border-white/[0.06] pt-8 md:mt-10 md:pt-9">
                <div className="flex min-h-[10.5rem] h-full flex-col justify-center rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] sm:min-h-[8.5rem] sm:flex-row sm:items-center sm:gap-8 sm:px-8 sm:py-7 md:min-h-[7.5rem]">
                  <p className="shrink-0 text-center font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80 sm:text-left">
                    Result
                  </p>
                  <div className="hidden h-10 w-px shrink-0 bg-white/[0.08] sm:block" aria-hidden />
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <p className="max-w-prose font-heading text-base font-semibold leading-snug tracking-tight text-foreground sm:mx-0 sm:text-lg">
                      Weighted E-ARI Composite
                    </p>
                    <p className="mt-2 font-mono text-[11px] font-medium leading-relaxed tracking-wide text-muted-foreground/85 sm:mt-1.5">
                      Maturity band assigned
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeUpBlock>
      </div>
    </div>
  )
}
