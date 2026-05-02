import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findComplianceSystem } from "@/lib/compliance/access";
import { buildSubmissionPackZip, SubmissionPackError } from "@/lib/compliance/submission-pack";
import { checkRateLimit, getRateLimitHeaders, resolveIdentifier } from "@/lib/rate-limit";

/** GET — ZIP regulator pack (manifest + JSON + CSV + DOCX); requires finalized FRIA & technical file */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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

    try {
      const { zipBuffer } = await buildSubmissionPackZip(systemId, sys.userId);
      const filename = `e-ari-submission-pack-${systemId.slice(0, 8)}.zip`;
      return new NextResponse(new Uint8Array(zipBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } catch (e) {
      if (e instanceof SubmissionPackError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }
  } catch (e) {
    console.error("submission-pack:", e);
    return NextResponse.json({ error: "Pack build failed" }, { status: 500 });
  }
}
