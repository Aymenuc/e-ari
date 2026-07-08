import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGrowthOrAbove } from "@/lib/tier";
import { TRAINING_MODULES, MODULE_CONTENT_VERSION, getTrainingModule } from "@/lib/training-modules";

/**
 * GET /api/literacy/article4-report — Article 4 (EU AI Act) evidence report.
 * .docx with roster, completion status, quiz scores, and tamper-evident
 * attestation hashes. Growth+ (org-wide reporting is an Autopilot selling
 * point, but Growth gets it for up to its 25-member cap).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { tier: true, organization: true, name: true },
    });
    if (!isGrowthOrAbove(user?.tier)) {
      return NextResponse.json({ error: "Article 4 report export requires Growth, Autopilot, or Enterprise.", upgradeRequired: true }, { status: 402 });
    }

    const members = await db.teamMember.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
      include: { completions: true },
    });
    const assignments = await db.trainingAssignment.findMany({ where: { userId: session.user.id } });

    const docx = await import("docx");
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, BorderStyle, AlignmentType } = docx;

    const orgName = user?.organization || user?.name || "Organisation";
    const now = new Date();
    const border = { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" };
    const borders = { top: border, bottom: border, left: border, right: border };
    const cell = (text: string, bold = false) =>
      new TableCell({
        borders,
        margins: { top: 40, bottom: 40, left: 100, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text, bold, size: 18, font: "Inter" })] })],
      });

    const rows: InstanceType<typeof TableRow>[] = [
      new TableRow({ tableHeader: true, children: ["Member", "Module", "Status", "Score", "Completed", "Attestation (SHA-256, first 16)"].map((h) => cell(h, true)) }),
    ];
    let done = 0;
    let total = 0;
    for (const m of members) {
      const memberModules = assignments.filter((a) => a.memberId === m.id).map((a) => a.moduleId);
      for (const moduleId of memberModules) {
        total++;
        const mod = getTrainingModule(moduleId);
        const comp = m.completions.find((c) => c.moduleId === moduleId);
        if (comp) done++;
        rows.push(new TableRow({ children: [
          cell(`${m.name} <${m.email}>`),
          cell(mod?.title ?? moduleId),
          cell(comp ? "Completed" : "Pending"),
          cell(comp?.quizScore != null ? `${Math.round(comp.quizScore)}%` : "—"),
          cell(comp ? comp.completedAt.toISOString().slice(0, 10) : "—"),
          cell(comp ? comp.attestationHash.slice(0, 16) : "—"),
        ] }));
      }
    }

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: "AI Literacy Training — Article 4 Evidence Report", bold: true, size: 40, font: "Inter" })] }),
          new Paragraph({ children: [new TextRun({ text: `${orgName} · Generated ${now.toISOString().slice(0, 10)} · Content version ${MODULE_CONTENT_VERSION}`, size: 20, color: "64748B", font: "Inter" })], spacing: { after: 200 } }),
          new Paragraph({ children: [new TextRun({ text:
            `This report documents AI literacy training completions recorded on the E-ARI platform in support of the organisation's obligations under Article 4 of Regulation (EU) 2024/1689 (the EU AI Act), applicable since 2 February 2025. ` +
            `Completion coverage: ${done} of ${total} assigned module completions (${total > 0 ? Math.round((done / total) * 100) : 0}%). ` +
            `Each completion carries a SHA-256 attestation hash binding the member, module, timestamp, and training-content version; full hashes are retrievable from the platform for verification.`,
            size: 20, font: "Inter" })], spacing: { after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: `Curriculum: ${TRAINING_MODULES.map((m) => `${m.title} (${m.minutes} min)`).join(" · ")}`, size: 18, color: "475569", font: "Inter" })], spacing: { after: 240 } }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300 }, children: [new TextRun({ text: "This document records training evidence. It does not by itself constitute a determination of legal compliance.", size: 16, italics: true, color: "94A3B8", font: "Inter" })] }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="E-ARI-Article4-Report-${now.toISOString().slice(0, 10)}.docx"`,
      },
    });
  } catch (e) {
    console.error("article4-report:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
