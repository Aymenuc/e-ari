'use client';

/**
 * ToolkitGrid — replaces the "Explore the AI toolkit" carousel.
 *
 * The carousel hid three of four modules behind arrows and framed them as a
 * gallery ("pick one"). The honest framing is TEMPORAL: the assessment is a
 * snapshot; these four modules are the continuous layer that keeps the score
 * true between assessments. All four are visible at once, and each card runs
 * a small self-animating vignette of the module actually doing its job —
 * shown, not described. Loops are slow, staggered, and disabled under
 * reduced motion (final frames render instead).
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Activity, Search, GraduationCap, MessageSquare, ArrowUpRight } from 'lucide-react';

/* ─── Vignettes: the module at work, ~90 px tall ────────────────────────── */

function PulseVignette({ go }: { go: boolean }) {
  // Monthly re-checks: the trend draws itself, the delta lands.
  const points = '0,54 22,50 44,52 66,44 88,46 110,38 132,40 154,30';
  return (
    <div className="relative h-[88px]">
      <svg viewBox="0 0 160 64" className="absolute inset-x-3 top-2 h-[56px] w-[calc(100%-24px)]">
        {[16, 32, 48].map((y) => (
          <line key={y} x1="0" y1={y} x2="160" y2={y} stroke="rgba(148,163,184,0.09)" strokeWidth="0.6" />
        ))}
        <motion.polyline
          points={points}
          fill="none"
          stroke="#7dd3fc"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={go ? { pathLength: 1 } : {}}
          transition={{ duration: 1.6, ease: 'easeInOut' }}
        />
        <motion.circle
          cx="154" cy="30" r="2.6" fill="#7dd3fc"
          initial={{ opacity: 0 }}
          animate={go ? { opacity: 1 } : {}}
          transition={{ delay: 1.5 }}
        />
      </svg>
      <motion.span
        className="absolute bottom-1.5 left-3 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-2 py-0.5 font-mono text-[9.5px] text-emerald-300"
        initial={{ opacity: 0, y: 4 }}
        animate={go ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 1.7, duration: 0.3 }}
      >
        53 → 55 · this month
      </motion.span>
    </div>
  );
}

