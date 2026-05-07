'use client'

import type { ElementType, ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ClipboardList, Scale, SlidersHorizontal, ScanSearch, Building2, Calculator, Tag } from 'lucide-react'

type PipelineStep = {
  icon: ElementType
  label: string
  desc: string
}

/**
 * Mirrors `scoreAssessment` in assessment-engine.ts: validate → pillar normalize →
 * 6 interdependency rules → X-Ray pattern detection → sector weighting →
 * weighted composite → maturity band.
 */
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
    <div className="relative">
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeUpBlock reducedMotion={prefersReducedMotion}>
          <div className="mx-auto mb-12 max-w-2xl text-center lg:mb-14">
            <div className="mb-5 flex items-center justify-center gap-3">
              <span aria-hidden className="h-px w-8 bg-eari-blue/60" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-eari-blue-light/90">
                Pipeline
              </span>
              <span aria-hidden className="h-px w-8 bg-eari-blue/60" />
            </div>
            <h2
              id="how-scoring-works-heading"
              className="font-heading text-3xl font-semibold tracking-[-0.03em] text-slate-50 sm:text-4xl"
            >
              How Scoring Works
            </h2>
            <p className="mt-4 font-sans text-[15px] leading-relaxed text-muted-foreground/90 sm:text-[17px]">
              Same path as production: normalize, apply six cross-pillar rules, X-Ray for structural patterns,
              re-weight by sector, composite, classify — deterministic and versioned.
            </p>
          </div>
        </FadeUpBlock>

        <FadeUpBlock delay={0.06} reducedMotion={prefersReducedMotion}>
          <div role="region" aria-labelledby="how-scoring-works-heading">
            <ol className="m-0 mx-auto max-w-2xl list-none space-y-10 p-0 sm:space-y-11">
              {PIPELINE_STEPS.map((step, i) => {
                const Icon = step.icon
                return (
                  <motion.li
                    key={step.label}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-24px' }}
                    transition={{ duration: 0.38, delay: i * 0.04 }}
                    className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 sm:gap-x-5"
                  >
                    <span className="pt-1 text-right font-mono text-[11px] font-semibold tabular-nums tracking-wide text-eari-blue-light/85 sm:w-8 sm:pt-1.5">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <h3 className="flex items-center gap-2 font-heading text-[15px] font-semibold tracking-tight text-slate-100 sm:text-base">
                        <Icon className="h-4 w-4 shrink-0 text-slate-500 opacity-90" strokeWidth={1.75} aria-hidden />
                        {step.label}
                      </h3>
                      <p className="mt-2 font-sans text-[13px] leading-relaxed text-muted-foreground/88 sm:text-[14px]">
                        {step.desc}
                      </p>
                    </div>
                  </motion.li>
                )
              })}
            </ol>

            <p className="mx-auto mt-12 max-w-2xl text-center font-sans text-[13px] leading-relaxed text-muted-foreground/82 sm:mt-14 sm:text-[14px]">
              <span className="font-medium text-slate-200">Output </span>
              — one composite score, one maturity band, structural patterns with evidence, and the sector weighting that produced the number. Methodology version is stored with each assessment for audit replay.
            </p>
          </div>
        </FadeUpBlock>
      </div>
    </div>
  )
}
