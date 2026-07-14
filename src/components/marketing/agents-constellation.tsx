'use client';

/**
 * AgentsConstellation — the six-agent orbit as a linked, explorable system.
 *
 * One shared active state drives three views: hover/focus an orbit node, a
 * pipeline chip, or a roster row and all three light the same agent — the
 * spoke brightens, a data packet travels hub → node, and the spotlight card
 * swaps to that agent's brief. Keyboard accessible (nodes and rows are real
 * buttons). Reduced motion: no packet, no pulse, instant card swaps.
 */

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Workflow, ArrowRight, type LucideIcon } from 'lucide-react';

export interface ConstellationAgent {
  id: string;
  icon: LucideIcon;
  name: string;
  tagline: string;
  description: string;
  capability: string;
  color: string;
}

const VB = 380;
const CXY = 190;
const ORBIT_R = 140;

function angleOf(index: number, total: number) {
  return -Math.PI / 2 + (index * 2 * Math.PI) / total;
}

export function AgentsConstellation({
  agents,
  flowLabels,
}: {
  agents: ConstellationAgent[];
  flowLabels: string[];
}) {
  const prefersReducedMotion = useReducedMotion();
  const [activeIdx, setActiveIdx] = useState(0);
  const active = agents[activeIdx];

  const nodePos = (i: number) => {
    const a = angleOf(i, agents.length);
    return {
      x: CXY + ORBIT_R * Math.cos(a),
      y: CXY + ORBIT_R * Math.sin(a),
      leftPct: ((CXY + ORBIT_R * Math.cos(a)) / VB) * 100,
      topPct: ((CXY + ORBIT_R * Math.sin(a)) / VB) * 100,
    };
  };

  return (
    <div className="mt-14 lg:mt-20 grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14 items-center">

      {/* ── LEFT: orbit ── */}
      <div className="lg:col-span-3">
        <div className="relative flex flex-col items-center justify-center py-6 sm:py-8">
          <p id="orbit-diagram-desc" className="sr-only">
            Six agents arranged clockwise from the top following the orchestration pipeline.
            Hover or focus an agent to see its brief. Lines connect each agent to the central orchestrator hub.
          </p>
          <div className="relative mx-auto aspect-square w-full max-w-[min(380px,92vw)]" aria-labelledby="orbit-diagram-desc">

            {/* Geometry: rings, spokes, and the travelling packet */}
            <svg className="absolute inset-0 z-0 h-full w-full" viewBox={`0 0 ${VB} ${VB}`} preserveAspectRatio="xMidYMid meet" aria-hidden>
              <circle cx={CXY} cy={CXY} r={ORBIT_R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.75" />
              <circle cx={CXY} cy={CXY} r={52} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" opacity={0.65} />

              {agents.map((agent, i) => {
                const { x, y } = nodePos(i);
                const isActive = i === activeIdx;
                return (
                  <motion.line
                    key={`spoke-${agent.id}`}
                    x1={CXY} y1={CXY} x2={x} y2={y}
                    stroke={agent.color}
                    strokeWidth={isActive ? 1.4 : 0.65}
                    strokeLinecap="round"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    animate={{ strokeOpacity: isActive ? 0.55 : 0.14 }}
                    transition={{ strokeOpacity: { duration: 0.25 } }}
                  />
                );
              })}

              {/* Data packet: hub → active node, forever commuting */}
              {!prefersReducedMotion && (
                <motion.circle
                  key={`packet-${active.id}`}
                  r="3"
                  fill={active.color}
                  initial={{ cx: CXY, cy: CXY, opacity: 0 }}
                  animate={{
                    cx: [CXY, nodePos(activeIdx).x],
                    cy: [CXY, nodePos(activeIdx).y],
                    opacity: [0, 0.9, 0],
                  }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.3 }}
                />
              )}
            </svg>

            {/* Hub */}
            <div className="absolute inset-0 z-[1] flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-navy-800/95 border border-white/[0.1] shadow-md shadow-black/40">
                  {!prefersReducedMotion && (
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-2xl border"
                      style={{ borderColor: `${active.color}66` }}
                      animate={{ opacity: [0.6, 0], scale: [1, 1.28] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                    />
                  )}
                  <Workflow className="h-6 w-6 sm:h-7 sm:w-7 text-eari-blue-light" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-mono text-muted-foreground/55 uppercase tracking-widest text-center px-1">
                  Orchestrator
                </span>
              </div>
            </div>

            {/* Nodes — real buttons, linked to the spotlight */}
            {agents.map((agent, i) => {
              const Icon = agent.icon;
              const { leftPct, topPct } = nodePos(i);
              const isActive = i === activeIdx;
              const shortLabel = agent.name.replace(/\s+Agent$/, '');
              return (
                <div
                  key={agent.id}
                  className="absolute z-[2] -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                >
                  <div className="relative flex flex-col items-center gap-1">
                    <motion.button
                      type="button"
                      aria-label={`${agent.name}: ${agent.tagline}`}
                      aria-pressed={isActive}
                      className="relative outline-none focus-visible:ring-2 focus-visible:ring-eari-blue/70 rounded-xl"
                      onMouseEnter={() => setActiveIdx(i)}
                      onFocus={() => setActiveIdx(i)}
                      onClick={() => setActiveIdx(i)}
                      animate={{ scale: isActive ? 1.12 : 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      {isActive && !prefersReducedMotion && (
                        <motion.span
                          aria-hidden
                          className="absolute inset-0 rounded-xl border-2"
                          style={{ borderColor: agent.color }}
                          animate={{ opacity: [0.55, 0], scale: [1, 1.45] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                        />
                      )}
                      <span
                        className="relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl border shadow-sm shadow-black/40 transition-colors duration-200"
                        style={{
                          backgroundColor: isActive ? `${agent.color}2e` : `${agent.color}18`,
                          borderColor: isActive ? `${agent.color}88` : 'rgba(255,255,255,0.1)',
                        }}
                      >
                        <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" style={{ color: agent.color }} />
                      </span>
                      <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-navy-900" />
                    </motion.button>
                    <span className={`max-w-[5.25rem] text-center font-mono text-[8px] sm:text-[9px] leading-snug transition-colors duration-200 pointer-events-none ${isActive ? 'text-slate-200' : 'text-muted-foreground/70'}`}>
                      {shortLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pipeline chips — same order, same state */}
          <div className="mt-8 flex items-center justify-center gap-0 flex-wrap">
            {flowLabels.map((label, i) => (
              <div key={label} className="flex items-center">
                <button
                  type="button"
                  onMouseEnter={() => setActiveIdx(i)}
                  onFocus={() => setActiveIdx(i)}
                  onClick={() => setActiveIdx(i)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-eari-blue/70 ${
                    i === activeIdx
                      ? 'bg-eari-blue/10 border-eari-blue/40'
                      : 'bg-navy-800/50 border-white/[0.04] hover:border-white/[0.1]'
                  }`}
                >
                  <span className={`text-[9px] font-mono font-bold ${i === activeIdx ? 'text-eari-blue-light' : 'text-muted-foreground/60'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={`text-[11px] font-heading font-semibold ${i === activeIdx ? 'text-white' : 'text-foreground'}`}>{label}</span>
                </button>
                {i < flowLabels.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground/20 mx-1 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: spotlight card (active agent) + roster ── */}
      <div className="lg:col-span-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="rounded-xl border p-5 mb-4"
            style={{ borderColor: `${active.color}33`, backgroundColor: `${active.color}0a` }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${active.color}1f` }}>
                <active.icon className="h-5 w-5" style={{ color: active.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading text-sm font-semibold text-white">{active.name}</span>
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-navy-900" />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground/60">{active.tagline}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground/80 leading-relaxed mb-3">{active.description}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {active.capability.split(' · ').map(cap => (
                <span key={cap} className="text-[9px] font-mono px-1.5 py-0.5 rounded border text-muted-foreground/70"
                  style={{ borderColor: `${active.color}2a`, backgroundColor: `${active.color}0f` }}>
                  {cap}
                </span>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Roster — every agent reachable, active row highlighted */}
        <div className="space-y-0">
          {agents.map((agent, i) => {
            const Icon = agent.icon;
            const isActive = i === activeIdx;
            return (
              <button
                key={agent.id}
                type="button"
                onMouseEnter={() => setActiveIdx(i)}
                onFocus={() => setActiveIdx(i)}
                onClick={() => setActiveIdx(i)}
                className={`flex w-full items-center gap-3 py-2.5 px-2 -mx-2 rounded-md text-left border-b border-white/[0.04] last:border-b-0 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-eari-blue/50 ${isActive ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]'}`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0" style={{ backgroundColor: `${agent.color}${isActive ? '22' : '10'}` }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: agent.color }} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className={`font-heading text-xs font-semibold transition-colors ${isActive ? 'text-white' : 'text-foreground'}`}>{agent.name}</span>
                    <span className="text-[9px] font-mono text-muted-foreground/40 hidden sm:inline truncate">{agent.tagline}</span>
                  </span>
                </span>
                <motion.span
                  className="h-1 w-6 rounded-full flex-shrink-0"
                  animate={{ backgroundColor: isActive ? agent.color : 'rgba(255,255,255,0.06)' }}
                  transition={{ duration: 0.2 }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
