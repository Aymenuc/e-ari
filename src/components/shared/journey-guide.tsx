'use client';

/**
 * Journey Guide — the portal's single narrative spine.
 *
 * Replaces the flat quick-access tile grid + onboarding checklist with one
 * progressive story: Assess → Discover → Comply → Monitor. Derived entirely
 * from real workspace state (/api/onboarding), so it can never show a stale
 * step. At any moment there is exactly ONE primary next action; later
 * stations render dimmed with an "unlocks" hint, which teaches the flow
 * without a tutorial.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ClipboardCheck, Search, ShieldCheck, Activity, CheckCircle2,
  ArrowRight, GraduationCap, Plug, UsersRound, KeyRound, Compass,
} from 'lucide-react';

interface Steps {
  assessment: boolean; discovery: boolean; registry: boolean;
  classification: boolean; evidence: boolean; team: boolean; training: boolean;
}

type StationId = 'assess' | 'discover' | 'comply' | 'monitor';

interface Station {
  id: StationId;
  icon: typeof ClipboardCheck;
  title: string;
  plain: string; // one-line plain-language purpose
  href: string;
  cta: string;
  done: (s: Steps) => boolean;
  available: (s: Steps) => boolean;
  unlockHint: string;
}

const STATIONS: Station[] = [
  {
    id: 'assess',
    icon: ClipboardCheck,
    title: 'Assess',
    plain: 'Answer 40 questions — get your readiness score and maturity band.',
    href: '/assessment',
    cta: 'Start your assessment (~15 min)',
    done: (s) => s.assessment,
    available: () => true,
    unlockHint: '',
  },
  {
    id: 'discover',
    icon: Search,
    title: 'Discover',
    plain: 'Upload an SSO or expense export — we surface every AI tool actually in use, including the undeclared ones.',
    href: '/portal/discovery',
    cta: 'Run Shadow AI Discovery',
    done: (s) => s.discovery || s.registry,
    available: (s) => s.assessment,
    unlockHint: 'Unlocks after your assessment',
  },
  {
    id: 'comply',
    icon: ShieldCheck,
    title: 'Comply',
    plain: 'Classify each AI system, upload evidence, assess vendors, train your staff — every obligation gets a live pass/fail state.',
    href: '/portal/controls',
    cta: 'Open your compliance workspace',
    done: (s) => s.classification && s.evidence,
    available: (s) => s.registry,
    unlockHint: 'Unlocks after your first AI system is registered',
  },
  {
    id: 'monitor',
    icon: Activity,
    title: 'Monitor',
    plain: 'Weekly digests, monthly pulse checks, and attestation reminders keep you defensible without re-doing the work.',
    href: '/pulse',
    cta: 'Set up monitoring',
    done: (s) => s.classification && s.evidence && s.training,
    available: (s) => s.classification,
    unlockHint: 'Unlocks after your first classification',
  },
];

/** Secondary tools — always reachable, never competing with the spine. */
const TOOLS = [
  { href: '/welcome', icon: Compass, label: 'Orientation' },
  { href: '/portal/vendors', icon: Plug, label: 'Vendor Risk' },
  { href: '/portal/literacy-compliance', icon: GraduationCap, label: 'Article 4 Training' },
  { href: '/portal/team', icon: UsersRound, label: 'Team' },
  { href: '/portal/api-keys', icon: KeyRound, label: 'API' },
];

export function JourneyGuide() {
  const [steps, setSteps] = useState<Steps | null>(null);

  useEffect(() => {
    fetch('/api/onboarding')
      .then(async (r) => { if (r.ok) setSteps((await r.json()).steps); })
      .catch(() => {});
  }, []);

  // Until state loads, render nothing rather than a wrong guess.
  if (!steps) return null;

  const next = STATIONS.find((st) => !st.done(steps) && st.available(steps)) ?? null;
  const allDone = STATIONS.every((st) => st.done(steps));

  return (
    <Card className="mb-8 bg-navy-800 border-eari-blue/20">
      <CardContent className="p-5 sm:p-6">
        {/* ── The spine ── */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {STATIONS.map((st, i) => {
            const done = st.done(steps);
            const available = st.available(steps);
            const isNext = next?.id === st.id;
            const Icon = st.icon;
            return (
              <div
                key={st.id}
                className={`relative rounded-lg border p-3.5 transition-colors ${
                  isNext
                    ? 'border-slate-300/40 bg-white/[0.05]'
                    : done
                      ? 'border-emerald-500/25 bg-emerald-500/[0.04]'
                      : 'border-border/40 opacity-55'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-[10px] text-muted-foreground">{i + 1}</span>
                  {done
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    : <Icon className={`h-4 w-4 ${isNext ? 'text-slate-200' : 'text-muted-foreground'}`} />}
                  <span className={`font-heading text-sm font-semibold ${done ? 'text-emerald-300' : isNext ? 'text-foreground' : 'text-slate-400'}`}>
                    {st.title}
                  </span>
                  {isNext && (
                    <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-slate-200">you are here</span>
                  )}
                </div>
                <p className="font-sans text-[11.5px] leading-snug text-muted-foreground">
                  {done ? 'Done.' : available ? st.plain : st.unlockHint}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── One primary next action ── */}
        {next ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button asChild className="btn-brand font-heading h-10 px-5">
              <Link href={next.href}>{next.cta}<ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <p className="font-sans text-xs text-muted-foreground">{next.plain}</p>
          </div>
        ) : allDone ? (
          <p className="mt-4 font-sans text-sm text-emerald-400">
            All four stages are active — your weekly digest keeps watch. Everything below is your live workspace.
          </p>
        ) : null}

        {/* ── Secondary tools: reachable, de-emphasised ── */}
        <div className="mt-4 pt-3 border-t border-border/30 flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70">Tools</span>
          {TOOLS.map((t) => (
            <Link key={t.href} href={t.href} className="inline-flex items-center gap-1.5 font-sans text-xs text-muted-foreground hover:text-slate-200 transition-colors">
              <t.icon className="h-3 w-3" />{t.label}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
