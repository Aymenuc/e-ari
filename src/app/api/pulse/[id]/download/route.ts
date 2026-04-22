import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generatePulseReport, type PulseReportData } from "@/lib/report-generator";
import { getSectorById } from "@/lib/sectors";
import { MATURITY_BANDS, PILLARS } from "@/lib/pillars";

/**
 * GET /api/pulse/[id]/download
 *
 * Download a Pulse report as a professional .docx file.
 * Uses generatePulseReport() from the report generator to produce
 * a fully formatted Word document with score tables, risk analysis,
 * quick wins, and sector benchmarks.
 */
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

    const pulseRun = await db.pulseRun.findUnique({
      where: { id },
    });

    if (!pulseRun) {
      return NextResponse.json({ error: "Pulse run not found" }, { status: 404 });
    }

    // Ensure the user owns this pulse run
    if (pulseRun.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse the JSON fields from the pulse run
    const rawPillarScores = JSON.parse(pulseRun.pillarScores) as Array<{
      pillarId: string;
      pillarName: string;
      normalizedScore: number;
      weight: number;
    }>;

    const rawScoreChanges = JSON.parse(pulseRun.scoreChanges) as Array<{
      pillarId: string;
      pillarName: string;
      previous: number;
      current: number;
      delta: number;
    }>;

    const rawTopRisks = JSON.parse(pulseRun.topRisks) as string[];
    const rawTopQuickWins = JSON.parse(pulseRun.topQuickWins) as string[];

    // Determine maturity band from overall score
    const overallScore = pulseRun.overallScore;
    let maturityBand: string = "laggard";
    let maturityLabel: string = "Laggard";

    for (const [key, band] of Object.entries(MATURITY_BANDS)) {
      if (overallScore >= band.min && overallScore <= band.max) {
        maturityBand = key;
        maturityLabel = band.label;
        break;
      }
    }

    // Calculate overall delta from score changes (or derive from previous assessment)
    let previousOverallScore: number | null = null;
    let overallDelta: number | null = null;

    // Try to get the previous assessment for comparison
    const assessment = await db.assessment.findUnique({
      where: { id: pulseRun.assessmentId },
    });

    if (assessment?.previousAssessmentId) {
      const prevAssessment = await db.assessment.findUnique({
        where: { id: assessment.previousAssessmentId },
      });
      if (prevAssessment?.overallScore != null) {
        previousOverallScore = prevAssessment.overallScore;
        overallDelta = Math.round((overallScore - previousOverallScore) * 100) / 100;
      }
    }

    // If we have score changes with deltas, use the aggregate delta
    if (rawScoreChanges.length > 0 && overallDelta === null) {
      const avgDelta = rawScoreChanges.reduce((sum, sc) => sum + sc.delta, 0) / rawScoreChanges.length;
      previousOverallScore = Math.round((overallScore - avgDelta) * 100) / 100;
      overallDelta = Math.round(avgDelta * 100) / 100;
    }

    // Get user info for the report
    const user = await db.user.findUnique({
      where: { id: pulseRun.userId },
    });

    const userName = user?.name || user?.email || "Unknown User";
    const organization = (user as any)?.organization || "Organization";
    const sector = assessment?.sector || "general";

    // Enrich pillar scores with names from PILLARS if missing
    const pillarScores = rawPillarScores.map((ps) => {
      if (!ps.pillarName || ps.pillarName === ps.pillarId) {
        const pillar = PILLARS.find((p) => p.id === ps.pillarId);
        return {
          ...ps,
          pillarName: pillar?.name || ps.pillarId,
          weight: ps.weight || pillar?.weight || 0.125,
        };
      }
      return ps;
    });

    // Enrich score changes with pillar names
    const scoreChanges = rawScoreChanges.map((sc) => {
      if (!sc.pillarName || sc.pillarName === sc.pillarId) {
        const pillar = PILLARS.find((p) => p.id === sc.pillarId);
        return {
          ...sc,
          pillarName: pillar?.name || sc.pillarId,
        };
      }
      return sc;
    });

    // Fetch benchmark data for the sector
    let benchmarkData: PulseReportData["benchmarkData"] = null;
    try {
      const sectorBenchmarks = await db.benchmarkSnapshot.findMany({
        where: { sector },
      });

      if (sectorBenchmarks.length > 0) {
        const pillarBenchmarks = sectorBenchmarks.map((b) => ({
          pillarId: b.pillarId,
          avgScore: b.avgScore,
          sampleSize: b.sampleSize,
          isRealData: true,
        }));

        const overallBenchmark = await db.benchmarkSnapshot.findFirst({
          where: { sector, pillarId: "overall" },
        });

        benchmarkData = {
          sector,
          pillars: pillarBenchmarks,
          overall: overallBenchmark
            ? {
                avgScore: overallBenchmark.avgScore,
                sampleSize: overallBenchmark.sampleSize,
                isRealData: true,
              }
            : null,
        };
      }
    } catch {
      // Benchmark data is optional; continue without it
    }

    // Build the PulseReportData object
    const reportData: PulseReportData = {
      overallScore,
      previousOverallScore,
      overallDelta,
      maturityBand,
      maturityLabel,
      pillarScores,
      scoreChanges,
      topRisks: rawTopRisks,
      topQuickWins: rawTopQuickWins,
      month: pulseRun.month,
      userName,
      organization,
      sector,
      benchmarkData,
    };

    // Generate the .docx report
    const docxBuffer = await generatePulseReport(reportData);

    const filename = `pulse-report-${pulseRun.month}-${id.slice(-6)}.docx`;

    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": docxBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Pulse download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
