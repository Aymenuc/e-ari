'use client';

import Link from 'next/link';
import {
  ClipboardCheck,
  SearchCheck,
  FileStack,
  Radar,
  Check,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProgressionState } from '@/lib/progression';
import { Button } from '@/components/ui/button';

export interface ProgressionBannerProps {
  state: ProgressionState;
  /** Highlight the next-action step with a subtle pulse ring */
  showNextActionGlow?: boolean;
  /** Overrides default CTA */
  cta?: { label: string; href: string };
}

const STEP_ORDER = ['assessed', 'verifying', 'complying', 'monitoring'] as const;
type StepKey = (typeof STEP_ORDER)[number];

const STEP_META: Record<StepKey, { label: string; Icon: typeof ClipboardCheck }> = {
  assessed: { label: 'Assess', Icon: ClipboardCheck },
  verifying: { label: 'Verify', Icon: SearchCheck },
  complying: { label: 'Comply', Icon: FileStack },
  monitoring: { label: 'Monitor', Icon: Radar },
};

const ACTIVE_HEADLINE: Record<StepKey, string> = {
  assessed: 'Run your first AI readiness assessment',
  verifying: 'Map evidence to your applicable AI Act obligations',
  complying: 'Generate FRIAs and Technical Files for your AI systems',
  monitoring: 'Watch for new gaps and upcoming attestations',
};

const ACTIVE_HELP: Record<StepKey, string> = {
  assessed: '8 pillars · ~15 minutes · benchmarked against your sector',
  verifying: 'Upload contracts, model cards, DPIAs — we extract clauses automatically',
  complying: 'Article 27 FRIAs and Annex IV files, exportable as PDF',
  monitoring: 'Daily regulatory scan + automated reminders before deadlines',
};

function defaultCta(state: ProgressionState): { label: string; href: string } {
  switch (state.currentStep) {
    case 'assessed':
      return { label: 'Take assessment', href: '/assessment' };
    case 'verifying':
      return state.firstUseCaseId
        ? {
            label: 'Add evidence',
            href: `/portal/use-cases/systems/${state.firstUseCaseId}/evidence`,
          }
        : { label: 'Register a use case', href: '/portal/use-cases/systems/new' };
    case 'complying':
      return state.firstUseCaseId
        ? {
            label: 'Generate FRIA',
            href: `/portal/use-cases/systems/${state.firstUseCaseId}/fria`,
          }
        : { label: 'Generate FRIA', href: '/portal/use-cases/systems/new' };
    default:
      return { label: 'View inbox', href: '/portal#inbox' };
  }
}

/** Per-step subtext — returns null when the step is empty/zero so we don't render misleading "0/0". */
function stepSubtext(step: StepKey, state: ProgressionState): string | null {
  switch (step) {
    case 'assessed':
      return state.assessed.complete && state.assessed.overallScore != null
        ? `Score ${Math.round(state.assessed.overallScore)}`
        : null;
    case 'verifying': {
      const { obligationsApplicable, obligationsEvidenced } = state.verifying;
      if (obligationsApplicable === 0) return null;
      return `${obligationsEvidenced}/${obligationsApplicable}`;
    }
    case 'complying': {
      const done = state.complying.friasFinalized + state.complying.technicalFilesFinalized;
      const total = state.complying.friasTotal + state.complying.technicalFilesTotal;
      if (total === 0) return null;
      return `${done}/${total}`;
    }
    case 'monitoring': {
      const c = state.monitoring.criticalGaps;
      const d = state.monitoring.attestationsDueWithin30Days;
      if (c === 0 && d === 0) return null;
      const parts: string[] = [];
      if (c > 0) parts.push(`${c} critical`);
      if (d > 0) parts.push(`${d} due`);
      return parts.join(' · ');
    }
  }
}

