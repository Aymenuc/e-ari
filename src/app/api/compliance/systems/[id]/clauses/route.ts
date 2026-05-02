import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { findComplianceSystem } from "@/lib/compliance/access";

/** GET — all EvidenceClause rows for systems owned by user */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: systemId } = await ctx.params;
    const sys = await findComplianceSystem(systemId, session.user.id, session.user.role);
    if (!sys) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const clauses = await db.evidenceClause.findMany({
      where: { evidence: { systemId } },
      include: {
        evidence: { select: { id: true, filename: true, mimeType: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 500,
    });

    return NextResponse.json({ clauses });
  } catch (e) {
    console.error("clauses GET:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
