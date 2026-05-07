import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { scoreAssessment, type ResponseMap } from "@/lib/assessment-engine";
import { executePipeline, clearCache } from "@/lib/orchestrator";

// GET /api/assessment/[id] — Get assessment with scores
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const assessment = await db.assessment.findUnique({
      where: { id },
      include: { responses: true },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    if (assessment.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If completed, include computed scores. Pass sector so the engine
    // applies sector weighting and X-Ray pattern detection — without this,
    // results page X-Ray + sector-weighting sections render empty.
    let scoringResult: ReturnType<typeof scoreAssessment> | null = null;
    if (assessment.status === "completed" && assessment.responses.length > 0) {
      try {
        const responseMap: ResponseMap = {};
        assessment.responses.forEach(r => {
          responseMap[r.questionId] = r.answer;
        });
        scoringResult = scoreAssessment(responseMap, assessment.sector);
      } catch {
        // Scoring may fail if incomplete, return assessment without scores
      }
    }

    return NextResponse.json({
      ...assessment,
      scoringResult,
    });
  } catch (error) {
    console.error("Assessment get error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/assessment/[id] — Update assessment (save draft or submit)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { responses, action, orgContext } = body; // action: "save" | "submit"

    const assessment = await db.assessment.findUnique({
      where: { id },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    if (assessment.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update responses
    if (responses && typeof responses === "object") {
      for (const [questionId, answer] of Object.entries(responses)) {
        await db.response.upsert({
          where: {
            assessmentId_questionId: {
              assessmentId: id,
              questionId,
            },
          },
          create: {
            assessmentId: id,
            pillarId: questionId.split("_")[0],
            questionId,
            answer: Number(answer),
          },
          update: {
            answer: Number(answer),
          },
        });
      }
    }

    // If submitting, run scoring engine + auto-trigger orchestrator pipeline
    if (action === "submit") {
      const allResponses = await db.response.findMany({
        where: { assessmentId: id },
      });

      const responseMap: ResponseMap = {};
      allResponses.forEach(r => {
        responseMap[r.questionId] = r.answer;
      });

      try {
        // Sector-aware scoring — applies sector weighting + X-Ray detection
        const scoringResult = scoreAssessment(responseMap, assessment.sector);

        await db.assessment.update({
          where: { id },
          data: {
            status: "completed",
            overallScore: scoringResult.overallScore,
            maturityBand: scoringResult.maturityBand,
            pillarScores: JSON.stringify(scoringResult.pillarScores),
            completedAt: new Date(),
          },
        });

        // Auto-trigger the orchestrator pipeline in the background
        // This fires off Insight, Discovery, Report, and Literacy agents
        // We don't await this — the user gets their scores immediately,
        // and the pipeline runs asynchronously. The results page polls for status.
        const user = await db.user.findUnique({ where: { id: session.user.id } });
        const tier = user?.tier || 'free';

        // Clear any stale cache
        clearCache(id);

        executePipeline({
          assessmentId: id,
          userId: session.user.id,
          tier,
          triggeredBy: 'auto',
          sector: assessment.sector,
          orgSize: user?.orgSize || undefined,
          organization: user?.organization || undefined,
          orgContext: orgContext || undefined,
        }).catch(err => {
          // Pipeline runs in background — log errors but don't block the response
          console.error('Background pipeline execution failed:', err);
        });

        return NextResponse.json({
          status: "completed",
          scoringResult,
          pipelineTriggered: true,
        });
      } catch (scoringError: unknown) {
        const message = scoringError instanceof Error ? scoringError.message : "Scoring failed";
        return NextResponse.json(
          { error: message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ status: "draft", saved: true });
  } catch (error) {
    console.error("Assessment update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
