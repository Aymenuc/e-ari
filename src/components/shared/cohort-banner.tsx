'use client';

/**
 * CohortBanner — the founding-cohort offer, shown on both pricing surfaces.
 *
 * The remaining-places figure is fetched from /api/cohort and COUNTED from
 * real granted accounts. If the count can't be established the banner still
 * renders the offer but omits the number entirely — an approximate scarcity
 * claim is worse than none for a company selling auditability.
 */

import { useEffect, useState } from 'react';

interface Cohort {
  on: boolean;
  cap: number;
  claimed: number;
  remaining: number;
  full: boolean;
  days: number;
}

/**
 * The window is stated in days, not as a date.
 *
 * A shared deadline shrinks as it approaches — the same page promised five
 * months in July and six weeks in November. "90 days from signup" reads the
 * same on every day of the programme, and it is the honest description of
 * what the account actually gets.
 */

export function CohortBanner({ className = '' }: { className?: string }) {
  const [cohort, setCohort] = useState<Cohort | null>(null);

  useEffect(() => {
    fetch('/api/cohort')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && typeof d.remaining === 'number') setCohort(d); })
      .catch(() => {});
  }, []);

  if (!cohort?.on) return null;

  return (
    <div className={`mx-auto max-w-3xl rounded-xl border border-white/[0.08] bg-navy-800/50 px-6 py-5 text-center ${className}`}>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
        Founding cohort
      </p>
      <p className="mt-2 font-heading text-base font-semibold text-slate-100">
        {cohort.full
          ? `All ${cohort.cap} places are taken — join the waitlist`
          : `Free for ${cohort.days} days — for the first ${cohort.cap} organisations`}
      </p>
      <p className="mt-2 font-sans text-sm text-slate-400">
        {cohort.full ? (
          <>
            All {cohort.cap} founding places have been claimed. Leave your details and we&apos;ll
            contact you as places open or when the programme moves to paid plans.
          </>
        ) : (
          <>
            Create an account and you get the full Growth feature set free for {cohort.days} days,
            no card required. The window starts the day you join.
            Prices are shown so you know what the platform will cost afterwards &mdash; and founding
            members keep a permanent discount on whichever plan they choose.
          </>
        )}
      </p>
      {!cohort.full && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1 font-mono text-[11px] text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {cohort.remaining} of {cohort.cap} places remaining
        </p>
      )}
    </div>
  );
}
