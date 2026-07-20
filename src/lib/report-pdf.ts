/**
 * report-pdf.ts — the assessment report as a native PDF (pdf-lib).
 *
 * PDF is the trust artifact: immutable, renders identically everywhere,
 * the thing you attach to a board pack or hand a regulator. This generator
 * follows the consultancy grammar the docx now shares: ink on white, ONE
 * slate accent, hairline rules, generous margins, no decorative tints.
 * Semantic colour appears only as text on severities.
 *
 * Pure pdf-lib (no font embedding, no native deps) — serverless-safe.
 */

import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, type RGB } from 'pdf-lib';
import type { ScoringResult } from './assessment-engine';
import { computeLeverage, responsesFromScoring } from './assessment-engine';

// ─── Palette (mirrors the docx constants) ───────────────────────────────────

const INK = rgb(0.078, 0.106, 0.173);        // #141B2C near-black
const BODY = rgb(0.176, 0.216, 0.282);       // #2D3748
const MUTED = rgb(0.392, 0.455, 0.545);      // #64748B
const ACCENT = rgb(0.2, 0.255, 0.333);       // #334155 slate — the one accent
const HAIR = rgb(0.886, 0.91, 0.941);        // #E2E8F0
const PANEL = rgb(0.973, 0.98, 0.988);       // #F8FAFC
const NAVY = rgb(0.039, 0.063, 0.141);       // #0A1024 cover panel
const WHITE = rgb(1, 1, 1);
const GREEN = rgb(0.086, 0.639, 0.29);       // #16A34A
const AMBER = rgb(0.851, 0.467, 0.024);      // #D97706
const RED = rgb(0.863, 0.149, 0.149);        // #DC2626

/** Map non-WinAnsi glyphs to encodable equivalents (Helvetica/pdf-lib). */
function sane(t: string): string {
  return t
    .replace(/\u2192/g, '›')   // →
    .replace(/[\u2713\u2714]/g, '+') // ✓
    .replace(/\u2022/g, '·')   // •
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Anything else outside Latin-1 becomes a hyphen placeholder.
    .replace(/[^\x00-\xFF\u2013\u2014\u20AC\u2026]/g, '-');
}

const A4: [number, number] = [595.28, 841.89];
const M = 56;               // page margin
const W = A4[0] - M * 2;    // content width

export interface ReportPdfData {
  scoringResult: ScoringResult;
  insights: {
    executiveSummary: string;
    strengths: string[];
    gaps: string[];
    risks: string[];
    nextSteps: string[];
    isAIGenerated: boolean;
  };
  organization: string;
  userName: string;
  sector?: string;
  completedAt: string;
}

// ─── Tiny layout engine ─────────────────────────────────────────────────────

class Doc {
  pdf!: PDFDocument;
  page!: PDFPage;
  font!: PDFFont;
  bold!: PDFFont;
  y = 0;
  pageNo = 0;
  private footerOrg = '';

  static async create(footerOrg: string): Promise<Doc> {
    const d = new Doc();
    d.pdf = await PDFDocument.create();
    d.font = await d.pdf.embedFont(StandardFonts.Helvetica);
    d.bold = await d.pdf.embedFont(StandardFonts.HelveticaBold);
    d.footerOrg = footerOrg;
    return d;
  }

  addPage(withFooter = true) {
    this.page = this.pdf.addPage(A4);
    this.pageNo += 1;
    this.y = A4[1] - M;
    if (withFooter && this.pageNo > 1) this.footer();
  }

  private footer() {
    const fy = M - 18;
    this.page.drawLine({ start: { x: M, y: fy + 12 }, end: { x: A4[0] - M, y: fy + 12 }, thickness: 0.5, color: HAIR });
    this.page.drawText(`E-ARI — AI Readiness Assessment · ${this.footerOrg} · Confidential`, {
      x: M, y: fy, size: 7.5, font: this.font, color: MUTED,
    });
    const pn = `${this.pageNo}`;
    this.page.drawText(pn, {
      x: A4[0] - M - this.font.widthOfTextAtSize(pn, 7.5), y: fy, size: 7.5, font: this.font, color: MUTED,
    });
  }

  ensure(height: number) {
    if (this.y - height < M + 8) this.addPage();
  }

