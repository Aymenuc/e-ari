import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveWorkspace, canWrite } from "@/lib/workspace";
import { getComplianceOutlookForAssessment } from "@/lib/compliance-outlook";

/** GET /api/compliance/outlook?assessmentId=… */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const ws = await resolveWorkspace(session.user.id);
    const assessmentId = req.nextUrl.searchParams.get("assessmentId");
    if (!assessmentId?.trim()) {
      return NextResponse.json({ error: "assessmentId required" }, { status: 400 });
    }
    const outlook = await getComplianceOutlookForAssessment(
      ws.ownerId,
      assessmentId.trim(),
    );
    if (!outlook) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(outlook);
  } catch (e) {
    console.error("compliance/outlook:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
