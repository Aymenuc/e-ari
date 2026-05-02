import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { classifyAISystem } from "@/lib/compliance/classifier";
import { sendComplianceClassificationEmail } from "@/lib/email-service";
import { findComplianceSystem } from "@/lib/compliance/access";
import { checkRateLimit, getRateLimitHeaders, resolveIdentifier } from "@/lib/rate-limit";

/** POST /api/compliance/systems/[id]/classify — AI Act risk tier */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const identifier = resolveIdentifier(session.user.id, req);
    const rateResult = checkRateLimit("compliance_classify", identifier);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: "Classification rate limit exceeded.", retryAfter: rateResult.retryAfter },
        { status: 429, headers: getRateLimitHeaders("compliance_classify", rateResult) },
      );
    }

    const { id } = await ctx.params;
    const system = await findComplianceSystem(id, session.user.id, session.user.role);
    if (!system) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const evidence = await db.evidence.findMany({
      where: { systemId: id },
      select: { filename: true, artifactType: true, extractedText: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    });

    const result = await classifyAISystem(system, evidence);

    const cited = result.citedArticles.length ? `\nArticles referenced: ${result.citedArticles.join(", ")}` : "";

    const updated = await db.aISystem.update({
      where: { id },
      data: {
        riskTier: result.riskTier,
        riskRationale: `${result.riskRationale}${cited}`,
        classifiedAt: new Date(),
      },
    });

    try {
      await db.notification.create({
        data: {
          userId: session.user.id,
          type: "system_classified",
          title: "AI system classified",
          message: `${system.name}: risk tier ${result.riskTier}.`,
          actionUrl: `/portal/use-cases/systems/${id}`,
        },
      });
    } catch {}

    void sendComplianceClassificationEmail(
      session.user.id,
      session.user.email || "",
      session.user.name,
      system.name,
      result.riskTier
    ).catch(() => {});

    return NextResponse.json({ system: updated, classification: result });
  } catch (e) {
    console.error("classify:", e);
    const msg = e instanceof Error ? e.message : "Classification failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