  wrap(text: string, size: number, font: PDFFont, width = W): string[] {
    const words = sane(text).replace(/\s+/g, ' ').trim().split(' ');
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const probe = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(probe, size) > width && line) {
        lines.push(line);
        line = w;
      } else line = probe;
    }
    if (line) lines.push(line);
    return lines;
  }

  text(t: string, opts: { size?: number; font?: PDFFont; color?: RGB; width?: number; x?: number; leading?: number; after?: number } = {}) {
    const size = opts.size ?? 9.5;
    const font = opts.font ?? this.font;
    const color = opts.color ?? BODY;
    const width = opts.width ?? W;
    const x = opts.x ?? M;
    const leading = opts.leading ?? size * 1.45;
    const lines = this.wrap(t, size, font, width);
    for (const ln of lines) {
      this.ensure(leading);
      this.y -= leading;
      this.page.drawText(ln, { x, y: this.y, size, font, color });
    }
    this.y -= opts.after ?? 0;
  }

  h1(t: string) {
    this.ensure(48);
    this.y -= 30;
    this.page.drawText(sane(t).toUpperCase(), { x: M, y: this.y, size: 8, font: this.bold, color: MUTED });
    this.y -= 17;
    this.page.drawText(sane(t), { x: M, y: this.y - 4, size: 17, font: this.bold, color: INK });
    this.y -= 12;
    this.rule();
    this.y -= 6;
  }

  h2(t: string, after = 8) {
    this.ensure(30);
    this.y -= 24;
    this.page.drawText(sane(t), { x: M, y: this.y, size: 12, font: this.bold, color: INK });
    this.y -= after;
  }

  rule(color = HAIR, thickness = 0.6) {
    this.ensure(6);
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: A4[0] - M, y: this.y }, thickness, color });
  }

  gap(h: number) {
    this.y -= h;
  }
}

const sevColor = (s: string): RGB => (s === 'critical' ? RED : s === 'high' ? AMBER : MUTED);

// ─── The report ─────────────────────────────────────────────────────────────

