import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { scoreAssessment, type ResponseMap } from "@/lib/assessment-engine";
import { generateAIInsights, generateTemplateInsightsSync } from "@/lib/ai-insights";
import { checkRateLimit, getRateLimitHeaders, resolveIdentifier } from "@/lib/rate-limit";

// GET /api/assessment/[id]/insights — Get AI-generated insights
// Free tier: receives a limited 1-summary insight (template-based)
// Professional+: receives full LLM-generated insights
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit insights (LLM-powered, expensive)
    const identifier = resolveIdentifier(session.user.id, req);
    const rateResult = checkRateLimit("insights", identifier);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before requesting insights again.", retryAfter: rateResult.retryAfter },
        { status: 429, headers: getRateLimitHeaders("insights", rateResult) }
      );
    }

    const { id } = await params;
    const assessment = await db.assessment.findUnique({
      where: { id },
      include: { responses: true, user: true },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    if (assessment.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (assessment.status !== "completed") {
      return NextResponse.json({ error: "Assessment not yet completed" }, { status: 400 });
    }

    const userTier = assessment.user.tier || 'free';

    // Compute scores
    const responseMap: ResponseMap = {};
    assessment.responses.forEach(r => {
      responseMap[r.questionId] = r.answer;
    });

    // Sector-aware scoring — must pass sector so X-Ray findings + sector
    // weighting reach the prompt and the cached output.
    const scoringResult = scoreAssessment(responseMap, assessment.sector);

    // ─── Free tier: limited insight summary (1 template-based summary) ───
    if (userTier === 'free') {
      // Check if we already have stored insights for this assessment
      if (assessment.aiInsights) {
        try {
          const stored = JSON.parse(assessment.aiInsights);
          return NextResponse.json({
            insights: stored,
            scoringResult,
            limited: true,
            upgradeMessage: 'Upgrade to Professional for full AI narrative insights, cross-pillar analysis, and detailed risk identification.',
          });
        } catch {
          // Fall through to generate
        }
      }

      // Generate a template-based summary (no LLM cost)
      const templateInsights = generateTemplateInsightsSync(scoringResult, {
        sector: assessment.user.sector || undefined,
        orgSize: assessment.user.orgSize || undefined,
      });

      // Store the limited insight
      await db.assessment.update({
        where: { id },
        data: { aiInsights: JSON.stringify(templateInsights) },
      });

      return NextResponse.json({
        insights: templateInsights,
        scoringResult,
        limited: true,
        upgradeMessage: 'Upgrade to Professional for full AI narrative insights, cross-pillar analysis, and detailed risk identification.',
      });
    }

    // ─── Professional/Enterprise: full LLM-generated insights ───
    // Cache hit — return immediately if we already generated full insights
    // for this assessment. Without this check the page calls into a 10–30 s
    // LLM round-trip on every load, which is what makes the Insights
    // section feel slow on the results page.
    if (assessment.aiInsights) {
      try {
        const stored = JSON.parse(assessment.aiInsights);
        // Only treat as a Pro cache hit if the stored payload is full
        // (template insights from a Free → Pro upgrade have no executiveSummary).
        if (stored && typeof stored === 'object' && stored.isAIGenerated === true) {
          return NextResponse.json({
            insights: stored,
            scoringResult,
            limited: false,
          });
        }
      } catch {
        // Cache corrupt — fall through to regenerate
      }
    }

    const insights = await generateAIInsights(scoringResult, {
      sector: assessment.user.sector || undefined,
      orgSize: assessment.user.orgSize || undefined,
    }, responseMap);

    // Store insights on assessment
    await db.assessment.update({
      where: { id },
      data: { aiInsights: JSON.stringify(insights) },
    });

    return NextResponse.json({
      insights,
      scoringResult,
      limited: false,
    });
  } catch (error) {
    console.error("Insights error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
