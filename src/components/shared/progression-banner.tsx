'use client';

import Link from 'next/link';
import {
  ClipboardCheck,
  SearchCheck,
  FileStack,
  Radar,
  Check,
  ChevronRight,
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

const STEP_META: Record<
  (typeof STEP_ORDER)[number],
  { label: string; Icon: typeof ClipboardCheck }
> = {
  assessed: { label: 'Assessed', Icon: ClipboardCheck },
  verifying: { label: 'Verify', Icon: SearchCheck },
  complying: { label: 'Comply', Icon: FileStack },
  monitoring: { label: 'Monitor', Icon: Radar },
};

function defaultCta(state: ProgressionState): { label: string; href: string } {
  switch (state.currentStep) {
    case 'assessed':
      return { label: 'Take assessment', href: '/assessment' };
    case 'verifying':
      return state.firstUseCaseId
        ? {
            label: 'Add evidence',
            href: `/compliance/systems/${state.firstUseCaseId}/evidence`,
          }
        : { label: 'Add evidence', href: '/compliance/systems/new' };
    case 'complying':
      return state.firstUseCaseId
        ? {
            label: 'Generate FRIA',
            href: `/compliance/systems/${state.firstUseCaseId}/fria`,
          }
        : { label: 'Generate FRIA', href: '/compliance/systems/new' };
    default:
      return { label: 'View inbox', href: '/portal#inbox' };
  }
}

function stepSubtext(
  step: (typeof STEP_ORDER)[number],
  state: ProgressionState,
): string {
  switch (step) {
    case 'assessed':
      return state.assessed.complete && state.assessed.overallScore != null
        ? `Score: ${Math.round(state.assessed.overallScore)}/100`
        : 'Not yet started';
    case 'verifying':
      return `${state.verifying.obligationsEvidenced}/${state.verifying.obligationsApplicable} obligations`;
    case 'complying': {
      const done =
        state.complying.friasFinalized + state.complying.technicalFilesFinalized;
      const total =
        state.complying.friasTotal + state.complying.technicalFilesTotal;
      return `${done}/${total} artifacts`;
    }
    default:
      return `${state.monitoring.criticalGaps} critical · ${state.monitoring.attestationsDueWithin30Days} due`;
  }
}

export function ProgressionBanner({
  state,
  showNextActionGlow = true,
  cta,
}: ProgressionBannerProps) {
  const active = state.currentStep;
  const activeIdx = STEP_ORDER.indexOf(active);
  const connectorProgress =
    STEP_ORDER.length > 1 ? activeIdx / (STEP_ORDER.length - 1) : 0;
  const resolved = cta ?? defaultCta(state);

  return (
    <div
      className="rounded-xl border border-white/[0.08] bg-navy-900/60 p-4 shadow-sm shadow-black/20 backdrop-blur-sm sm:p-5"
      role="region"
      aria-label="Compliance progression"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="min-w-0 flex-1">
          {/* Connector background + progress */}
          <div className="relative mb-4 hidden sm:block">
            <div className="absolute left-0 right-0 top-[22px] h-px bg-white/10" aria-hidden />
            <div
              className="absolute left-0 top-[22px] h-px bg-eari-blue/50 transition-[width] duration-500 ease-out"
              style={{ width: `${connectorProgress * 100}%` }}
              aria-hidden
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:gap-2">
            {STEP_ORDER.map((step, i) => {
              const { label, Icon } = STEP_META[step];
              const idx = STEP_ORDER.indexOf(step);
              const done = idx < activeIdx;
              const current = step === active;
              const pending = idx > activeIdx;

              return (
                <div
                  key={step}
                  className={cn(
                    'relative flex flex-row items-start gap-3 rounded-lg border px-3 py-3 sm:flex-col sm:items-center sm:text-center',
                    done &&
                      'border-emerald-500/35 bg-emerald-500/[0.06]',
                    current &&
                      'border-eari-blue/40 bg-eari-blue/[0.07]',
                    pending &&
                      'border-dashed border-white/15 bg-transparent',
                  )}
                >
                  <div
                    className={cn(
                      'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border sm:mx-auto',
                      done && 'border-emerald-400/50 bg-emerald-500/15 text-emerald-400',
                      current &&
                        'border-eari-blue-light/60 bg-eari-blue/20 text-eari-blue-light',
                      pending && 'border-white/20 text-muted-foreground',
                      showNextActionGlow &&
                        current &&
                        'ring-2 ring-eari-blue/35 ring-offset-2 ring-offset-navy-950',
                    )}
                  >
                    {done ? (
                      <Check className="h-5 w-5" aria-hidden />
                    ) : (
                      <Icon className="h-5 w-5" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 sm:px-0">
                    <p className="font-heading text-sm font-semibold text-slate-100">
                      {label}
                    </p>
                    <p className="mt-1 font-sans text-xs leading-snug text-muted-foreground">
                      {stepSubtext(step, state)}
                    </p>
                  </div>
                  {i < STEP_ORDER.length - 1 && (
                    <div
                      className="my-1 ml-5 hidden h-px w-[calc(100%-2rem)] bg-white/10 sm:hidden"
                      aria-hidden
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 flex-col justify-center gap-2 border-t border-white/[0.06] pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Next step
          </p>
          <Button
            asChild
            className="bg-eari-blue hover:bg-eari-blue-dark font-heading shadow-md shadow-eari-blue/15"
          >
            <Link href={resolved.href} className="inline-flex items-center gap-2">
              {resolved.label}
              <ChevronRight className="h-4 w-4 opacity-90" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
