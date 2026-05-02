import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { findComplianceSystem } from "@/lib/compliance/access";
import {
  assertSubmissionPackPreflight,
  buildSubmissionPack,
  SubmissionPackError,
} from "@/lib/compliance/submission-pack";

/** GET /api/compliance/systems/[id]/submission — JSON bundle (same preflight as ZIP pack) */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: systemId } = await ctx.params;
    const sys = await findComplianceSystem(systemId, session.user.id, session.user.role);
    if (!sys) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const full = await db.aISystem.findFirst({
      where: { id: systemId },
      include: { fria: true, technicalFile: true },
    });
    if (!full) return NextResponse.json({ error: "Not found" }, { status: 404 });

    try {
      assertSubmissionPackPreflight(full);
    } catch (e) {
      if (e instanceof SubmissionPackError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }

    const pack = await buildSubmissionPack(systemId, sys.userId);
    const body = JSON.stringify(pack, null, 2);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="e-ari-compliance-pack-${systemId.slice(0, 8)}.json"`,
      },
    });
  } catch (e) {
    console.error("submission:", e);
    return NextResponse.json({ error: "Pack build failed" }, { status: 500 });
  }
}
