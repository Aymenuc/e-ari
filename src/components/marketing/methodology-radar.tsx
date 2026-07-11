'use client';

/**
 * MethodologyRadar — a self-drawing 8-pillar radar.
 *
 * Design intent (the premium move): NOT a perpetual gimmick. When it scrolls
 * into view it performs one choreographed reveal — rings settle, axes draw
 * from the center, the data web strokes itself around the perimeter while its
 * vertices pop in sequence and the fill blooms, and the center score counts
 * up — then it holds as a calm, confident, static instrument. Plays once.
 *
 * Colour encodes score on a single cool ramp (muted steel → bright cyan), so
 * strong pillars visibly glow and weak ones recede. One coherent palette, not
 * eight arbitrary hues.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

const PILLARS = [
  { name: 'Strategy', score: 72 },
  { name: 'Data', score: 58 },
  { name: 'Technology', score: 65 },
  { name: 'Talent', score: 44 },
  { name: 'Governance', score: 78 },
  { name: 'Culture', score: 55 },
  { name: 'Process', score: 61 },
  { name: 'Security', score: 83 },
];

const AVG = Math.round((PILLARS.reduce((s, p) => s + p.score, 0) / PILLARS.length) * 10) / 10;

const CX = 120;
const CY = 120;
const R = 84;

// Score → colour on one cool ramp: 40 → muted steel, 85 → bright cyan.
function scoreColor(score: number): string {
  const lo = { r: 0x3a, g: 0x52, b: 0x74 }; // #3a5274 muted steel-blue
  const hi = { r: 0x38, g: 0xbd, b: 0xf8 }; // #38bdf8 sky-400
  const t = Math.max(0, Math.min(1, (score - 40) / 45));
  const ch = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${ch(lo.r, hi.r)}, ${ch(lo.g, hi.g)}, ${ch(lo.b, hi.b)})`;
}

function vertex(i: number, score: number) {
  const angle = (Math.PI * 2 * i) / PILLARS.length - Math.PI / 2;
  const rr = (score / 100) * R;
  return { x: CX + rr * Math.cos(angle), y: CY + rr * Math.sin(angle), angle };
}

export function MethodologyRadar() {
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

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-md aspect-square">
      {/* Ambient glow — static, subtle */}
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

        {/* Concentric rings — settle in */}
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

        {/* Axes — draw outward from center */}
        {PILLARS.map((_, i) => {
          const v = vertex(i, 100);
          return (
            <motion.line
              key={i}
              x1={CX} y1={CY} x2={v.x} y2={v.y}
              stroke="rgba(100,116,139,0.12)" strokeWidth="0.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={go ? { pathLength: 1, opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.03, ease: 'easeOut' }}
            />
          );
        })}

        {/* Data web fill — blooms in */}
        <motion.polygon
          points={polyPoints}
          fill="url(#radarWebFill)"
          stroke="none"
          initial={{ opacity: 0 }}
          animate={go ? { opacity: 1 } : {}}
          transition={{ duration: 1.1, delay: 0.7, ease: 'easeOut' }}
        />

        {/* Data web stroke — draws itself around the perimeter */}
        <motion.polygon
          points={polyPoints}
          fill="none"
          stroke="url(#radarWebStroke)"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={go ? { pathLength: 1, opacity: 1 } : {}}
          transition={{ pathLength: { ...draw, delay: 0.45 }, opacity: { duration: 0.2, delay: 0.45 } }}
        />

        {/* Vertices — pop in sequence as the stroke passes */}
        {points.map((v, i) => {
          const c = scoreColor(PILLARS[i].score);
          return (
            <motion.g
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={go ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.4, delay: 0.6 + i * 0.11, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ transformOrigin: `${v.x}px ${v.y}px` }}
            >
              <circle cx={v.x} cy={v.y} r="4.5" fill={c} opacity="0.18" />
              <circle cx={v.x} cy={v.y} r="2.6" fill={c} />
            </motion.g>
          );
        })}

        {/* Labels — fade in last */}
        {PILLARS.map((p, i) => {
          const v = vertex(i, 100);
          const lx = CX + (R + 24) * Math.cos(v.angle);
          const ly = CY + (R + 24) * Math.sin(v.angle);
          return (
            <motion.g
              key={i}
              initial={{ opacity: 0 }}
              animate={go ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 1.1 + i * 0.05 }}
            >
              <text x={lx} y={ly - 3} textAnchor="middle" dominantBaseline="middle"
                fill="#94a3b8" fontSize="7.5" fontFamily="var(--font-jetbrains)" fontWeight="500">
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

      {/* Center score — counts up, then holds */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <span className="block font-heading text-4xl font-semibold tracking-tight tabular-nums text-slate-50">
            {centerVal.toFixed(1)}
          </span>
          <span className="block text-[10px] font-mono text-slate-500 tracking-[0.2em] uppercase mt-1">
            E-ARI score
          </span>
        </div>
      </div>
    </div>
  );
}
