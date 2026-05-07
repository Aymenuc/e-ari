import { NextResponse } from "next/server";
import { PILLARS } from "@/lib/pillars";
import { verifyAdmin } from "@/lib/verify-admin";

// GET /api/report-diagnostic — Test report generation without database dependency
// ADMIN-ONLY. Previously this endpoint was wide open to the public internet,
// which meant anyone could (a) generate an expensive DOCX on every call, and
// (b) read full stack traces with internal paths from the error responses.
// Both are acceptable when scoped to admins; neither is acceptable publicly.
export async function GET() {
  const adminCheck = await verifyAdmin();
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: adminCheck.message }, { status: adminCheck.status });
  }

  const diagTag = `[DIAG:${Date.now()}]`;

  try {
    console.log(`${diagTag} Report diagnostic started`);

    // Step 1: Test docx import
    let Document, Packer, Paragraph, TextRun, HeadingLevel, Header, Footer, PageNumber,
      Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ShadingType,
      convertInchesToTwip, TableLayoutType, VerticalAlign;
    try {
      const docx = await import('docx');
      Document = docx.Document;
      Packer = docx.Packer;
      Paragraph = docx.Paragraph;
      TextRun = docx.TextRun;
      HeadingLevel = docx.HeadingLevel;
      Header = docx.Header;
      Footer = docx.Footer;
      PageNumber = docx.PageNumber;
      Table = docx.Table;
      TableRow = docx.TableRow;
      TableCell = docx.TableCell;
      WidthType = docx.WidthType;
      AlignmentType = docx.AlignmentType;
      BorderStyle = docx.BorderStyle;
      ShadingType = docx.ShadingType;
      convertInchesToTwip = docx.convertInchesToTwip;
      TableLayoutType = docx.TableLayoutType;
      VerticalAlign = docx.VerticalAlign;
      console.log(`${diagTag} docx import OK`);
    } catch (importErr) {
      console.error(`${diagTag} docx import FAILED:`, importErr);
      return NextResponse.json({
        step: 'import',
        error: `docx import failed: ${importErr instanceof Error ? importErr.message : String(importErr)}`,
      }, { status: 500 });
    }

    // Step 2: Generate a full DOCX with tables (similar to the actual report)
    try {
      const FONT_HEADING = 'Space Grotesk';
      const FONT_BODY = 'Inter';
      const COLOR_PRIMARY = '1A1A2E';
      const COLOR_TEXT = '2D3748';
      const COLOR_BLUE = '2563EB';
      const COLOR_WHITE = 'FFFFFF';
      const BG_HEADER = '1E293B';
      const BORDER_LIGHT = 'E2E8F0';
      const BORDER_MEDIUM = 'CBD5E1';

      const cellMargins = { top: 60, bottom: 60, left: 120, right: 120 };

      function thinBorder(color: string = BORDER_LIGHT) {
        return { style: BorderStyle.SINGLE, size: 1, color };
      }
      function allBorders(color: string = BORDER_LIGHT) {
        return { top: thinBorder(color), bottom: thinBorder(color), left: thinBorder(color), right: thinBorder(color) };
      }

      const pillarRows = PILLARS.map((p, idx) => {
        return new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: p.name, font: FONT_BODY, size: 20, bold: true, color: p.color || COLOR_BLUE })],
                spacing: { before: 40, after: 40 },
              })],
              margins: cellMargins,
              shading: idx % 2 === 1 ? { type: ShadingType.CLEAR, fill: 'F8FAFC', color: 'auto' } : undefined,
              borders: allBorders(BORDER_LIGHT),
              verticalAlign: VerticalAlign.CENTER,
              width: { size: 4000, type: WidthType.DXA },
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: `${30 + Math.floor(Math.random() * 50)}%`, font: FONT_BODY, size: 20, bold: true, color: COLOR_PRIMARY })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 40 },
              })],
              margins: cellMargins,
              borders: allBorders(BORDER_LIGHT),
              verticalAlign: VerticalAlign.CENTER,
              width: { size: 2000, type: WidthType.DXA },
            }),
          ],
          cantSplit: true,
        });
      });

      const doc = new Document({
        styles: {
          default: {
            document: { run: { font: FONT_BODY, size: 22, color: COLOR_TEXT } },
            heading1: { run: { font: FONT_HEADING, size: 32, bold: true, color: COLOR_PRIMARY } },
            heading2: { run: { font: FONT_HEADING, size: 26, bold: true, color: COLOR_PRIMARY } },
          },
        },
        sections: [{
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(0.8),
                bottom: convertInchesToTwip(0.8),
                left: convertInchesToTwip(0.9),
                right: convertInchesToTwip(0.9),
              },
            },
          },
          headers: {
            default: new Header({
              children: [new Paragraph({
                children: [
                  new TextRun({ text: 'E-ARI  |  ', font: FONT_HEADING, size: 16, color: COLOR_BLUE }),
                  new TextRun({ text: 'Diagnostic Test', font: FONT_BODY, size: 16, color: '64748B' }),
                ],
                alignment: AlignmentType.RIGHT,
              })],
            }),
          },
          footers: {
            default: new Footer({
              children: [new Paragraph({
                children: [
                  new TextRun({ text: 'E-ARI  |  Page ', font: FONT_BODY, size: 14, color: '64748B' }),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT_BODY, size: 14, color: '64748B' }),
                ],
                alignment: AlignmentType.CENTER,
              })],
            }),
          },
          children: [
            new Paragraph({ spacing: { before: 1200 }, children: [] }),
            new Paragraph({
              children: [new TextRun({ text: 'E-ARI', font: FONT_HEADING, size: 64, bold: true, color: COLOR_BLUE })],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [new TextRun({ text: 'Report Generation Diagnostic', font: FONT_HEADING, size: 36, color: COLOR_PRIMARY })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [new TextRun({ text: `Generated: ${new Date().toISOString()}`, font: FONT_BODY, size: 22, color: '64748B' })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 80 },
            }),
            new Paragraph({
              children: [new TextRun({ text: `Pillars loaded: ${PILLARS.length}`, font: FONT_BODY, size: 22, color: '64748B' })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            // Pillar table
            new Paragraph({
              children: [new TextRun({ text: 'Pillar Scores', font: FONT_HEADING, size: 26, bold: true, color: COLOR_PRIMARY })],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 240, after: 120 },
              keepNext: true,
            }),
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: 'Pillar', font: FONT_BODY, size: 18, bold: true, color: COLOR_WHITE })],
                        spacing: { before: 40, after: 40 },
                      })],
                      margins: cellMargins,
                      shading: { type: ShadingType.CLEAR, fill: BG_HEADER, color: 'auto' },
                      borders: allBorders(BORDER_LIGHT),
                      verticalAlign: VerticalAlign.CENTER,
                      width: { size: 4000, type: WidthType.DXA },
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: 'Score', font: FONT_BODY, size: 18, bold: true, color: COLOR_WHITE })],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 40, after: 40 },
                      })],
                      margins: cellMargins,
                      shading: { type: ShadingType.CLEAR, fill: BG_HEADER, color: 'auto' },
                      borders: allBorders(BORDER_LIGHT),
                      verticalAlign: VerticalAlign.CENTER,
                      width: { size: 2000, type: WidthType.DXA },
                    }),
                  ],
                  tableHeader: true,
                }),
                ...pillarRows,
              ],
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: thinBorder(BORDER_MEDIUM),
                bottom: thinBorder(BORDER_MEDIUM),
                left: thinBorder(BORDER_MEDIUM),
                right: thinBorder(BORDER_MEDIUM),
                insideHorizontal: thinBorder(BORDER_LIGHT),
                insideVertical: thinBorder(BORDER_LIGHT),
              },
              layout: TableLayoutType.FIXED,
            }),
          ],
        }],
      });

      const buffer = await Packer.toBuffer(doc);
      console.log(`${diagTag} DOCX generated OK, buffer size: ${buffer.length}`);

      const headers = new Headers();
      headers.set("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      headers.set("Content-Disposition", "attachment; filename=\"E-ARI-Diagnostic.docx\"");
      headers.set("Content-Length", String(buffer.length));

      return new NextResponse(new Uint8Array(buffer), { headers, status: 200 });
    } catch (docxErr) {
      console.error(`${diagTag} DOCX generation FAILED:`, docxErr);
      return NextResponse.json({
        step: 'docx_generation',
        error: `Packer.toBuffer failed: ${docxErr instanceof Error ? docxErr.message : String(docxErr)}`,
        stack: docxErr instanceof Error ? docxErr.stack : undefined,
      }, { status: 500 });
    }
  } catch (error) {
    console.error(`${diagTag} Unhandled diagnostic error:`, error);
    return NextResponse.json({
      step: 'unknown',
      error: `Diagnostic failed: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
