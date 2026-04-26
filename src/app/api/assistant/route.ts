import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPipelineContext } from '@/lib/orchestrator';
import type { PipelineContext } from '@/lib/orchestrator';
import { checkRateLimit, getRateLimitHeaders, resolveIdentifier } from '@/lib/rate-limit';
import { LLM_API_URL, LLM_MODEL } from '@/lib/llm-config';

const SYSTEM_PROMPT = `You are the E-ARI AI Assistant, an expert in enterprise AI readiness assessment. You help users understand the 8-pillar framework (Strategy, Data, Technology, Talent, Governance, Culture, Process, Security), explain scoring methodology, interpret maturity bands (Laggard 0-25, Follower 26-50, Chaser 51-75, Pacesetter 76-100), and guide them through the assessment process. Be concise, professional, and actionable.

Key information about E-ARI:
- 8 pillars: Strategy & Vision (15% weight), Data & Infrastructure (15%), Technology & Tools (12%), Talent & Skills (13%), Governance & Ethics (15%), Culture & Change Management (10%), Process & Operations (10%), Security & Compliance (10%)
- Each pillar has 5 questions on a Likert scale (1-5)
- Raw scores are normalized to 0-100 per pillar
- Interdependency rules apply: If Governance < 30, Technology is capped at 70%. If Data < 30, Strategy is capped at 85%.
- Maturity bands: Laggard (0-25), Follower (26-50), Chaser (51-75), Pacesetter (76-100)
- The overall score is a weighted combination of all pillar scores
- AI insights are generated from scores but never alter the computed results
- The Discovery Agent helps stakeholders prepare for assessment through guided interviews

Keep responses under 5 paragraphs. Use bullet points for lists. Reference specific pillars, scores, and pipeline results when relevant. Provide specific, actionable advice grounded in the user's assessment data.`;

const DISCOVERY_SYSTEM_PROMPT = `You are the E-ARI Discovery Agent, an AI-powered stakeholder interview tool. Your role is to conduct a guided interview to understand an organization's AI readiness context before they take the formal assessment.

Interview flow:
1. Start by asking about the organization (name, industry, size)
2. Ask about current AI initiatives and their maturity
3. Explore pain points and challenges with AI adoption
4. Discuss strategic priorities and leadership commitment
5. Understand data and technology infrastructure readiness
6. Assess talent and cultural readiness

Guidelines:
- Ask one question at a time
- Be conversational but professional
- Acknowledge responses before moving to the next topic
- After gathering sufficient context (6-8 exchanges), provide a preliminary readiness profile
- The preliminary profile should identify likely strengths and gaps based on the interview
- Suggest which pillars to focus on in the formal assessment

Keep each response to 2-3 sentences max, except for the final profile which can be longer.`;

/** Sector-specific guidance for the assistant */
const SECTOR_GUIDANCE: Record<string, string> = {
  healthcare: 'For healthcare organizations, emphasize HIPAA compliance, clinical AI governance, FDA SaMD pathways, EHR data integration, and patient safety considerations. Regulatory readiness is critical.',
  finance: 'For financial services, focus on SR 11-7 model risk management, fair lending compliance, AML/KYC automation, real-time risk monitoring, and regulatory reporting. Model explainability and audit trails are essential.',
  manufacturing: 'For manufacturing, emphasize Industry 4.0 readiness, IoT/OT data pipelines, predictive maintenance, quality inspection AI, and supply chain optimization. Edge computing and OT/IT convergence are key enablers.',
  technology: 'For technology companies, focus on MLOps maturity, production ML systems, feature store architecture, CI/CD for ML, and responsible AI practices. Product-led AI strategy and platform thinking are differentiators.',
  government: 'For government agencies, emphasize FedRAMP compliance, NIST AI RMF, public trust and transparency, citizen-centric AI, legacy system integration, and inter-agency data sharing. Procurement and acquisition pathways for AI are critical.',
  retail: 'For retail organizations, focus on customer data platforms, personalization engines, demand forecasting, omnichannel AI, and consumer privacy (GDPR/CCPA). Real-time recommendation and inventory optimization are key use cases.',
  education: 'For education institutions, emphasize adaptive learning platforms, student data privacy (FERPA), learning analytics, faculty AI literacy, and institutional digital transformation. Assessment automation and learning path optimization are high-impact areas.',
  energy: 'For energy sector organizations, focus on SCADA/IoT data pipelines, predictive maintenance for critical assets, NERC CIP compliance, digital twin strategy, and safety-critical AI governance. Edge AI for remote monitoring is a key enabler.',
};

