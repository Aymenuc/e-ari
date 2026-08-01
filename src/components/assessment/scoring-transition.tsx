'use client'

/**
 * The hand-off from the last question to the score.
 *
 * Submitting used to spin a button for six seconds and then hard-navigate to a
 * page that fetched again — two dead moments back to back, at the exact point
 * the product finally has something to say. The work happening in those six
 * seconds is the most defensible thing E-ARI does, and it was invisible.
 *
 * So the stages below are the real pipeline out of assessment-engine.ts, in
 * order, not decorative loading copy. They advance on a timer because the
 * server does not stream progress — which is honest as long as the last stage
 * waits for the actual response rather than pretending to finish. It does: the
 * score only appears once the PUT resolves, and the sequence holds on the final
 * stage for as long as the server takes.
 */

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'

/** The seven steps scoreAssessment() actually runs, in its order. */
const STAGES = [
  'Checking every question is answered',
  'Scoring the eight pillars',
  'Applying interdependency rules',
  'Computing the unweighted baseline',
  'Applying sector weighting',
  'Classifying the maturity band',
  'Detecting structural patterns',
] as const

const EASE = [0.22, 1, 0.36, 1] as const

export function ScoringTransition({
  open, score, onRevealed,
}: {
  open: boolean
  /** Set once the server responds; until then the last stage holds. */
  score: number | null
  /** Called after the number has been read, to continue to the results. */
  onRevealed: () => void
}) {
  return (
    <AnimatePresence>
      {open && <ScoringPanel score={score} onRevealed={onRevealed} />}
    </AnimatePresence>
  )
}

function ScoringPanel({
  score, onRevealed,
}: {
  score: number | null
  onRevealed: () => void
}) {
  const reduce = useReducedMotion()
  const [stage, setStage] = useState(0)
  const [shown, setShown] = useState(0)
  const revealed = useRef(false)

  // Walk the stages while the request is in flight, stopping one short so the
  // final tick belongs to the real response rather than the clock.
  useEffect(() => {
    if (score !== null) return
    const t = setInterval(() => {
      setStage(s => (s < STAGES.length - 1 ? s + 1 : s))
    }, reduce ? 120 : 620)
    return () => clearInterval(t)
  }, [score, reduce])

  // Count up to the score, then hand over. `stage` is not touched here — once
  // score is non-null every row reads as done from score alone.
  useEffect(() => {
    if (score === null || revealed.current) return
    revealed.current = true
    // Both paths write through the frame callback rather than the effect body:
    // at DUR 0 the first frame lands the final value, so reduced motion gets
    // the number immediately without a synchronous setState here.
    const start = performance.now()
    const DUR = reduce ? 0 : 1100
    let raf = 0
    const tick = (now: number) => {
      const p = DUR === 0 ? 1 : Math.min(1, (now - start) / DUR)
      const eased = 1 - Math.pow(1 - p, 3)
      setShown(score * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const t = setTimeout(onRevealed, reduce ? 900 : DUR + 950)
    return () => { cancelAnimationFrame(raf); clearTimeout(t) }
  }, [score, reduce, onRevealed])

  return (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-center bg-navy-900"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          role="status"
          aria-live="polite"
          aria-label={score === null ? 'Scoring your assessment' : `Your score is ${Math.round(score)} out of 100`}
        >
          <div className="w-full max-w-md px-8">
            {/* The number, once there is one. Shares a view-transition-name
                with the results hero so browsers that support it morph the
                figure across the navigation instead of cutting. */}
            <div className="mb-10 flex h-[132px] items-end justify-center">
              <AnimatePresence mode="wait">
                {score === null ? (
                  <motion.div
                    key="pulse"
                    className="h-[132px] w-[132px] rounded-full border border-white/[0.07]"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={reduce ? { opacity: 1, scale: 1 } : { opacity: [0.35, 0.75, 0.35], scale: [0.97, 1.01, 0.97] }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={reduce ? { duration: 0.2 } : { duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
                  />
                ) : (
                  <motion.div
                    key="score"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    className="text-center"
                    style={{ viewTransitionName: 'eari-score' }}
                  >
                    <div className="font-heading text-[104px] font-semibold leading-none tracking-[-0.04em] text-slate-50 tabular-nums">
                      {Math.round(shown)}
                    </div>
                    <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">
                      out of 100
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <ol className="space-y-2.5">
              {STAGES.map((label, i) => {
                const done = i < stage || score !== null
                const active = i === stage && score === null
                return (
                  <li key={label} className="flex items-center gap-3">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
                        done ? 'border-transparent bg-emerald-500/80'
                          : active ? 'border-slate-400' : 'border-white/[0.10]'
                      }`}
                    >
                      {done && <Check className="h-2.5 w-2.5 text-navy-900" />}
                    </span>
                    <motion.span
                      className={`font-sans text-sm ${
                        done ? 'text-slate-400' : active ? 'text-slate-100' : 'text-slate-600'
                      }`}
                      animate={active && !reduce ? { opacity: [0.65, 1, 0.65] } : { opacity: 1 }}
                      transition={active && !reduce ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : undefined}
                    >
                      {label}
                    </motion.span>
                  </li>
                )
              })}
            </ol>

            <p className="mt-8 border-t border-white/[0.06] pt-5 text-center font-sans text-[12px] leading-relaxed text-slate-500">
              Reproducible arithmetic on a published methodology. The same
              answers always produce the same score.
            </p>
          </div>
        </motion.div>
  )
}
