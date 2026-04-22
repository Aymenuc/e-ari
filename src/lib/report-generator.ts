/**
 * E-ARI Professional Report Generator
 *
 * Generates high-quality .docx reports (Assessment Results + Pulse Reports)
 * using the `docx` npm package following strict best practices:
 *
 * Rules:
 * - Always use proper margins, cantSplit: true, tableHeader: true, keepNext: true
 * - Never use ShadingType.SOLID — always use ShadingType.CLEAR
 * - Always set cell margins (top:60, bottom:60, left:120, right:120)
 * - PageBreak must be inside a Paragraph with text content
 * - Use consistent fonts (Space Grotesk for headings, Inter for body)
 * - Include proper headers/footers with page numbers + confidentiality
 * - Light theme for docx (dark text on white/cream backgrounds for readability)
 * - Structure: Title → TOC → Executive Summary → Overall Score → Pillar Breakdown → Trends → Benchmarks → Recommendations → Glossary
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  convertInchesToTwip,
  TableLayoutType,
  VerticalAlign,
} from 'docx';
import { PILLARS, MATURITY_BANDS, type MaturityBand } from './pillars';
import type { ScoringResult, PillarScoreResult, AdjustmentRecord } from './assessment-engine';

// ─── Constants (Light Theme — readable on white docx backgrounds) ──────────

const FONT_HEADING = 'Space Grotesk';
const FONT_BODY = 'Inter';

// Text colors (dark for readability on white)
const COLOR_PRIMARY = '1A1A2E';     // Near-black for main headings
const COLOR_TEXT = '2D3748';        // Dark gray for body text
const COLOR_TEXT_SECONDARY = '64748B'; // Medium gray for secondary text
const COLOR_BLUE = '2563EB';        // Brand blue for accents
const COLOR_BLUE_DARK = '1D4ED8';   // Darker blue
const COLOR_CYAN = '0891B2';        // Teal/cyan accent
const COLOR_GREEN = '16A34A';       // Green for positive
const COLOR_AMBER = 'D97706';       // Amber for warnings
const COLOR_RED = 'DC2626';         // Red for risks
const COLOR_PINK = 'DB2777';        // Pink accent
const COLOR_TEAL = '0D9488';        // Teal accent
const COLOR_SLATE = '475569';       // Slate gray
const COLOR_WHITE = 'FFFFFF';

// Background/shading colors (light fills for tables)
const BG_HEADER = '1E293B';        // Dark slate for header row text (white text)
const BG_ROW_ALT = 'F8FAFC';       // Very light blue-gray for alternating rows
const BG_BLUE_LIGHT = 'EFF6FF';    // Light blue tint
const BG_GREEN_LIGHT = 'F0FDF4';   // Light green tint
const BG_AMBER_LIGHT = 'FFFBEB';   // Light amber tint
const BG_RED_LIGHT = 'FEF2F2';     // Light red tint
const BG_SCORE = 'F1F5F9';        // Light gray for score sections
const BG_SCORE_HIGH = 'DCFCE7';    // Green tint for high scores
const BG_SCORE_MED = 'FEF9C3';     // Yellow tint for medium scores
const BG_SCORE_LOW = 'FEE2E2';     // Red tint for low scores

// Border colors
const BORDER_LIGHT = 'E2E8F0';     // Light border
const BORDER_MEDIUM = 'CBD5E1';    // Medium border

const CELL_MARGINS = {
  top: 60,
  bottom: 60,
  left: 120,
  right: 120,
};

const PAGE_MARGINS = {
  top: convertInchesToTwip(0.8),
  bottom: convertInchesToTwip(0.8),
  left: convertInchesToTwip(0.9),
  right: convertInchesToTwip(0.9),
};

// ─── Helper Functions ───────────────────────────────────────────────────────

function getMaturityColor(band: string): string {
  switch (band) {
    case 'laggard': return COLOR_RED;
    case 'follower': return COLOR_AMBER;
    case 'chaser': return COLOR_BLUE;
    case 'pacesetter': return COLOR_GREEN;
    default: return COLOR_SLATE;
  }
}

function getScoreBgColor(score: number): string {
  if (score >= 75) return BG_SCORE_HIGH;
  if (score >= 50) return BG_SCORE_MED;
  return BG_SCORE_LOW;
}

function getPillarColor(pillarId: string): string {
  const pillar = PILLARS.find(p => p.id === pillarId);
  return pillar?.color || COLOR_BLUE;
}

function thinBorder(color: string = BORDER_LIGHT) {
  return { style: BorderStyle.SINGLE, size: 1, color };
}

function allBorders(color: string = BORDER_LIGHT) {
  return {
    top: thinBorder(color),
    bottom: thinBorder(color),
    left: thinBorder(color),
    right: thinBorder(color),
  };
}

function headingParagraph(text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1): Paragraph {
  return new Paragraph({
    heading: level,
    children: [
      new TextRun({
        text,
        font: FONT_HEADING,
        size: level === HeadingLevel.HEADING_1 ? 32 : level === HeadingLevel.HEADING_2 ? 26 : 22,
        bold: true,
        color: COLOR_PRIMARY,
      }),
    ],
    spacing: { before: level === HeadingLevel.HEADING_1 ? 360 : 240, after: 120 },
    keepNext: true,
  });
}

function bodyParagraph(text: string, opts?: { bold?: boolean; color?: string; size?: number; spacing?: { before?: number; after?: number } }): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: FONT_BODY,
        size: opts?.size || 22,
        bold: opts?.bold || false,
        color: opts?.color || COLOR_TEXT,
      }),
    ],
    spacing: opts?.spacing || { before: 60, after: 60 },
  });
}

function bulletParagraph(text: string, color: string = COLOR_TEXT): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: '\u2022  ', font: FONT_BODY, size: 22, color }),
      new TextRun({ text, font: FONT_BODY, size: 22, color: COLOR_TEXT }),
    ],
    spacing: { before: 40, after: 40 },
    indent: { left: 360 },
  });
}

function spacer(height: number = 120): Paragraph {
  return new Paragraph({ spacing: { before: height, after: 0 }, children: [] });
}

function divider(): Paragraph {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_MEDIUM } },
    spacing: { before: 200, after: 200 },
    children: [],
  });
}

function makeHeaderCell(text: string, width?: number): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, font: FONT_BODY, size: 18, bold: true, color: COLOR_WHITE })],
      alignment: AlignmentType.LEFT,
      spacing: { before: 40, after: 40 },
    })],
    margins: CELL_MARGINS,
    shading: { type: ShadingType.CLEAR, fill: BG_HEADER, color: 'auto' },
    borders: allBorders(BORDER_LIGHT),
    verticalAlign: VerticalAlign.CENTER,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
  });
}

function makeCell(text: string, opts?: { bold?: boolean; color?: string; alignment?: typeof AlignmentType[keyof typeof AlignmentType]; width?: number; shading?: string; size?: number }): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, font: FONT_BODY, size: opts?.size ?? 20, bold: opts?.bold || false, color: opts?.color || COLOR_TEXT })],
      alignment: opts?.alignment || AlignmentType.LEFT,
      spacing: { before: 40, after: 40 },
    })],
    margins: CELL_MARGINS,
    shading: opts?.shading ? { type: ShadingType.CLEAR, fill: opts.shading, color: 'auto' } : undefined,
    borders: allBorders(BORDER_LIGHT),
    verticalAlign: VerticalAlign.CENTER,
    width: opts?.width ? { size: opts.width, type: WidthType.DXA } : undefined,
  });
}

// ─── Score Bar Visualization (color-coded progress bar) ─────────────────────

function scoreBarParagraph(score: number, color: string): Paragraph {
  const filled = Math.round(score);
  const empty = 100 - filled;
  return new Paragraph({
    children: [
      new TextRun({ text: '\u2588'.repeat(Math.ceil(filled / 5)), font: FONT_BODY, size: 16, color }),
      new TextRun({ text: '\u2591'.repeat(Math.ceil(empty / 5)), font: FONT_BODY, size: 16, color: BORDER_MEDIUM }),
      new TextRun({ text: `  ${Math.round(score)}%`, font: FONT_BODY, size: 20, bold: true, color }),
    ],
    spacing: { before: 40, after: 40 },
  });
}

// ─── Table of Contents ──────────────────────────────────────────────────────

function buildTableOfContents(): Paragraph[] {
  const tocItems = [
    { title: '1. Executive Summary', page: '2' },
    { title: '2. Overall AI Readiness Score', page: '2' },
    { title: '3. Pillar Breakdown', page: '3' },
    { title: '4. Detailed Pillar Analysis', page: '4' },
    { title: '5. Strategic Insights', page: '7' },
    { title: '6. Sector Benchmark Comparison', page: '8' },
    { title: '7. Interdependency Adjustments', page: '9' },
    { title: '8. Recommended Next Steps', page: '10' },
    { title: '9. Methodology & Glossary', page: '11' },
    { title: '10. Confidentiality & Disclaimer', page: '12' },
  ];

  const paragraphs: Paragraph[] = [
    headingParagraph('Table of Contents', HeadingLevel.HEADING_1),
    spacer(80),
  ];

  for (const item of tocItems) {
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({ text: item.title, font: FONT_BODY, size: 22, color: COLOR_TEXT }),
      ],
      spacing: { before: 30, after: 30 },
      indent: { left: 240 },
    }));
  }

  return paragraphs;
}

// ─── Maturity Band Reference Card ───────────────────────────────────────────

function buildMaturityBandCard(currentBand: string): Table {
  const bands = [
    { id: 'pacesetter', label: 'Pacesetter', range: '76-100%', color: COLOR_GREEN, bg: BG_SCORE_HIGH, desc: 'Leading AI adoption with mature, well-integrated capabilities across the organization.' },
    { id: 'chaser', label: 'Chaser', range: '51-75%', color: COLOR_BLUE, bg: BG_BLUE_LIGHT, desc: 'Actively pursuing AI transformation with solid foundations in key areas.' },
    { id: 'follower', label: 'Follower', range: '26-50%', color: COLOR_AMBER, bg: BG_AMBER_LIGHT, desc: 'Early-stage adoption with meaningful gaps that require strategic attention.' },
    { id: 'laggard', label: 'Laggard', range: '0-25%', color: COLOR_RED, bg: BG_SCORE_LOW, desc: 'Minimal AI readiness; significant investment and organizational change needed.' },
  ];

  const headerRow = new TableRow({
    children: [
      makeHeaderCell('Band', 1600),
      makeHeaderCell('Score Range', 1400),
      makeHeaderCell('Description', 6400),
    ],
    tableHeader: true,
  });

  const dataRows = bands.map(band => {
    const isCurrent = band.id === currentBand;
    const rowBg = isCurrent ? band.bg : undefined;
    return new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            children: [
              new TextRun({ text: isCurrent ? '\u25B6 ' : '   ', font: FONT_BODY, size: 18, color: band.color }),
              new TextRun({ text: band.label, font: FONT_BODY, size: 20, bold: isCurrent, color: band.color }),
            ],
            spacing: { before: 40, after: 40 },
          })],
          margins: CELL_MARGINS,
          shading: rowBg ? { type: ShadingType.CLEAR, fill: rowBg, color: 'auto' } : undefined,
          borders: allBorders(BORDER_LIGHT),
          verticalAlign: VerticalAlign.CENTER,
          width: { size: 1600, type: WidthType.DXA },
        }),
        makeCell(band.range, { alignment: AlignmentType.CENTER, width: 1400, shading: rowBg, bold: isCurrent, color: band.color }),
        makeCell(band.desc, { width: 6400, shading: rowBg, color: isCurrent ? COLOR_TEXT : COLOR_TEXT_SECONDARY, size: 18 }),
      ],
      cantSplit: true,
    });
  });

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: thinBorder(BORDER_MEDIUM), bottom: thinBorder(BORDER_MEDIUM), left: thinBorder(BORDER_MEDIUM), right: thinBorder(BORDER_MEDIUM), insideHorizontal: thinBorder(BORDER_LIGHT), insideVertical: thinBorder(BORDER_LIGHT) },
    layout: TableLayoutType.FIXED,
  });
}

// ─── Glossary Appendix ──────────────────────────────────────────────────────

function buildGlossary(): Paragraph[] {
  const terms = [
    { term: 'AI Readiness Score', def: 'A composite metric (0-100%) measuring an organization\'s preparedness to adopt, integrate, and scale artificial intelligence solutions across its operations, strategy, and culture.' },
    { term: 'Pillar', def: 'One of eight foundational domains of AI readiness: Vision & Strategy, Data & Infrastructure, Talent & Culture, Governance & Ethics, Technology & Tools, Processes & Operations, Innovation & R&D, and Partnerships & Ecosystem.' },
    { term: 'Maturity Band', def: 'A classification tier indicating the depth and sophistication of an organization\'s AI capabilities. From lowest to highest: Laggard (0-25%), Follower (26-50%), Chaser (51-75%), Pacesetter (76-100%).' },
    { term: 'Normalized Score', def: 'A pillar-level score converted from the raw Likert scale (1-5) to a 0-100% scale for comparability across pillars and against sector benchmarks.' },
    { term: 'Strategic Weight', def: 'The relative importance of each pillar in the overall readiness calculation, determined by research on AI transformation success factors and validated across industry frameworks.' },
    { term: 'Interdependency Adjustment', def: 'A score modifier that reduces the effective readiness of dependent pillars when their foundational prerequisites are critically weak (below 15%). This reflects the reality that advanced capabilities cannot compensate for missing fundamentals.' },
    { term: 'Contribution', def: 'The absolute point contribution of a pillar to the overall score, calculated as the normalized score multiplied by the strategic weight.' },
    { term: 'Sector Benchmark', def: 'A comparative reference point derived from aggregated assessment data and validated research (McKinsey AI Index, Gartner AI Readiness, WEF Framework). Benchmarks labeled "Real" include consented participant data; "Estimated" benchmarks are research-derived.' },
    { term: 'Critical Pillar Failure', def: 'A pillar scoring below 15%, indicating a fundamental deficit that must be addressed before dependent AI initiatives can succeed.' },
  ];

  const paragraphs: Paragraph[] = [
    headingParagraph('Glossary of Terms', HeadingLevel.HEADING_2),
    bodyParagraph('The following definitions clarify key terminology used throughout this report to ensure consistent interpretation across all stakeholders.', { color: COLOR_TEXT_SECONDARY, size: 20, spacing: { before: 40, after: 120 } }),
  ];

  for (const t of terms) {
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({ text: t.term, font: FONT_BODY, size: 20, bold: true, color: COLOR_BLUE }),
        new TextRun({ text: ` — ${t.def}`, font: FONT_BODY, size: 20, color: COLOR_TEXT }),
      ],
      spacing: { before: 60, after: 60 },
    }));
  }

  return paragraphs;
}

// ─── Confidentiality & Disclaimer Section ───────────────────────────────────

function buildConfidentialitySection(organization: string): Paragraph[] {
  return [
    divider(),
    headingParagraph('Confidentiality & Disclaimer', HeadingLevel.HEADING_2),
    bodyParagraph('This document is strictly confidential and intended solely for the use of authorized personnel within ' + organization + '. Unauthorized reproduction, distribution, or disclosure of this document, in whole or in part, is strictly prohibited without prior written consent from E-ARI.', { size: 20, spacing: { before: 40, after: 100 } }),
    bodyParagraph('The assessments, analyses, and recommendations contained herein are based on self-reported data provided by the organization and processed through the E-ARI scoring engine. While every effort has been made to ensure accuracy and relevance, E-ARI makes no warranties, express or implied, regarding the completeness or reliability of the findings. Organizations should use this report as a strategic input and validate key decisions through independent expert consultation.', { size: 20, spacing: { before: 40, after: 100 } }),
    bodyParagraph('Sector benchmarks are derived from a combination of consented assessment data and research-based estimates from McKinsey Global AI Survey, Gartner AI Readiness Index, and the World Economic Forum AI Readiness Framework. As the dataset grows, benchmarks will become increasingly precise. Current benchmarks should be interpreted as directional indicators rather than definitive standards.', { size: 20, color: COLOR_TEXT_SECONDARY, spacing: { before: 40, after: 100 } }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Report Classification: ', font: FONT_BODY, size: 20, bold: true, color: COLOR_AMBER }),
        new TextRun({ text: 'CONFIDENTIAL', font: FONT_HEADING, size: 20, bold: true, color: COLOR_RED }),
      ],
      spacing: { before: 80, after: 40 },
    }),
    bodyParagraph(`Generated by E-ARI Platform on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}. All rights reserved.`, { color: COLOR_TEXT_SECONDARY, size: 18 }),
  ];
}

// ─── Assessment Results Report ──────────────────────────────────────────────

export interface AssessmentReportData {
  scoringResult: ScoringResult;
  insights: {
    executiveSummary: string;
    strengths: string[];
    gaps: string[];
    risks: string[];
    opportunities: string[];
    nextSteps: string[];
    isAIGenerated: boolean;
    pillarDrilldown?: Array<{
      pillarId: string;
      pillarName: string;
      score: number;
      maturityLabel: string;
      strongestQuestions: Array<{
        questionId: string;
        questionTopic: string;
        answer: number;
        answerLabel: string;
      }>;
      weakestQuestions: Array<{
        questionId: string;
        questionTopic: string;
        answer: number;
        answerLabel: string;
      }>;
    }>;
  };
  userName: string;
  organization: string;
  sector: string;
  completedAt: string;
  benchmarkData?: {
    sector: string;
    pillars: Array<{
      pillarId: string;
      avgScore: number;
      sampleSize: number;
      isRealData: boolean;
    }>;
    overall: { avgScore: number; sampleSize: number; isRealData: boolean } | null;
  };
  previousScore?: number | null;
  previousDate?: string | null;
}

export async function generateAssessmentReport(data: AssessmentReportData): Promise<Buffer> {
  const { scoringResult, insights, userName, organization, sector, completedAt, benchmarkData, previousScore, previousDate } = data;
  const date = new Date(completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const maturityColor = getMaturityColor(scoringResult.maturityBand);
  const sectorName = sector.charAt(0).toUpperCase() + sector.slice(1);

  // ─── Build Document Sections ────────────────────────────────────────────

  const children: (Paragraph | Table)[] = [];

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 0: TITLE PAGE
  // ═══════════════════════════════════════════════════════════════════════

  children.push(spacer(1600));
  children.push(new Paragraph({
    children: [new TextRun({ text: 'E-ARI', font: FONT_HEADING, size: 72, bold: true, color: COLOR_BLUE })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: 'Enterprise AI Readiness Assessment', font: FONT_HEADING, size: 36, color: COLOR_PRIMARY })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
  }));
  children.push(divider());
  children.push(spacer(100));
  children.push(new Paragraph({
    children: [new TextRun({ text: organization, font: FONT_HEADING, size: 30, bold: true, color: COLOR_PRIMARY })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: `Sector: ${sectorName}`, font: FONT_BODY, size: 22, color: COLOR_TEXT_SECONDARY })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: `Assessment Date: ${date}`, font: FONT_BODY, size: 22, color: COLOR_TEXT_SECONDARY })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: `Prepared for: ${userName}`, font: FONT_BODY, size: 22, color: COLOR_TEXT_SECONDARY })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
  }));
  children.push(divider());
  children.push(spacer(100));

  // Confidentiality badge
  children.push(new Paragraph({
    children: [
      new TextRun({ text: 'CONFIDENTIAL', font: FONT_HEADING, size: 22, bold: true, color: COLOR_RED }),
      new TextRun({ text: '  —  This document contains proprietary assessment data. Distribution is restricted.', font: FONT_BODY, size: 18, color: COLOR_TEXT_SECONDARY }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
  }));

  children.push(new Paragraph({
    children: [new TextRun({ text: `Scoring v${scoringResult.scoringVersion}  |  Methodology v${scoringResult.methodologyVersion}  |  E-ARI 8-Pillar Framework`, font: FONT_BODY, size: 18, color: COLOR_TEXT_SECONDARY })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 0 },
  }));

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 1: TABLE OF CONTENTS
  // ═══════════════════════════════════════════════════════════════════════

  children.push(new Paragraph({
    children: [new TextRun({ text: 'Table of Contents', break: 1 })],
    heading: HeadingLevel.HEADING_1,
    keepNext: true,
  }));
  children.push(...buildTableOfContents());

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 2: EXECUTIVE SUMMARY + OVERALL SCORE
  // ═══════════════════════════════════════════════════════════════════════

  children.push(new Paragraph({
    children: [new TextRun({ text: 'Executive Summary', break: 1 })],
    heading: HeadingLevel.HEADING_1,
    keepNext: true,
  }));

  // Overall Score Section
  children.push(new Paragraph({
    children: [
      new TextRun({ text: 'Overall AI Readiness Score: ', font: FONT_HEADING, size: 32, color: COLOR_PRIMARY }),
      new TextRun({ text: `${Math.round(scoringResult.overallScore)}%`, font: FONT_HEADING, size: 44, bold: true, color: maturityColor }),
    ],
    spacing: { before: 200, after: 80 },
    keepNext: true,
  }));

  children.push(new Paragraph({
    children: [
      new TextRun({ text: 'Maturity Classification: ', font: FONT_BODY, size: 22, color: COLOR_TEXT_SECONDARY }),
      new TextRun({ text: scoringResult.maturityLabel, font: FONT_BODY, size: 22, bold: true, color: maturityColor }),
    ],
    spacing: { after: 60 },
  }));

  const bandDesc = MATURITY_BANDS[scoringResult.maturityBand as keyof typeof MATURITY_BANDS]?.description || '';
  if (bandDesc) {
    children.push(bodyParagraph(bandDesc, { color: COLOR_TEXT_SECONDARY, size: 20, spacing: { before: 40, after: 100 } }));
  }

  // Maturity Band Reference Card
  children.push(spacer(60));
  children.push(bodyParagraph('Maturity Band Reference:', { bold: true, color: COLOR_TEXT_SECONDARY, size: 18, spacing: { before: 40, after: 40 } }));
  children.push(buildMaturityBandCard(scoringResult.maturityBand));

  // Previous score comparison
  if (previousScore !== null && previousScore !== undefined) {
    children.push(spacer(80));
    const delta = Math.round(scoringResult.overallScore - previousScore);
    const deltaColor = delta >= 0 ? COLOR_GREEN : COLOR_RED;
    const deltaText = delta >= 0 ? `+${delta}` : `${delta}`;
    const arrow = delta >= 0 ? '\u2191' : '\u2193';
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `${arrow} Trend: `, font: FONT_BODY, size: 22, bold: true, color: deltaColor }),
        new TextRun({ text: `${deltaText} points `, font: FONT_BODY, size: 22, bold: true, color: deltaColor }),
        new TextRun({ text: 'from previous assessment', font: FONT_BODY, size: 22, color: COLOR_TEXT_SECONDARY }),
        previousDate ? new TextRun({ text: ` (${new Date(previousDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`, font: FONT_BODY, size: 20, color: COLOR_TEXT_SECONDARY }) : new TextRun({ text: '' }),
      ],
      spacing: { after: 80 },
    }));
  }

  // Executive Summary Narrative
  children.push(headingParagraph('Executive Summary', HeadingLevel.HEADING_2));
  children.push(bodyParagraph(insights.executiveSummary, { size: 22, spacing: { before: 80, after: 160 } }));

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 3: PILLAR BREAKDOWN
  // ═══════════════════════════════════════════════════════════════════════

  children.push(headingParagraph('Pillar Breakdown', HeadingLevel.HEADING_2));
  children.push(bodyParagraph('The following table presents the detailed breakdown of your AI readiness across all 8 pillars. Each pillar is scored on a 0-100% normalized scale, classified into a maturity band, and weighted according to its strategic importance in the overall readiness calculation. The contribution column shows the absolute points each pillar adds to your overall score.', { color: COLOR_TEXT_SECONDARY, size: 20, spacing: { before: 40, after: 120 } }));

  // Pillar Summary Table
  const pillarHeaderRow = new TableRow({
    children: [
      makeHeaderCell('Pillar', 3200),
      makeHeaderCell('Score', 1200),
      makeHeaderCell('Maturity', 1400),
      makeHeaderCell('Weight', 1000),
      makeHeaderCell('Contribution', 1600),
    ],
    tableHeader: true,
  });

  const pillarDataRows = scoringResult.pillarScores.map((ps, idx) => {
    const color = getPillarColor(ps.pillarId);
    const contribution = Math.round(ps.normalizedScore * ps.weight * 100) / 100;
    const scoreBg = getScoreBgColor(ps.normalizedScore);
    return new TableRow({
      children: [
        makeCell(ps.pillarName, { bold: true, color, width: 3200, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
        makeCell(`${Math.round(ps.normalizedScore)}%`, { bold: true, alignment: AlignmentType.CENTER, width: 1200, shading: scoreBg, color: getMaturityColor(ps.maturityBand) }),
        makeCell(ps.maturityLabel, { color: getMaturityColor(ps.maturityBand), alignment: AlignmentType.CENTER, width: 1400, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
        makeCell(`${Math.round(ps.weight * 100)}%`, { alignment: AlignmentType.CENTER, width: 1000, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
        makeCell(`${contribution.toFixed(1)}`, { alignment: AlignmentType.CENTER, width: 1600, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
      ],
      cantSplit: true,
    });
  });

  children.push(new Table({
    rows: [pillarHeaderRow, ...pillarDataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: thinBorder(BORDER_MEDIUM), bottom: thinBorder(BORDER_MEDIUM), left: thinBorder(BORDER_MEDIUM), right: thinBorder(BORDER_MEDIUM), insideHorizontal: thinBorder(BORDER_LIGHT), insideVertical: thinBorder(BORDER_LIGHT) },
    layout: TableLayoutType.FIXED,
  }));

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 4: DETAILED PILLAR ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════

  children.push(spacer(200));
  children.push(headingParagraph('Detailed Pillar Analysis', HeadingLevel.HEADING_2));
  children.push(bodyParagraph('This section provides a granular view of each pillar, including the visual score bar, individual question responses, and AI-driven analysis of key strengths and weaknesses within each domain.', { color: COLOR_TEXT_SECONDARY, size: 20, spacing: { before: 40, after: 120 } }));

  for (const ps of scoringResult.pillarScores) {
    const pillarColor = getPillarColor(ps.pillarId);
    const pillar = PILLARS.find(p => p.id === ps.pillarId);

    children.push(new Paragraph({
      children: [
        new TextRun({ text: `${ps.pillarName} `, font: FONT_HEADING, size: 24, bold: true, color: pillarColor }),
        new TextRun({ text: `\u2014 ${Math.round(ps.normalizedScore)}% `, font: FONT_HEADING, size: 24, bold: true, color: COLOR_PRIMARY }),
        new TextRun({ text: `(${ps.maturityLabel})`, font: FONT_BODY, size: 20, color: getMaturityColor(ps.maturityBand) }),
      ],
      spacing: { before: 240, after: 80 },
      keepNext: true,
    }));

    // Score bar
    children.push(scoreBarParagraph(ps.normalizedScore, pillarColor));

    // Adjustment warnings
    for (const adj of ps.adjustments) {
      children.push(bodyParagraph(`\u26A0 Adjustment: ${adj.description}`, { color: COLOR_AMBER, size: 18, spacing: { before: 40, after: 40 } }));
    }

    // Question detail table
    if (pillar) {
      const qHeaderRow = new TableRow({
        children: [
          makeHeaderCell('Question', 5400),
          makeHeaderCell('Answer', 1000),
          makeHeaderCell('Score', 1200),
          makeHeaderCell('Contribution', 1800),
        ],
        tableHeader: true,
      });

      const qRows = ps.questionDetails.map((qd, idx) => {
        const question = pillar.questions.find(q => q.id === qd.questionId);
        const qText = question ? question.text : qd.questionId;
        const truncatedQ = qText.length > 120 ? qText.substring(0, 117) + '...' : qText;
        const qScore = Math.round(qd.normalizedAnswer);
        const qBg = qScore >= 75 ? BG_SCORE_HIGH : qScore >= 50 ? BG_SCORE_MED : qScore < 25 ? BG_SCORE_LOW : undefined;
        return new TableRow({
          children: [
            makeCell(truncatedQ, { width: 5400, color: COLOR_TEXT, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
            makeCell(`${qd.answer}/5`, { alignment: AlignmentType.CENTER, width: 1000, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
            makeCell(`${qScore}%`, { alignment: AlignmentType.CENTER, width: 1200, shading: qBg || (idx % 2 === 1 ? BG_ROW_ALT : undefined), color: qScore >= 75 ? COLOR_GREEN : qScore < 25 ? COLOR_RED : undefined, bold: qScore >= 75 || qScore < 25 }),
            makeCell(qd.contribution, { alignment: AlignmentType.CENTER, width: 1800, color: COLOR_TEXT_SECONDARY, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
          ],
          cantSplit: true,
        });
      });

      children.push(new Table({
        rows: [qHeaderRow, ...qRows],
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: thinBorder(BORDER_MEDIUM), bottom: thinBorder(BORDER_MEDIUM), left: thinBorder(BORDER_MEDIUM), right: thinBorder(BORDER_MEDIUM), insideHorizontal: thinBorder(BORDER_LIGHT), insideVertical: thinBorder(BORDER_LIGHT) },
        layout: TableLayoutType.FIXED,
      }));
    }

    // AI Drilldown if available
    const drilldown = insights.pillarDrilldown?.find(pd => pd.pillarId === ps.pillarId);
    if (drilldown) {
      if (drilldown.strongestQuestions && drilldown.strongestQuestions.length > 0) {
        children.push(bodyParagraph('Key Strengths:', { bold: true, color: COLOR_GREEN, size: 20, spacing: { before: 80, after: 20 } }));
        for (const sq of drilldown.strongestQuestions) {
          const label = sq.questionTopic || sq.questionId;
          children.push(bulletParagraph(`${label} (${sq.answer}/5, ${sq.answerLabel})`, COLOR_GREEN));
        }
      }
      if (drilldown.weakestQuestions && drilldown.weakestQuestions.length > 0) {
        children.push(bodyParagraph('Key Weaknesses:', { bold: true, color: COLOR_AMBER, size: 20, spacing: { before: 80, after: 20 } }));
        for (const wq of drilldown.weakestQuestions) {
          const label = wq.questionTopic || wq.questionId;
          children.push(bulletParagraph(`${label} (${wq.answer}/5, ${wq.answerLabel})`, COLOR_AMBER));
        }
      }
    }

    children.push(spacer(80));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 5: STRATEGIC INSIGHTS
  // ═══════════════════════════════════════════════════════════════════════

  children.push(headingParagraph('Strategic Insights', HeadingLevel.HEADING_2));
  children.push(bodyParagraph('The following insights synthesize your assessment data into actionable strategic themes. Strengths represent areas of competitive advantage; Gaps indicate missing capabilities that limit AI potential; Risks highlight exposure to adverse outcomes; and Opportunities identify high-impact areas where targeted investment could yield disproportionate returns.', { color: COLOR_TEXT_SECONDARY, size: 20, spacing: { before: 40, after: 120 } }));

  if (insights.strengths.length > 0) {
    children.push(bodyParagraph('Strengths', { bold: true, color: COLOR_GREEN, size: 22, spacing: { before: 120, after: 40 } }));
    for (const s of insights.strengths) {
      children.push(bulletParagraph(s, COLOR_GREEN));
    }
  }

  if (insights.gaps.length > 0) {
    children.push(bodyParagraph('Gaps', { bold: true, color: COLOR_AMBER, size: 22, spacing: { before: 120, after: 40 } }));
    for (const g of insights.gaps) {
      children.push(bulletParagraph(g, COLOR_AMBER));
    }
  }

  if (insights.risks.length > 0) {
    children.push(bodyParagraph('Risks', { bold: true, color: COLOR_RED, size: 22, spacing: { before: 120, after: 40 } }));
    for (const r of insights.risks) {
      children.push(bulletParagraph(r, COLOR_RED));
    }
  }

  if (insights.opportunities.length > 0) {
    children.push(bodyParagraph('Opportunities', { bold: true, color: COLOR_CYAN, size: 22, spacing: { before: 120, after: 40 } }));
    for (const o of insights.opportunities) {
      children.push(bulletParagraph(o, COLOR_CYAN));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 6: BENCHMARK COMPARISON
  // ═══════════════════════════════════════════════════════════════════════

  if (benchmarkData) {
    children.push(headingParagraph('Sector Benchmark Comparison', HeadingLevel.HEADING_2));
    const bSectorName = benchmarkData.sector.charAt(0).toUpperCase() + benchmarkData.sector.slice(1);
    const dataSourceNote = benchmarkData.pillars.some(p => p.isRealData)
      ? 'Benchmark data includes real consented assessment data from organizations in your sector, combined with research-based estimates for statistical validity.'
      : 'Benchmark data is based on research-based estimates from McKinsey Global AI Survey, Gartner AI Readiness Index, and WEF AI Readiness Framework. As more organizations contribute data, benchmarks will become increasingly precise.';
    children.push(bodyParagraph(`Your scores compared to the ${bSectorName} sector average. ${dataSourceNote}`, { color: COLOR_TEXT_SECONDARY, size: 20, spacing: { before: 40, after: 120 } }));

    const bHeaderRow = new TableRow({
      children: [
        makeHeaderCell('Pillar', 2800),
        makeHeaderCell('Your Score', 1600),
        makeHeaderCell('Sector Avg', 1600),
        makeHeaderCell('Difference', 1600),
        makeHeaderCell('Data Source', 1800),
      ],
      tableHeader: true,
    });

    const bRows = scoringResult.pillarScores.map((ps, idx) => {
      const bp = benchmarkData.pillars.find(p => p.pillarId === ps.pillarId);
      const sectorAvg = bp ? Math.round(bp.avgScore) : null;
      const diff = sectorAvg !== null ? Math.round(ps.normalizedScore - bp!.avgScore) : null;
      const diffColor = diff !== null ? (diff >= 0 ? COLOR_GREEN : COLOR_RED) : COLOR_TEXT_SECONDARY;
      const diffText = diff !== null ? (diff >= 0 ? `+${diff}%` : `${diff}%`) : 'N/A';
      const diffBg = diff !== null ? (diff >= 10 ? BG_SCORE_HIGH : diff <= -10 ? BG_SCORE_LOW : undefined) : undefined;
      const source = bp ? (bp.isRealData ? `Real (n=${bp.sampleSize})` : 'Estimated') : 'N/A';

      return new TableRow({
        children: [
          makeCell(ps.pillarName, { bold: true, color: getPillarColor(ps.pillarId), width: 2800, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
          makeCell(`${Math.round(ps.normalizedScore)}%`, { bold: true, alignment: AlignmentType.CENTER, width: 1600, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
          makeCell(sectorAvg !== null ? `${sectorAvg}%` : 'N/A', { alignment: AlignmentType.CENTER, width: 1600, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
          makeCell(diffText, { bold: true, alignment: AlignmentType.CENTER, color: diffColor, width: 1600, shading: diffBg || (idx % 2 === 1 ? BG_ROW_ALT : undefined) }),
          makeCell(source, { alignment: AlignmentType.CENTER, color: COLOR_TEXT_SECONDARY, size: 18, width: 1800, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
        ],
        cantSplit: true,
      });
    });

    // Overall row
    if (benchmarkData.overall) {
      const overallDiff = Math.round(scoringResult.overallScore - benchmarkData.overall.avgScore);
      const overallDiffColor = overallDiff >= 0 ? COLOR_GREEN : COLOR_RED;
      bRows.push(new TableRow({
        children: [
          makeCell('Overall', { bold: true, color: COLOR_BLUE, width: 2800, shading: BG_BLUE_LIGHT }),
          makeCell(`${Math.round(scoringResult.overallScore)}%`, { bold: true, alignment: AlignmentType.CENTER, width: 1600, shading: BG_BLUE_LIGHT }),
          makeCell(`${Math.round(benchmarkData.overall.avgScore)}%`, { alignment: AlignmentType.CENTER, width: 1600, shading: BG_BLUE_LIGHT }),
          makeCell(`${overallDiff >= 0 ? '+' : ''}${overallDiff}%`, { bold: true, alignment: AlignmentType.CENTER, color: overallDiffColor, width: 1600, shading: BG_BLUE_LIGHT }),
          makeCell(benchmarkData.overall.isRealData ? `Real (n=${benchmarkData.overall.sampleSize})` : 'Estimated', { alignment: AlignmentType.CENTER, color: COLOR_TEXT_SECONDARY, width: 1800, shading: BG_BLUE_LIGHT }),
        ],
        cantSplit: true,
      }));
    }

    children.push(new Table({
      rows: [bHeaderRow, ...bRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: thinBorder(BORDER_MEDIUM), bottom: thinBorder(BORDER_MEDIUM), left: thinBorder(BORDER_MEDIUM), right: thinBorder(BORDER_MEDIUM), insideHorizontal: thinBorder(BORDER_LIGHT), insideVertical: thinBorder(BORDER_LIGHT) },
      layout: TableLayoutType.FIXED,
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 7: INTERDEPENDENCY ADJUSTMENTS
  // ═══════════════════════════════════════════════════════════════════════

  if (scoringResult.adjustments.length > 0) {
    children.push(headingParagraph('Interdependency Adjustments', HeadingLevel.HEADING_2));
    children.push(bodyParagraph('The following interdependency adjustments were applied to your scores. These adjustments reflect the reality that AI readiness pillars are interconnected — weaknesses in foundational pillars (such as Data & Infrastructure or Governance & Ethics) reduce the effective readiness of dependent pillars. An organization cannot deploy production AI systems reliably without adequate data pipelines and governance frameworks, regardless of how advanced its technology tools may be.', { color: COLOR_TEXT_SECONDARY, size: 20, spacing: { before: 40, after: 120 } }));

    const adjHeaderRow = new TableRow({
      children: [
        makeHeaderCell('Rule', 1400),
        makeHeaderCell('Pillar Affected', 2200),
        makeHeaderCell('Original', 1200),
        makeHeaderCell('Adjusted', 1200),
        makeHeaderCell('Impact', 1200),
        makeHeaderCell('Rationale', 4400),
      ],
      tableHeader: true,
    });

    const adjRows = scoringResult.adjustments.map((adj, idx) => new TableRow({
      children: [
        makeCell(adj.type, { bold: true, color: COLOR_AMBER, width: 1400, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
        makeCell(adj.pillarAffected, { width: 2200, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
        makeCell(`${Math.round(adj.originalScore)}%`, { alignment: AlignmentType.CENTER, width: 1200, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
        makeCell(`${Math.round(adj.adjustedScore)}%`, { alignment: AlignmentType.CENTER, color: COLOR_AMBER, width: 1200, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
        makeCell(`${adj.delta.toFixed(1)}`, { alignment: AlignmentType.CENTER, color: COLOR_RED, width: 1200, shading: BG_SCORE_LOW }),
        makeCell(adj.description, { color: COLOR_TEXT_SECONDARY, size: 18, width: 4400, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
      ],
      cantSplit: true,
    }));

    children.push(new Table({
      rows: [adjHeaderRow, ...adjRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: thinBorder(BORDER_MEDIUM), bottom: thinBorder(BORDER_MEDIUM), left: thinBorder(BORDER_MEDIUM), right: thinBorder(BORDER_MEDIUM), insideHorizontal: thinBorder(BORDER_LIGHT), insideVertical: thinBorder(BORDER_LIGHT) },
      layout: TableLayoutType.FIXED,
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 8: RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════════

  children.push(headingParagraph('Recommended Next Steps', HeadingLevel.HEADING_2));
  children.push(bodyParagraph('Based on your assessment results and industry best practices, the following actions are recommended to advance your AI readiness. These recommendations are prioritized by impact and feasibility, with the highest-priority items addressing foundational gaps that currently constrain your overall readiness.', { color: COLOR_TEXT_SECONDARY, size: 20, spacing: { before: 40, after: 80 } }));

  for (let i = 0; i < insights.nextSteps.length; i++) {
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `${i + 1}. `, font: FONT_BODY, size: 22, bold: true, color: COLOR_BLUE }),
        new TextRun({ text: insights.nextSteps[i], font: FONT_BODY, size: 22, color: COLOR_TEXT }),
      ],
      spacing: { before: 60, after: 60 },
      indent: { left: 360 },
    }));
  }

  // ── Critical Failures ───────────────────────────────────────────────────
  if (scoringResult.criticalPillarFailures.length > 0) {
    children.push(spacer(120));
    children.push(headingParagraph('Critical Pillar Failures', HeadingLevel.HEADING_2));
    children.push(bodyParagraph('The following pillars scored below 15%, indicating critical failures that must be addressed before any AI initiatives can succeed. These represent existential gaps in your organization\'s AI foundation — without resolving them, investments in more advanced capabilities will yield diminishing returns and increased risk.', { color: COLOR_RED, size: 20, spacing: { before: 40, after: 80 } }));
    for (const pf of scoringResult.criticalPillarFailures) {
      const pillar = PILLARS.find(p => p.id === pf);
      if (pillar) {
        const score = scoringResult.pillarScores.find(ps => ps.pillarId === pf);
        children.push(bulletParagraph(`${pillar.name}: ${Math.round(score?.normalizedScore || 0)}% \u2014 Immediate remediation required`, COLOR_RED));
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 9: METHODOLOGY + GLOSSARY
  // ═══════════════════════════════════════════════════════════════════════

  children.push(divider());
  children.push(headingParagraph('Methodology', HeadingLevel.HEADING_2));
  children.push(bodyParagraph(`This assessment uses the E-ARI 8-pillar AI Readiness Framework (Scoring v${scoringResult.scoringVersion}, Methodology v${scoringResult.methodologyVersion}). Each pillar contains 5 Likert-scale questions (1-5), normalized to a 0-100 scale. Overall scores are computed as weighted sums of pillar scores, with interdependency adjustments applied where foundational pillars are critically weak. Maturity bands classify overall readiness: Laggard (0-25%), Follower (26-50%), Chaser (51-75%), Pacesetter (76-100%).`, { color: COLOR_TEXT_SECONDARY, size: 18, spacing: { before: 40, after: 120 } }));
  children.push(bodyParagraph('The framework draws on established AI readiness models including the McKinsey Global AI Survey, Gartner AI Maturity Model, and the World Economic Forum AI Readiness Index, adapted for cross-industry applicability with sector-specific benchmarking capabilities.', { color: COLOR_TEXT_SECONDARY, size: 18, spacing: { before: 40, after: 120 } }));

  if (insights.isAIGenerated) {
    children.push(bodyParagraph('AI-Assisted Narrative: This report includes AI-generated strategic insights. While these provide valuable context derived from your assessment data and industry patterns, critical business decisions should be validated independently with domain expertise and organizational context.', { color: COLOR_AMBER, size: 18, spacing: { before: 40, after: 80 } }));
  }

  // Glossary
  children.push(...buildGlossary());

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 10: CONFIDENTIALITY & DISCLAIMER
  // ═══════════════════════════════════════════════════════════════════════

  children.push(...buildConfidentialitySection(organization));

  // ─── Assemble Document ──────────────────────────────────────────────────

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT_BODY, size: 22, color: COLOR_TEXT },
        },
        heading1: {
          run: { font: FONT_HEADING, size: 32, bold: true, color: COLOR_PRIMARY },
        },
        heading2: {
          run: { font: FONT_HEADING, size: 26, bold: true, color: COLOR_PRIMARY },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: PAGE_MARGINS,
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [
              new TextRun({ text: 'E-ARI  |  ', font: FONT_HEADING, size: 16, color: COLOR_BLUE }),
              new TextRun({ text: 'AI Readiness Assessment Report', font: FONT_BODY, size: 16, color: COLOR_TEXT_SECONDARY }),
              new TextRun({ text: `  |  ${organization}`, font: FONT_BODY, size: 16, color: COLOR_TEXT_SECONDARY }),
            ],
            alignment: AlignmentType.RIGHT,
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: 'CONFIDENTIAL  |  E-ARI  |  Page ', font: FONT_BODY, size: 14, color: COLOR_TEXT_SECONDARY }),
              new TextRun({ children: [PageNumber.CURRENT], font: FONT_BODY, size: 14, color: COLOR_TEXT_SECONDARY }),
            ],
            alignment: AlignmentType.CENTER,
          })],
        }),
      },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}


// ─── Pulse Report ────────────────────────────────────────────────────────────

export interface PulseReportData {
  overallScore: number;
  previousOverallScore: number | null;
  overallDelta: number | null;
  maturityBand: string;
  maturityLabel: string;
  pillarScores: Array<{
    pillarId: string;
    pillarName: string;
    normalizedScore: number;
    weight: number;
  }>;
  scoreChanges: Array<{
    pillarId: string;
    pillarName: string;
    previous: number;
    current: number;
    delta: number;
  }>;
  topRisks: string[];
  topQuickWins: string[];
  month: string;
  userName: string;
  organization: string;
  sector: string;
  benchmarkData?: {
    sector: string;
    pillars: Array<{
      pillarId: string;
      avgScore: number;
      sampleSize: number;
      isRealData: boolean;
    }>;
    overall: { avgScore: number; sampleSize: number; isRealData: boolean } | null;
  } | null;
}

export async function generatePulseReport(data: PulseReportData): Promise<Buffer> {
  const {
    overallScore, previousOverallScore, overallDelta, maturityBand, maturityLabel,
    pillarScores, scoreChanges, topRisks, topQuickWins, month,
    userName, organization, sector, benchmarkData,
  } = data;

  const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const maturityColor = getMaturityColor(maturityBand);
  const sectorName = sector.charAt(0).toUpperCase() + sector.slice(1);

  const children: (Paragraph | Table)[] = [];

  // ── Title Page ──────────────────────────────────────────────────────────
  children.push(spacer(1600));
  children.push(new Paragraph({
    children: [new TextRun({ text: 'E-ARI', font: FONT_HEADING, size: 72, bold: true, color: COLOR_BLUE })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: 'AI Pulse Report', font: FONT_HEADING, size: 36, color: COLOR_PRIMARY })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
  }));
  children.push(divider());
  children.push(spacer(100));
  children.push(new Paragraph({
    children: [new TextRun({ text: `${monthLabel} Readiness Summary`, font: FONT_HEADING, size: 30, bold: true, color: COLOR_PRIMARY })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: organization, font: FONT_HEADING, size: 26, color: COLOR_TEXT })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: `Sector: ${sectorName}`, font: FONT_BODY, size: 22, color: COLOR_TEXT_SECONDARY })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: `Prepared for: ${userName}`, font: FONT_BODY, size: 22, color: COLOR_TEXT_SECONDARY })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
  }));
  children.push(divider());
  children.push(spacer(100));
  children.push(new Paragraph({
    children: [
      new TextRun({ text: 'CONFIDENTIAL', font: FONT_HEADING, size: 22, bold: true, color: COLOR_RED }),
      new TextRun({ text: '  —  This document contains proprietary assessment data. Distribution is restricted.', font: FONT_BODY, size: 18, color: COLOR_TEXT_SECONDARY }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 0 },
  }));

  // Page break
  children.push(new Paragraph({
    children: [new TextRun({ text: 'Overall Readiness', break: 1 })],
    heading: HeadingLevel.HEADING_1,
    keepNext: true,
  }));

  // ── Overall Score ───────────────────────────────────────────────────────
  children.push(new Paragraph({
    children: [
      new TextRun({ text: `${Math.round(overallScore)}%`, font: FONT_HEADING, size: 56, bold: true, color: maturityColor }),
    ],
    spacing: { before: 120, after: 40 },
  }));
  children.push(new Paragraph({
    children: [
      new TextRun({ text: `${maturityLabel} Maturity`, font: FONT_BODY, size: 24, bold: true, color: maturityColor }),
    ],
    spacing: { after: 80 },
  }));

  // Maturity Band Reference Card
  children.push(bodyParagraph('Maturity Band Reference:', { bold: true, color: COLOR_TEXT_SECONDARY, size: 18, spacing: { before: 40, after: 40 } }));
  children.push(buildMaturityBandCard(maturityBand));

  if (overallDelta !== null && previousOverallScore !== null) {
    const deltaColor = overallDelta >= 0 ? COLOR_GREEN : COLOR_RED;
    const deltaText = overallDelta >= 0 ? `+${Math.round(overallDelta)}` : `${Math.round(overallDelta)}`;
    const arrow = overallDelta >= 0 ? '\u2191' : '\u2193';
    children.push(spacer(80));
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `${arrow} Trend: `, font: FONT_BODY, size: 22, bold: true, color: deltaColor }),
        new TextRun({ text: `${deltaText} points `, font: FONT_BODY, size: 22, bold: true, color: deltaColor }),
        new TextRun({ text: 'from last assessment', font: FONT_BODY, size: 22, color: COLOR_TEXT_SECONDARY }),
        new TextRun({ text: ` (previous: ${Math.round(previousOverallScore)}%)`, font: FONT_BODY, size: 20, color: COLOR_TEXT_SECONDARY }),
      ],
      spacing: { after: 120 },
    }));
  }

  // ── Pillar Scores Table ─────────────────────────────────────────────────
  children.push(headingParagraph('Pillar Scores', HeadingLevel.HEADING_2));
  children.push(bodyParagraph('Your AI readiness scores across all 8 pillars, with comparison to your previous assessment. The Progress column uses a visual bar to indicate score level at a glance.', { color: COLOR_TEXT_SECONDARY, size: 20, spacing: { before: 40, after: 120 } }));

  const pHeaderRow = new TableRow({
    children: [
      makeHeaderCell('Pillar', 2800),
      makeHeaderCell('Score', 1200),
      makeHeaderCell('Previous', 1200),
      makeHeaderCell('Change', 1200),
      makeHeaderCell('Weight', 1000),
      makeHeaderCell('Readiness Level', 2200),
    ],
    tableHeader: true,
  });

  const pDataRows = pillarScores.map((ps, idx) => {
    const change = scoreChanges.find(sc => sc.pillarId === ps.pillarId);
    const delta = change ? change.delta : null;
    const deltaColor = delta !== null ? (delta >= 0 ? COLOR_GREEN : COLOR_RED) : COLOR_TEXT_SECONDARY;
    const deltaText = delta !== null ? (delta >= 0 ? `+${Math.round(delta)}` : `${Math.round(delta)}`) : '\u2014';
    const prevText = change ? `${Math.round(change.previous)}%` : '\u2014';
    const color = getPillarColor(ps.pillarId);
    const scoreBg = getScoreBgColor(ps.normalizedScore);
    const level = ps.normalizedScore >= 75 ? 'High' : ps.normalizedScore >= 50 ? 'Medium' : ps.normalizedScore >= 25 ? 'Low' : 'Critical';
    const levelColor = ps.normalizedScore >= 75 ? COLOR_GREEN : ps.normalizedScore >= 50 ? COLOR_BLUE : ps.normalizedScore >= 25 ? COLOR_AMBER : COLOR_RED;

    return new TableRow({
      children: [
        makeCell(ps.pillarName, { bold: true, color, width: 2800, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
        makeCell(`${Math.round(ps.normalizedScore)}%`, { bold: true, alignment: AlignmentType.CENTER, width: 1200, shading: scoreBg, color: levelColor }),
        makeCell(prevText, { alignment: AlignmentType.CENTER, color: COLOR_TEXT_SECONDARY, width: 1200, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
        makeCell(deltaText, { bold: true, alignment: AlignmentType.CENTER, color: deltaColor, width: 1200, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
        makeCell(`${Math.round(ps.weight * 100)}%`, { alignment: AlignmentType.CENTER, width: 1000, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
        makeCell(level, { bold: true, alignment: AlignmentType.CENTER, color: levelColor, width: 2200, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
      ],
      cantSplit: true,
    });
  });

  children.push(new Table({
    rows: [pHeaderRow, ...pDataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: thinBorder(BORDER_MEDIUM), bottom: thinBorder(BORDER_MEDIUM), left: thinBorder(BORDER_MEDIUM), right: thinBorder(BORDER_MEDIUM), insideHorizontal: thinBorder(BORDER_LIGHT), insideVertical: thinBorder(BORDER_LIGHT) },
    layout: TableLayoutType.FIXED,
  }));

  // ── Top Risks ───────────────────────────────────────────────────────────
  if (topRisks.length > 0) {
    children.push(headingParagraph('Top Risks', HeadingLevel.HEADING_2));
    children.push(bodyParagraph('The following risks represent the most critical threats to your AI readiness trajectory based on your current scores and trend analysis:', { color: COLOR_TEXT_SECONDARY, size: 20, spacing: { before: 40, after: 80 } }));
    for (const r of topRisks) {
      children.push(bulletParagraph(r, COLOR_RED));
    }
  }

  // ── Quick Wins ──────────────────────────────────────────────────────────
  if (topQuickWins.length > 0) {
    children.push(headingParagraph('Quick Wins', HeadingLevel.HEADING_2));
    children.push(bodyParagraph('These are high-impact, low-effort actions that can yield immediate improvements in your AI readiness score:', { color: COLOR_TEXT_SECONDARY, size: 20, spacing: { before: 40, after: 80 } }));
    for (const q of topQuickWins) {
      children.push(bulletParagraph(q, COLOR_GREEN));
    }
  }

  // ── Sector Benchmark ────────────────────────────────────────────────────
  if (benchmarkData) {
    children.push(headingParagraph('Sector Benchmark Comparison', HeadingLevel.HEADING_2));
    const bSectorName = benchmarkData.sector.charAt(0).toUpperCase() + benchmarkData.sector.slice(1);
    const dataSourceNote = benchmarkData.pillars.some(p => p.isRealData)
      ? 'Benchmark data includes real consented assessment data combined with research-based estimates.'
      : 'Benchmark data is based on research-based estimates from McKinsey, Gartner, and WEF AI Readiness Index.';
    children.push(bodyParagraph(`Your pillar scores compared to the ${bSectorName} sector average. ${dataSourceNote}`, { color: COLOR_TEXT_SECONDARY, size: 20, spacing: { before: 40, after: 120 } }));

    const bHeaderRow = new TableRow({
      children: [
        makeHeaderCell('Pillar', 2800),
        makeHeaderCell('Your Score', 1600),
        makeHeaderCell('Sector Avg', 1600),
        makeHeaderCell('Difference', 1600),
        makeHeaderCell('Data Source', 1800),
      ],
      tableHeader: true,
    });

    const bRows = pillarScores.map((ps, idx) => {
      const bp = benchmarkData.pillars.find(p => p.pillarId === ps.pillarId);
      const sectorAvg = bp ? Math.round(bp.avgScore) : null;
      const diff = sectorAvg !== null ? Math.round(ps.normalizedScore - bp!.avgScore) : null;
      const diffColor = diff !== null ? (diff >= 0 ? COLOR_GREEN : COLOR_RED) : COLOR_TEXT_SECONDARY;
      const diffText = diff !== null ? (diff >= 0 ? `+${diff}%` : `${diff}%`) : 'N/A';
      const source = bp ? (bp.isRealData ? `Real (n=${bp.sampleSize})` : 'Estimated') : 'N/A';

      return new TableRow({
        children: [
          makeCell(ps.pillarName, { bold: true, color: getPillarColor(ps.pillarId), width: 2800, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
          makeCell(`${Math.round(ps.normalizedScore)}%`, { bold: true, alignment: AlignmentType.CENTER, width: 1600, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
          makeCell(sectorAvg !== null ? `${sectorAvg}%` : 'N/A', { alignment: AlignmentType.CENTER, width: 1600, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
          makeCell(diffText, { bold: true, alignment: AlignmentType.CENTER, color: diffColor, width: 1600, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
          makeCell(source, { alignment: AlignmentType.CENTER, color: COLOR_TEXT_SECONDARY, size: 18, width: 1800, shading: idx % 2 === 1 ? BG_ROW_ALT : undefined }),
        ],
        cantSplit: true,
      });
    });

    // Overall row
    if (benchmarkData.overall) {
      const overallDiff = Math.round(overallScore - benchmarkData.overall.avgScore);
      const overallDiffColor = overallDiff >= 0 ? COLOR_GREEN : COLOR_RED;
      bRows.push(new TableRow({
        children: [
          makeCell('Overall', { bold: true, color: COLOR_BLUE, width: 2800, shading: BG_BLUE_LIGHT }),
          makeCell(`${Math.round(overallScore)}%`, { bold: true, alignment: AlignmentType.CENTER, width: 1600, shading: BG_BLUE_LIGHT }),
          makeCell(`${Math.round(benchmarkData.overall.avgScore)}%`, { alignment: AlignmentType.CENTER, width: 1600, shading: BG_BLUE_LIGHT }),
          makeCell(`${overallDiff >= 0 ? '+' : ''}${overallDiff}%`, { bold: true, alignment: AlignmentType.CENTER, color: overallDiffColor, width: 1600, shading: BG_BLUE_LIGHT }),
          makeCell(benchmarkData.overall.isRealData ? `Real (n=${benchmarkData.overall.sampleSize})` : 'Estimated', { alignment: AlignmentType.CENTER, color: COLOR_TEXT_SECONDARY, width: 1800, shading: BG_BLUE_LIGHT }),
        ],
        cantSplit: true,
      }));
    }

    children.push(new Table({
      rows: [bHeaderRow, ...bRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: thinBorder(BORDER_MEDIUM), bottom: thinBorder(BORDER_MEDIUM), left: thinBorder(BORDER_MEDIUM), right: thinBorder(BORDER_MEDIUM), insideHorizontal: thinBorder(BORDER_LIGHT), insideVertical: thinBorder(BORDER_LIGHT) },
      layout: TableLayoutType.FIXED,
    }));
  }

  // ── Methodology + Confidentiality ───────────────────────────────────────
  children.push(divider());
  children.push(headingParagraph('Methodology', HeadingLevel.HEADING_2));
  children.push(bodyParagraph(`This pulse report is generated using the E-ARI 8-pillar AI Readiness Framework. Scores reflect the most recent assessment with comparison to your prior results where available. Maturity bands: Laggard (0-25%), Follower (26-50%), Chaser (51-75%), Pacesetter (76-100%).`, { color: COLOR_TEXT_SECONDARY, size: 18, spacing: { before: 40, after: 80 } }));

  children.push(...buildConfidentialitySection(organization));

  // ─── Assemble Document ──────────────────────────────────────────────────
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT_BODY, size: 22, color: COLOR_TEXT },
        },
        heading1: {
          run: { font: FONT_HEADING, size: 32, bold: true, color: COLOR_PRIMARY },
        },
        heading2: {
          run: { font: FONT_HEADING, size: 26, bold: true, color: COLOR_PRIMARY },
        },
      },
    },
    sections: [{
      properties: {
        page: { margin: PAGE_MARGINS },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [
              new TextRun({ text: 'E-ARI  |  ', font: FONT_HEADING, size: 16, color: COLOR_BLUE }),
              new TextRun({ text: 'AI Pulse Report', font: FONT_BODY, size: 16, color: COLOR_TEXT_SECONDARY }),
              new TextRun({ text: `  |  ${organization}  |  ${monthLabel}`, font: FONT_BODY, size: 16, color: COLOR_TEXT_SECONDARY }),
            ],
            alignment: AlignmentType.RIGHT,
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: 'CONFIDENTIAL  |  E-ARI  |  Page ', font: FONT_BODY, size: 14, color: COLOR_TEXT_SECONDARY }),
              new TextRun({ children: [PageNumber.CURRENT], font: FONT_BODY, size: 14, color: COLOR_TEXT_SECONDARY }),
            ],
            alignment: AlignmentType.CENTER,
          })],
        }),
      },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
