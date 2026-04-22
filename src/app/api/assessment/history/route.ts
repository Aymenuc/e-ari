import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/assessment/history — Chronological list of completed assessments for trend analysis
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assessments = await db.assessment.findMany({
      where: {
        userId: session.user.id,
        status: "completed",
      },
      orderBy: { completedAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        completedAt: true,
        overallScore: true,
        maturityBand: true,
        pillarScores: true,
        sector: true,
        isPulse: true,
        pulseMonth: true,
        previousAssessmentId: true,
        scoringVersion: true,
      },
    });

    // Parse pillarScores JSON for each assessment
    const parsed = assessments.map(a => ({
      ...a,
      pillarScores: a.pillarScores ? JSON.parse(a.pillarScores) : null,
    }));

    return NextResponse.json({
      assessments: parsed,
      total: parsed.length,
    });
  } catch (error) {
    console.error("Assessment history GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
