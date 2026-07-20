/**
 * report-pdf.ts — the assessment report as a native PDF (pdf-lib).
 *
 * PDF is the trust artifact: immutable, renders identically everywhere, the
 * thing you attach to a board pack or hand a regulator. Consultancy grammar:
 * ink on white, ONE slate accent, hairline rules, generous margins, no
 * decorative tints. Semantic colour appears only on severities.
 *
 * Structure (a real document, not a summary sheet):
 *   cover · contents · 01 executive summary · 02 where you stand (maturity
 *   scale + vector radar) · 03 pillar results · 04 pillar detail (strongest /
 *   weakest answer per pillar) · 05 highest-leverage moves · 06 structural
 *   findings · 07 sector benchmark · 08 certification · 09 next steps ·
 *   10 methodology
 *
 * Pure pdf-lib (no font embedding, no native deps) — serverless-safe.
 */

import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, type RGB } from 'pdf-lib';
import type { ScoringResult } from './assessment-engine';
import { computeLeverage, responsesFromScoring } from './assessment-engine';
import { PILLARS } from './pillars';
import { getEffectivePillarQuestions } from './sectors';
import { assessCertification } from './certification';

// ─── Palette ────────────────────────────────────────────────────────────────

const INK = rgb(0.078, 0.106, 0.173);
const BODY = rgb(0.176, 0.216, 0.282);
const MUTED = rgb(0.392, 0.455, 0.545);
const ACCENT = rgb(0.2, 0.255, 0.333);
const HAIR = rgb(0.886, 0.91, 0.941);
const PANEL = rgb(0.973, 0.98, 0.988);
const NAVY = rgb(0.039, 0.063, 0.141);
const NAVY_TEXT = rgb(0.58, 0.64, 0.72);
const WHITE = rgb(1, 1, 1);
const GREEN = rgb(0.086, 0.639, 0.29);
const AMBER = rgb(0.851, 0.467, 0.024);
const RED = rgb(0.863, 0.149, 0.149);

/** Map non-WinAnsi glyphs to encodable equivalents (Helvetica/pdf-lib). */
function sane(t: string): string {
  return t
    .replace(/→/g, '>')
    .replace(/[✓✔]/g, '+')
    .replace(/•/g, '·')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x00-\xFF–—€…]/g, '-');
}

const A4: [number, number] = [595.28, 841.89];
const M = 56;
const W = A4[0] - M * 2;

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
  benchmarkData?: {
    sector: string;
    pillars: Array<{ pillarId: string; avgScore: number; sampleSize: number; isRealData: boolean }>;
    overall: { avgScore: number; sampleSize: number; isRealData: boolean } | null;
  };
  previousScore?: number | null;
}

// ─── Layout engine ──────────────────────────────────────────────────────────

class Doc {
  pdf!: PDFDocument;
  page!: PDFPage;
  font!: PDFFont;
  bold!: PDFFont;
  y = 0;
  pageNo = 0;
  sectionNo = 0;
  toc: Array<{ n: string; title: string; page: number }> = [];
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
    this.y = A4[1] - M - 10;
    if (withFooter) this.drawFooter(this.page, this.pageNo);
  }

  drawFooter(page: PDFPage, n: number) {
    const fy = M - 20;
    page.drawLine({ start: { x: M, y: fy + 13 }, end: { x: A4[0] - M, y: fy + 13 }, thickness: 0.5, color: HAIR });
    page.drawText(sane(`E-ARI - AI Readiness Assessment · ${this.footerOrg} · Confidential`), {
      x: M, y: fy, size: 7.5, font: this.font, color: MUTED,
    });
    const pn = `${n}`;
    page.drawText(pn, { x: A4[0] - M - this.font.widthOfTextAtSize(pn, 7.5), y: fy, size: 7.5, font: this.font, color: MUTED });
  }

  ensure(height: number) {
    if (this.y - height < M + 10) this.addPage();
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

  text(t: string, o: { size?: number; font?: PDFFont; color?: RGB; width?: number; x?: number; leading?: number; after?: number } = {}) {
    const size = o.size ?? 9.5;
    const font = o.font ?? this.font;
    const color = o.color ?? BODY;
    const x = o.x ?? M;
    const leading = o.leading ?? size * 1.5;
    for (const ln of this.wrap(t, size, font, o.width ?? W)) {
      this.ensure(leading);
      this.y -= leading;
      this.page.drawText(ln, { x, y: this.y, size, font, color });
    }
    this.y -= o.after ?? 0;
  }

  /** Section opener — numbered, recorded for the contents page. */
  section(title: string) {
    this.sectionNo += 1;
    const n = String(this.sectionNo).padStart(2, '0');
    // Always start a section with room to breathe; new page if tight.
    if (this.y < M + 200) this.addPage();
    this.toc.push({ n, title, page: this.pageNo });
    this.y -= 26;
    this.page.drawText(n, { x: M, y: this.y, size: 8.5, font: this.bold, color: ACCENT });
    this.page.drawText(sane(title).toUpperCase(), {
      x: M + 22, y: this.y, size: 8.5, font: this.bold, color: MUTED,
    });
    this.y -= 22;
    this.page.drawText(sane(title), { x: M, y: this.y - 4, size: 18, font: this.bold, color: INK });
    this.y -= 14;
    this.rule();
    this.y -= 10;
  }

  rule(color = HAIR, thickness = 0.6) {
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: A4[0] - M, y: this.y }, thickness, color });
  }

  gap(h: number) { this.y -= h; }

  right(t: string, y: number, size: number, font: PDFFont, color: RGB) {
    const s = sane(t);
    this.page.drawText(s, { x: A4[0] - M - font.widthOfTextAtSize(s, size), y, size, font, color });
  }
}

