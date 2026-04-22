import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit, getRateLimitHeaders, resolveIdentifier } from "@/lib/rate-limit";

// GET /api/assessment — List user's assessments
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assessments = await db.assessment.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        responses: true,
      },
    });

    return NextResponse.json(assessments);
  } catch (error) {
    console.error("Assessment list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/assessment — Create new assessment
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit assessment creation (expensive: DB + agent triggers)
    const identifier = resolveIdentifier(session.user.id, req);
    const rateResult = checkRateLimit("assessment", identifier);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before creating another assessment.", retryAfter: rateResult.retryAfter },
        { status: 429, headers: getRateLimitHeaders("assessment", rateResult) }
      );
    }

    const body = await req.json();
    const { responses, sector } = body;

    if (!responses || typeof responses !== "object") {
      return NextResponse.json({ error: "Responses are required" }, { status: 400 });
    }

    // Create assessment
    const assessment = await db.assessment.create({
      data: {
        userId: session.user.id,
        status: "draft",
        scoringVersion: "1.0.0",
        methodologyVersion: "1.0.0",
        aiInsights: sector ? JSON.stringify({ sector }) : null,
      },
    });

    // Create responses if provided
    if (Object.keys(responses).length > 0) {
      const responseData = Object.entries(responses).map(([questionId, answer]) => ({
        assessmentId: assessment.id,
        pillarId: questionId.split("_")[0],
        questionId,
        answer: Number(answer),
      }));

      await db.response.createMany({
        data: responseData,
      });
    }

    return NextResponse.json(assessment, { status: 201 });
  } catch (error) {
    console.error("Assessment create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