export function ProgressionBanner({
  state,
  showNextActionGlow = true,
  cta,
}: ProgressionBannerProps) {
  const active = state.currentStep;
  const activeIdx = STEP_ORDER.indexOf(active);
  const resolved = cta ?? defaultCta(state);
  const totalSteps = STEP_ORDER.length;

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-navy-900/85 via-navy-900/70 to-navy-900/85 px-5 py-5 sm:px-7 sm:py-6"
      role="region"
      aria-label="Compliance progression"
    >
      {/* Subtle decorative glow behind active step */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-eari-blue/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-stretch lg:justify-between lg:gap-8">
        {/* ── Left: stepper + active context ──────────────────────────────── */}
        <div className="min-w-0 flex-1">
          {/* Header row */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-eari-blue-light/85">
              Step {activeIdx + 1} of {totalSteps} · {STEP_META[active].label}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
              {Math.round((activeIdx / (totalSteps - 1)) * 100)}% complete
            </p>
          </div>

          {/* Horizontal rail */}
          <div className="relative">
            {/* Background rail */}
            <div
              aria-hidden
              className="absolute left-[14px] right-[14px] top-[14px] h-px bg-gradient-to-r from-white/10 via-white/15 to-white/10"
            />
            {/* Filled progress */}
            <div
              aria-hidden
              className="absolute left-[14px] top-[14px] h-px bg-gradient-to-r from-eari-blue/60 via-eari-blue-light/70 to-eari-blue-light/40 transition-[width] duration-500 ease-out"
              style={{ width: `calc(${(activeIdx / (totalSteps - 1)) * 100}% - ${activeIdx === 0 ? 0 : 14}px)` }}
            />

            <ol className="relative grid grid-cols-4 gap-2">
              {STEP_ORDER.map((step) => {
                const idx = STEP_ORDER.indexOf(step);
                const done = idx < activeIdx;
                const current = step === active;
                const { label, Icon } = STEP_META[step];
                const sub = stepSubtext(step, state);

                return (
                  <li key={step} className="flex flex-col items-center gap-2">
                    <div
                      className={cn(
                        'relative z-10 flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-300',
                        done && 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300',
                        current && 'border-eari-blue-light/70 bg-eari-blue/15 text-eari-blue-light',
                        !done && !current && 'border-white/15 bg-navy-900/80 text-muted-foreground/60',
                      )}
                    >
                      {/* Subtle pulse on the active dot only */}
                      {showNextActionGlow && current && (
                        <span
                          aria-hidden
                          className="absolute inset-0 rounded-full bg-eari-blue/25 animate-ping"
                          style={{ animationDuration: '2.2s' }}
                        />
                      )}
                      {done ? (
                        <Check className="relative h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                      ) : (
                        <Icon className="relative h-3.5 w-3.5" aria-hidden />
                      )}
                    </div>

                    <div className="text-center">
                      <p
                        className={cn(
                          'font-heading text-xs font-semibold leading-tight transition-colors',
                          current && 'text-foreground',
                          done && 'text-emerald-200/90',
                          !done && !current && 'text-muted-foreground/70',
                        )}
                      >
                        {label}
                      </p>
                      {sub ? (
                        <p
                          className={cn(
                            'mt-0.5 font-mono text-[10px] tabular-nums',
                            current ? 'text-eari-blue-light/80' : done ? 'text-emerald-300/70' : 'text-muted-foreground/50',
                          )}
                        >
                          {sub}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Active step context */}
          <div className="mt-5 border-t border-white/[0.06] pt-4">
            <p className="font-heading text-base font-semibold text-foreground sm:text-lg">
              {ACTIVE_HEADLINE[active]}
            </p>
            <p className="mt-1 font-sans text-xs text-muted-foreground sm:text-sm">
              {ACTIVE_HELP[active]}
            </p>
          </div>
        </div>

        {/* ── Right: CTA ─────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-end lg:items-center">
          <Button
            asChild
            size="lg"
            className="group w-full bg-eari-blue text-white shadow-lg shadow-eari-blue/20 hover:bg-eari-blue-dark lg:w-auto"
          >
            <Link href={resolved.href} className="inline-flex items-center justify-center gap-2 font-heading">
              {resolved.label}
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
