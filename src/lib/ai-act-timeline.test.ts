import { describe, it, expect } from 'vitest';
import {
  AI_ACT_MILESTONES, milestone, nextMilestone, inForce, daysUntil, formatMilestoneDate,
} from './ai-act-timeline';

/**
 * These dates were wrong in production once already.
 *
 * The product shipped "high-risk obligations apply from 2 August 2026" in
 * eight places after the Digital Omnibus had already moved standalone Annex III
 * to 2 December 2027 — including in the ground-truth block handed to the
 * language model, so the generated narratives repeated it. Stating a
 * superseded applicability date is the worst error a compliance product can
 * make, so the corrected dates are pinned here rather than left to review.
 */
describe('EU AI Act timeline', () => {
  it('defers standalone Annex III high-risk to 2 December 2027', () => {
    const m = milestone('high-risk-annex-iii');
    expect(m).toBeDefined();
    expect(m!.date.toISOString()).toBe('2027-12-02T00:00:00.000Z');
    expect(m!.amendedByOmnibus).toBe(true);
    expect(formatMilestoneDate(m!)).toBe('2 December 2027');
  });

  it('defers product-embedded high-risk to 2 August 2028', () => {
    expect(milestone('high-risk-annex-i')!.date.toISOString()).toBe('2028-08-02T00:00:00.000Z');
  });

  it('leaves the Article 4 literacy duty in force from February 2025', () => {
    const m = milestone('literacy')!;
    expect(m.date.toISOString()).toBe('2025-02-02T00:00:00.000Z');
    // The Omnibus deliberately did not touch this one; if a future edit marks
    // it amended, that is a claim needing a source.
    expect(m.amendedByOmnibus).toBe(false);
  });

  it('keeps Article 50 transparency at 2 August 2026, unamended', () => {
    const m = milestone('transparency')!;
    expect(m.date.toISOString()).toBe('2026-08-02T00:00:00.000Z');
    expect(m.amendedByOmnibus).toBe(false);
  });

  it('carries the two prohibitions the Omnibus added, from 2 December 2026', () => {
    const m = milestone('new-prohibitions')!;
    expect(m.date.toISOString()).toBe('2026-12-02T00:00:00.000Z');
    expect(m.amendedByOmnibus).toBe(true);
  });

  it('never states 2 August 2026 as the high-risk date', () => {
    const highRisk = milestone('high-risk-annex-iii')!;
    expect(highRisk.date.getUTCFullYear()).not.toBe(2026);
  });

  it('is ordered chronologically, so nextMilestone means what it says', () => {
    const times = AI_ACT_MILESTONES.map((m) => m.date.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('splits in-force from upcoming around a given date', () => {
    const on = new Date('2026-08-04T00:00:00Z');
    const live = inForce(on).map((m) => m.id);
    expect(live).toContain('literacy');
    expect(live).toContain('transparency');
    expect(live).not.toContain('high-risk-annex-iii');

    const next = nextMilestone(on);
    expect(next!.date.getTime()).toBeGreaterThan(on.getTime());
    expect(daysUntil(milestone('high-risk-annex-iii')!, on)).toBeGreaterThan(0);
  });
});
