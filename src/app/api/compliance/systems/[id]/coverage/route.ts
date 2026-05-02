import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { AI_ACT_OBLIGATIONS } from "@/lib/compliance/ai-act-obligations";
import { findComplianceSystem } from "@/lib/compliance/access";

/** GET — obligation catalogue rows with citation counts for coverage matrix */
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
      select: { aiActArticles: true },
      take: 2000,
    });

    const counts = new Map<string, number>();
    for (const c of clauses) {
      for (const code of c.aiActArticles) {
        counts.set(code, (counts.get(code) ?? 0) + 1);
      }
    }

    const rows = AI_ACT_OBLIGATIONS.map((o) => ({
      code: o.code,
      label: o.label,
      severity: o.severity,
      citationCount: counts.get(o.code) ?? 0,
    }));

    return NextResponse.json({ rows });
  } catch (e) {
    console.error("coverage GET:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
