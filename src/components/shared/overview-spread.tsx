'use client';

/**
 * OverviewSpread — the composed "state of readiness" for the results
 * Overview tab. Replaces the inherited sequence (maturity card + eight
 * full pillar cards) with one designed spread that answers "where do we
 * stand" in a single view: compact pillar list beside a radar, the
 * engine's findings as three alert rows, and the single highest-leverage
 * move as the one call-to-action. Every element deep-links into the tab
 * that owns its detail.
 */

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, TrendingUp } from 'lucide-react';
import {
  computeLeverage,
  responsesFromScoring,
  type ScoringResult,
} from '@/lib/assessment-engine';
import type { XRayFinding } from '@/lib/scoring-patterns';

function ramp(score: number): string {
  const t = Math.max(0, Math.min(1, (score - 40) / 45));
  const ch = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${ch(0x3a, 0x38)}, ${ch(0x52, 0xbd)}, ${ch(0x74, 0xf8)})`;
}

const SEVERITY_DOT: Record<string, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#facc15',
  low: '#64748b',
};

export function OverviewSpread({
  scoring,
  onGoTo,
}: {
  scoring: ScoringResult;
  onGoTo: (tab: string) => void;
}) {
  const prefersReducedMotion = useReducedMotion();

  const topMove = useMemo(() => {
    try {
      const responses = responsesFromScoring(scoring);
      if (Object.keys(responses).length < 40) return null;
      return computeLeverage(responses, scoring.sectorWeighting?.sector).moves[0] ?? null;
    } catch {
      return null;
    }
  }, [scoring]);

  const findings: XRayFinding[] = (scoring.xRayFindings ?? []).slice(0, 3);

  // Radar geometry
  const CX = 110, CY = 110, R = 78;
  const pts = scoring.pillarScores.map((p, i) => {
    const a = (Math.PI * 2 * i) / scoring.pillarScores.length - Math.PI / 2;
    const r = (p.normalizedScore / 100) * R;
    return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a), a };
  });
  const poly = pts.map((v) => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(' ');

  return (
    <div className="space-y-4">
      {/* ── The spread: pillars beside the shape of readiness ── */}
      <div className="aurora-card rounded-2xl p-[1px]">
        <Card className="bg-navy-800/40 border-0 rounded-2xl">
          <CardContent className="p-5 sm:p-7">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
              {/* Compact pillar list */}
              <div className="lg:col-span-3 space-y-1">
                {scoring.pillarScores.map((p, i) => {
                  const c = ramp(p.normalizedScore);
                  return (
                    <motion.div
                      key={p.pillarId}
                      initial={prefersReducedMotion ? false : { opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.05, duration: 0.35 }}
                      className="flex items-center gap-3 rounded-md px-2 py-1.5 -mx-2 hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="w-40 shrink-0 truncate font-heading text-[13px] font-medium text-slate-200">
                        {p.pillarName}
                      </span>
                      <div className="h-1.5 flex-1 rounded-full bg-white/[0.05] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: c }}
                          initial={{ width: 0 }}
                          animate={{ width: `${p.normalizedScore}%` }}
                          transition={{ delay: 0.15 + i * 0.05, duration: 0.7, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="w-9 text-right font-mono text-[12px] font-semibold tabular-nums" style={{ color: c }}>
                        {Math.round(p.normalizedScore)}
                      </span>
                      <span className="hidden sm:block w-20 text-right font-mono text-[9px] uppercase tracking-wider text-slate-500">
                        {p.maturityLabel}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Radar — the shape of readiness */}
              <div className="lg:col-span-2 flex justify-center">
                <svg viewBox="0 0 220 220" className="w-full max-w-[260px]" aria-label="Pillar radar">
                  {[0.25, 0.5, 0.75, 1].map((f) => (
                    <circle key={f} cx={CX} cy={CY} r={R * f} fill="none"
                      stroke={f === 1 ? 'rgba(148,163,184,0.16)' : 'rgba(100,116,139,0.1)'} strokeWidth="0.6" />
                  ))}
                  {pts.map((v, i) => (
                    <line key={i} x1={CX} y1={CY}
                      x2={CX + R * Math.cos(v.a)} y2={CY + R * Math.sin(v.a)}
                      stroke="rgba(100,116,139,0.1)" strokeWidth="0.5" />
                  ))}
                  <motion.polygon
                    points={poly}
                    fill="rgba(56,189,248,0.10)"
                    stroke="rgba(125,211,252,0.8)"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                    initial={prefersReducedMotion ? false : { pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  />
                  {pts.map((v, i) => (
                    <circle key={i} cx={v.x} cy={v.y} r="2.4"
                      fill={ramp(scoring.pillarScores[i].normalizedScore)} />
                  ))}
                  {scoring.pillarScores.map((p, i) => {
                    const a = (Math.PI * 2 * i) / scoring.pillarScores.length - Math.PI / 2;
                    const lx = CX + (R + 18) * Math.cos(a);
                    const ly = CY + (R + 18) * Math.sin(a);
                    return (
                      <text key={p.pillarId} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                        fill="#94a3b8" fontSize="7.5" fontFamily="var(--font-jetbrains)">
                        {p.pillarName.split(' ')[0]}
                      </text>
                    );
                  })}
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── What the engine flagged + the one move ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="aurora-card rounded-2xl p-[1px]">
          <Card className="bg-navy-800/40 border-0 rounded-2xl h-full">
            <CardContent className="p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-3">
                What the engine flagged
              </p>
              {findings.length === 0 ? (
                <p className="font-sans text-sm text-muted-foreground">
                  No structural failure patterns detected in this response set.
                </p>
              ) : (
                <div className="space-y-2">
                  {findings.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => onGoTo('findings')}
                      className="flex w-full items-center gap-3 rounded-lg border border-white/[0.06] bg-navy-900/40 px-3 py-2.5 text-left transition-colors hover:border-white/[0.14]"
                    >
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: SEVERITY_DOT[f.severity] ?? '#64748b' }} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-heading text-[13px] font-semibold text-slate-100 truncate">
                          {f.id} · {f.title}
                        </span>
                        <span className="block font-sans text-[11.5px] text-muted-foreground truncate">
                          {f.headline}
                        </span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="aurora-card rounded-2xl p-[1px]">
          <Card className="bg-navy-800/40 border-0 rounded-2xl h-full">
            <CardContent className="p-5 flex flex-col">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-3">
                Your highest-leverage move
              </p>
              {topMove ? (
                <>
                  <div className="flex items-start gap-3 flex-1">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/[0.07] shrink-0">
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-sans text-[13px] leading-snug text-slate-200">{topMove.questionText}</p>
                      <p className="mt-1.5 font-mono text-[11px] text-slate-500">
                        {topMove.pillarName} · {topMove.currentAnswer}/5 → {topMove.targetAnswer}/5 ·{' '}
                        <span className="text-emerald-400 font-semibold">+{topMove.scoreDelta.toFixed(2)} pts exact</span>
                      </p>
                    </div>
                  </div>
                  <Button onClick={() => onGoTo('action')} className="btn-brand font-heading font-semibold h-9 px-4 text-sm mt-4 self-start">
                    Open the full action plan <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <p className="font-sans text-sm text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-slate-500" />
                  Leverage analysis needs the full 40-answer set.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
