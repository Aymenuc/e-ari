'use client';

/**
 * TeachingEmptyState — the first-run coaching that replaces "Nothing here yet".
 *
 * Deliberately NOT a product tour. Modal tours interrupt before the user has
 * formed the question, and get dismissed on reflex. This teaches at the exact
 * moment the question exists: the user is standing at a door they have never
 * opened. Three things, always in this order:
 *
 *   1. What this gives you        (the payoff — why bother at all)
 *   2. What it needs from you     (the concrete input — the actual blocker)
 *   3. One button                 (no competing choices)
 *
 * The "needs" list is the part that matters. Most first-run abandonment is
 * not "I don't understand the feature", it is "I don't know what file to
 * upload", so we name the file.
 */

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export function TeachingEmptyState({
  icon: Icon,
  headline,
  payoff,
  needs,
  action,
  footnote,
}: {
  icon: LucideIcon;
  /** What the user walks away with. Written as an outcome, not a feature. */
  headline: string;
  payoff: string;
  /** The concrete inputs required — name real files and real sources. */
  needs: string[];
  action?: ReactNode;
  footnote?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-xl rounded-xl border border-white/[0.07] bg-navy-900/40 px-6 py-8 text-center"
    >
      <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03]">
        <Icon className="h-5 w-5 text-slate-300" strokeWidth={1.75} />
      </span>

      <h3 className="font-heading text-[17px] font-semibold tracking-tight text-slate-100">
        {headline}
      </h3>
      <p className="mx-auto mt-2 max-w-md font-sans text-[13.5px] leading-relaxed text-muted-foreground">
        {payoff}
      </p>

      {needs.length > 0 && (
        <div className="mx-auto mt-5 max-w-md rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-left">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-slate-500">
            What you need
          </p>
          <ul className="mt-2 space-y-1.5">
            {needs.map((n) => (
              <li key={n} className="flex items-start gap-2 font-sans text-[12.5px] leading-snug text-slate-300">
                <span aria-hidden className="mt-[6px] h-1 w-1 flex-shrink-0 rounded-full bg-slate-500" />
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}

      {action && <div className="mt-6 flex justify-center">{action}</div>}

      {footnote && (
        <p className="mt-4 font-sans text-[11.5px] text-muted-foreground/70">{footnote}</p>
      )}
    </motion.div>
  );
}
