/**
 * Pipeline Retry API — Retry a specific failed agent
 *
 * POST /api/pipeline/[id]/retry — Retry one or more failed agents
 * Body: { agent: "insight" } or { agents: ["insight", "discovery"] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { retryAgent, type AgentId, type StageResult } from '@/lib/orchestrator';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { agent, agents } = body;

    // Verify the pipeline run belongs to the user
    const run = await db.pipelineRun.findUnique({
      where: { id },
    });

    if (!run) {
      return NextResponse.json({ error: 'Pipeline run not found' }, { status: 404 });
    }

    if (run.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const agentsToRetry: AgentId[] = (agents as AgentId[]) || (agent ? [agent as AgentId] : []);

    if (agentsToRetry.length === 0) {
      return NextResponse.json({ error: 'Specify agent or agents to retry' }, { status: 400 });
    }

    const results: StageResult[] = [];
    for (const a of agentsToRetry) {
      const result = await retryAgent(id, a);
      results.push(result);
    }

    // Update pipeline run status based on results
    const allCompleted = results.every(r => r.status === 'completed');

    if (allCompleted) {
      // Check if all stages in the run are now completed
      const allStages = await db.pipelineStage.findMany({
        where: { pipelineRunId: id },
      });
      const nonSkippedStages = allStages.filter(s => s.status !== 'skipped');
      const allDone = nonSkippedStages.every(s => s.status === 'completed');

      if (allDone) {
        await db.pipelineRun.update({
          where: { id },
          data: { status: 'completed', completedAt: new Date() },
        });
      } else {
        await db.pipelineRun.update({
          where: { id },
          data: { status: 'partial' },
        });
      }
    }

    return NextResponse.json({
      results: results.map(r => ({
        agent: r.agent,
        status: r.status,
        durationMs: r.durationMs,
        error: r.error,
      })),
    });
  } catch (error) {
    console.error('Pipeline retry error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