const sevColor = (s: string): RGB => (s === 'critical' ? RED : s === 'high' ? AMBER : MUTED);
const bandOf = (s: number) => (s <= 25 ? 0 : s <= 50 ? 1 : s <= 75 ? 2 : 3);

// ─── Visual components ──────────────────────────────────────────────────────

/** Maturity scale: four segments with a marker at the organisation's score. */
function drawMaturityScale(d: Doc, score: number) {
  const bands = ['Laggard', 'Follower', 'Chaser', 'Pacesetter'];
  const barY = d.y - 34;
  const segW = W / 4;
  const active = bandOf(score);

  bands.forEach((b, i) => {
    const x = M + i * segW;
    d.page.drawRectangle({
      x, y: barY, width: segW - 3, height: 9,
      color: i === active ? ACCENT : PANEL,
      borderColor: HAIR, borderWidth: 0.5,
    });
    d.page.drawText(b, {
      x, y: barY - 13, size: 7.5,
      font: i === active ? d.bold : d.font,
      color: i === active ? INK : MUTED,
    });
    const range = ['0-25', '26-50', '51-75', '76-100'][i];
    d.page.drawText(range, { x, y: barY - 23, size: 6.5, font: d.font, color: MUTED });
  });

  // Marker
  const mx = M + (Math.max(0, Math.min(100, score)) / 100) * W;
  d.page.drawRectangle({ x: mx - 1, y: barY - 3, width: 2, height: 15, color: INK });
  const lbl = `${Math.round(score)}`;
  d.page.drawText(lbl, {
    x: Math.min(A4[0] - M - 14, mx - d.bold.widthOfTextAtSize(lbl, 9.5) / 2), y: barY + 17, size: 9.5, font: d.bold, color: INK,
  });
  d.y = barY - 34;
}

