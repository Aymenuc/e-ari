'use client';

/**
 * HeroScene — the landing hero's theatrical centerpiece.
 *
 * Not a screenshot: the product performs itself. A ~13 s choreographed loop
 * runs the real pipeline story — Discovery streams context, Scoring counts
 * the ring up while pillar bars fill, an X-Ray finding fires, the Insight
 * agent types its narrative live, and the Report assembles — then the scene
 * breathes and runs again. Everything is deterministic framer-motion + rAF;
 * no video assets, no layout shift (the feed area is fixed-height).
 *
 * Reduced motion: renders the completed final frame, no timers.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Radar, Calculator, Sparkles, FileText, CheckCircle2 } from 'lucide-react';

// ─── Choreography ────────────────────────────────────────────────────────────

const LOOP_MS = 14500;

type Stage = 'discovery' | 'scoring' | 'insight' | 'report' | 'done';

interface FeedLine {
  id: number;
  tone: 'run' | 'ok' | 'warn' | 'type';
  text: string;
}

/** Timeline events: feed lines + stage transitions, in ms from cycle start. */
const EVENTS: Array<{ at: number; stage?: Stage; line?: Omit<FeedLine, 'id'> }> = [
  { at: 250, stage: 'discovery', line: { tone: 'run', text: 'discovery — resolving organisation context' } },
  { at: 1500, line: { tone: 'ok', text: '6 sources · entity classified · sector locked' } },
  { at: 2500, stage: 'scoring', line: { tone: 'run', text: 'scoring — 40 signals → 8 pillars (deterministic)' } },
  { at: 3600, line: { tone: 'ok', text: 'sector weights applied · baseline 64 → 67' } },
  { at: 4500, line: { tone: 'warn', text: 'X-RAY P-02 · Ambition Gap — strategy 82 vs talent 44' } },
  { at: 5700, stage: 'insight', line: { tone: 'run', text: 'insight — grounding narrative in findings' } },
  { at: 6300, line: { tone: 'type', text: 'Talent (44) constrains execution. Highest-leverage move: +2.4 pts.' } },
  { at: 10300, stage: 'report', line: { tone: 'run', text: 'report — assembling board-ready docx' } },
  { at: 11500, stage: 'done', line: { tone: 'ok', text: 'report ready · 12 sections · certification path: Silver' } },
];

const STAGES: Array<{ id: Stage; label: string; icon: typeof Radar }> = [
  { id: 'discovery', label: 'Discover', icon: Radar },
  { id: 'scoring', label: 'Score', icon: Calculator },
  { id: 'insight', label: 'Insight', icon: Sparkles },
  { id: 'report', label: 'Report', icon: FileText },
];

const PILLAR_BARS = [
  { label: 'Strategy', value: 82, color: '#60a5fa' },
  { label: 'Governance', value: 78, color: '#818cf8' },
  { label: 'Talent', value: 44, color: '#f59e0b' },
];

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useCountUp(target: number, active: boolean, duration = 1700): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) { setValue(0); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return value;
}

function useTypewriter(text: string, active: boolean, cps = 30): string {
  const [shown, setShown] = useState('');
  useEffect(() => {
    if (!active) { setShown(''); return; }
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, 1000 / cps);
    return () => clearInterval(iv);
  }, [text, active, cps]);
  return shown;
}

// ─── Scene ───────────────────────────────────────────────────────────────────

const TONE_STYLES: Record<FeedLine['tone'], { mark: string; cls: string }> = {
  run: { mark: '▸', cls: 'text-slate-400' },
  ok: { mark: '✓', cls: 'text-emerald-400/90' },
  warn: { mark: '⚠', cls: 'text-amber-400/95' },
  type: { mark: '│', cls: 'text-sky-300' },
};

