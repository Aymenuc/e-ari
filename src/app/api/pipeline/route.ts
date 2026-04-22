/**
 * Pipeline API — Trigger and monitor orchestration runs
 *
 * POST /api/pipeline          — Trigger a new pipeline run
 * GET  /api/pipeline?assessmentId=... — Get latest pipeline status
 * GET  /api/pipeline?assessmentId=...&history=true — Get all runs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  executePipeline,
  getLatestPipelineRun,
  getPipelineHistory,
  clearCache,
  type PipelineConfig,
} from '@/lib/orchestrator';

// POST /api/pipeline — Trigger a new pipeline run
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { assessmentId, skipAgents, onlyAgents, triggeredBy } = body;

    if (!assessmentId) {
      return NextResponse.json({ error: 'assessmentId is required' }, { status: 400 });
    }

    // Verify the assessment belongs to the user
    const assessment = await db.assessment.findUnique({
      where: { id: assessmentId },
      include: { user: true },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (assessment.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (assessment.status !== 'completed') {
      return NextResponse.json({ error: 'Assessment must be completed first' }, { status: 400 });
    }

    // Get authoritative tier from DB (not just JWT)
    const user = await db.user.findUnique({ where: { id: session.user.id } });
    const tier = user?.tier || 'free';

    // Clear cache to ensure fresh results
    clearCache(assessmentId);

    const config: PipelineConfig = {
      assessmentId,
      userId: session.user.id,
      tier,
      triggeredBy: triggeredBy || 'manual',
      skipAgents,
      onlyAgents,
      sector: assessment.sector,
      orgSize: assessment.user?.orgSize || undefined,
      organization: assessment.user?.organization || undefined,
    };

    // Execute the pipeline (this runs all agents sequentially/parallel as designed)
    const result = await executePipeline(config);

    return NextResponse.json({
      pipelineRunId: result.pipelineRunId,
      status: result.status,
      stages: result.stages.map(s => ({
        agent: s.agent,
        status: s.status,
        durationMs: s.durationMs,
        error: s.error,
      })),
      totalDurationMs: result.totalDurationMs,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
    });
  } catch (error) {
    console.error('Pipeline API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/pipeline — Get pipeline status for an assessment
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const assessmentId = searchParams.get('assessmentId');

    if (!assessmentId) {
      return NextResponse.json({ error: 'assessmentId is required' }, { status: 400 });
    }

    // Verify access
    const assessment = await db.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (assessment.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const history = searchParams.get('history') === 'true';

    if (history) {
      const runs = await getPipelineHistory(assessmentId);
      return NextResponse.json({ runs });
    }

    const latestRun = await getLatestPipelineRun(assessmentId);

    if (!latestRun) {
      return NextResponse.json({ status: 'none', message: 'No pipeline runs found for this assessment' });
    }

    return NextResponse.json(latestRun);
  } catch (error) {
    console.error('Pipeline GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
