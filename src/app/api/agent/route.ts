/**
 * E-ARI Agent API Route
 *
 * POST /api/agent
 *
 * Accepts an AgentRequest body and returns an AgentResponse
 * from the E-ARI agentic optimization & support service.
 *
 * Authentication is optional — the endpoint works both for
 * authenticated users during assessment and for demo/preview
 * usage on the landing page with sample data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  queryAgent,
  generateRoadmap,
  getSectorBenchmark,
  type AgentRequest,
  type AgentResponse,
  type RoadmapPhase,
  type BenchmarkResult,
} from '@/lib/agent';
import { checkRateLimit, getRateLimitHeaders, resolveIdentifier } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // ─── Auth + Tier check: Agent features require Professional or Enterprise ───
    // The agent uses LLM calls that cost money; enforce server-side tier gating.
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Read authoritative tier from the database, not just the JWT (prevents stale tokens)
    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { tier: true } });
    const userTier = user?.tier || 'free';
    if (userTier === 'free') {
      return NextResponse.json(
        { error: 'Agentic features require Professional or Enterprise tier. Upgrade to unlock AI-powered roadmaps, benchmarks, and recommendations.', tierRequired: 'professional' },
        { status: 403 }
      );
    }

    // Rate limit agent calls (LLM-powered, expensive)
    const identifier = resolveIdentifier(session.user.id, request);
    const rateResult = checkRateLimit("agent", identifier);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before making another agent request.', retryAfter: rateResult.retryAfter },
        { status: 429, headers: getRateLimitHeaders("agent", rateResult) }
      );
    }

    const body = await request.json();

    // Validate required field
    if (!body.action || typeof body.action !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      );
    }

    const { action } = body;

    // Route to the appropriate handler based on action
    switch (action) {
      case 'roadmap': {
        // Generate a phased AI adoption roadmap
        const { overallScore, pillarScores, sector, orgContext } = body;

        if (overallScore === undefined || overallScore === null) {
          return NextResponse.json(
            { error: 'overallScore is required for roadmap action.' },
            { status: 400 }
          );
        }

        if (!pillarScores || !Array.isArray(pillarScores) || pillarScores.length === 0) {
          return NextResponse.json(
            { error: 'pillarScores array is required for roadmap action.' },
            { status: 400 }
          );
        }

        const result: RoadmapPhase[] = await generateRoadmap(
          Number(overallScore),
          pillarScores,
          sector,
          orgContext
        );

        // Return in a format the AgentPanel expects
        return NextResponse.json({
          content: result.map((phase, i) =>
            `**Phase ${i + 1}: ${phase.phase}**\n` +
            `Timeframe: ${phase.timeframe}\n` +
            `Investment Level: **${phase.investmentLevel}**\n` +
            `Pillar Focus: ${phase.pillarFocus.join(', ')}\n\n` +
            `**Objectives:**\n${phase.objectives.map(o => `- ${o}`).join('\n')}\n\n` +
            `**Key Actions:**\n${phase.keyActions.map((a, j) => `${j + 1}. ${a}`).join('\n')}`
          ).join('\n\n---\n\n'),
          action: 'roadmap',
          followUpQuestions: [],
          relatedPillars: result.flatMap(r => r.pillarFocus).filter((v, i, a) => a.indexOf(v) === i).slice(0, 4),
          isAIGenerated: true,
          modelUsed: 'z-ai-llm',
          generatedAt: new Date().toISOString(),
        } as AgentResponse);
      }

      case 'benchmark': {
        // Get sector benchmark comparison
        const { sectorId, sector, pillarScores, overallScore } = body;

        const effectiveSectorId = sectorId || sector || 'general';

        if (!pillarScores || !Array.isArray(pillarScores) || pillarScores.length === 0) {
          return NextResponse.json(
            { error: 'pillarScores array is required for benchmark action.' },
            { status: 400 }
          );
        }

        const result: BenchmarkResult = await getSectorBenchmark(
          effectiveSectorId,
          pillarScores,
        );

        // Return in a format the AgentPanel expects
        return NextResponse.json({
          content:
            `**Sector Benchmark Comparison — ${result.sector}**\n\n` +
            `**Overall Score:** ${overallScore ?? 'N/A'}%\n` +
            `**Estimated Sector Average:** ~${result.averageScore}%\n` +
            `**Top Quartile Threshold:** ~${result.topQuartile}%\n` +
            `**Bottom Quartile Threshold:** ~${result.bottomQuartile}%\n\n` +
            `**Per-Pillar Comparison:**\n\n` +
            `| Pillar | Your Score | Sector Avg | Percentile |\n` +
            `|--------|-----------|------------|------------|\n` +
            result.pillarBenchmarks.map(pb =>
              `| ${pb.pillarId} | ${pb.userScore}% | ~${pb.sectorAverage}% | ~${pb.percentile}th |`
            ).join('\n') + '\n\n' +
            `**Insight:** ${result.insight}\n\n` +
            `*Sector benchmarks are AI-estimated and intended for directional guidance only. Actual sector performance may vary.*`,
          action: 'benchmark',
          followUpQuestions: [],
          relatedPillars: result.pillarBenchmarks
            .filter(pb => pb.userScore < pb.sectorAverage)
            .map(pb => pb.pillarId)
            .slice(0, 4),
          isAIGenerated: result.isAIGenerated,
          modelUsed: 'z-ai-llm',
          generatedAt: new Date().toISOString(),
        } as AgentResponse);
      }

      default: {
        // All other actions route through queryAgent
        const validActions = [
          'question_help',
          'pillar_optimization',
          'context_insight',
          'recommendation',
          'discovery_interview',
        ];

        if (!validActions.includes(action)) {
          return NextResponse.json(
            { error: `Invalid action "${action}". Must be one of: ${validActions.join(', ')}, roadmap, benchmark.` },
            { status: 400 }
          );
        }

        // For discovery_interview, support a simplified `messages` array format
        // from the Discovery page alongside the structured AgentRequest fields.
        // If `messages` is provided, convert to conversationHistory + discoveryResponse.
        let conversationHistory = body.conversationHistory;
        let discoveryResponse = body.discoveryResponse;
        let interviewPhase = body.interviewPhase;

        if (body.messages && Array.isArray(body.messages) && body.messages.length > 0) {
          // Split messages: all but the last user message become conversationHistory,
          // the last user message becomes discoveryResponse
          const msgs = body.messages as Array<{ role: string; content: string }>;
          const lastUserMsg = [...msgs].reverse().find(m => m.role === 'user');
          discoveryResponse = lastUserMsg?.content || body.discoveryResponse;

          // All messages except the last user message go into conversationHistory
          let historyMsgs = msgs;
          if (lastUserMsg) {
            const lastUserIdx = msgs.lastIndexOf(lastUserMsg);
            historyMsgs = msgs.slice(0, lastUserIdx);
          }
          conversationHistory = historyMsgs
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({
              role: (m.role === 'user' || m.role === 'assistant' ? m.role : 'user') as 'user' | 'assistant',
              content: m.content,
            }));
        }

        // `synthesis: true` is a shorthand for interviewPhase = 'synthesis'
        if (body.synthesis === true) {
          interviewPhase = 'synthesis';
        }

        const agentRequest: AgentRequest = {
          action: body.action,
          pillarId: body.pillarId,
          questionId: body.questionId,
          questionText: body.questionText,
          currentScore: body.currentScore,
          pillarScores: body.pillarScores,
          orgContext: body.orgContext,
          sectorId: body.sectorId,
          sector: body.sector,
          overallScore: body.overallScore,
          discoveryResponse,
          interviewPhase,
          conversationHistory,
        };

        const response: AgentResponse = await queryAgent(agentRequest);
        return NextResponse.json(response);
      }
    }
  } catch (error) {
    console.error('[E-ARI Agent API] Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal server error processing agent request' },
      { status: 500 }
    );
  }
}
