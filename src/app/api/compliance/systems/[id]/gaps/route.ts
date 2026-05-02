import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { regenerateObligationGaps } from "@/lib/compliance/gap-radar";
import { sendComplianceGapCriticalEmail } from "@/lib/email-service";
import { findComplianceSystem } from "@/lib/compliance/access";
import { checkRateLimit, getRateLimitHeaders, resolveIdentifier } from "@/lib/rate-limit";

/** GET /api/compliance/systems/[id]/gaps */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: systemId } = await ctx.params;
    const sys = await findComplianceSystem(systemId, session.user.id, session.user.role);
    if (!sys) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const gaps = await db.obligationGap.findMany({
      where: { systemId },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(gaps);
  } catch (e) {
    console.error("gaps GET:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST /api/compliance/systems/[id]/gaps — regenerate */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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
    const { id: systemId } = await ctx.params;
    const sys = await findComplianceSystem(systemId, session.user.id, session.user.role);
    if (!sys) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const n = await regenerateObligationGaps(systemId);
    const gaps = await db.obligationGap.findMany({ where: { systemId } });
    const critical = gaps.filter((g) => g.severity === "critical");

    if (critical.length > 0) {
      try {
        await db.notification.create({
          data: {
            userId: session.user.id,
            type: "gap_critical",
            title: "Critical compliance gaps detected",
            message: `${critical.length} critical gap(s) for ${sys.name}.`,
            actionUrl: `/portal/use-cases/systems/${systemId}/gaps`,
          },
        });
      } catch {}
      void sendComplianceGapCriticalEmail(
        session.user.id,
        session.user.email || "",
        session.user.name,
        sys.name,
        critical.length
      ).catch(() => {});
    }

    return NextResponse.json({ regenerated: n, gaps });
  } catch (e) {
    console.error("gaps POST:", e);
    const msg = e instanceof Error ? e.message : "Gap radar failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