export function HeroScene() {
  const prefersReducedMotion = useReducedMotion();
  const [cycle, setCycle] = useState(0);
  const [stage, setStage] = useState<Stage>('discovery');
  const [feed, setFeed] = useState<FeedLine[]>([]);
  const idRef = useRef(0);

  // Schedule one full loop; cycle bump reschedules the next.
  useEffect(() => {
    if (prefersReducedMotion) {
      setStage('done');
      setFeed(EVENTS.filter(e => e.line).map((e, i) => ({ id: i, ...e.line! })));
      return;
    }
    setFeed([]);
    setStage('discovery');
    const timers = EVENTS.map(e =>
      setTimeout(() => {
        if (e.stage) setStage(e.stage);
        if (e.line) {
          idRef.current += 1;
          const line: FeedLine = { id: idRef.current, ...e.line };
          setFeed(prev => [...prev.slice(-5), line]);
        }
      }, e.at),
    );
    timers.push(setTimeout(() => setCycle(c => c + 1), LOOP_MS));
    return () => timers.forEach(clearTimeout);
  }, [cycle, prefersReducedMotion]);

  const stageIdx = STAGES.findIndex(s => s.id === stage);
  const scoringReached = stage !== 'discovery';
  const score = useCountUp(67, scoringReached || !!prefersReducedMotion);
  const RING_C = 289; // 2πr for r=46

  const typeLine = feed.find(l => l.tone === 'type');
  const typed = useTypewriter(typeLine?.text ?? '', !!typeLine && !prefersReducedMotion);

  return (
    <div className="relative w-full max-w-lg">
      <div className="aurora-card rounded-xl p-[1px] shadow-[0_30px_70px_-24px_rgba(0,0,0,0.7)]">
        <div className="rounded-xl overflow-hidden relative bg-[#0e131c]">

          {/* ── Chrome ── */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0a0f17] border-b border-white/[0.05]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/60 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">
              Live assessment · agent pipeline
            </span>
            <span className="ml-auto text-[10px] font-mono text-slate-600">v5.3</span>
          </div>

          {/* ── Pipeline rail ── */}
          <div className="relative flex items-center px-4 py-3 border-b border-white/[0.05] bg-[#0b1019]">
            {STAGES.map((s, i) => {
              const isActive = i === stageIdx || (stage === 'done' && i === STAGES.length - 1);
              const isDone = i < stageIdx || stage === 'done';
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex items-center gap-1.5">
                    <motion.span
                      className="flex h-6 w-6 items-center justify-center rounded-md border"
                      animate={{
                        borderColor: isActive ? 'rgba(96,165,250,0.6)' : isDone ? 'rgba(52,211,153,0.35)' : 'rgba(148,163,184,0.15)',
                        backgroundColor: isActive ? 'rgba(37,99,235,0.18)' : isDone ? 'rgba(16,185,129,0.08)' : 'rgba(148,163,184,0.03)',
                        scale: isActive && !prefersReducedMotion ? [1, 1.08, 1] : 1,
                      }}
                      transition={isActive && !prefersReducedMotion ? { scale: { repeat: Infinity, duration: 1.6 } } : { duration: 0.3 }}
                    >
                      {isDone && !isActive
                        ? <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        : <Icon className={`h-3 w-3 ${isActive ? 'text-sky-300' : 'text-slate-500'}`} />}
                    </motion.span>
                    <span className={`font-mono text-[9px] uppercase tracking-[0.14em] ${isActive ? 'text-sky-300' : isDone ? 'text-emerald-400/80' : 'text-slate-600'}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className="relative mx-2 h-px flex-1 bg-white/[0.06] overflow-hidden">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-500/70 to-indigo-400/70"
                        animate={{ width: i < stageIdx || stage === 'done' ? '100%' : '0%' }}
                        transition={{ duration: 0.9, ease: 'easeInOut' }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Body: ring + bars | activity feed ── */}
          <div className="grid grid-cols-[auto_1fr] gap-4 p-5">
            {/* Score cluster */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <svg width="104" height="104" viewBox="0 0 104 104" aria-label={`Overall readiness score: ${score}`}>
                  <defs>
                    <linearGradient id="heroSceneRing" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#818cf8" />
                    </linearGradient>
                  </defs>
                  <circle cx="52" cy="52" r="46" fill="none" stroke="rgba(48,57,74,0.35)" strokeWidth="6" />
                  <circle
                    cx="52" cy="52" r="46" fill="none"
                    stroke="url(#heroSceneRing)" strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={RING_C}
                    strokeDashoffset={RING_C - (RING_C * score) / 100}
                    transform="rotate(-90 52 52)"
                    style={{ transition: 'stroke-dashoffset 0.35s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-heading text-[26px] font-semibold tabular-nums text-slate-50 leading-none">{score}</span>
                  <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-slate-500 mt-1">E-ARI score</span>
                </div>
              </div>

              <div className="w-[104px] space-y-1.5">
                {PILLAR_BARS.map((b, i) => (
                  <div key={b.label}>
                    <div className="flex justify-between font-mono text-[8px] text-slate-500 mb-0.5">
                      <span>{b.label}</span>
                      <span className="tabular-nums" style={{ color: b.color }}>{b.value}</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: b.color }}
                        animate={{ width: scoringReached || prefersReducedMotion ? `${b.value}%` : '0%' }}
                        transition={{ duration: 1.1, delay: 0.2 + i * 0.15, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity feed — fixed height, no layout shift */}
            <div className="relative h-[176px] overflow-hidden font-mono text-[10.5px] leading-[1.75]">
              <AnimatePresence initial={false}>
                {feed.map(line => {
                  const t = TONE_STYLES[line.tone];
                  return (
                    <motion.div
                      key={line.id}
                      layout="position"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex gap-2 ${t.cls}`}
                    >
                      <span className="shrink-0 select-none opacity-70">{t.mark}</span>
                      <span className="min-w-0">
                        {line.tone === 'type' && !prefersReducedMotion ? (
                          <>
                            {typed}
                            {typed.length < line.text.length && (
                              <span className="inline-block w-[6px] h-[12px] translate-y-[2px] bg-sky-300/80 animate-pulse ml-px" />
                            )}
                          </>
                        ) : line.text}
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {/* Fade at the top so pushed-up lines exit gracefully */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-[#0e131c] to-transparent" />
            </div>
          </div>

          {/* ── Outcome strip — reserved height, appears at the end ── */}
          <div className="h-10 px-5 border-t border-white/[0.05] bg-[#0b1019] flex items-center">
            <AnimatePresence mode="wait">
              {(stage === 'done' || prefersReducedMotion) && (
                <motion.div
                  key={`outcome-${cycle}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="flex items-center gap-3 w-full"
                >
                  <span className="inline-flex items-center gap-1.5 font-mono text-[9.5px] text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Board-ready report · docx
                  </span>
                  <span className="ml-auto inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/[0.07] px-2 py-0.5 font-mono text-[9px] text-emerald-300">
                    +2.4 pts next move identified
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Hero companions ─────────────────────────────────────────────────────────

/** Cursor-tracking light on the hero — parent must be position:relative. */
export function MouseSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.parentElement;
    const node = ref.current;
    if (!el || !node) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      node.style.background = `radial-gradient(640px circle at ${e.clientX - r.left}px ${e.clientY - r.top}px, rgba(99,102,241,0.08), transparent 65%)`;
    };
    const onLeave = () => { node.style.background = 'transparent'; };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => { el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave); };
  }, []);
  return <div ref={ref} aria-hidden className="absolute inset-0 pointer-events-none z-[1]" />;
}

/** Magnetic wrapper — the CTA leans toward the cursor and springs back. */
export function Magnetic({ children, className }: { children: React.ReactNode; className?: string }) {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  return (
    <motion.div
      ref={ref}
      className={className ?? 'inline-block w-full sm:w-auto'}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, mass: 0.5 }}
      onPointerMove={(e) => {
        if (prefersReducedMotion || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        setOffset({
          x: Math.max(-6, Math.min(6, (e.clientX - (r.left + r.width / 2)) * 0.15)),
          y: Math.max(-5, Math.min(5, (e.clientY - (r.top + r.height / 2)) * 0.2)),
        });
      }}
      onPointerLeave={() => setOffset({ x: 0, y: 0 })}
    >
      {children}
    </motion.div>
  );
}

/** Count-up stat row under the hero CTAs. */
const HERO_STATS = [
  { n: 8, label: 'Pillars' },
  { n: 40, label: 'Signals' },
  { n: 6, label: 'AI agents' },
  { n: 1, label: 'Defensible score' },
];

function StatNumber({ n, delay }: { n: number; delay: number }) {
  const prefersReducedMotion = useReducedMotion();
  const [go, setGo] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGo(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  const value = useCountUp(n, go || !!prefersReducedMotion, 1200);
  return <span className="font-heading text-lg font-semibold tabular-nums text-slate-100">{prefersReducedMotion ? n : value}</span>;
}

export function HeroStats() {
  return (
    <div className="mt-10 flex items-center gap-7 justify-center lg:justify-start">
      {HERO_STATS.map((s, i) => (
        <div key={s.label} className="flex items-baseline gap-1.5">
          <StatNumber n={s.n} delay={600 + i * 180} />
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Infinite framework marquee — the compliance surface E-ARI speaks. */
const FRAMEWORKS = [
  'EU AI Act', 'ISO/IEC 42001', 'NIST AI RMF', 'GDPR', 'DORA', 'SOC 2',
  'Deterministic scoring V5.3', 'Article 4 literacy',
];

export function FrameworkMarquee() {
  return (
    <div className="marquee-mask relative overflow-hidden py-1" aria-label="Frameworks and standards E-ARI aligns with">
      <div className="marquee-track flex w-max items-center">
        {[0, 1].map(copy => (
          <div key={copy} className="flex items-center" aria-hidden={copy === 1}>
            {FRAMEWORKS.map(f => (
              <span key={f} className="flex items-center whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                <span className="px-6">{f}</span>
                <span className="text-eari-blue/50">◆</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
