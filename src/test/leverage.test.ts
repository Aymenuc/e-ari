import { describe, it, expect } from 'vitest';
import {
  computeLeverage,
  responsesFromScoring,
  scoreAssessment,
  type ResponseMap,
} from '@/lib/assessment-engine';
import { PILLARS } from '@/lib/pillars';

function buildResponses(fill: number, overrides: Record<string, number> = {}): ResponseMap {
  const responses: ResponseMap = {};
  for (const pillar of PILLARS) {
    for (const q of pillar.questions) responses[q.id] = fill;
  }
  return { ...responses, ...overrides };
}

describe('computeLeverage', () => {
  it('is deterministic', () => {
    const responses = buildResponses(3, { governance_1: 1, data_2: 2 });
    const a = computeLeverage(responses, 'technology');
    const b = computeLeverage(responses, 'technology');
    expect(a).toEqual(b);
  });

  it('produces a positive, sorted move table for a mid-maturity profile', () => {
    const leverage = computeLeverage(buildResponses(3));
    expect(leverage.moves).toHaveLength(40); // every answer < 5 is movable
    for (let i = 1; i < leverage.moves.length; i++) {
      expect(leverage.moves[i - 1].scoreDelta).toBeGreaterThanOrEqual(leverage.moves[i].scoreDelta);
    }
    expect(leverage.moves[0].scoreDelta).toBeGreaterThan(0);
    expect(leverage.moves[0].targetAnswer).toBe(leverage.moves[0].currentAnswer + 1);
  });

  it('surfaces interdependency-rule releases as the top moves', () => {
    // Governance raw 10 → normalized 25, one step reaches raw 11 → 30,
    // which releases the ×0.7 Technology penalty (RULE_1 requires < 30) —
    // so a governance step must dominate the table.
    const responses = buildResponses(4, {
      governance_1: 2, governance_2: 2, governance_3: 2, governance_4: 2, governance_5: 2,
    });
    const base = scoreAssessment(responses);
    expect(base.adjustments.some((a) => a.type === 'RULE_1')).toBe(true);

    const leverage = computeLeverage(responses);
    const releasing = leverage.moves.filter((m) => m.rulesReleased.includes('RULE_1'));
    expect(releasing.length).toBeGreaterThan(0);
    expect(leverage.moves[0].pillarId).toBe('governance');
    expect(leverage.moves[0].rulesReleased).toContain('RULE_1');
    // The release makes the top move worth strictly more than a plain
    // same-pillar step elsewhere.
    const plain = leverage.moves.find((m) => m.rulesReleased.length === 0);
    expect(leverage.moves[0].scoreDelta).toBeGreaterThan(plain!.scoreDelta);
  });

  it('simulates an exact path to the next maturity band', () => {
    const responses = buildResponses(3); // score 50 → follower, boundary at 51
    const leverage = computeLeverage(responses);
    expect(leverage.nextBand?.band).toBe('chaser');
    expect(leverage.pathToNextBand.length).toBeGreaterThan(0);
    const last = leverage.pathToNextBand[leverage.pathToNextBand.length - 1];
    expect(last.scoreAfter).toBeGreaterThan(50);

    // Replay the path independently — every scoreAfter must be exact.
    const replay = { ...responses };
    for (const step of leverage.pathToNextBand) {
      expect(replay[step.questionId]).toBe(step.fromAnswer);
      replay[step.questionId] = step.toAnswer;
      expect(scoreAssessment(replay).overallScore).toBe(step.scoreAfter);
    }
  });

  it('returns no next band at pacesetter and no moves at ceiling', () => {
    const leverage = computeLeverage(buildResponses(5));
    expect(leverage.nextBand).toBeNull();
    expect(leverage.moves).toHaveLength(0);
  });

  it('template insights lead with exact-gain leverage moves', async () => {
    const { generateTemplateInsightsSync } = await import('@/lib/ai-insights');
    const result = scoreAssessment(buildResponses(3), 'healthcare');
    const insights = generateTemplateInsightsSync(result, { sector: 'healthcare' });
    expect(insights.nextSteps[0]).toMatch(/^Highest-leverage move:/);
    expect(insights.nextSteps[0]).toMatch(/\+\d+\.\d points/);
  });

  it('responsesFromScoring round-trips through a scoring result', () => {
    const responses = buildResponses(2, { strategy_1: 5, security_3: 4 });
    const result = scoreAssessment(responses, 'healthcare');
    expect(responsesFromScoring(result)).toEqual(responses);
    // And leverage computed from the rebuilt map matches the original.
    expect(computeLeverage(responsesFromScoring(result), 'healthcare'))
      .toEqual(computeLeverage(responses, 'healthcare'));
  });
});
