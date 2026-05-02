/**
 * Lightweight PDF builders for compliance exports (FRIA, technical file summary).
 * Uses ASCII-safe drawing where needed for Helvetica compatibility.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 48;
const FOOTER_Y = 36;

/** Strip problematic unicode for StandardFonts Helvetica (Latin subset). */
function asciiSafe(s: string): string {
  return s.replace(/[^\x09\x0a\x0d\x20-\x7E]/g, "?");
}

function wrapWords(line: string, maxChars: number): string[] {
  const words = line.split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!w) continue;
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) cur = next;
    else {
      if (cur) out.push(cur);
      if (w.length > maxChars) {
        for (let i = 0; i < w.length; i += maxChars) {
          out.push(w.slice(i, i + maxChars));
        }
        cur = "";
      } else cur = w;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function wrapBlock(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  for (const raw of text.split("\n")) {
    if (!raw) {
      lines.push("");
      continue;
    }
    lines.push(...wrapWords(raw, maxChars));
  }
  return lines;
}

type TextBlock = { title?: string; body: string };

async function drawDocument(
  blocks: TextBlock[],
  meta: { title: string; subtitle?: string; footerRight?: string },
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;
  const bodySize = 10;
  const lineH = bodySize + 3;
  const maxChars = 88;
  const MAX_DRAW = 380;

  const needBreak = (floor: number) => y < floor;

  const breakPage = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  const drawFooter = () => {
    page.drawText("E-ARI — compliance export (draft for review)", {
      x: MARGIN,
      y: FOOTER_Y,
      size: 8,
      font,
      color: rgb(0.42, 0.44, 0.48),
    });
    if (meta.footerRight) {
      const fr = asciiSafe(meta.footerRight).slice(0, 120);
      page.drawText(fr, {
        x: PAGE_W - MARGIN - font.widthOfTextAtSize(fr, 8),
        y: FOOTER_Y,
        size: 8,
        font,
        color: rgb(0.42, 0.44, 0.48),
      });
    }
  };

  const writeLines = (textLines: string[], size: number, bold: boolean) => {
    const f = bold ? fontBold : font;
    for (const raw of textLines) {
      let line = asciiSafe(raw);
      if (line.length === 0) {
        if (needBreak(MARGIN + 72)) {
          drawFooter();
          breakPage();
        }
        y -= lineH;
        continue;
      }
      while (line.length > 0) {
        if (needBreak(MARGIN + 72)) {
          drawFooter();
          breakPage();
        }
        const piece = line.slice(0, MAX_DRAW);
        line = line.slice(MAX_DRAW);
        page.drawText(piece, {
          x: MARGIN,
          y,
          size,
          font: f,
          color: rgb(0.1, 0.12, 0.15),
        });
        y -= lineH;
      }
    }
  };

  writeLines(wrapWords(meta.title, maxChars), 16, true);
  y -= 6;
  if (meta.subtitle) {
    writeLines(wrapWords(meta.subtitle, maxChars), 11, false);
    y -= 8;
  }

  for (const b of blocks) {
    if (b.title) {
      y -= 6;
      if (needBreak(MARGIN + 96)) {
        drawFooter();
        breakPage();
      }
      writeLines(wrapWords(b.title, maxChars), 12, true);
      y -= 4;
    }
    writeLines(wrapBlock(b.body, maxChars), bodySize, false);
    y -= 10;
  }

  drawFooter();
  return pdf.save();
}

export async function buildFriaPdfBuffer(params: {
  systemName: string;
  friaJson: unknown;
  status: string;
}): Promise<Buffer> {
  const body =
    typeof params.friaJson === "string"
      ? params.friaJson
      : JSON.stringify(params.friaJson, null, 2);
  const bytes = await drawDocument(
    [{ title: "FRIA JSON (structured content)", body }],
    {
      title: "FRIA export",
      subtitle: `System: ${params.systemName} | Status: ${params.status}`,
      footerRight: `Generated ${new Date().toISOString().slice(0, 10)}`,
    },
  );
  return Buffer.from(bytes);
}

export async function buildTechnicalFilePdfBuffer(params: {
  systemName: string;
  tfJson: unknown;
  status: string;
}): Promise<Buffer> {
  const body =
    typeof params.tfJson === "string"
      ? params.tfJson
      : JSON.stringify(params.tfJson, null, 2);
  const bytes = await drawDocument(
    [{ title: "Technical file summary (JSON)", body }],
    {
      title: "Technical file export",
      subtitle: `System: ${params.systemName} | Status: ${params.status}`,
      footerRight: `Generated ${new Date().toISOString().slice(0, 10)}`,
    },
  );
  return Buffer.from(bytes);
}