function getFallbackResponse(messages: { role: string; content: string }[], mode?: string): string {
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  const userContent = lastUserMessage?.content?.toLowerCase() || '';

  if (mode === 'discovery') {
    return "I'd love to learn about your organization. Could you tell me about your industry and the size of your organization?";
  }

  if (userContent.includes('score') || userContent.includes('scoring')) {
    return 'E-ARI scores are calculated using a weighted combination across 8 pillars. Each pillar is normalized to 0-100, then multiplied by its weight. The weights are: Strategy (15%), Data (15%), Governance (15%), Talent (13%), Technology (12%), Culture (10%), Process (10%), Security (10%). Interdependency adjustments may apply if certain pillars score very low.';
  }

  if (userContent.includes('methodology') || userContent.includes('pillar') || userContent.includes('framework')) {
    return 'The E-ARI framework evaluates AI readiness across 8 pillars: Strategy & Vision, Data & Infrastructure, Technology & Tools, Talent & Skills, Governance & Ethics, Culture & Change Management, Process & Operations, and Security & Compliance. Each pillar has 5 Likert-scale questions, with weights reflecting strategic importance.';
  }

  if (userContent.includes('maturity') || userContent.includes('band') || userContent.includes('laggard') || userContent.includes('pacesetter')) {
    return 'E-ARI maturity bands are: Laggard (0-25) — minimal readiness, Follower (26-50) — early stage, Chaser (51-75) — progressing, Pacesetter (76-100) — advanced. Your band is determined by the weighted overall score after interdependency adjustments.';
  }

  if (userContent.includes('assessment') || userContent.includes('help') || userContent.includes('guide')) {
    return 'The E-ARI assessment takes about 15-20 minutes. You\'ll answer 40 questions (5 per pillar) on a Likert scale from Strongly Disagree to Strongly Agree. Select your industry sector first for contextualized insights. You can save and resume at any time. Would you like to start an assessment?';
  }

  return 'I can help you understand E-ARI scores, methodology, maturity bands, or guide you through the assessment. What would you like to know more about?';
}

/**
 * Build a rich context block from pipeline results.
 * Falls back to raw score-only context if no pipeline results exist.
 */
