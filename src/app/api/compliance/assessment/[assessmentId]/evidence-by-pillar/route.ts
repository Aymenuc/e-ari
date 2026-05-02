import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Aggregates EvidenceClause counts per readiness pillar for all AISystems
 * linked to an assessment (same owner).
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ assessmentId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { assessmentId } = await ctx.params;

    const assessment = await db.assessment.findFirst({
      where: { id: assessmentId, userId: session.user.id },
      select: { id: true },
    });
    if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const systems = await db.aISystem.findMany({
      where: { assessmentId, userId: session.user.id },
      select: { id: true, name: true },
    });

    if (systems.length === 0) {
      return NextResponse.json({ pillarCounts: {}, systems: [] });
    }

    const ids = systems.map((s) => s.id);
    const clauses = await db.evidenceClause.findMany({
      where: { evidence: { systemId: { in: ids } } },
      select: { pillarIds: true },
      take: 5000,
    });

    const pillarCounts: Record<string, number> = {};
    for (const row of clauses) {
      for (const p of row.pillarIds) {
        pillarCounts[p] = (pillarCounts[p] ?? 0) + 1;
      }
    }

    return NextResponse.json({ pillarCounts, systems });
  } catch (e) {
    console.error("evidence-by-pillar:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
