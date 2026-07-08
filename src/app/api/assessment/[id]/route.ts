import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveWorkspace, canWrite } from "@/lib/workspace";
import { db } from "@/lib/db";
import { scoreAssessment, type ResponseMap } from "@/lib/assessment-engine";
import { executePipeline, clearCache } from "@/lib/orchestrator";
import { checkQuota } from "@/lib/tier-limits";

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
    const ws = await resolveWorkspace(session.user.id);

    const { id } = await params;
    const assessment = await db.assessment.findUnique({
      where: { id },
      include: { responses: true, user: { select: { sector: true } } },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    if (assessment.userId !== ws.ownerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Effective sector for scoring/display. Assessments completed before the
    // sector-persistence fix are stuck with the column default "general" (the
    // wizard's pick was stashed in aiInsights and overwritten) — fall back to
    // the profile sector so their recomputed results aren't sector-blind.
    const effectiveSector =
      assessment.sector && assessment.sector !== "general"
        ? assessment.sector
        : assessment.user?.sector || assessment.sector;

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
        scoringResult = scoreAssessment(responseMap, effectiveSector);
      } catch {
        // Scoring may fail if incomplete, return assessment without scores
      }
    }

    const { user: _user, ...assessmentRow } = assessment;
    return NextResponse.json({
      ...assessmentRow,
      sector: effectiveSector,
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
    const ws = await resolveWorkspace(session.user.id);
    if (!canWrite(ws.role)) return NextResponse.json({ error: "Your seat is view-only in this workspace." }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { responses, action, orgContext, sector: bodySector } = body; // action: "save" | "submit"

    const assessment = await db.assessment.findUnique({
      where: { id },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    if (assessment.userId !== ws.ownerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // The wizard sends the selected sector on both save and submit; the
    // handler used to drop it, so scoring always ran with the column
    // default "general". Validate against the known enum and let it
    // override the (possibly stale) column value.
    const VALID_SECTORS = ['healthcare', 'finance', 'manufacturing', 'retail', 'government', 'technology', 'energy', 'education', 'general'];
    const effectiveSector: string =
      typeof bodySector === 'string' && VALID_SECTORS.includes(bodySector)
        ? bodySector
        : assessment.sector || 'general';

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
      // ── Quota gate ───────────────────────────────────────────────────
      // Enforce monthly assessment limit for the user's tier. Only counts
      // already-completed assessments — submitting the same draft twice
      // shouldn't double-bill, but completing a fresh draft against a
      // saturated quota must be blocked here, not at the LLM layer.
      if (assessment.status !== "completed" && assessment.isPulse !== true) {
        const userRecord = await db.user.findUnique({
          where: { id: ws.ownerId },
          select: { tier: true },
        });
        const quota = await checkQuota(ws.ownerId, userRecord?.tier, 'assessment');
        if (!quota.allowed) {
          return NextResponse.json(
            {
              error: quota.message ?? "Monthly assessment quota exceeded.",
              quota: {
                used: quota.used,
                limit: quota.limit,
                remaining: quota.remaining,
                resetsAt: quota.resetsAt.toISOString(),
              },
              upgradeRequired: true,
            },
            { status: 402 },
          );
        }
      }

      const allResponses = await db.response.findMany({
        where: { assessmentId: id },
      });

      const responseMap: ResponseMap = {};
      allResponses.forEach(r => {
        responseMap[r.questionId] = r.answer;
      });

      try {
        // Sector-aware scoring — applies sector weighting + X-Ray detection.
        // Uses the wizard-selected sector, not the column default.
        const scoringResult = scoreAssessment(responseMap, effectiveSector);

        // Pull entityType off the orgContext (if context-enrichment ran)
        // and persist it so the results page can render entity-aware UI
        // without re-classifying.
        //
        // We previously gated this on confidence === 'high' || 'medium',
        // which meant a low-confidence enrichment (very common for smaller
        // orgs whose Tavily results are thin) silently dropped the entity
        // type — the Assessment row stayed entityType=null and the
        // results page fell back to commercial defaults. The classifier
        // is a SEPARATE question from synthesis confidence: even if Tavily
        // results are thin, the entity type pick from the org name +
        // single snippet is usually reliable. Persist it whenever the
        // classifier returned a known key.
        const orgCtx = orgContext as { entityType?: string; confidence?: 'high' | 'medium' | 'low' | 'none' } | undefined;
        const entityType = orgCtx?.entityType && [
          'commercial','public_sector','nonprofit','academic','international_body','unknown'
        ].includes(orgCtx.entityType) ? orgCtx.entityType : null;
        // Diagnostic: confirm the entity type reaches persistence. Search
        // "[assessment] entity_type" in Vercel logs to verify the wiring.
        console.log(`[assessment] persisting submit id=${id} entity_type=${entityType ?? 'none'} confidence=${orgCtx?.confidence ?? 'none'}`);

        await db.assessment.update({
          where: { id },
          data: {
            status: "completed",
            sector: effectiveSector,
            overallScore: scoringResult.overallScore,
            maturityBand: scoringResult.maturityBand,
            pillarScores: JSON.stringify(scoringResult.pillarScores),
            // Stamp the versions that actually scored this assessment —
            // rows previously said 1.0.0 while the engine ran 5.3.
            scoringVersion: scoringResult.scoringVersion,
            methodologyVersion: scoringResult.methodologyVersion,
            completedAt: new Date(),
            ...(entityType ? { entityType } : {}),
          },
        });

        // Auto-trigger the orchestrator pipeline in the background
        // This fires off Insight, Discovery, Report, and Literacy agents
        // We don't await this — the user gets their scores immediately,
        // and the pipeline runs asynchronously. The results page polls for status.
        const user = await db.user.findUnique({ where: { id: ws.ownerId } });
        const tier = user?.tier || 'free';

        // Clear any stale cache
        clearCache(id);

        executePipeline({
          assessmentId: id,
          userId: ws.ownerId,
          tier,
          triggeredBy: 'auto',
          sector: effectiveSector,
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
