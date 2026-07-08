'use client';

/**
 * Getting-started checklist — derived entirely from real workspace state
 * (/api/onboarding), so it can never show a stale step. Auto-hides when
 * complete; dismissible per browser; reappears only if new steps regress
 * to incomplete (they can't — state is monotonic).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Circle, X, Rocket } from 'lucide-react';

interface Steps {
  assessment: boolean; discovery: boolean; registry: boolean;
  classification: boolean; evidence: boolean; team: boolean; training: boolean;
}

const STEP_DEFS: { key: keyof Steps; label: string; sub: string; href: string }[] = [
  { key: 'assessment', label: 'Run your baseline assessment', sub: '40 questions, ~15 minutes — everything else builds on this', href: '/assessment' },
  { key: 'discovery', label: 'Discover your AI footprint', sub: 'Upload an SSO or expense export — find undeclared AI tools', href: '/portal/discovery' },
  { key: 'registry', label: 'Register your first AI system', sub: 'Every system gets an EU AI Act risk profile', href: '/portal/discovery' },
  { key: 'classification', label: 'Classify its risk tier', sub: 'Article 5 / 6 / 50 classification with cited rationale', href: '/portal' },
  { key: 'evidence', label: 'Upload your first evidence', sub: 'DPIAs, model cards, contracts — clauses extract automatically', href: '/portal' },
  { key: 'training', label: 'Assign Article 4 training', sub: 'Staff AI literacy is a legal duty since Feb 2025', href: '/portal/literacy-compliance' },
  { key: 'team', label: 'Invite your team', sub: 'Shared workspace — same registry, evidence, and controls', href: '/portal/team' },
];

const DISMISS_KEY = 'eari-onboarding-dismissed';

export function OnboardingChecklist() {
  const [steps, setSteps] = useState<Steps | null>(null);
  const [dismissed, setDismissed] = useState(true); // assume dismissed until we know

  useEffect(() => {
    try { setDismissed(localStorage.getItem(DISMISS_KEY) === '1'); } catch { setDismissed(false); }
    fetch('/api/onboarding').then(async (r) => {
      if (r.ok) setSteps((await r.json()).steps);
    }).catch(() => {});
  }, []);

  if (!steps || dismissed) return null;
  const done = STEP_DEFS.filter((s) => steps[s.key]).length;
  if (done === STEP_DEFS.length) return null; // fully onboarded — get out of the way

  const next = STEP_DEFS.find((s) => !steps[s.key]);
  const pct = Math.round((done / STEP_DEFS.length) * 100);

  return (
    <Card className="mb-8 bg-navy-800 border-eari-blue/25 ring-1 ring-eari-blue/10">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Rocket className="h-4 w-4 text-eari-blue-light" />
          <h2 className="font-heading text-sm font-semibold text-foreground">Getting started</h2>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{done}/{STEP_DEFS.length} · {pct}%</span>
          <div className="flex-1 h-1 rounded-full bg-navy-700 overflow-hidden max-w-40">
            <div className="h-full bg-eari-blue transition-all" style={{ width: `${pct}%` }} />
          </div>
          <button
            aria-label="Dismiss getting started"
            onClick={() => { setDismissed(true); try { localStorage.setItem(DISMISS_KEY, '1'); } catch {} }}
            className="ml-auto text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
          {STEP_DEFS.map((s) => {
            const isDone = steps[s.key];
            const isNext = next?.key === s.key;
            return (
              <Link key={s.key} href={s.href} className={`group flex items-start gap-2.5 rounded-md px-2 py-1.5 -mx-2 transition-colors ${isNext ? 'bg-eari-blue/10' : 'hover:bg-navy-700/50'}`}>
                {isDone
                  ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400" />
                  : <Circle className={`h-4 w-4 mt-0.5 shrink-0 ${isNext ? 'text-eari-blue-light' : 'text-muted-foreground/50'}`} />}
                <span className="min-w-0">
                  <span className={`block font-sans text-[13px] leading-snug ${isDone ? 'text-muted-foreground line-through decoration-muted-foreground/40' : isNext ? 'text-foreground font-medium' : 'text-slate-300'}`}>
                    {s.label}{isNext && <span className="ml-2 font-mono text-[9px] uppercase tracking-wider text-eari-blue-light">next</span>}
                  </span>
                  {!isDone && <span className="block font-sans text-[11px] text-muted-foreground/80 leading-snug">{s.sub}</span>}
                </span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
