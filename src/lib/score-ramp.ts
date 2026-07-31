/**
 * The single score→colour ramp for the whole product.
 *
 * One hue, varying luminance and saturation: a low score is a dim slate-blue,
 * a high score is a bright sky. Deliberately NOT a red/amber/green traffic
 * light — a rainbow encodes judgement the score itself already carries, and it
 * reads as a template. Rank is legible here from brightness alone, which also
 * survives greyscale printing in a board pack and the common forms of colour
 * blindness.
 *
 * Reserve actual hue for things that are categorically different rather than
 * merely lower: severity dots on findings, and the maturity band label.
 */

/** Interpolated ramp colour for a 0–100 score. */
export function scoreRamp(score: number): string {
  const t = Math.max(0, Math.min(1, (score - 40) / 45));
  const ch = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${ch(0x3a, 0x38)}, ${ch(0x52, 0xbd)}, ${ch(0x74, 0xf8)})`;
}

/**
 * What a score means, in the words a reader already owns.
 *
 * The maturity band ("Laggard", "Follower") is our vocabulary, not theirs, and
 * repeating it down a list of eight rows teaches nothing — the reader has to
 * hold a glossary in their head to skim. These four phrases answer the only
 * question a row is really asked: does this need work? The band still appears
 * once, in the header, with its range beside it.
 *
 * Every surface that lists pillar scores uses this, so the page says the same
 * thing in the same words wherever the reader lands.
 */
export function plainBand(score: number): string {
  if (score < 26) return 'needs work now';
  if (score < 50) return 'below halfway';
  if (score < 76) return 'adequate';
  return 'strong';
}

/** Severity accents for X-Ray findings — categorical, so hue is meaningful. */
export const SEVERITY_DOT: Record<string, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#facc15',
  low: '#64748b',
};