/** Vector radar of the eight pillars. */
function drawRadar(d: Doc, sc: ScoringResult, cx: number, cy: number, r: number) {
  const n = sc.pillarScores.length;
  const ang = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  // Rings
  [0.25, 0.5, 0.75, 1].forEach((f) => {
    d.page.drawCircle({ x: cx, y: cy, size: r * f, borderColor: f === 1 ? HAIR : rgb(0.93, 0.94, 0.96), borderWidth: 0.6 });
  });
  // Axes
  for (let i = 0; i < n; i++) {
    d.page.drawLine({
      start: { x: cx, y: cy },
      end: { x: cx + r * Math.cos(ang(i)), y: cy + r * Math.sin(ang(i)) },
      thickness: 0.5, color: rgb(0.93, 0.94, 0.96),
    });
  }
  // Data polygon (SVG space: y down, origin at centre)
  const pts = sc.pillarScores.map((p, i) => {
    const rr = (p.normalizedScore / 100) * r;
    return { dx: rr * Math.cos(ang(i)), dy: -rr * Math.sin(ang(i)), px: cx + rr * Math.cos(ang(i)), py: cy + rr * Math.sin(ang(i)) };
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.dx.toFixed(2)} ${p.dy.toFixed(2)}`).join(' ') + ' Z';
  d.page.drawSvgPath(path, { x: cx, y: cy, color: rgb(0.85, 0.89, 0.94), borderColor: ACCENT, borderWidth: 1.4, opacity: 0.75 });
  // Vertices
  pts.forEach((p) => d.page.drawCircle({ x: p.px, y: p.py, size: 2.2, color: ACCENT }));
  // Labels
  sc.pillarScores.forEach((p, i) => {
    const lx = cx + (r + 20) * Math.cos(ang(i));
    const ly = cy + (r + 20) * Math.sin(ang(i));
    const name = sane(p.pillarName.split(' ')[0]);
    const val = `${Math.round(p.normalizedScore)}`;
    d.page.drawText(name, { x: lx - d.font.widthOfTextAtSize(name, 7.5) / 2, y: ly + 2, size: 7.5, font: d.font, color: MUTED });
    d.page.drawText(val, { x: lx - d.bold.widthOfTextAtSize(val, 8) / 2, y: ly - 8, size: 8, font: d.bold, color: INK });
  });
}

/** Question text for a pillar question id — sector variant when one exists,
 *  so the report quotes the same wording the respondent actually saw. */
function questionText(pillarId: string, questionId: string, sectorId?: string): string {
  const p = PILLARS.find((x) => x.id === pillarId);
  if (!p) return questionId;
  const idx = p.questions.findIndex((q) => q.id === questionId);
  if (idx < 0) return questionId;
  const effective = sectorId ? getEffectivePillarQuestions(sectorId, pillarId) : p.questions;
  return (effective[idx] ?? p.questions[idx])?.text ?? questionId;
}

// ─── The report ─────────────────────────────────────────────────────────────

export async function generateAssessmentPdf(data: ReportPdfData): Promise<Uint8Array> {
  const { scoringResult: sc, insights, organization, sector, completedAt, benchmarkData, previousScore } = data;
  const d = await Doc.create(organization);
  const date = new Date(completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const cert = assessCertification(sc.overallScore, sc.pillarScores);
  const findings = sc.xRayFindings ?? [];

  // ══ COVER (page 1) ═══════════════════════════════════════════════════════
  d.addPage(false);
  const coverH = 430;
  d.page.drawRectangle({ x: 0, y: A4[1] - coverH, width: A4[0], height: coverH, color: NAVY });

  const bx = M, by = A4[1] - 92;
  d.page.drawRectangle({ x: bx, y: by + 20, width: 30, height: 5, color: WHITE });
  d.page.drawRectangle({ x: bx, y: by + 10, width: 18, height: 5, color: rgb(0.72, 0.76, 0.82) });
  d.page.drawRectangle({ x: bx, y: by, width: 30, height: 5, color: rgb(0.42, 0.47, 0.55) });
  d.page.drawText('E-ARI', { x: bx + 42, y: by + 8, size: 15, font: d.bold, color: WHITE });

  d.page.drawText('AI READINESS ASSESSMENT', { x: M, y: A4[1] - 190, size: 9, font: d.bold, color: NAVY_TEXT });
  let oy = A4[1] - 226;
  for (const ln of d.wrap(organization, 30, d.bold, W)) {
    d.page.drawText(ln, { x: M, y: oy, size: 30, font: d.bold, color: WHITE });
    oy -= 38;
  }
  d.page.drawText(
    sane(`${date}  ·  ${sector ? `${sector[0].toUpperCase()}${sector.slice(1)} sector  ·  ` : ''}Scoring ${sc.scoringVersion}`),
    { x: M, y: A4[1] - coverH + 92, size: 9.5, font: d.font, color: NAVY_TEXT },
  );

  // Metrics strip inside the panel
  const stripY = A4[1] - coverH + 34;
  d.page.drawLine({ start: { x: M, y: stripY + 34 }, end: { x: A4[0] - M, y: stripY + 34 }, thickness: 0.5, color: rgb(0.18, 0.22, 0.3) });
  const metrics: Array<[string, string]> = [
    ['MATURITY', sc.maturityLabel],
    ['PILLARS BELOW 50', `${sc.pillarScores.filter((p) => p.normalizedScore < 50).length} of ${sc.pillarScores.length}`],
    ['STRUCTURAL FINDINGS', `${findings.length}`],
    ['CERTIFICATION', cert.isCertified ? cert.certification.label : 'Not yet certified'],
  ];
  metrics.forEach(([k, v], i) => {
    const x = M + i * (W / 4);
    d.page.drawText(k, { x, y: stripY + 18, size: 6.5, font: d.bold, color: rgb(0.45, 0.5, 0.58) });
    d.page.drawText(sane(v), { x, y: stripY + 2, size: 11, font: d.bold, color: WHITE });
  });

  // The number, below the panel
  const scoreStr = `${Math.round(sc.overallScore)}`;
  d.page.drawText(scoreStr, { x: M, y: A4[1] - coverH - 120, size: 88, font: d.bold, color: INK });
  const sw = d.bold.widthOfTextAtSize(scoreStr, 88);
  d.page.drawText('/ 100', { x: M + sw + 10, y: A4[1] - coverH - 118, size: 16, font: d.font, color: MUTED });
  if (typeof sc.baselineOverallScore === 'number' && Math.round(sc.baselineOverallScore) !== Math.round(sc.overallScore)) {
    d.page.drawText(
      sane(`Baseline ${Math.round(sc.baselineOverallScore)} re-weighted to ${Math.round(sc.overallScore)} for sector context.`),
      { x: M, y: A4[1] - coverH - 146, size: 9, font: d.font, color: MUTED },
    );
  }
  if (typeof previousScore === 'number') {
    const delta = sc.overallScore - previousScore;
    d.page.drawText(
      sane(`${delta >= 0 ? '+' : ''}${delta.toFixed(1)} points since the previous assessment (${Math.round(previousScore)}).`),
      { x: M, y: A4[1] - coverH - 162, size: 9, font: d.font, color: delta >= 0 ? GREEN : AMBER },
    );
  }
  d.page.drawText(
    'Deterministic scoring - identical answers always produce an identical score. Prepared for board and regulatory review.',
    { x: M, y: M + 16, size: 8.5, font: d.font, color: MUTED },
  );
  d.page.drawText('CONFIDENTIAL', { x: M, y: M, size: 8.5, font: d.bold, color: ACCENT });

  // Reserve page 2 for the contents page (inserted at the end).
  d.pageNo = 2;

  // ══ 01 EXECUTIVE SUMMARY ═════════════════════════════════════════════════
  d.addPage();
  d.section('Executive summary');
  d.text(insights.executiveSummary, { size: 10.5, leading: 16.5, after: 6 });
  if (!insights.isAIGenerated) {
    d.text('Generated deterministically from your responses; the AI narrative layer was not used.', { size: 8, color: MUTED, after: 4 });
  }

  // ══ 02 WHERE YOU STAND ═══════════════════════════════════════════════════
  d.section('Where you stand');
  d.text(
    `The composite score places ${organization} in the ${sc.maturityLabel} band. The scale below is fixed across every E-ARI assessment, which is what makes the position comparable over time and between organisations.`,
    { size: 9.5, after: 6 },
  );
  drawMaturityScale(d, sc.overallScore);
  d.gap(10);

  // Radar on its own generous block
  d.ensure(280);
  const rcx = A4[0] / 2, rcy = d.y - 130;
  drawRadar(d, sc, rcx, rcy, 96);
  d.y = rcy - 140;
  d.text('Pillar profile - the shape of readiness across all eight dimensions.', { size: 8.5, color: MUTED });

  // ══ 03 PILLAR RESULTS ════════════════════════════════════════════════════
  d.section('Pillar results');
  for (const p of sc.pillarScores) {
    d.ensure(26);
    d.y -= 26;
    const midY = d.y + 7;
    d.page.drawText(sane(p.pillarName), { x: M, y: midY, size: 9.5, font: d.bold, color: INK });
    const barX = M + 185, barW = 158, barH = 5;
    d.page.drawRectangle({ x: barX, y: midY - 0.5, width: barW, height: barH, color: PANEL, borderColor: HAIR, borderWidth: 0.5 });
    d.page.drawRectangle({ x: barX, y: midY - 0.5, width: Math.max(2, (p.normalizedScore / 100) * barW), height: barH, color: ACCENT });
    d.page.drawText(`${Math.round(p.normalizedScore)}`, { x: barX + barW + 12, y: midY, size: 9.5, font: d.bold, color: INK });
    d.page.drawText(sane(p.maturityLabel), { x: barX + barW + 38, y: midY, size: 8, font: d.font, color: MUTED });
    d.right(`weight ${Math.round(p.weight * 100)}%`, midY, 7.5, d.font, MUTED);
  }
  d.gap(8);
  if (sc.adjustments.length > 0) {
    d.text(
      `${sc.adjustments.length} interdependency adjustment${sc.adjustments.length === 1 ? '' : 's'} applied. Cross-pillar rules are part of the published methodology: a weak foundation discounts what it cannot support.`,
      { size: 8.5, color: MUTED },
    );
    for (const a of sc.adjustments) {
      d.text(`- ${a.description}`, { size: 8.5, color: MUTED, x: M + 8, width: W - 8 });
    }
  }

  // ══ 04 PILLAR DETAIL ═════════════════════════════════════════════════════
  d.section('Pillar detail');
  d.text('For each pillar: the answer that scored highest and the answer that scored lowest. The weakest answers are where the leverage analysis looks first.', { size: 9.5, after: 6 });
  for (const p of sc.pillarScores) {
    const sorted = [...(p.questionDetails ?? [])].sort((a, b) => a.answer - b.answer);
    if (sorted.length === 0) continue;
    const weakest = sorted[0];
    const strongest = sorted[sorted.length - 1];
    d.ensure(74);
    d.y -= 20;
    d.page.drawText(sane(p.pillarName), { x: M, y: d.y, size: 10.5, font: d.bold, color: INK });
    d.right(`${Math.round(p.normalizedScore)} · ${p.maturityLabel}`, d.y, 8.5, d.font, MUTED);
    d.gap(2);
    d.text(`Strongest - "${questionText(p.pillarId, strongest.questionId, sector)}" (${strongest.answer}/5)`, {
      size: 8.5, color: BODY, x: M + 8, width: W - 8, leading: 12,
    });
    d.text(`Weakest - "${questionText(p.pillarId, weakest.questionId, sector)}" (${weakest.answer}/5)`, {
      size: 8.5, color: BODY, x: M + 8, width: W - 8, leading: 12, after: 6,
    });
    d.rule();
  }

  // ══ 05 HIGHEST-LEVERAGE MOVES ════════════════════════════════════════════
  try {
    const responses = responsesFromScoring(sc);
    if (Object.keys(responses).length >= 40) {
      const lev = computeLeverage(responses, sc.sectorWeighting?.sector);
      const moves = lev.moves.slice(0, 5).filter((m) => m.scoreDelta > 0);
      if (moves.length > 0) {
        d.section('Highest-leverage moves');
        d.text(
          `Each move below was computed by re-running the complete ${sc.scoringVersion} pipeline with that single answer improved one step. The gains are exact and reproducible - they account for pillar weights, sector weighting and interdependency releases. They are not estimates.`,
          { size: 9.5, after: 8 },
        );
        moves.forEach((m, i) => {
          const qLines = d.wrap(m.questionText, 9.5, d.font, W - 130);
          d.ensure(20 + qLines.length * 13 + 12);
          d.y -= 18;
          d.page.drawText(`${i + 1}`, { x: M, y: d.y, size: 10, font: d.bold, color: MUTED });
          d.page.drawText(sane(`${m.pillarName}  ·  ${m.currentAnswer}/5 to ${m.targetAnswer}/5`), {
            x: M + 16, y: d.y, size: 8, font: d.font, color: MUTED,
          });
          d.right(`+${m.scoreDelta.toFixed(2)} pts`, d.y, 10, d.bold, GREEN);
          for (const ln of qLines) {
            d.y -= 13;
            d.page.drawText(ln, { x: M + 16, y: d.y, size: 9.5, font: d.font, color: BODY });
          }
          if (m.rulesReleased.length > 0) {
            d.y -= 12;
            d.page.drawText('Also releases a cross-pillar scoring penalty.', { x: M + 16, y: d.y, size: 8, font: d.font, color: GREEN });
          }
          d.y -= 10;
          if (i < moves.length - 1) d.rule();
        });
        if (lev.nextBand) {
          d.gap(10);
          d.text(
            `Path to ${lev.nextBand.label}: ${lev.nextBand.pointsNeeded.toFixed(1)} points to the next maturity band${lev.pathToNextBand.length > 0 ? `. The shortest simulated path crosses it in ${lev.pathToNextBand.length} one-step improvements` : ''}.`,
            { size: 9.5, font: d.bold, color: ACCENT },
          );
        }
      }
    }
  } catch { /* leverage is additive */ }

  // ══ 06 STRUCTURAL FINDINGS ═══════════════════════════════════════════════
  if (findings.length > 0) {
    d.section('Structural findings');
    d.text(
      'Detected from how responses combine across pillars, not from any single answer. Each finding carries its evidence, business impact, and a concrete next move.',
      { size: 9.5, after: 6 },
    );
    for (const f of findings) {
      d.ensure(80);
      d.y -= 20;
      d.page.drawText(sane(`${f.id} - ${f.title}`), { x: M, y: d.y, size: 11, font: d.bold, color: INK });
      d.right(f.severity.toUpperCase(), d.y + 1, 8, d.bold, sevColor(f.severity));
      d.gap(3);
      d.text(f.headline, { size: 9.5, font: d.bold, color: BODY, after: 3 });
      d.text(`Business impact - ${f.businessImpact}`, { size: 9, after: 3 });
      d.text(`Recommended move - ${f.recommendation}`, { size: 9, color: ACCENT, after: 3 });
      if (f.evidence?.length) {
        d.text(`Evidence: ${f.evidence.map((e) => `${e.questionId} = ${e.answer}/5`).join(', ')}`, { size: 8, color: MUTED, after: 5 });
      }
      d.rule();
    }
  }

  // ══ 07 SECTOR BENCHMARK ══════════════════════════════════════════════════
  if (benchmarkData && benchmarkData.pillars.length > 0) {
    d.section('Sector benchmark');
    const real = benchmarkData.overall?.isRealData === true;
    d.text(
      real
        ? `Comparison against ${benchmarkData.overall?.sampleSize ?? 0} consenting ${benchmarkData.sector} assessments on the platform.`
        : `Comparison against curated ${benchmarkData.sector} reference values. These are published reference points, not a live peer panel - treated as indicative until the consenting sample is large enough to be statistically meaningful.`,
      { size: 9, color: MUTED, after: 8 },
    );
    d.ensure(20);
    d.y -= 16;
    d.page.drawText('PILLAR', { x: M, y: d.y, size: 7, font: d.bold, color: MUTED });
    d.page.drawText('YOU', { x: M + 230, y: d.y, size: 7, font: d.bold, color: MUTED });
    d.page.drawText('REFERENCE', { x: M + 285, y: d.y, size: 7, font: d.bold, color: MUTED });
    d.page.drawText('DELTA', { x: M + 365, y: d.y, size: 7, font: d.bold, color: MUTED });
    d.gap(4);
    d.rule();
    for (const p of sc.pillarScores) {
      const b = benchmarkData.pillars.find((x) => x.pillarId === p.pillarId);
      if (!b) continue;
      const delta = p.normalizedScore - b.avgScore;
      d.ensure(18);
      d.y -= 17;
      d.page.drawText(sane(p.pillarName), { x: M, y: d.y, size: 9, font: d.font, color: BODY });
      d.page.drawText(`${Math.round(p.normalizedScore)}`, { x: M + 230, y: d.y, size: 9, font: d.bold, color: INK });
      d.page.drawText(`${Math.round(b.avgScore)}`, { x: M + 285, y: d.y, size: 9, font: d.font, color: MUTED });
      d.page.drawText(`${delta >= 0 ? '+' : ''}${delta.toFixed(0)}`, {
        x: M + 365, y: d.y, size: 9, font: d.bold, color: delta >= 0 ? GREEN : AMBER,
      });
    }
  }

  // ══ 08 CERTIFICATION ═════════════════════════════════════════════════════
  d.section('Certification status');
  if (cert.isCertified) {
    d.text(`${organization} qualifies for E-ARI ${cert.certification.label} certification.`, { size: 10.5, font: d.bold, color: INK, after: 4 });
    d.text(cert.certification.description, { size: 9.5, after: 6 });
  } else {
    d.text('Not yet certified.', { size: 10.5, font: d.bold, color: INK, after: 4 });
    d.text(cert.certification.description, { size: 9.5, after: 6 });
  }
  if (cert.nextLevel) {
    d.text(`Path to ${cert.nextLevel.label}`, { size: 10, font: d.bold, color: ACCENT, after: 4 });
    d.text(
      `Requires an overall score of ${cert.nextLevel.minOverallScore} and the per-pillar minimums below.`,
      { size: 9, color: MUTED, after: 4 },
    );
    if (cert.nextLevelGaps.length === 0) {
      d.text('All per-pillar minimums are already met.', { size: 9, color: GREEN });
    } else {
      for (const g of cert.nextLevelGaps) {
        d.ensure(15);
        d.y -= 14;
        d.page.drawText(sane(g.pillarName), { x: M + 8, y: d.y, size: 9, font: d.font, color: BODY });
        d.page.drawText(sane(`${Math.round(g.current)} to ${g.required}`), { x: M + 230, y: d.y, size: 9, font: d.bold, color: AMBER });
      }
    }
  }

  // ══ 09 RECOMMENDED NEXT STEPS ════════════════════════════════════════════
  if (insights.nextSteps.length > 0) {
    d.section('Recommended next steps');
    insights.nextSteps.slice(0, 6).forEach((step, i) => {
      const clean = step.split(' | ')[0];
      const lines = d.wrap(clean, 9.5, d.font, W - 20);
      d.ensure(lines.length * 13 + 12);
      d.y -= 16;
      d.page.drawText(`${i + 1}.`, { x: M, y: d.y, size: 9.5, font: d.bold, color: ACCENT });
      lines.forEach((ln, li) => {
        if (li > 0) d.y -= 13;
        d.page.drawText(ln, { x: M + 20, y: d.y, size: 9.5, font: d.font, color: BODY });
      });
      d.y -= 4;
    });
  }

  // ══ 10 METHODOLOGY ═══════════════════════════════════════════════════════
  d.section('Methodology and scope');
  d.text(
    `Scores are produced by the E-ARI deterministic engine (scoring ${sc.scoringVersion}, methodology ${sc.methodologyVersion}). Forty Likert responses normalise to eight pillar scores; six documented cross-pillar interdependency rules apply; eight X-Ray detectors scan response combinations for structural patterns; sector weighting re-balances pillar contributions${sc.sectorWeighting ? ` (the ${sc.sectorWeighting.sector} profile was applied here)` : ''}; and the leverage simulation re-runs the entire pipeline once per possible improvement to produce exact gains. Identical inputs always produce identical outputs, and every version is recorded on the assessment.`,
    { size: 9, leading: 14, after: 6 },
  );
  if (sc.sectorWeighting) {
    d.text(`Sector weighting rationale: ${sc.sectorWeighting.rationale}`, { size: 9, color: MUTED, after: 6 });
  }
  d.text('The full methodology is published at e-ari.com/handbook.', { size: 9, color: ACCENT, after: 10 });
  d.rule();
  d.gap(8);
  d.text(
    'Scope and limitations: this report reflects self-reported responses at the assessment date and is provided for internal governance purposes. It is not legal advice, and obligations under the EU AI Act or any other regulation should be confirmed with qualified counsel.',
    { size: 8, color: MUTED },
  );

  // ══ CONTENTS (inserted as page 2) ════════════════════════════════════════
  const toc = d.pdf.insertPage(1, A4);
  d.drawFooter(toc, 2);
  let ty = A4[1] - M - 36;
  toc.drawText('CONTENTS', { x: M, y: ty, size: 8.5, font: d.bold, color: MUTED });
  ty -= 26;
  toc.drawText('Contents', { x: M, y: ty, size: 18, font: d.bold, color: INK });
  ty -= 16;
  toc.drawLine({ start: { x: M, y: ty }, end: { x: A4[0] - M, y: ty }, thickness: 0.6, color: HAIR });
  ty -= 26;
  for (const e of d.toc) {
    toc.drawText(e.n, { x: M, y: ty, size: 9, font: d.bold, color: ACCENT });
    toc.drawText(sane(e.title), { x: M + 26, y: ty, size: 10.5, font: d.font, color: INK });
    const pn = `${e.page}`;
    toc.drawText(pn, { x: A4[0] - M - d.font.widthOfTextAtSize(pn, 9.5), y: ty, size: 9.5, font: d.font, color: MUTED });
    // leader rule
    toc.drawLine({
      start: { x: M + 34 + d.font.widthOfTextAtSize(sane(e.title), 10.5), y: ty + 3 },
      end: { x: A4[0] - M - 16, y: ty + 3 },
      thickness: 0.4, color: rgb(0.93, 0.94, 0.96),
    });
    ty -= 24;
  }
  ty -= 14;
  toc.drawText(
    sane(`Prepared for ${organization} · ${date}`),
    { x: M, y: ty, size: 8.5, font: d.font, color: MUTED },
  );

  return d.pdf.save();
}