async function buildPipelineContext(
  assessmentId: string,
  fallbackContext?: {
    overallScore?: number;
    maturityBand?: string;
    pillarScores?: { name: string; score: number }[];
    sector?: string;
    orgSize?: string;
  }
): Promise<string> {
  let pipelineCtx: PipelineContext | null = null;

  try {
    pipelineCtx = await getPipelineContext(assessmentId);
  } catch {
    // Pipeline context unavailable — will use fallback
  }

  // If no pipeline context, fall back to raw scores only
  if (!pipelineCtx || !pipelineCtx.scoringResult) {
    return buildFallbackContextBlock(fallbackContext);
  }

  const sections: string[] = [];

  // ─── Scoring Results ───
  const scoring = pipelineCtx.scoringResult;
  sections.push(`OVERALL E-ARI SCORE: ${Math.round(scoring.overallScore)}% (${scoring.maturityLabel} maturity band)`);
  sections.push(`PILLAR SCORES: ${scoring.pillarScores.map(p => `${p.pillarName}: ${Math.round(p.normalizedScore)}% (${p.maturityLabel})`).join(', ')}`);

  if (scoring.pillarScores.some(p => p.adjustments.length > 0)) {
    const adjDescs = scoring.pillarScores
      .filter(p => p.adjustments.length > 0)
      .flatMap(p => p.adjustments.map(a => `${p.pillarName}: ${a.description}`));
    sections.push(`INTERDEPENDENCY ADJUSTMENTS: ${adjDescs.join('; ')}`);
  }

  // ─── Insight Results ───
  if (pipelineCtx.insightResult) {
    const insight = pipelineCtx.insightResult;
    sections.push(`INSIGHT AGENT — STRENGTHS: ${insight.strengths.join('; ')}`);
    sections.push(`INSIGHT AGENT — GAPS: ${insight.gaps.join('; ')}`);
    sections.push(`INSIGHT AGENT — RISKS: ${insight.risks.join('; ')}`);
    sections.push(`INSIGHT AGENT — OPPORTUNITIES: ${insight.opportunities.join('; ')}`);
    if (insight.executiveSummary) {
      sections.push(`EXECUTIVE SUMMARY: ${insight.executiveSummary}`);
    }
    if (insight.nextSteps.length > 0) {
      sections.push(`RECOMMENDED NEXT STEPS: ${insight.nextSteps.join('; ')}`);
    }
  }

  // ─── Discovery Findings ───
  if (pipelineCtx.discoveryResult) {
    const disc = pipelineCtx.discoveryResult;
    sections.push(`DISCOVERY AGENT — LANDSCAPE: ${disc.landscapeAnalysis}`);
    sections.push(`DISCOVERY AGENT — COMPETITIVE POSITION: ${disc.competitivePosition}`);
    if (disc.gapIndicators.length > 0) {
      sections.push(`DISCOVERY AGENT — GAP INDICATORS: ${disc.gapIndicators.map(g => `${g.pillar} (${g.severity}): ${g.indicator}`).join('; ')}`);
    }
    if (disc.regulatorySignals.length > 0) {
      sections.push(`DISCOVERY AGENT — REGULATORY SIGNALS: ${disc.regulatorySignals.join('; ')}`);
    }
    if (disc.techStackInsights.length > 0) {
      sections.push(`DISCOVERY AGENT — TECH STACK: ${disc.techStackInsights.join('; ')}`);
    }
  }

  // ─── Roadmap Phases ───
  if (pipelineCtx.roadmapResult && pipelineCtx.roadmapResult.length > 0) {
    const roadmapStr = pipelineCtx.roadmapResult
      .map(phase => `Phase "${phase.phase}" (${phase.timeframe}): Objectives — ${phase.objectives.join(', ')}; Key Actions — ${phase.keyActions.join(', ')}; Investment — ${phase.investmentLevel}; Pillar Focus — ${phase.pillarFocus.join(', ')}`)
      .join(' | ');
    sections.push(`ROADMAP: ${roadmapStr}`);
  }

  // ─── Benchmark Comparison ───
  if (pipelineCtx.benchmarkResult) {
    const bench = pipelineCtx.benchmarkResult;
    sections.push(`BENCHMARK — Sector: ${bench.sector}, Sector Average: ${bench.averageScore}%, Top Quartile: ${bench.topQuartile}%, Bottom Quartile: ${bench.bottomQuartile}%`);
    if (bench.pillarBenchmarks.length > 0) {
      sections.push(`BENCHMARK — PILLAR COMPARISON: ${bench.pillarBenchmarks.map(b => `${b.pillarId}: User ${b.userScore}% vs Sector Avg ${b.sectorAverage}% (Percentile: ${b.percentile})`).join('; ')}`);
    }
    if (bench.insight) {
      sections.push(`BENCHMARK — INSIGHT: ${bench.insight}`);
    }
  }

  // ─── Strategic Recommendations ───
  if (pipelineCtx.recommendationResult) {
    sections.push(`STRATEGIC RECOMMENDATION: ${pipelineCtx.recommendationResult}`);
  }

  // ─── Sector ───
  if (pipelineCtx.sector && pipelineCtx.sector !== 'general') {
    sections.push(`SECTOR: ${pipelineCtx.sector}`);
  }
  if (pipelineCtx.orgSize) {
    sections.push(`ORG SIZE: ${pipelineCtx.orgSize}`);
  }

  return `\n\n--- USER ASSESSMENT PIPELINE CONTEXT (use this to personalize responses) ---\n${sections.join('\n')}\n--- END PIPELINE CONTEXT ---\n\nReference the user's actual scores, insights, roadmap, and benchmarks when relevant. Provide specific, actionable advice grounded in their pipeline results.`;
}

/**
 * Build a fallback context block from raw scores only.
 * Used when no pipeline results are available.
 */
function buildFallbackContextBlock(context?: {
  overallScore?: number;
  maturityBand?: string;
  pillarScores?: { name: string; score: number }[];
  sector?: string;
  orgSize?: string;
}): string {
  if (!context || !context.overallScore) return '';

  const pillarDetail = context.pillarScores?.length
    ? `\nPillar scores: ${context.pillarScores.map(p => `${p.name}: ${p.score}%`).join(', ')}`
    : '';

  return `\n\n--- USER ASSESSMENT CONTEXT (use this to personalize responses) ---\nOverall E-ARI Score: ${context.overallScore}% (${context.maturityBand || 'Unknown'} maturity band)${pillarDetail}\nSector: ${context.sector || 'Not specified'} | Org Size: ${context.orgSize || 'Not specified'}\n--- END CONTEXT ---\n\nReference the user's actual scores when relevant. Provide specific, actionable advice based on their results.`;
}

