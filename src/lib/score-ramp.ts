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

/** Severity accents for X-Ray findings — categorical, so hue is meaningful. */
export const SEVERITY_DOT: Record<string, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#facc15',
  low: '#64748b',
};
