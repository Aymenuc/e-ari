import { describe, expect, it } from 'vitest';
import { AI_ACT_OBLIGATIONS } from '@/lib/compliance/ai-act-obligations';
import {
  applicableObligationsForTier,
  clauseSupportsObligation,
} from '@/lib/progression';

describe('progression helpers', () => {
  it('high tier includes full catalogue', () => {
    expect(applicableObligationsForTier('high').length).toBe(
      AI_ACT_OBLIGATIONS.length,
    );
  });

  it('minimal tier is a strict subset', () => {
    const m = applicableObligationsForTier('minimal');
    expect(m.length).toBeGreaterThan(0);
    expect(m.length).toBeLessThan(AI_ACT_OBLIGATIONS.length);
  });

  it('clauseSupportsObligation matches hint articles loosely', () => {
    const ob = AI_ACT_OBLIGATIONS.find((o) => o.code === 'AI_ACT_ART_9');
    expect(ob).toBeDefined();
    expect(clauseSupportsObligation(['Art. 9 — risk management'], ob!)).toBe(
      true,
    );
    expect(clauseSupportsObligation([], ob!)).toBe(false);
  });
});
