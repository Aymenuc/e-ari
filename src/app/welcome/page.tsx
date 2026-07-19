'use client';

/**
 * /welcome — the concierge.
 *
 * The platform grew feature-rich enough to intimidate; this page is the
 * antidote. Two questions, one screen, zero jargon — and the answer is a
 * personal three-step plan that assembles LIVE in the side rail as you
 * choose. Everything the plan doesn't mention is explicitly deferred
 * ("can wait"), which is the sentence that kills overwhelm.
 *
 * Keyboard: 1–4 select an option, ← goes back. Reduced motion: no slides.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { LandingBackdrop } from '@/components/marketing/landing-backdrop';
import { Button } from '@/components/ui/button';
import {
  Landmark, Gauge, GraduationCap, Compass, Eye, EyeOff, HelpCircle,
  ClipboardCheck, Search, ShieldCheck, Activity, BookOpen, UsersRound,
  FileCheck2, TrendingUp, ArrowRight, ArrowLeft, Check, type LucideIcon,
} from 'lucide-react';

// ─── The two questions ──────────────────────────────────────────────────────

type Goal = 'compliance' | 'readiness' | 'training' | 'exploring';
type Visibility = 'yes' | 'no' | 'unsure';

const GOALS: Array<{ id: Goal; icon: LucideIcon; label: string; sub: string }> = [
  { id: 'compliance', icon: Landmark, label: 'EU AI Act compliance', sub: 'Obligations, evidence, audit-ready records' },
  { id: 'readiness', icon: Gauge, label: 'Know how ready we are', sub: 'A defensible score and where to improve first' },
  { id: 'training', icon: GraduationCap, label: 'Train my staff (Article 4)', sub: 'Role-based literacy with exportable proof' },
  { id: 'exploring', icon: Compass, label: 'Just exploring', sub: 'Show me what this platform actually does' },
];

const VISIBILITY: Array<{ id: Visibility; icon: LucideIcon; label: string; sub: string }> = [
  { id: 'yes', icon: Eye, label: 'Yes, fully mapped', sub: 'We keep an inventory of AI tools in use' },
  { id: 'no', icon: EyeOff, label: 'No', sub: 'People use what they use — nobody tracks it' },
  { id: 'unsure', icon: HelpCircle, label: 'Not sure', sub: 'There is probably more than we think' },
];

// ─── Plan derivation (deterministic — same answers, same plan) ──────────────

interface PlanStep {
  icon: LucideIcon;
  title: string;
  detail: string;
  time: string;
  href: string;
  cta: string;
}

function buildPlan(goal: Goal, visibility: Visibility | null): PlanStep[] {
  const assessment: PlanStep = {
    icon: ClipboardCheck,
    title: 'Take the baseline assessment',
    detail: '40 questions, deterministic scoring across 8 pillars — the number every next step builds on.',
    time: '~15 min',
    href: '/assessment',
    cta: 'Start assessment',
  };
  const discovery: PlanStep = {
    icon: Search,
    title: 'Run Shadow AI Discovery',
    detail: 'Upload an SSO or expense export — we surface every AI tool actually in use, including undeclared ones.',
    time: '~10 min',
    href: '/portal/discovery',
    cta: 'Open Discovery',
  };
  const registry: PlanStep = {
    icon: ShieldCheck,
    title: 'Register your AI systems',
    detail: 'Each system gets classified against the AI Act and mapped to its concrete obligations.',
    time: '~5 min each',
    href: '/portal/use-cases/systems/new',
    cta: 'Register a system',
  };
  const training: PlanStep = {
    icon: GraduationCap,
    title: 'Assign Article 4 training',
    detail: 'Add your people, pick their role track, and every completion becomes audit evidence.',
    time: '~3 min to assign',
    href: '/portal/literacy-compliance',
    cta: 'Open training',
  };
  const leverage: PlanStep = {
    icon: TrendingUp,
    title: 'Read your leverage moves',
    detail: 'Your results rank every possible improvement by its exact score gain — start at the top.',
    time: 'on your results',
    href: '/portal',
    cta: 'View results',
  };
  const pulse: PlanStep = {
    icon: Activity,
    title: 'Set up monthly Pulse',
    detail: 'Five-minute re-checks track drift so the board number never goes stale.',
    time: '~5 min/month',
    href: '/pulse',
    cta: 'Open Pulse',
  };
  const people: PlanStep = {
    icon: UsersRound,
    title: 'Add your people',
    detail: 'Members need no accounts — each gets a personal magic link by email.',
    time: '~2 min',
    href: '/portal/literacy-compliance',
    cta: 'Add members',
  };
  const evidence: PlanStep = {
    icon: FileCheck2,
    title: 'Export the Article 4 report',
    detail: 'The roster of who trained on what, with content-version attestations — auditor-ready.',
    time: '1 click',
    href: '/portal/literacy-compliance',
    cta: 'Export report',
  };
  const handbook: PlanStep = {
    icon: BookOpen,
    title: 'Read the methodology',
    detail: 'The full published handbook: pillars, rules, X-Ray detectors, leverage simulation.',
    time: 'browse',
    href: '/handbook',
    cta: 'Open handbook',
  };

  switch (goal) {
    case 'compliance':
      return [assessment, visibility === 'yes' ? registry : discovery, training];
    case 'readiness':
      return [assessment, visibility === 'yes' ? leverage : discovery, pulse];
    case 'training':
      return [people, { ...training, title: 'Assign role tracks', detail: 'One click per role — leadership, technical, procurement, HR, or the all-staff core.' }, evidence];
    case 'exploring':
      return [assessment, leverage, handbook];
  }
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function WelcomePage() {
  const prefersReducedMotion = useReducedMotion();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [visibility, setVisibility] = useState<Visibility | null>(null);

  const plan = useMemo(() => (goal ? buildPlan(goal, visibility) : []), [goal, visibility]);

  const pick = useCallback(
    (stepIdx: number, value: string) => {
      if (stepIdx === 0) {
        setGoal(value as Goal);
        setTimeout(() => setStep(1), prefersReducedMotion ? 0 : 240);
      } else {
        setVisibility(value as Visibility);
        setTimeout(() => setStep(2), prefersReducedMotion ? 0 : 240);
      }
    },
    [prefersReducedMotion],
  );

  // Persist the plan choice + keyboard controls
  useEffect(() => {
    if (step === 2 && goal) {
      try {
        localStorage.setItem('eari_onboarding', JSON.stringify({ goal, visibility, at: Date.now() }));
      } catch { /* private mode */ }
    }
  }, [step, goal, visibility]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && step > 0) setStep((s) => s - 1);
      const n = parseInt(e.key, 10);
      if (!Number.isNaN(n) && n >= 1) {
        if (step === 0 && n <= GOALS.length) pick(0, GOALS[n - 1].id);
        if (step === 1 && n <= VISIBILITY.length) pick(1, VISIBILITY[n - 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, pick]);

  const slide = prefersReducedMotion
    ? { initial: {}, animate: {}, exit: {} }
    : {
        initial: { opacity: 0, x: 32 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -24 },
      };

  return (
    <div className="relative min-h-screen flex flex-col">
      <LandingBackdrop />

      {/* Chrome: mark + skip */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="E-ARI" className="h-8 w-8 rounded-lg" />
          <span className="font-heading font-semibold text-slate-100">E-ARI</span>
        </Link>
        <div className="flex items-center gap-5">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5" aria-label={`Step ${Math.min(step + 1, 3)} of 3`}>
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                aria-label={`Go to step ${i + 1}`}
                disabled={i > step}
                onClick={() => i < step && setStep(i)}
                className={`h-1.5 min-h-0 min-w-0 p-0 border-0 appearance-none rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-slate-100' : i < step ? 'w-3 bg-slate-100/50 cursor-pointer' : 'w-3 bg-white/[0.1]'
                }`}
              />
            ))}
          </div>
          <Link href="/portal" className="font-sans text-xs text-muted-foreground hover:text-foreground transition-colors">
            Skip — take me to the dashboard
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center">
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-10 pb-16 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12 lg:gap-16 items-center">

          {/* ── Question / plan zone ── */}
          <div className="min-h-[420px]">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div key="q1" {...slide} transition={{ duration: 0.3, ease: 'easeOut' }}>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-3">90-second orientation</p>
                  <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-slate-50">
                    What brings you here?
                  </h1>
                  <p className="mt-3 font-sans text-[15px] text-slate-400 max-w-lg">
                    The platform does a lot. You don&apos;t need most of it yet — answer two questions and we&apos;ll hand you the three steps that matter.
                  </p>
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
                    {GOALS.map((g, i) => (
                      <OptionCard key={g.id} index={i + 1} icon={g.icon} label={g.label} sub={g.sub}
                        selected={goal === g.id} onSelect={() => pick(0, g.id)} />
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div key="q2" {...slide} transition={{ duration: 0.3, ease: 'easeOut' }}>
                  <button onClick={() => setStep(0)} className="mb-4 inline-flex items-center gap-1.5 font-sans text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                  <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-slate-50">
                    Do you know which AI tools are already in use?
                  </h1>
                  <p className="mt-3 font-sans text-[15px] text-slate-400 max-w-lg">
                    Be honest — most organisations aren&apos;t sure, and the plan is better when it starts from the truth.
                  </p>
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
                    {VISIBILITY.map((v, i) => (
                      <OptionCard key={v.id} index={i + 1} icon={v.icon} label={v.label} sub={v.sub}
                        selected={visibility === v.id} onSelect={() => pick(1, v.id)} />
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 2 && goal && (
                <motion.div key="plan" {...slide} transition={{ duration: 0.3, ease: 'easeOut' }}>
                  <button onClick={() => setStep(1)} className="mb-4 inline-flex items-center gap-1.5 font-sans text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                  <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-slate-50">
                    Your next three steps.
                  </h1>
                  <p className="mt-3 font-sans text-[15px] text-slate-400 max-w-lg">
                    Do these in order. Everything else — vendors, benchmarks, the API — <span className="text-slate-200">can wait</span> until these are done.
                  </p>
                  <div className="mt-8 space-y-3 max-w-2xl">
                    {plan.map((s, i) => {
                      const Icon = s.icon;
                      return (
                        <motion.div
                          key={s.title}
                          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 + i * 0.12, duration: 0.35 }}
                          className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-navy-800/60 p-4"
                        >
                          <span className="font-heading text-lg font-semibold tabular-nums text-slate-500 w-5">{i + 1}</span>
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] flex-shrink-0">
                            <Icon className="h-4.5 w-4.5 text-slate-300" strokeWidth={1.75} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <h3 className="font-heading text-[15px] font-semibold text-slate-100">{s.title}</h3>
                              <span className="font-mono text-[10px] text-slate-500">{s.time}</span>
                            </div>
                            <p className="mt-0.5 font-sans text-[12.5px] leading-snug text-muted-foreground">{s.detail}</p>
                          </div>
                          {i === 0 ? (
                            <Button onClick={() => router.push(s.href)} className="btn-brand font-heading font-semibold h-9 px-4 text-sm flex-shrink-0">
                              {s.cta} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Link href={s.href} className="font-sans text-xs text-slate-400 hover:text-slate-100 transition-colors flex-shrink-0">
                              {s.cta}
                            </Link>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                  <p className="mt-6 font-sans text-xs text-muted-foreground/70">
                    This plan stays on your dashboard&apos;s journey guide — you can&apos;t lose your place.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Live plan rail (desktop) — assembles as you answer ── */}
          <aside className="hidden lg:block" aria-hidden={step === 2}>
            <div className="rounded-xl border border-white/[0.06] bg-navy-900/40 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-4">Your plan</p>
              <div className="space-y-2.5">
                {[0, 1, 2].map((slot) => {
                  const filled = step >= 1 ? plan[slot] : slot === 0 && goal ? plan[0] : undefined;
                  const ready = step === 2 || (slot === 0 && !!goal) || (step >= 1 && !!visibility);
                  const s = ready ? plan[slot] : filled;
                  return (
                    <div key={slot} className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 min-h-[46px]">
                      {s ? (
                        <motion.div
                          initial={prefersReducedMotion ? false : { opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2.5 min-w-0"
                        >
                          <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="font-sans text-xs text-slate-300 truncate">{s.title}</span>
                        </motion.div>
                      ) : (
                        <span className="font-mono text-[10px] text-slate-600">step {slot + 1} — answering…</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 font-sans text-[11px] leading-snug text-muted-foreground/60">
                Three steps, in order, with time estimates. Nothing else until you want it.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

// ─── Option card ────────────────────────────────────────────────────────────

function OptionCard({
  index, icon: Icon, label, sub, selected, onSelect,
}: {
  index: number; icon: LucideIcon; label: string; sub: string; selected: boolean; onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-slate-300/60 hover:-translate-y-0.5 ${
        selected
          ? 'border-slate-200/60 bg-white/[0.06]'
          : 'border-white/[0.08] bg-navy-800/50 hover:border-white/[0.18] hover:bg-navy-800/80'
      }`}
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg border flex-shrink-0 transition-colors duration-200 ${
        selected ? 'border-slate-200/50 bg-slate-100 text-navy-900' : 'border-white/[0.08] bg-white/[0.03] text-slate-400 group-hover:text-slate-200'
      }`}>
        {selected ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" strokeWidth={1.75} />}
      </span>
      <span className="min-w-0">
        <span className="block font-heading text-[14.5px] font-semibold text-slate-100">{label}</span>
        <span className="mt-0.5 block font-sans text-[12px] leading-snug text-muted-foreground">{sub}</span>
      </span>
      <kbd className="absolute top-3 right-3 hidden sm:block rounded border border-white/[0.08] bg-white/[0.03] px-1.5 font-mono text-[10px] text-slate-500">
        {index}
      </kbd>
    </button>
  );
}
