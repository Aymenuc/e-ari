'use client'

import Link from 'next/link'
import { useEffect, useState, type ElementType, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Activity, GraduationCap, Search, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'

const AUTO_ADVANCE_MS = 5500

type SpotlightSlide = {
  id: string
  icon: ElementType
  title: string
  eyebrow: string
  description: string
  href: string
  accent: string
}

const SLIDES: SpotlightSlide[] = [
  {
    id: 'pulse',
    icon: Activity,
    title: 'AI Pulse',
    eyebrow: 'Continuous monitoring',
    description:
      'Monthly readiness checks, drift alerts, and trend views—so pillar scores and risks stay current without another full assessment.',
    href: '/pulse',
    accent: '#06b6d4',
  },
  {
    id: 'literacy',
    icon: GraduationCap,
    title: 'Literacy Hub',
    eyebrow: 'Role-based learning',
    description:
      'Micro-lessons and paths tuned to seniority and gaps—close the talent pillar without generic training catalogs.',
    href: '/literacy',
    accent: '#06b6d4',
  },
  {
    id: 'discovery',
    icon: Search,
    title: 'Discovery',
    eyebrow: 'Stakeholder interviews',
    description:
      'Structured, adaptive interviews capture context questionnaires miss—mapped back to readiness themes and gaps.',
    href: '/discovery',
    accent: '#3b82f6',
  },
  {
    id: 'assistant',
    icon: MessageSquare,
    title: 'Assistant',
    eyebrow: 'Context-aware guidance',
    description:
      'Answers methodology questions and steers next steps using your assessment context—available throughout the journey.',
    href: '/assessment',
    accent: '#ec4899',
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

  return (
    <ParallaxSectionShell>
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-block font-mono text-xs tracking-widest uppercase text-eari-blue/70 mb-3">
            Platform
          </span>
          <h2 id="product-spotlight-heading" className="font-heading text-3xl sm:text-4xl font-bold gradient-text-blue">
            AI modules: Pulse, Literacy, Discovery &amp; Assistant
          </h2>
          <p className="mt-4 text-lg text-muted-foreground font-sans">
            Core AI surfaces in one glance—deep dives live on each product page.
          </p>
        </div>

        <div
          className="max-w-3xl mx-auto"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false)
          }}
        >
          <div
            className="relative rounded-2xl border border-white/[0.06] bg-navy-800/50 backdrop-blur-sm overflow-hidden min-h-[280px] sm:min-h-[240px]"
            role="region"
            aria-labelledby="product-spotlight-heading"
            aria-roledescription="carousel"
            aria-label="Product highlights"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={slide.id}
                id={`spotlight-slide-${slide.id}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${slide.title}. ${slide.description}`}
                initial={prefersReducedMotion ? false : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
                transition={
                  prefersReducedMotion ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' }
                }
                className="p-8 sm:p-10 flex flex-col sm:flex-row sm:items-start gap-6"
              >
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/[0.08]"
                  style={{ backgroundColor: `${slide.accent}18`, boxShadow: `0 0 24px ${slide.accent}12` }}
                >
                  <Icon className="h-7 w-7" style={{ color: slide.accent }} aria-hidden />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/70">{slide.eyebrow}</p>
                  <h3 className="mt-1 font-heading text-2xl font-bold text-foreground">{slide.title}</h3>
                  <p className="mt-3 text-muted-foreground font-sans leading-relaxed">{slide.description}</p>
                  <div className="mt-6">
                    <Link href={slide.href}>
                      <Button className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading font-semibold">
                        Open {slide.title}
                        <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Progress dots */}
            <div className="flex justify-center gap-2 pb-6 px-4" aria-label="Slide indicators">
              {SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-current={i === index ? 'true' : undefined}
                  className={`h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eari-blue focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900 ${
                    i === index ? 'w-8 bg-eari-blue' : 'w-2 bg-white/20 hover:bg-white/35'
                  }`}
                  onClick={() => setIndex(i)}
                  aria-label={`Show slide: ${s.title}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </ParallaxSectionShell>
  )
}

/** Matches landing ParallaxSection styling without pulling scroll hooks into every consumer */
function ParallaxSectionShell({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="section-gradient-separator" aria-hidden="true">
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      </div>
      <section className="relative py-20 sm:py-28 bg-navy-800/30 overflow-hidden" id="product-spotlight">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.04]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }}
          />
        </div>
        {children}
      </section>
    </>
  )
}
