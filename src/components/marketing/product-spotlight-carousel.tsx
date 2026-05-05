'use client'

import Link from 'next/link'
import { useEffect, useState, type ElementType, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  Activity,
  GraduationCap,
  Search,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Interval between slide advances (pause on hover/focus; disabled when reduced motion). */
const AUTO_ADVANCE_MS = 3500

type SpotlightSlide = {
  id: string
  icon: ElementType
  title: string
  shortLabel: string
  eyebrow: string
  description: string
  href: string
  accent: string
  accentSoft: string
}

const SLIDES: SpotlightSlide[] = [
  {
    id: 'pulse',
    icon: Activity,
    title: 'AI Pulse',
    shortLabel: 'Pulse',
    eyebrow: 'Continuous monitoring',
    description:
      'Monthly readiness checks, drift alerts, and trend views—so pillar scores and risks stay current without another full assessment.',
    href: '/pulse',
    accent: '#22d3ee',
    accentSoft: 'rgba(34, 211, 238, 0.12)',
  },
  {
    id: 'literacy',
    icon: GraduationCap,
    title: 'Literacy Hub',
    shortLabel: 'Literacy',
    eyebrow: 'Role-based learning',
    description:
      'Micro-lessons and paths tuned to seniority and gaps—close the talent pillar without generic training catalogs.',
    href: '/literacy',
    accent: '#38bdf8',
    accentSoft: 'rgba(56, 189, 248, 0.12)',
  },
  {
    id: 'discovery',
    icon: Search,
    title: 'Discovery',
    shortLabel: 'Discovery',
    eyebrow: 'Stakeholder interviews',
    description:
      'Structured, adaptive interviews capture context questionnaires miss—mapped back to readiness themes and gaps.',
    href: '/discovery',
    accent: '#60a5fa',
    accentSoft: 'rgba(96, 165, 250, 0.14)',
  },
  {
    id: 'assistant',
    icon: MessageSquare,
    title: 'Assistant',
    shortLabel: 'Assistant',
    eyebrow: 'Context-aware guidance',
    description:
      'Answers methodology questions and steers next steps using your assessment context—available throughout the journey.',
    href: '/assessment',
    accent: '#f472b6',
    accentSoft: 'rgba(244, 114, 182, 0.12)',
  },
]

export function ProductSpotlightCarousel() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (paused || prefersReducedMotion) return
    const id = window.setTimeout(() => {
      setIndex((i) => (i + 1) % SLIDES.length)
    }, AUTO_ADVANCE_MS)
    return () => clearTimeout(id)
  }, [paused, prefersReducedMotion, index])

  const slide = SLIDES[index]
  const Icon = slide.icon

  const go = (dir: -1 | 1) => {
    setIndex((i) => (i + dir + SLIDES.length) % SLIDES.length)
  }

  const hoverHandlers = {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocusCapture: () => setPaused(true),
    onBlurCapture: (e: React.FocusEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false)
    },
  }

  return (
    <ParallaxSectionShell>
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="mb-3 inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-eari-blue-light/80">
            Platform
          </span>
          <h2
            id="product-spotlight-heading"
            className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Explore the AI toolkit
          </h2>
          <p className="mt-3 font-sans text-base text-muted-foreground sm:text-lg">
            Four modules that surface the platform between assessments — Pulse, Literacy, Discovery, and Assistant. Pick one or let the carousel introduce each.
          </p>
        </div>

        <div className="mx-auto max-w-4xl" {...hoverHandlers}>
          {/* Tab strip — always visible */}
          <div
            className="mb-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
            role="tablist"
            aria-label="Product modules"
          >
            {SLIDES.map((s, i) => {
              const TabIcon = s.icon
              const active = i === index
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`spotlight-panel-${s.id}`}
                  id={`spotlight-tab-${s.id}`}
                  onClick={() => setIndex(i)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eari-blue focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900 ${
                    active
                      ? 'border-transparent bg-white/[0.09] text-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'
                      : 'border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/10 hover:bg-white/[0.04] hover:text-foreground'
                  }`}
                  style={
                    active
                      ? {
                          boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 12px 40px -12px ${s.accent}44`,
                        }
                      : undefined
                  }
                >
                  <TabIcon className="h-4 w-4 shrink-0" style={{ color: active ? s.accent : undefined }} aria-hidden />
                  <span className="font-heading">{s.shortLabel}</span>
                </button>
              )
            })}
          </div>

          <div
            className="relative rounded-[1.75rem] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(15,23,42,0.92)_0%,rgba(17,24,39,0.85)_45%,rgba(15,23,42,0.95)_100%)] p-[1px] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.65)] backdrop-blur-xl"
            role="region"
            aria-labelledby="product-spotlight-heading"
            aria-roledescription="carousel"
            aria-label="Product highlights"
          >
            <div
              className="relative overflow-hidden rounded-[1.7rem] bg-navy-900/40"
              style={{
                boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.04), inset 0 -80px 120px -80px ${slide.accentSoft}`,
              }}
            >
              {/* Accent glow */}
              <div
                className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl"
                style={{ background: slide.accent, opacity: 0.07 }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full blur-3xl"
                style={{ background: '#2563eb', opacity: 0.05 }}
                aria-hidden
              />

              {/* Prev / next */}
              <div className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 sm:block">
                <button
                  type="button"
                  aria-label="Previous module"
                  onClick={() => go(-1)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-navy-950/80 text-muted-foreground backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eari-blue"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              </div>
              <div className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 sm:block">
                <button
                  type="button"
                  aria-label="Next module"
                  onClick={() => go(1)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-navy-950/80 text-muted-foreground backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eari-blue"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={slide.id}
                  id={`spotlight-panel-${slide.id}`}
                  role="tabpanel"
                  aria-labelledby={`spotlight-tab-${slide.id}`}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={
                    prefersReducedMotion ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
                  }
                  className="relative px-6 pb-10 pt-10 sm:px-14 sm:pb-12 sm:pt-12"
                >
                  <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-10">
                    <div
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/[0.07] sm:h-[4.5rem] sm:w-[4.5rem]"
                      style={{
                        background: `linear-gradient(135deg, ${slide.accentSoft}, transparent)`,
                        boxShadow: `0 8px 32px -8px ${slide.accent}33`,
                      }}
                    >
                      <Icon className="h-8 w-8 sm:h-9 sm:w-9" style={{ color: slide.accent }} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground/75">
                        {slide.eyebrow}
                      </p>
                      <h3 className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                        {slide.title}
                      </h3>
                      <p className="mt-4 max-w-xl font-sans text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                        {slide.description}
                      </p>
                      <div className="mt-8">
                        <Link href={slide.href}>
                          <Button
                            size="lg"
                            className="rounded-xl bg-eari-blue px-6 font-heading font-semibold text-white shadow-[0_12px_40px_-12px_rgba(37,99,235,0.55)] hover:bg-eari-blue-dark"
                          >
                            Open {slide.title}
                            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile prev/next */}
          <div className="mt-6 flex justify-center gap-4 sm:hidden">
            <button
              type="button"
              aria-label="Previous module"
              onClick={() => go(-1)}
              className="rounded-full border border-white/10 px-5 py-2 text-sm text-muted-foreground hover:bg-white/5"
            >
              Previous
            </button>
            <button
              type="button"
              aria-label="Next module"
              onClick={() => go(1)}
              className="rounded-full border border-white/10 px-5 py-2 text-sm text-muted-foreground hover:bg-white/5"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </ParallaxSectionShell>
  )
}

function ParallaxSectionShell({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="section-gradient-separator" aria-hidden="true">
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/15 to-transparent" />
      </div>
      <section className="relative overflow-hidden bg-navy-900/20 py-20 sm:py-28" id="product-spotlight">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div
            className="absolute left-1/2 top-0 h-[420px] w-[min(100%,720px)] -translate-x-1/2 opacity-[0.07]"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 50% 0%, rgb(56, 189, 248) 0%, transparent 65%)',
            }}
          />
        </div>
        {children}
      </section>
    </>
  )
}