function DiscoveryVignette({ go }: { go: boolean }) {
  // Shadow-AI radar: the beam sweeps, undeclared tools blip in.
  const prefersReducedMotion = useReducedMotion();
  const blips = [
    { x: 96, y: 22, delay: 0.9 },
    { x: 58, y: 44, delay: 1.7 },
    { x: 116, y: 50, delay: 2.5 },
  ];
  return (
    <div className="relative h-[88px]">
      <svg viewBox="0 0 160 76" className="absolute inset-x-3 top-1 h-[64px] w-[calc(100%-24px)]">
        {[14, 26, 38].map((r) => (
          <circle key={r} cx="80" cy="38" r={r} fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="0.6" />
        ))}
        {!prefersReducedMotion && go && (
          <motion.line
            x1="80" y1="38" x2="80" y2="0"
            stroke="rgba(125,211,252,0.55)" strokeWidth="1"
            style={{ transformOrigin: '80px 38px' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
          />
        )}
        {blips.map((b, i) => (
          <motion.circle
            key={i} cx={b.x} cy={b.y} r="2.4" fill="#fbbf24"
            initial={{ opacity: 0, scale: 0 }}
            animate={go ? { opacity: [0, 1, 0.75], scale: 1 } : {}}
            transition={{ delay: b.delay, duration: 0.4 }}
          />
        ))}
      </svg>
      <motion.span
        className="absolute bottom-1.5 left-3 rounded-full border border-amber-500/25 bg-amber-500/[0.08] px-2 py-0.5 font-mono text-[9.5px] text-amber-300"
        initial={{ opacity: 0, y: 4 }}
        animate={go ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 2.7, duration: 0.3 }}
      >
        3 undeclared tools surfaced
      </motion.span>
    </div>
  );
}

function LiteracyVignette({ go }: { go: boolean }) {
  // Article 4 coverage: the ring fills, the roster count lands.
  const C = 2 * Math.PI * 24;
  return (
    <div className="relative flex h-[88px] items-center gap-4 px-4">
      <svg width="60" height="60" viewBox="0 0 60 60" className="shrink-0">
        <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(148,163,184,0.14)" strokeWidth="5" />
        <motion.circle
          cx="30" cy="30" r="24" fill="none"
          stroke="#a5b4fc" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={C}
          transform="rotate(-90 30 30)"
          initial={{ strokeDashoffset: C }}
          animate={go ? { strokeDashoffset: C * 0.2 } : {}}
          transition={{ duration: 1.4, ease: 'easeOut', delay: 0.2 }}
        />
        <text x="30" y="34" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="600" fontFamily="var(--font-space-grotesk)">80%</text>
      </svg>
      <div className="space-y-1.5">
        {['Leadership', 'Data team', 'Operations'].map((row, i) => (
          <motion.div
            key={row}
            className="flex items-center gap-1.5 font-mono text-[9.5px] text-slate-400"
            initial={{ opacity: 0, x: -6 }}
            animate={go ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.5 + i * 0.25 }}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${i < 2 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            {row} {i < 2 ? 'certified' : 'in progress'}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function AssistantVignette({ go }: { go: boolean }) {
  // Grounded guidance: a real question gets a cited answer, live.
  const prefersReducedMotion = useReducedMotion();
  const answer = 'Art. 50 — transparency duties apply. 2 evidence gaps.';
  const [shown, setShown] = useState(prefersReducedMotion ? answer : '');
  useEffect(() => {
    if (!go || prefersReducedMotion) return;
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setShown(answer.slice(0, i));
      if (i >= answer.length) clearInterval(t);
    }, 34);
    return () => clearInterval(t);
  }, [go, prefersReducedMotion]);
  return (
    <div className="flex h-[88px] flex-col justify-center gap-2 px-4">
      <div className="self-end rounded-lg rounded-br-sm border border-white/[0.07] bg-white/[0.04] px-2.5 py-1.5 font-sans text-[10.5px] text-slate-300">
        Which obligations cover our support chatbot?
      </div>
      <div className="self-start rounded-lg rounded-bl-sm border border-sky-500/20 bg-sky-500/[0.06] px-2.5 py-1.5 font-mono text-[10px] text-sky-200 min-h-[26px]">
        {shown}
        {go && !prefersReducedMotion && shown.length < answer.length && (
          <span className="ml-px inline-block h-[10px] w-[5px] translate-y-[1px] animate-pulse bg-sky-300/80" />
        )}
      </div>
    </div>
  );
}

/* ─── The grid ──────────────────────────────────────────────────────────── */

const MODULES = [
  {
    icon: Activity,
    name: 'Pulse',
    what: 'Monthly five-minute re-checks track score drift, so the board number is never stale.',
    href: '/pulse',
    cta: 'Open Pulse',
    Vignette: PulseVignette,
  },
  {
    icon: Search,
    name: 'Discovery',
    what: 'Scans SSO and expense exports for the AI tools nobody declared — before an auditor does.',
    href: '/portal/discovery',
    cta: 'Run Discovery',
    Vignette: DiscoveryVignette,
  },
  {
    icon: GraduationCap,
    name: 'Literacy',
    what: 'Article 4 training with per-role quizzes and an exportable compliance roster.',
    href: '/literacy',
    cta: 'Open Literacy',
    Vignette: LiteracyVignette,
  },
  {
    icon: MessageSquare,
    name: 'Assistant',
    what: 'Answers grounded in your assessment and evidence vault — cites articles, flags gaps.',
    href: '/portal',
    cta: 'Ask Assistant',
    Vignette: AssistantVignette,
  },
];

export function ToolkitGrid() {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-120px' });
  const go = inView || !!prefersReducedMotion;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto">
        <div className="mb-5 flex items-center justify-center gap-3">
          <span aria-hidden className="h-px w-8 bg-gradient-to-r from-slate-500/10 via-slate-400/60 to-slate-500/10" />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
            Between assessments
          </span>
          <span aria-hidden className="h-px w-8 bg-gradient-to-r from-slate-500/10 via-slate-400/60 to-slate-500/10" />
        </div>
        <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-slate-50">
          The score is a snapshot.
          <br className="hidden sm:block" /> These four keep it true.
        </h2>
        <p className="mt-4 text-[17px] text-slate-400 font-sans leading-relaxed">
          An assessment tells you where you stand today. Pulse, Discovery, Literacy, and the
          Assistant are the continuous layer — watching drift, surfacing shadow AI, training your
          people, and answering the hard questions in between.
        </p>
      </div>

      <div ref={ref} className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:mt-16">
        {MODULES.map((m, i) => {
          const Icon = m.icon;
          const Vignette = m.Vignette;
          return (
            <motion.div
              key={m.name}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
              animate={go ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] }}
              className="group flex flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-navy-800/50 transition-colors duration-200 hover:border-white/[0.16] hover:bg-navy-800/70"
            >
              {/* The module at work */}
              <div className="border-b border-white/[0.05] bg-navy-900/40">
                <Vignette go={go} />
              </div>

              {/* What it is, in one honest sentence */}
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03]">
                    <Icon className="h-4 w-4 text-slate-300" strokeWidth={1.75} />
                  </span>
                  <h3 className="font-heading text-[15px] font-semibold tracking-tight text-slate-100">
                    {m.name}
                  </h3>
                </div>
                <p className="mt-2.5 flex-1 font-sans text-[12.5px] leading-relaxed text-muted-foreground/90">
                  {m.what}
                </p>
                <Link
                  href={m.href}
                  className="mt-3 inline-flex items-center gap-1 font-heading text-[12.5px] font-semibold text-slate-200 transition-colors group-hover:text-white"
                >
                  {m.cta}
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
