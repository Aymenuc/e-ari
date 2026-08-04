import { describe, it, expect } from 'vitest';
import {
  SAFETY_COMPONENT_TEST, SMALL_MID_CAP, scopeRulesForPrompt, assessSmallMidCap,
} from './ai-act-scope';

/**
 * These encode statutory tests, so they are pinned rather than reviewed.
 *
 * The thresholds come from Commission Recommendation (EU) 2025/1099 and the
 * scope rules from Regulation (EU) 2026/1744. A secondary summary of the
 * Recommendation gave 1,500 employees and EUR 300 million; the primary text
 * gives fewer than 750 and EUR 150 million / EUR 129 million. The numbers below
 * are the primary text's, and a change to them should have to break a test.
 */
describe('small mid-cap thresholds', () => {
  it('matches Recommendation (EU) 2025/1099', () => {
    expect(SMALL_MID_CAP.maxHeadcount).toBe(750);
    expect(SMALL_MID_CAP.maxTurnoverEur).toBe(150_000_000);
    expect(SMALL_MID_CAP.maxBalanceSheetEur).toBe(129_000_000);
  });

  it('rules the category out above the headcount ceiling', () => {
    for (const band of ['1001-5000', '5000+']) {
      expect(assessSmallMidCap(band).likelihood).toBe('unlikely');
    }
  });

  it('never asserts the status from a band that straddles the ceiling', () => {
    const r = assessSmallMidCap('201-1000');
    expect(r.likelihood).toBe('possible');
    expect(r.likelihood).not.toBe('likely');
    expect(r.missing).toContain('exact headcount');
  });

  it('asks for the financial limbs rather than assuming them', () => {
    const r = assessSmallMidCap('201-1000');
    expect(r.missing.some((m) => /turnover/i.test(m))).toBe(true);
    expect(r.missing.some((m) => /balance/i.test(m))).toBe(true);
  });

  it('says nothing when there is no size on record', () => {
    expect(assessSmallMidCap(undefined).likelihood).toBe('unknown');
    expect(assessSmallMidCap(null).likelihood).toBe('unknown');
  });
});

describe('amended safety-component test', () => {
  it('keeps both limbs — intended purpose and objective failure', () => {
    expect(SAFETY_COMPONENT_TEST.intendedPurpose).toMatch(/intended purpose/i);
    expect(SAFETY_COMPONENT_TEST.failureEndangers).toMatch(/failure or malfunction/i);
  });

  it('carries every Article 6(1a) excluded use', () => {
    for (const use of [
      'user assistance', 'performance optimisation', 'service efficiency',
      'automation', 'convenience', 'quality control',
    ]) {
      expect(SAFETY_COMPONENT_TEST.excludedUses).toContain(use);
    }
  });
});

describe('classifier prompt rules', () => {
  const rules = scopeRulesForPrompt();

  it('names the amending regulation so the model applies the current text', () => {
    expect(rules).toContain('2026/1744');
    expect(rules).toMatch(/do not apply the 2024 text unamended/i);
  });

  it('forbids the superseded high-risk date and states the real ones', () => {
    expect(rules).toMatch(/never say high-risk obligations applied from 2 August 2026/i);
    expect(rules).toContain('2 December 2027');
    expect(rules).toContain('2 August 2028');
  });

  it('keeps Annex III as a separate route, unaffected by the safety test', () => {
    expect(rules).toMatch(/Annex III[\s\S]*separate route/i);
  });

  it('tells the model to name the missing fact instead of assuming the worse tier', () => {
    expect(scopeRulesForPrompt()).toMatch(/NOT a safety component/i);
  });
});
