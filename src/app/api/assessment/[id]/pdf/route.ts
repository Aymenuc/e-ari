import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { scoreAssessment, type ResponseMap } from "@/lib/assessment-engine";
import { generateAIInsights, generateTemplateInsightsSync } from "@/lib/ai-insights";
import { generateAssessmentReport, type AssessmentReportData } from "@/lib/report-generator";
import { getSectorStats } from "@/lib/benchmark-engine";
import { getSetting } from "@/lib/platform-settings";

// GET /api/assessment/[id]/pdf — Generate professional .docx assessment report
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

    // Check tier - PDF/DOCX is available for professional and enterprise tiers
    if (assessment.user.tier === "free") {
      return NextResponse.json(
        { error: "PDF export requires Professional or Enterprise tier" },
        { status: 403 }
      );
    }

    // Compute scores
    const responseMap: ResponseMap = {};
    assessment.responses.forEach(r => {
      responseMap[r.questionId] = r.answer;
    });

    const scoringResult = scoreAssessment(responseMap);

    // Use AI insights for Professional/Enterprise users, template for fallback
    let insights;
    const userTier = assessment.user.tier || 'free';
    if (userTier === 'professional' || userTier === 'enterprise') {
      try {
        insights = await generateAIInsights(scoringResult, {
          sector: assessment.user.sector || undefined,
          orgSize: assessment.user.orgSize || undefined,
        }, responseMap);
      } catch {
        insights = generateTemplateInsightsSync(scoringResult, {
          sector: assessment.user.sector || undefined,
          orgSize: assessment.user.orgSize || undefined,
        });
      }
    } else {
      insights = generateTemplateInsightsSync(scoringResult, {
        sector: assessment.user.sector || undefined,
        orgSize: assessment.user.orgSize || undefined,
      });
    }

    // Fetch benchmark data for sector comparison
    let benchmarkData: AssessmentReportData['benchmarkData'] | undefined;
    try {
      const sector = assessment.user.sector || 'technology';
      const stats = await getSectorStats(sector);
      if (stats) {
        benchmarkData = {
          sector,
          pillars: stats.pillars.map(ps => ({
            pillarId: ps.pillarId,
            avgScore: ps.avgScore,
            sampleSize: ps.sampleSize,
            isRealData: ps.isRealData,
          })),
          overall: stats.overall ? {
            avgScore: stats.overall.avgScore,
            sampleSize: stats.overall.sampleSize,
            isRealData: stats.overall.isRealData,
          } : null,
        };
      }
    } catch {
      // Benchmark data is optional — report generates without it
    }

    // Fetch previous assessment score for trend comparison
    let previousScore: number | null = null;
    let previousDate: string | null = null;
    try {
      const previousAssessment = await db.assessment.findFirst({
        where: {
          userId: assessment.userId,
          status: "completed",
          completedAt: { not: null, lt: assessment.completedAt || new Date() },
        },
        orderBy: { completedAt: "desc" },
        select: { id: true, completedAt: true },
      });
      if (previousAssessment) {
        const prevResponses = await db.response.findMany({
          where: { assessmentId: previousAssessment.id },
        });
        const prevResponseMap: ResponseMap = {};
        prevResponses.forEach(r => { prevResponseMap[r.questionId] = r.answer; });
        const prevScoring = scoreAssessment(prevResponseMap);
        previousScore = prevScoring.overallScore;
        previousDate = previousAssessment.completedAt?.toISOString() || null;
      }
    } catch {
      // Previous score is optional
    }

    // Generate professional .docx report
    const reportData: AssessmentReportData = {
      scoringResult,
      insights,
      userName: assessment.user.name || assessment.user.email,
      organization: assessment.user.organization || "Organization",
      sector: assessment.user.sector || "technology",
      completedAt: assessment.completedAt?.toISOString() || new Date().toISOString(),
      benchmarkData,
      previousScore,
      previousDate,
    };

    if (assessment.user.tier === "enterprise") {
      const [enabled, brandName, logoUrl, accentColor] = await Promise.all([
        getSetting("custom_branding_enabled"),
        getSetting("custom_brand_name"),
        getSetting("custom_brand_logo_url"),
        getSetting("custom_brand_accent_color"),
      ]);
      reportData.branding = {
        enabled,
        brandName,
        logoUrl,
        accentColor,
      };
    }

    const docxBuffer = await generateAssessmentReport(reportData);

    return new NextResponse(new Uint8Array(docxBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="E-ARI-Assessment-Report-${id.slice(0, 8)}.docx"`,
      },
    });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