export async function generateAssessmentPdf(data: ReportPdfData): Promise<Uint8Array> {
  const { scoringResult: sc, insights, organization, sector, completedAt } = data;
  const d = await Doc.create(organization);
  const date = new Date(completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // ═══ COVER ════════════════════════════════════════════════════════════════
  d.addPage(false);
  const coverH = 340;
  d.page.drawRectangle({ x: 0, y: A4[1] - coverH, width: A4[0], height: coverH, color: NAVY });

  // Monochrome three-bar mark
  const bx = M, by = A4[1] - 88;
  d.page.drawRectangle({ x: bx, y: by + 20, width: 30, height: 5, color: WHITE });
  d.page.drawRectangle({ x: bx, y: by + 10, width: 18, height: 5, color: rgb(0.72, 0.76, 0.82) });
  d.page.drawRectangle({ x: bx, y: by, width: 30, height: 5, color: rgb(0.42, 0.47, 0.55) });
  d.page.drawText('E-ARI', { x: bx + 42, y: by + 8, size: 15, font: d.bold, color: WHITE });

  d.page.drawText('AI READINESS ASSESSMENT', {
    x: M, y: A4[1] - 168, size: 9, font: d.bold, color: rgb(0.58, 0.64, 0.72),
  });
  const orgLines = d.wrap(organization, 30, d.bold, W);
  let oy = A4[1] - 200;
  for (const ln of orgLines) {
    d.page.drawText(ln, { x: M, y: oy, size: 30, font: d.bold, color: WHITE });
    oy -= 38;
  }
  d.page.drawText(`${date}${sector ? `  ·  ${sector[0].toUpperCase()}${sector.slice(1)} sector` : ''}  ·  Scoring ${sc.scoringVersion}`, {
    x: M, y: A4[1] - coverH + 30, size: 9.5, font: d.font, color: rgb(0.58, 0.64, 0.72),
  });

  // Below the panel: the number, huge and alone
  const scoreStr = `${Math.round(sc.overallScore)}`;
  d.page.drawText(scoreStr, { x: M, y: A4[1] - coverH - 130, size: 92, font: d.bold, color: INK });
  const sw = d.bold.widthOfTextAtSize(scoreStr, 92);
  d.page.drawText('/ 100', { x: M + sw + 10, y: A4[1] - coverH - 128, size: 16, font: d.font, color: MUTED });
  d.page.drawText(`${sc.maturityLabel.toUpperCase()}`, { x: M, y: A4[1] - coverH - 160, size: 12, font: d.bold, color: ACCENT });
  if (typeof sc.baselineOverallScore === 'number' && Math.round(sc.baselineOverallScore) !== Math.round(sc.overallScore)) {
    d.page.drawText(
      `Baseline ${Math.round(sc.baselineOverallScore)} re-weighted for sector context — methodology, section 6.`,
      { x: M, y: A4[1] - coverH - 180, size: 9, font: d.font, color: MUTED },
    );
  }
  d.page.drawText('Deterministic scoring — identical answers always produce an identical score. Prepared for board and regulatory review.', {
    x: M, y: M + 14, size: 8.5, font: d.font, color: MUTED,
  });
  d.page.drawText('CONFIDENTIAL', { x: M, y: M, size: 8.5, font: d.bold, color: ACCENT });

  // ═══ 1 · EXECUTIVE SUMMARY ═══════════════════════════════════════════════
  d.addPage();
  d.h1('Executive summary');
  d.text(insights.executiveSummary, { size: 10.5, leading: 16, after: 4 });
  if (!insights.isAIGenerated) {
    d.text('This summary is generated deterministically from your responses; the AI narrative layer was not used.', { size: 8, color: MUTED, after: 2 });
  }

  // ═══ 2 · PILLAR RESULTS ══════════════════════════════════════════════════
  d.h1('Pillar results');
  const rowH = 24;
  for (const p of sc.pillarScores) {
    d.ensure(rowH);
    d.y -= rowH;
    const midY = d.y + 7;
    d.page.drawText(p.pillarName, { x: M, y: midY, size: 9.5, font: d.bold, color: INK });
    // score bar
    const barX = M + 190, barW = 200, barH = 5;
    d.page.drawRectangle({ x: barX, y: midY - 0.5, width: barW, height: barH, color: PANEL, borderColor: HAIR, borderWidth: 0.5 });
    d.page.drawRectangle({ x: barX, y: midY - 0.5, width: Math.max(2, (p.normalizedScore / 100) * barW), height: barH, color: ACCENT });
    const scoreTxt = `${Math.round(p.normalizedScore)}`;
    d.page.drawText(scoreTxt, { x: barX + barW + 12, y: midY, size: 9.5, font: d.bold, color: INK });
    d.page.drawText(p.maturityLabel, { x: barX + barW + 40, y: midY, size: 8, font: d.font, color: MUTED });
  }
  d.gap(6);
  if (sc.adjustments.length > 0) {
    d.text(
      `${sc.adjustments.length} interdependency adjustment${sc.adjustments.length === 1 ? '' : 's'} applied — cross-pillar rules are part of the published methodology (section 6).`,
      { size: 8.5, color: MUTED },
    );
  }

  // ═══ 3 · HIGHEST-LEVERAGE MOVES ══════════════════════════════════════════
  try {
    const responses = responsesFromScoring(sc);
    if (Object.keys(responses).length >= 40) {
      const lev = computeLeverage(responses, sc.sectorWeighting?.sector);
      const moves = lev.moves.slice(0, 5).filter((m) => m.scoreDelta > 0);
      if (moves.length > 0) {
        d.h1('Highest-leverage moves');
        d.text(
          `Each move was computed by re-running the complete ${sc.scoringVersion} pipeline with that single answer improved one step. Gains are exact and reproducible, not estimates.`,
          { size: 9, color: MUTED, after: 6 },
        );
        moves.forEach((m, i) => {
          const qLines = d.wrap(m.questionText, 9.5, d.font, W - 120);
          const blockH = 16 + qLines.length * 13 + 14;
          d.ensure(blockH);
          d.y -= 16;
          d.page.drawText(`${i + 1}`, { x: M, y: d.y, size: 10, font: d.bold, color: MUTED });
          d.page.drawText(sane(`${m.pillarName}  ·  ${m.currentAnswer}/5 › ${m.targetAnswer}/5`), { x: M + 16, y: d.y, size: 8, font: d.font, color: MUTED });
          const gain = `+${m.scoreDelta.toFixed(2)} pts`;
          d.page.drawText(gain, { x: A4[0] - M - d.bold.widthOfTextAtSize(gain, 10), y: d.y, size: 10, font: d.bold, color: GREEN });
          for (const ln of qLines) {
            d.y -= 13;
            d.page.drawText(ln, { x: M + 16, y: d.y, size: 9.5, font: d.font, color: BODY });
          }
          d.y -= 10;
          if (i < moves.length - 1) { d.rule(); }
        });
        if (lev.nextBand) {
          d.gap(8);
          d.text(
            `Path to ${lev.nextBand.label}: ${lev.nextBand.pointsNeeded.toFixed(1)} points to the next maturity band${lev.pathToNextBand.length > 0 ? ` — shortest simulated path: ${lev.pathToNextBand.length} one-step improvements` : ''}.`,
            { size: 9, color: ACCENT },
          );
        }
      }
    }
  } catch { /* leverage is additive */ }

  // ═══ 4 · STRUCTURAL FINDINGS ═════════════════════════════════════════════
  const findings = sc.xRayFindings ?? [];
  if (findings.length > 0) {
    d.h1('Structural findings (X-Ray)');
    d.text(
      'Detected from response combinations across pillars, not single answers. Each finding carries evidence, business impact, and a concrete move.',
      { size: 9, color: MUTED, after: 4 },
    );
    for (const f of findings) {
      d.ensure(60);
      d.y -= 20;
      d.page.drawText(sane(`${f.id} — ${f.title}`), { x: M, y: d.y, size: 11, font: d.bold, color: INK });
      const sev = f.severity.toUpperCase();
      d.page.drawText(sev, { x: A4[0] - M - d.bold.widthOfTextAtSize(sev, 8), y: d.y + 1, size: 8, font: d.bold, color: sevColor(f.severity) });
      d.gap(4);
      d.text(f.headline, { size: 9.5, font: d.bold, color: BODY, after: 2 });
      d.text(`Impact — ${f.businessImpact}`, { size: 9, color: BODY, after: 2 });
      d.text(`Recommended move — ${f.recommendation}`, { size: 9, color: ACCENT, after: 4 });
      d.rule();
    }
  }

  // ═══ 5 · RECOMMENDED NEXT STEPS ══════════════════════════════════════════
  if (insights.nextSteps.length > 0) {
    d.h1('Recommended next steps');
    insights.nextSteps.slice(0, 6).forEach((step, i) => {
      const clean = step.split(' | ')[0];
      d.ensure(26);
      d.y -= 16;
      d.page.drawText(`${i + 1}.`, { x: M, y: d.y, size: 9.5, font: d.bold, color: ACCENT });
      const lines = d.wrap(clean, 9.5, d.font, W - 18);
      let first = true;
      for (const ln of lines) {
        if (!first) d.y -= 13;
        d.page.drawText(ln, { x: M + 18, y: d.y, size: 9.5, font: d.font, color: BODY });
        first = false;
        if (!first) d.ensure(13);
      }
      d.y -= 4;
    });
  }

  // ═══ 6 · METHODOLOGY & DISCLAIMER ════════════════════════════════════════
  d.h1('Methodology');
  d.text(
    `Scores are produced by the E-ARI deterministic engine (${sc.scoringVersion}, methodology ${sc.methodologyVersion}): forty Likert responses normalise to eight pillar scores; six documented cross-pillar interdependency rules apply; eight X-Ray detectors scan response combinations; sector weighting re-balances pillar contributions${sc.sectorWeighting ? ` (${sc.sectorWeighting.sector} profile applied)` : ''}; and the leverage simulation re-runs the pipeline per possible improvement. Identical inputs always produce identical outputs. The full methodology is published at e-ari.com/handbook.`,
    { size: 9, leading: 14, after: 8 },
  );
  d.text(
    'This report reflects self-reported responses at the assessment date and is provided for internal governance purposes. It is not legal advice; obligations under the EU AI Act should be confirmed with qualified counsel.',
    { size: 8, color: MUTED },
  );

  return d.pdf.save();
}
