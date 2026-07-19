'use client';

/**
 * ResultsTabs — the report's information architecture.
 *
 * Replaces the scrollspy nav + 18,000px single column with VIEWS: one
 * reader-job per tab. "Where do we stand" (Overview), "what do we do"
 * (Action Plan), "what are we exposed to" (Compliance), "what did the
 * engine find" (Insights & Findings), "how do we compare / what did we
 * earn" (Benchmark). Sticky segmented control, keyboard accessible,
 * animated underline, scrolls to top on switch.
 */

import { motion } from 'framer-motion';

export interface ResultsTab {
  id: string;
  label: string;
}

export function ResultsTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: ResultsTab[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <nav
      aria-label="Report views"
      className="sticky top-0 z-40 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-navy-900/90 backdrop-blur-md border-b border-white/[0.06]"
    >
      <div role="tablist" className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                onChange(t.id);
                window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
              }}
              className={`relative whitespace-nowrap rounded-md px-3.5 py-2 font-heading text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50 ${
                isActive ? 'text-slate-50' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
              {isActive && (
                <motion.span
                  layoutId="results-tab-underline"
                  className="absolute inset-x-2 -bottom-[9px] h-[2px] rounded-full bg-slate-100"
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
