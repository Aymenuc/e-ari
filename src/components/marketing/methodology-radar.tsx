'use client';

/**
 * MethodologyExplorer — the 8-pillar framework as an instrument you can play.
 *
 * The radar performs its one-time choreographed reveal (rings settle, axes
 * draw, the web strokes itself, vertices pop, the score counts up) and then
 * becomes INTERACTIVE: hovering or focusing a pillar row lights its vertex,
 * brightens its axis, dims the rest, and reveals what that pillar measures —
 * and hovering a vertex highlights the row right back. One shared state, two
 * linked views. Keyboard accessible via the row buttons.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useInView, useReducedMotion } from 'framer-motion';
import { PILLARS as LIB_PILLARS } from '@/lib/pillars';
import {
  Target, Database, Cpu, Users, Scale, Heart, GitBranch, Shield,
  type LucideIcon,
} from 'lucide-react';

// Demo scores in lib pillar order (strategy … security).
const DEMO_SCORES = [72, 58, 65, 44, 78, 55, 61, 83];

const ICONS: Record<string, LucideIcon> = {
  Target, Database, Cpu, Users, Scale, Heart, GitBranch, Shield,
};

const PILLARS = LIB_PILLARS.map((p, i) => ({
  id: p.id,
  name: p.shortName,
  fullName: p.name,
  weight: Math.round(p.weight * 100),
  // First sentence of the published description — what this pillar measures.
  measures: p.description.split(/(?<=\.)\s/)[0],
  icon: ICONS[p.icon] ?? Target,
  score: DEMO_SCORES[i],
}));

const AVG = Math.round((PILLARS.reduce((s, p) => s + p.score, 0) / PILLARS.length) * 10) / 10;

const CX = 120;
const CY = 120;
const R = 84;

// Score → colour on one cool ramp: 40 → muted steel, 85 → bright cyan.
function scoreColor(score: number): string {
  const lo = { r: 0x3a, g: 0x52, b: 0x74 };
  const hi = { r: 0x38, g: 0xbd, b: 0xf8 };
  const t = Math.max(0, Math.min(1, (score - 40) / 45));
  const ch = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${ch(lo.r, hi.r)}, ${ch(lo.g, hi.g)}, ${ch(lo.b, hi.b)})`;
}

function vertex(i: number, score: number) {
  const angle = (Math.PI * 2 * i) / PILLARS.length - Math.PI / 2;
  const rr = (score / 100) * R;
  return { x: CX + rr * Math.cos(angle), y: CY + rr * Math.sin(angle), angle };
}

// ─── Radar (driven by shared active state) ──────────────────────────────────

function Radar({ active, onActive }: { active: number | null; onActive: (i: number | null) => void }) {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-120px' });
  const go = inView || prefersReducedMotion;

  const [centerVal, setCenterVal] = useState(prefersReducedMotion ? AVG : 0);
  useEffect(() => {
    if (prefersReducedMotion) { setCenterVal(AVG); return; }
    if (!inView) return;
    let raf = 0;
    const t0 = performance.now();
    const dur = 1600;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setCenterVal(Math.round(AVG * (1 - Math.pow(1 - p, 3)) * 10) / 10);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, prefersReducedMotion]);

  const points = PILLARS.map((p, i) => vertex(i, p.score));
  const polyPoints = points.map((v) => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(' ');
  const draw = { duration: 1.3, ease: [0.22, 1, 0.36, 1] as const };
  const dimmed = active !== null;

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-md aspect-square">
      <div
        className="absolute inset-[14%] rounded-full opacity-[0.14] blur-2xl"
        style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.35) 0%, transparent 70%)' }}
      />

      <svg viewBox="0 0 240 240" className="w-full h-full overflow-visible" aria-label="8-pillar readiness radar">
        <defs>
          <radialGradient id="radarWebFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(56,189,248,0.20)" />
            <stop offset="70%" stopColor="rgba(37,99,235,0.08)" />
            <stop offset="100%" stopColor="rgba(37,99,235,0.02)" />
          </radialGradient>
          <linearGradient id="radarWebStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75, 1].map((f, idx) => (
          <motion.circle
            key={f}
            cx={CX} cy={CY} r={R * f}
            fill="none"
            stroke={idx === 3 ? 'rgba(56,189,248,0.16)' : 'rgba(100,116,139,0.13)'}
            strokeWidth={idx === 3 ? 0.7 : 0.5}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={go ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: idx * 0.07, ease: 'easeOut' }}
            style={{ transformOrigin: `${CX}px ${CY}px` }}
          />
        ))}

        {/* Axes — the active pillar's axis lights up in its score colour */}
        {PILLARS.map((p, i) => {
          const v = vertex(i, 100);
          const isActive = active === i;
          return (
            <motion.line
              key={i}
              x1={CX} y1={CY} x2={v.x} y2={v.y}
              strokeWidth={isActive ? 1.1 : 0.5}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={go ? {
                pathLength: 1,
                opacity: 1,
                stroke: isActive ? scoreColor(p.score) : 'rgba(100,116,139,0.12)',
              } : {}}
              transition={{ pathLength: { duration: 0.5, delay: 0.15 + i * 0.03 }, stroke: { duration: 0.25 } }}
            />
          );
        })}

        <motion.polygon
          points={polyPoints}
          fill="url(#radarWebFill)"
          stroke="none"
          initial={{ opacity: 0 }}
          animate={go ? { opacity: dimmed ? 0.55 : 1 } : {}}
          transition={{ duration: 0.5, delay: go && !dimmed ? 0.7 : 0 }}
        />
        <motion.polygon
          points={polyPoints}
          fill="none"
          stroke="url(#radarWebStroke)"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={go ? { pathLength: 1, opacity: dimmed ? 0.6 : 1 } : {}}
          transition={{ pathLength: { ...draw, delay: 0.45 }, opacity: { duration: 0.25 } }}
        />

        {/* Vertices — hover targets; the active one blooms */}
        {points.map((v, i) => {
          const c = scoreColor(PILLARS[i].score);
          const isActive = active === i;
          return (
            <motion.g
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={go ? { opacity: dimmed && !isActive ? 0.45 : 1, scale: 1 } : {}}
              transition={{ duration: 0.4, delay: 0.6 + i * 0.11, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ transformOrigin: `${v.x}px ${v.y}px` }}
            >
              {isActive && (
                <motion.circle
                  cx={v.x} cy={v.y} r="8" fill="none" stroke={c} strokeWidth="0.8"
                  initial={{ opacity: 0.7, scale: 0.6 }}
                  animate={{ opacity: 0, scale: 1.7 }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                  style={{ transformOrigin: `${v.x}px ${v.y}px` }}
                />
              )}
              <circle cx={v.x} cy={v.y} r={isActive ? 6.5 : 4.5} fill={c} opacity={isActive ? 0.3 : 0.18} />
              <circle cx={v.x} cy={v.y} r={isActive ? 3.4 : 2.6} fill={c} />
              {/* Generous invisible hit area — radar answers the cursor too */}
              <circle
                cx={v.x} cy={v.y} r="14" fill="transparent" className="cursor-pointer"
                onMouseEnter={() => onActive(i)} onMouseLeave={() => onActive(null)}
              />
            </motion.g>
          );
        })}

        {/* Labels */}
        {PILLARS.map((p, i) => {
          const v = vertex(i, 100);
          const lx = CX + (R + 24) * Math.cos(v.angle);
          const ly = CY + (R + 24) * Math.sin(v.angle);
          const isActive = active === i;
          return (
            <motion.g
              key={i}
              initial={{ opacity: 0 }}
              animate={go ? { opacity: dimmed && !isActive ? 0.4 : 1 } : {}}
              transition={{ duration: 0.4, delay: go && !dimmed ? 1.1 + i * 0.05 : 0 }}
            >
              <text x={lx} y={ly - 3} textAnchor="middle" dominantBaseline="middle"
                fill={isActive ? '#e2e8f0' : '#94a3b8'} fontSize="7.5" fontFamily="var(--font-jetbrains)" fontWeight={isActive ? '700' : '500'}>
                {p.name}
              </text>
              <text x={lx} y={ly + 8} textAnchor="middle" dominantBaseline="middle"
                fill={scoreColor(p.score)} fontSize="8.5" fontFamily="var(--font-jetbrains)" fontWeight="700">
                {p.score}
              </text>
            </motion.g>
          );
        })}
      </svg>

      {/* Center — average score, or the active pillar's weight */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <AnimatePresence mode="wait">
          {active === null ? (
            <motion.div key="avg" className="text-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <span className="block font-heading text-4xl font-semibold tracking-tight tabular-nums text-slate-50">
                {centerVal.toFixed(1)}
              </span>
              <span className="block text-[10px] font-mono text-slate-500 tracking-[0.2em] uppercase mt-1">
                E-ARI score
              </span>
            </motion.div>
          ) : (
            <motion.div key={`p-${active}`} className="text-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <span className="block font-heading text-4xl font-semibold tracking-tight tabular-nums" style={{ color: scoreColor(PILLARS[active].score) }}>
                {PILLARS[active].score}
              </span>
              <span className="block text-[10px] font-mono text-slate-500 tracking-[0.2em] uppercase mt-1">
                {PILLARS[active].name} · {PILLARS[active].weight}% weight
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Explorer: radar + linked pillar list ───────────────────────────────────

export function MethodologyExplorer() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="mt-14 lg:mt-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
      <Radar active={active} onActive={setActive} />

      <div className="space-y-0" onMouseLeave={() => setActive(null)}>
        {PILLARS.map((pillar, i) => {
          const Icon = pillar.icon;
          const isActive = active === i;
          const c = scoreColor(pillar.score);
          return (
            <button
              key={pillar.id}
              type="button"
              className="group relative block w-full text-left py-3.5 border-b border-white/[0.04] last:border-b-0 outline-none"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-expanded={isActive}
            >
              {/* Active accent rail */}
              <motion.span
                aria-hidden
                className="absolute left-[-14px] top-3 bottom-3 w-[2px] rounded-full"
                animate={{ backgroundColor: isActive ? c : 'rgba(0,0,0,0)' }}
                transition={{ duration: 0.2 }}
              />
              <div className="flex items-center gap-4">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-md flex-shrink-0 border transition-colors duration-200"
                  style={{
                    borderColor: isActive ? `${c}55` : 'rgba(255,255,255,0.06)',
                    backgroundColor: isActive ? `${c}14` : 'rgba(255,255,255,0.03)',
                  }}
                >
                  <Icon className="h-4 w-4 transition-colors duration-200" style={{ color: isActive ? c : 'rgba(148,163,184,0.7)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={`font-heading text-sm font-semibold transition-colors duration-200 ${isActive ? 'text-white' : 'text-foreground'}`}>
                      {pillar.fullName}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground/60 flex-shrink-0">
                      {pillar.weight}% weight
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-white/[0.04] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pillar.score}%` }}
                      viewport={{ once: true }}
                      animate={{ backgroundColor: isActive ? c : 'rgba(37,99,235,0.8)' }}
                      transition={{ width: { duration: 0.65, delay: 0.35 + i * 0.04, ease: 'easeOut' }, backgroundColor: { duration: 0.2 } }}
                    />
                  </div>
                  {/* What this pillar measures — revealed while active */}
                  <AnimatePresence initial={false}>
                    {isActive && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className="overflow-hidden font-sans text-[11.5px] leading-snug text-muted-foreground/80 pt-1.5 pr-4"
                      >
                        {pillar.measures}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
                <span className="font-mono text-lg font-semibold tabular-nums transition-colors duration-200" style={{ color: isActive ? c : undefined }}>
                  {pillar.score}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Back-compat alias — earlier landing revisions imported the radar alone. */
export function MethodologyRadar() {
  return <Radar active={null} onActive={() => {}} />;
}