export async function POST(req: NextRequest) {
  let parsedMessages: { role: string; content: string }[] = [];
  let parsedMode: string | undefined;

  try {
    // ── Auth Check ──
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Tier Check: Assistant requires Professional or Enterprise ──
    const user = await db.user.findUnique({ where: { id: session.user.id } });
    const tier = user?.tier || 'free';
    if (tier === 'free') {
      return NextResponse.json(
        { error: 'Assistant requires Professional or Enterprise tier', upgradeRequired: true },
        { status: 403 }
      );
    }

    // Rate limit assistant calls
    const identifier = resolveIdentifier(session.user.id, req);
    const rateResult = checkRateLimit("assistant", identifier);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before sending another message.', retryAfter: rateResult.retryAfter },
        { status: 429, headers: getRateLimitHeaders("assistant", rateResult) }
      );
    }

    const body = await req.json();
    const { messages, mode, context } = body;
    parsedMessages = messages || [];
    parsedMode = mode;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    // Select system prompt based on mode
    const basePrompt = mode === 'discovery'
      ? DISCOVERY_SYSTEM_PROMPT
      : SYSTEM_PROMPT;

    // Fetch user's latest assessment for context enrichment
    let assessmentContext: { overallScore?: number; maturityBand?: string; pillarScores?: { name: string; score: number }[]; sector?: string; orgSize?: string } = {};
    let latestAssessmentId: string | null = null;
    let assessmentSector: string | null = null;
    try {
      const latestAssessment = await db.assessment.findFirst({
        where: { userId: session.user.id, status: 'completed' },
        orderBy: { completedAt: 'desc' },
        include: { responses: true, user: true },
      });
      if (latestAssessment?.overallScore) {
        latestAssessmentId = latestAssessment.id;
        assessmentSector = latestAssessment.user.sector || null;
        const { scoreAssessment } = await import('@/lib/assessment-engine');
        const responseMap: Record<string, number> = {};
        latestAssessment.responses.forEach(r => { responseMap[r.questionId] = r.answer; });
        const scoringResult = scoreAssessment(responseMap);
        assessmentContext = {
          overallScore: Math.round(scoringResult.overallScore),
          maturityBand: scoringResult.maturityLabel,
          pillarScores: scoringResult.pillarScores.map(p => ({ name: p.pillarName, score: Math.round(p.normalizedScore) })),
          sector: latestAssessment.user.sector || undefined,
          orgSize: latestAssessment.user.orgSize || undefined,
        };
      }
    } catch {
      // Could not fetch assessment context — continue without it
    }

    // Build rich pipeline context if we have an assessment ID
    const contextBlock = latestAssessmentId
      ? await buildPipelineContext(latestAssessmentId, context || assessmentContext)
      : buildFallbackContextBlock(context || assessmentContext);

    // Add sector-specific guidance if available
    const sector = assessmentSector || (context?.sector as string) || (assessmentContext.sector);
    const sectorGuidance = sector && sector !== 'general' && SECTOR_GUIDANCE[sector]
      ? `\n\n--- SECTOR-SPECIFIC GUIDANCE ---\n${SECTOR_GUIDANCE[sector]}\n--- END SECTOR GUIDANCE ---\n\nTailor your advice for the ${sector} sector using this guidance.`
      : '';

    const systemPrompt = basePrompt + contextBlock + sectorGuidance;

    // Build the messages array for the LLM — retain 20 messages (up from 10)
    const chatMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.slice(-20).map((m: { role: string; content: string }) => ({
        role: (m.role === 'user' || m.role === 'assistant' ? m.role : 'user') as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const glmResp = await fetch(
      LLM_API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: chatMessages,
          max_tokens: 1500,
          temperature: 0.3,
        }),
      }
    );
    if (!glmResp.ok) {
      const errText = await glmResp.text();
      console.error('LLM API error:', glmResp.status, errText);
      throw new Error(`LLM service error: ${glmResp.status}`);
    }
    const glmRespData = await glmResp.json();
    const completion = { choices: glmRespData.choices };

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json({
        message: getFallbackResponse(messages, mode),
      });
    }

    return NextResponse.json({ message: content });
  } catch (error) {
    console.error('Assistant API error:', error);
    // Use fallback with the parsed messages (may be empty if parsing failed)
    return NextResponse.json({
      message: getFallbackResponse(parsedMessages, parsedMode),
    });
  }
}
