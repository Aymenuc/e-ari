import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { scoreAssessment, type ResponseMap } from "@/lib/assessment-engine";
import { generateAIInsights, generateTemplateInsightsSync, PROMPT_VERSION } from "@/lib/ai-insights";
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
    // Narrative sector: the sector chosen FOR THIS ASSESSMENT wins; the
    // profile sector is only a fallback for pre-fix rows stuck on "general".
    const narrativeSector =
      assessment.sector && assessment.sector !== "general"
        ? assessment.sector
        : assessment.user.sector || undefined;


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
          if (stored && typeof stored === 'object' && typeof stored.executiveSummary === 'string') {
            return NextResponse.json({
              insights: stored,
              scoringResult,
              limited: true,
              fallback: stored.isAIGenerated !== true,
              upgradeMessage: 'Upgrade to Professional for full AI narrative insights, cross-pillar analysis, and detailed risk identification.',
            });
          }
        } catch {
          // Fall through to generate
        }
      }

      // Generate a template-based summary (no LLM cost). Pass entityType
      // so the template's recommendation strings (Phase 2) speak to the
      // right reader — no "scale across business units" for a UN body.
      const templateInsights = generateTemplateInsightsSync(scoringResult, {
        sector: narrativeSector,
        orgSize: assessment.user.orgSize || undefined,
        entityType: assessment.entityType || undefined,
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
        fallback: true,
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
        // Only treat as a Pro cache hit if:
        // 1) payload is full AI output (not legacy/free seed), and
        // 2) prompt version matches current prompt contract.
        // This avoids serving stale/generic narratives forever after prompt improvements.
        if (
          stored &&
          typeof stored === 'object' &&
          stored.isAIGenerated === true &&
          stored.promptVersion === PROMPT_VERSION
        ) {
          return NextResponse.json({
            insights: stored,
            scoringResult,
            limited: false,
            fallback: false,
          });
        }
      } catch {
        // Cache corrupt — fall through to regenerate
      }
    }

    const insights = await generateAIInsights(scoringResult, {
      sector: narrativeSector,
      orgSize: assessment.user.orgSize || undefined,
      organization: assessment.user.organization || undefined,
      // Drives entity-aware framing (peer noun, scaling noun, role) inside
      // the prompt builder + template fallback. See src/lib/entity-types.ts.
      entityType: assessment.entityType || undefined,
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
      fallback: insights.isAIGenerated !== true,
    });
  } catch (error) {
    console.error("Insights error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
