import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { runEvidenceExtractionPipeline } from "@/lib/compliance/clause-pipeline";
import { findEvidenceForSession } from "@/lib/compliance/access";
import { checkRateLimit, getRateLimitHeaders, resolveIdentifier } from "@/lib/rate-limit";

/** POST /api/compliance/systems/[id]/evidence/[eid]/extract — text + clauses */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; eid: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const identifier = resolveIdentifier(session.user.id, req);
    const rateResult = checkRateLimit("compliance_generate", identifier);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: "Generation rate limit exceeded.", retryAfter: rateResult.retryAfter },
        { status: 429, headers: getRateLimitHeaders("compliance_generate", rateResult) },
      );
    }
    const { id: systemId, eid } = await ctx.params;
    const row = await findEvidenceForSession(systemId, eid, session.user.id, session.user.role);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const out = await runEvidenceExtractionPipeline(eid);
    const evidence = await db.evidence.findUnique({ where: { id: eid } });
    const clauseCount = await db.evidenceClause.count({ where: { evidenceId: eid } });

    return NextResponse.json({
      clausesCreated: out.clausesCreated,
      clauseCount,
      textLen: out.textLen,
      extractionStatus: evidence?.extractionStatus,
    });
  } catch (e) {
    console.error("extract:", e);
    const msg = e instanceof Error ? e.message : "Extract failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
