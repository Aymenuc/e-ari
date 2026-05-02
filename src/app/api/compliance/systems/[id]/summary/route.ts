import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { findComplianceSystem } from "@/lib/compliance/access";

/** GET /api/compliance/systems/[id]/summary — lightweight counts for step rail */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await ctx.params;
    const sys = await findComplianceSystem(id, session.user.id, session.user.role);
    if (!sys) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [evidenceCount, openGaps, fria, tf] = await Promise.all([
      db.evidence.count({ where: { systemId: id } }),
      db.obligationGap.count({ where: { systemId: id, status: "open" } }),
      db.fRIA.findUnique({
        where: { systemId: id },
        select: { status: true },
      }),
      db.technicalFile.findUnique({
        where: { systemId: id },
        select: { status: true },
      }),
    ]);

    return NextResponse.json({
      evidenceCount,
      openGaps,
      friaStatus: fria?.status ?? null,
      technicalFileStatus: tf?.status ?? null,
    });
  } catch (e) {
    console.error("system summary:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
