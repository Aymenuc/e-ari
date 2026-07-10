'use client';

/**
 * Highest-Leverage Moves — the "so what" of the results page.
 *
 * Re-runs the deterministic V5.3 scoring pipeline with each answer raised
 * one step and shows the EXACT overall-score gain per move, plus the
 * shortest simulated path to the next maturity band. No estimates, no LLM:
 * every number here is reproducible arithmetic on the published methodology,
 * which is precisely the claim generic consultancy decks cannot make.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, ArrowRight, Unlock } from 'lucide-react';
import {
  computeLeverage,
  responsesFromScoring,
  type ScoringResult,
} from '@/lib/assessment-engine';

/** Human names for interdependency-rule releases. */
const RULE_LABELS: Record<string, string> = {
  RULE_1: 'releases the Governance → Technology penalty',
  RULE_2: 'releases the Data → Strategy penalty',
  RULE_3: 'releases the Security → Technology penalty',
  RULE_4: 'releases the Talent → Strategy penalty',
  RULE_5: 'releases the Governance+Security → Process penalty',
  RULE_6: 'releases the Culture → Process penalty',
};

const ANSWER_LABELS: Record<number, string> = {
  1: 'not started', 2: 'ad-hoc', 3: 'defined', 4: 'managed', 5: 'optimised',
};

export function LeverageMoves({
  scoring,
  topN = 5,
}: {
  scoring: Pick<ScoringResult, 'pillarScores' | 'sectorWeighting' | 'overallScore' | 'maturityLabel'>;
  topN?: number;
}) {
  const leverage = useMemo(() => {
    try {
      const responses = responsesFromScoring(scoring);
      // Older assessments may not have persisted per-question detail —
      // leverage needs the complete 40-answer map to re-run the pipeline.
      if (Object.keys(responses).length < 40) return null;
      return computeLeverage(responses, scoring.sectorWeighting?.sector);
    } catch {
      return null;
    }
  }, [scoring]);

  if (!leverage || leverage.moves.length === 0) return null;

  const top = leverage.moves.slice(0, topN);
  const maxDelta = top[0]?.scoreDelta || 1;

  return (
    <div className="aurora-card rounded-2xl p-[1px]">
      <Card className="bg-navy-800/90 backdrop-blur-sm border-0 rounded-2xl hover-lift">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="font-heading text-xl font-bold tracking-tight text-foreground">
                Highest-Leverage Moves
              </CardTitle>
              <CardDescription className="font-sans text-sm">
                Each move below was scored by re-running the full pipeline with that one answer improved a single step — exact gains, not estimates
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] border-emerald-500/30 text-emerald-400 whitespace-nowrap">
              SIMULATED · {leverage.scoringVersion}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Ranked moves */}
          <div className="space-y-3">
            {top.map((m, i) => (
              <div key={m.questionId} className="flex items-start gap-3 rounded-lg border border-border/40 bg-navy-900/40 p-3.5">
                <span className="font-mono text-xs text-muted-foreground mt-1 w-4 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant="outline" className="font-mono text-[10px] border-border text-muted-foreground">{m.pillarName}</Badge>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {m.currentAnswer}/5 ({ANSWER_LABELS[m.currentAnswer]}) <ArrowRight className="inline h-3 w-3" /> {m.targetAnswer}/5 ({ANSWER_LABELS[m.targetAnswer]})
                    </span>
                  </div>
                  <p className="font-sans text-sm text-foreground leading-snug">{m.questionText}</p>
                  {m.rulesReleased.length > 0 && (
                    <p className="mt-1.5 flex items-center gap-1.5 font-sans text-xs text-emerald-400">
                      <Unlock className="h-3 w-3" />
                      Also {m.rulesReleased.map(r => RULE_LABELS[r] ?? r).join('; ')}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0 w-24">
                  <p className="font-heading text-lg font-semibold tabular-nums text-emerald-400">+{m.scoreDelta.toFixed(2)}</p>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">overall pts</p>
                  <div className="mt-1.5 h-1 rounded-full bg-navy-900 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${Math.max(8, (m.scoreDelta / maxDelta) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Path to next band */}
          {leverage.nextBand && (
            <div className="rounded-lg border border-eari-blue/20 bg-eari-blue/[0.06] p-4">
              <p className="font-sans text-sm text-foreground">
                You are <span className="font-semibold tabular-nums">{leverage.nextBand.pointsNeeded.toFixed(1)} points</span> from{' '}
                <span className="font-semibold">{leverage.nextBand.label}</span>.
                {leverage.pathToNextBand.length > 0 ? (
                  <> The shortest simulated path is <span className="font-semibold">{leverage.pathToNextBand.length} one-step improvement{leverage.pathToNextBand.length === 1 ? '' : 's'}</span>:</>
                ) : (
                  <> Crossing that boundary takes sustained improvement across several pillars — start with the moves above.</>
                )}
              </p>
              {leverage.pathToNextBand.length > 0 && (
                <ol className="mt-3 space-y-1.5">
                  {leverage.pathToNextBand.map((s, i) => (
                    <li key={i} className="flex items-baseline gap-2 font-sans text-xs text-muted-foreground">
                      <span className="font-mono text-eari-blue-light">{i + 1}.</span>
                      <span className="flex-1">
                        <span className="text-foreground">{s.pillarName}</span> — {s.questionText.length > 90 ? `${s.questionText.slice(0, 87)}…` : s.questionText} ({s.fromAnswer}→{s.toAnswer})
                      </span>
                      <span className="font-mono tabular-nums text-emerald-400 whitespace-nowrap">→ {s.scoreAfter.toFixed(1)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
