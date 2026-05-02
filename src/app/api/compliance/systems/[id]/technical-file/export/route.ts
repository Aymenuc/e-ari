import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { findComplianceSystem } from "@/lib/compliance/access";
import { buildTechnicalFileSummaryDocxBuffer } from "@/lib/compliance/compliance-docx";

/** GET /api/compliance/systems/[id]/technical-file/export */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: systemId } = await ctx.params;
    const sys = await findComplianceSystem(systemId, session.user.id, session.user.role);
    if (!sys) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const tf = await db.technicalFile.findUnique({ where: { systemId } });
    if (!tf) {
      return NextResponse.json({ error: "Generate technical file first" }, { status: 400 });
    }

    const technical = {
      systemDescription: tf.systemDescription,
      designSpecs: tf.designSpecs,
      dataGovernance: tf.dataGovernance,
      monitoringPlan: tf.monitoringPlan,
      riskManagement: tf.riskManagement,
      performanceMetrics: tf.performanceMetrics,
      instructionsForUse: tf.instructionsForUse,
      euDeclaration: tf.euDeclaration,
      status: tf.status,
    };

    const buf = await buildTechnicalFileSummaryDocxBuffer({
      systemName: sys.name,
      technical,
    });

    const filename = `TechnicalFile-${systemId.slice(0, 8)}.docx`;
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("technical export:", e);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
