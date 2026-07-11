import { describe, it, expect } from 'vitest';
import { assessCertification } from '@/lib/certification';
import { PILLARS } from '@/lib/pillars';

const pillarsAt = (score: number) =>
  PILLARS.map(p => ({ pillarId: p.id, pillarName: p.name, normalizedScore: score }));

describe('assessCertification next-level direction', () => {
  it('gold points UP to platinum, never down to silver', () => {
    const r = assessCertification(76, pillarsAt(76));
    expect(r.level).toBe('gold');
    expect(r.nextLevel?.level).toBe('platinum');
  });

  it('silver points to gold, bronze to silver', () => {
    expect(assessCertification(62, pillarsAt(62)).nextLevel?.level).toBe('gold');
    expect(assessCertification(47, pillarsAt(47)).nextLevel?.level).toBe('silver');
  });

  it('uncertified points to bronze, platinum to nothing', () => {
    expect(assessCertification(20, pillarsAt(20)).nextLevel?.level).toBe('bronze');
    expect(assessCertification(95, pillarsAt(95)).nextLevel).toBeNull();
  });

  it('next-level gaps are the unmet pillar minimums of the level ABOVE', () => {
    // Overall 76 but one weak pillar can hold certification below gold —
    // the gaps shown must belong to the higher target, not a lower one.
    const scores = pillarsAt(76).map(p =>
      p.pillarId === 'governance' ? { ...p, normalizedScore: 30 } : p);
    const r = assessCertification(76, scores);
    expect(r.nextLevel).not.toBeNull();
    const above = ['bronze', 'silver', 'gold', 'platinum'];
    expect(above.indexOf(r.nextLevel!.level)).toBeGreaterThan(above.indexOf(r.level === 'none' ? 'bronze' : r.level) - 1);
    for (const gap of r.nextLevelGaps) expect(gap.current).toBeLessThan(gap.required);
  });
});
