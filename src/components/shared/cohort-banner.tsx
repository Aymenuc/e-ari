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
  endsAt: string | null;
}

/** "31 December 2026" — long form reads as a commitment, not a countdown. */
function formatEnd(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function CohortBanner({ className = '' }: { className?: string }) {
  const [cohort, setCohort] = useState<Cohort | null>(null);

  useEffect(() => {
    fetch('/api/cohort')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && typeof d.remaining === 'number') setCohort(d); })
      .catch(() => {});
  }, []);

  if (!cohort?.on) return null;
  const ends = formatEnd(cohort.endsAt);

  return (
    <div className={`mx-auto max-w-3xl rounded-xl border border-white/[0.08] bg-navy-800/50 px-6 py-5 text-center ${className}`}>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
        Founding cohort
      </p>
      <p className="mt-2 font-heading text-base font-semibold text-slate-100">
        {cohort.full
          ? `All ${cohort.cap} places are taken — join the waitlist`
          : ends
            ? `Free through ${ends} for the first ${cohort.cap} organisations`
            : 'Every plan below is free while we work with our first organisations'}
      </p>
      <p className="mt-2 font-sans text-sm text-slate-400">
        {cohort.full ? (
          <>
            All {cohort.cap} founding places have been claimed. Leave your details and we&apos;ll
            contact you as places open or when the programme moves to paid plans.
          </>
        ) : (
          <>
            Create an account and you get the full Growth feature set at no cost, no card required.
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
