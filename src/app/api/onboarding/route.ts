import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveWorkspace } from "@/lib/workspace";

/**
 * GET /api/onboarding — derived getting-started state for the workspace.
 * No stored step flags: every step is computed from what actually exists,
 * so the checklist can never drift from reality.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ws = await resolveWorkspace(session.user.id);

    const [assessments, discovered, systems, classified, evidence, seats, training] = await Promise.all([
      db.assessment.count({ where: { userId: ws.ownerId, status: "completed", isPulse: false } }),
      db.discoveredTool.count({ where: { userId: ws.ownerId } }),
      db.aISystem.count({ where: { userId: ws.ownerId } }),
      db.aISystem.count({ where: { userId: ws.ownerId, classifiedAt: { not: null } } }),
      db.evidence.count({ where: { userId: ws.ownerId } }),
      db.orgMembership.count({ where: { ownerId: ws.ownerId, status: { in: ["invited", "active"] } } }),
      db.trainingAssignment.count({ where: { userId: ws.ownerId } }),
    ]);

    return NextResponse.json({
      steps: {
        assessment: assessments > 0,
        discovery: discovered > 0,
        registry: systems > 0,
        classification: classified > 0,
        evidence: evidence > 0,
        team: seats > 0,
        training: training > 0,
      },
    });
  } catch (e) {
    console.error("onboarding GET:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
