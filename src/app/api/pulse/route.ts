import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { deriveStoredPulseOverallMetrics, runPulse, savePulseRun } from "@/lib/pulse-engine";
import { checkRateLimitFromRequest } from "@/lib/rate-limit";

// GET /api/pulse?month=2026-04 — Returns user's pulse history
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");

    const where: { userId: string; month?: string } = { userId: session.user.id };
    if (month) {
      where.month = month;
    }

    const pulseRuns = await db.pulseRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Parse JSON fields for response and hydrate metrics not stored on PulseRun rows
    const parsed = pulseRuns.map((run) => {
      const pillarScores = JSON.parse(run.pillarScores) as Parameters<
        typeof deriveStoredPulseOverallMetrics
      >[0]["pillarScores"];
      const scoreChanges = JSON.parse(run.scoreChanges) as Parameters<
        typeof deriveStoredPulseOverallMetrics
      >[0]["scoreChanges"];
      const { previousOverallScore, overallDelta } = deriveStoredPulseOverallMetrics({
        overallScore: run.overallScore,
        pillarScores,
        scoreChanges,
      });
      return {
        ...run,
        pillarScores,
        scoreChanges,
        topRisks: JSON.parse(run.topRisks),
        topQuickWins: JSON.parse(run.topQuickWins),
        previousOverallScore,
        overallDelta,
      };
    });

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Pulse GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/pulse — Trigger a new Pulse run
export async function POST(req: NextRequest) {
  try {
    // Rate limit pulse runs (5 per 15 minutes)
    const rateLimitError = checkRateLimitFromRequest(req, 'pulse', 5, 900);
    if (rateLimitError) return rateLimitError;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runPulse(session.user.id);
    const pulseRunId = await savePulseRun(session.user.id, result);

    // Create a notification for the user about the pulse result
    await db.notification.create({
      data: {
        userId: session.user.id,
        type: "pulse_ready",
        title: "AI Pulse Report Ready",
        message: `Your ${result.month} AI Pulse report is ready. Overall score: ${Math.round(result.overallScore)}%.`,
        actionUrl: "/pulse",
        assessmentId: result.assessmentId,
      },
    });

    return NextResponse.json({
      id: pulseRunId,
      ...result,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message.includes("No completed assessment")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("Pulse POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
