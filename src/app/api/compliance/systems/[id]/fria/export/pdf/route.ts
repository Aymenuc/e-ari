import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { findComplianceSystem } from "@/lib/compliance/access";
import { buildFriaPdfBuffer } from "@/lib/compliance/compliance-pdf";

/** GET /api/compliance/systems/[id]/fria/export/pdf */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: systemId } = await ctx.params;
    const sys = await findComplianceSystem(systemId, session.user.id, session.user.role);
    if (!sys) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const fria = await db.fRIA.findUnique({ where: { systemId } });
    if (!fria) {
      return NextResponse.json({ error: "Generate FRIA first" }, { status: 400 });
    }

    const friaJson = {
      affectedGroups: fria.affectedGroups,
      rightsAtRisk: fria.rightsAtRisk,
      mitigations: fria.mitigations,
      residualRisk: fria.residualRisk,
      oversightDesign: fria.oversightDesign,
      status: fria.status,
    };

    const buf = await buildFriaPdfBuffer({
      systemName: sys.name,
      friaJson,
      status: fria.status,
    });

    const filename = `FRIA-${systemId.slice(0, 8)}.pdf`;
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("fria export pdf:", e);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
