import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { checkRateLimit, getRateLimitHeaders, resolveIdentifier } from '@/lib/rate-limit';
import { LLM_API_URL } from '@/lib/llm-config';

export async function POST(req: NextRequest) {
  try {
    // ── Auth Check ──
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Tier Check: Literacy requires Professional, Growth, or Enterprise ──
    const user = await db.user.findUnique({ where: { id: session.user.id } });
    const tier = user?.tier || 'free';
    if (tier === 'free') {
      return NextResponse.json(
        { error: 'AI Literacy training requires Professional, Growth, or Enterprise tier', upgradeRequired: true },
        { status: 403 }
      );
    }

    // Rate limit literacy (LLM-powered learning paths)
    const identifier = resolveIdentifier(session.user.id, req);
    const rateResult = checkRateLimit("literacy", identifier);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before generating another learning path.', retryAfter: rateResult.retryAfter },
        { status: 429, headers: getRateLimitHeaders("literacy", rateResult) }
      );
    }

    const body = await req.json();
    const { quizScores, role, sector, action } = body;

    // Handle department insights action
    if (action === 'department_insights') {
      return await handleDepartmentInsights(sector);
    }

    if (!quizScores) {
      return NextResponse.json({ error: 'Quiz scores are required' }, { status: 400 });
    }

    // Build context from quiz results
    const categoryScores = Object.entries(quizScores as Record<string, { score: number; total: number }>).map(
      ([id, data]) => `${id}: ${Math.round((data.score / data.total) * 100)}%`
    ).join(', ');

    const roleInfo = role ? `Role: ${role}.` : '';
    const sectorInfo = sector ? `Sector: ${sector}.` : '';

    const prompt = `You are an AI literacy training advisor for the E-ARI platform. Based on the user's quiz performance and profile, generate a personalized AI learning path.

Quiz scores: ${categoryScores}
${roleInfo} ${sectorInfo}

Generate a JSON response with this exact format:
{
  "overallLevel": "Beginner|Developing|Proficient|Expert",
  "summary": "2-3 sentence assessment of their current AI literacy",
  "recommendedPath": [
    {
      "order": 1,
      "title": "Module title",
      "description": "Why this module and what they'll learn",
      "duration": "estimated hours",
      "priority": "critical|high|moderate",
      "topics": ["topic1", "topic2", "topic3"]
    }
  ],
  "strengths": ["area1", "area2"],
  "gaps": ["gap1", "gap2"],
  "nextMilestone": "What they should aim to achieve next"
}

Rules:
- Recommend 3-5 modules ordered by priority
- Focus modules on the WEAKEST areas first
- Tailor descriptions to the user's role if provided
- Keep topics practical and actionable
- Do not fabricate external course links`;

    try {
      const glmResp1 = await fetch(
        LLM_API_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GLM_API_KEY}`,
          },
          body: JSON.stringify({
            model: "zai-org/GLM-5.1-FP8",
            messages: [
              { role: 'system', content: 'You are an AI literacy training advisor. Generate personalized learning paths based on assessment data. Always respond with valid JSON only.' },
              { role: 'user', content: prompt },
            ],
            max_tokens: 1200,
            temperature: 0.4,
          }),
        }
      );

      if (!glmResp1.ok) {
        const errorText = await glmResp1.text();
        console.error('LLM API error:', glmResp1.status, errorText);
        throw new Error('LLM service unavailable');
      }

      const glmData1 = await glmResp1.json();
      const completion = { choices: glmData1.choices };

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response');

      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      const parsed = JSON.parse(jsonStr);

      return NextResponse.json({
        ...parsed,
        isAIGenerated: true,
        modelUsed: 'GLM-5.1',
      });
    } catch (llmError) {
      console.error('LLM unavailable for literacy path:', llmError);

      // Deterministic fallback based on quiz scores
      const totalScore = Object.values(quizScores as Record<string, { score: number; total: number }>).reduce(
        (acc, v) => acc + v.score, 0
      );
      const totalPossible = Object.values(quizScores as Record<string, { score: number; total: number }>).reduce(
        (acc, v) => acc + v.total, 0
      );
      const pct = Math.round((totalScore / totalPossible) * 100);

      const level = pct >= 80 ? 'Expert' : pct >= 60 ? 'Proficient' : pct >= 40 ? 'Developing' : 'Beginner';

      return NextResponse.json({
        overallLevel: level,
        summary: `Based on your quiz performance (${pct}%), your AI literacy is at the ${level} level. Focus on the areas where you scored lowest to build a well-rounded understanding.`,
        recommendedPath: [
          { order: 1, title: 'AI Foundations for Business Leaders', description: 'Build a solid foundation in AI concepts and terminology', duration: '4 hours', priority: 'critical', topics: ['What AI can and cannot do', 'Identifying AI use cases', 'Building an AI strategy'] },
          { order: 2, title: 'Data Literacy for AI Readiness', description: 'Understanding data quality and governance for AI', duration: '3 hours', priority: 'high', topics: ['Data quality essentials', 'Understanding data pipelines', 'Data governance basics'] },
          { order: 3, title: 'AI Ethics & Responsible Innovation', description: 'Navigate the ethical landscape of AI deployment', duration: '5 hours', priority: 'moderate', topics: ['Bias detection', 'Transparency requirements', 'Impact assessment'] },
        ],
        strengths: pct >= 60 ? ['Strong conceptual understanding'] : ['Willingness to learn'],
        gaps: pct < 60 ? ['Foundational AI concepts', 'Practical application knowledge'] : ['Advanced governance frameworks'],
        nextMilestone: pct >= 60 ? 'Explore advanced MLOps and governance topics' : 'Complete foundational AI literacy modules',
        isAIGenerated: false,
      });
    }
  } catch (error) {
    console.error('Literacy API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleDepartmentInsights(sector?: string): Promise<NextResponse> {
  const sectorInfo = sector ? ` for the ${sector} sector` : '';

  const prompt = `You are an AI literacy analyst for the E-ARI platform. Generate realistic AI literacy scores and insights for 8 typical enterprise departments${sectorInfo}.

Generate a JSON response with this exact format:
{
  "departments": [
    {
      "name": "Department Name",
      "score": <number 0-100>,
      "respondents": <number>,
      "insights": "One sentence insight about this department's AI literacy strengths and gaps"
    }
  ]
}

Include these 8 departments: Engineering, Data Science, Product, Marketing, Finance, Operations, HR, Legal.
Rules:
- Scores should vary realistically (not all high, not all low)
- Engineering and Data Science typically score highest
- Legal and Operations typically score lowest
- Insights should mention specific AI literacy gaps or strengths
- Respondents should be realistic numbers (20-200)
- Respond with valid JSON only`;

  try {
    const glmResp2 = await fetch(
      LLM_API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: "zai-org/GLM-5.1-FP8",
          messages: [
            { role: 'system', content: 'You are an AI literacy analyst. Generate department-level AI IQ data based on organizational patterns. Always respond with valid JSON only.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 800,
          temperature: 0.3,
        }),
      }
    );

    if (!glmResp2.ok) {
      const errorText = await glmResp2.text();
      console.error('LLM API error:', glmResp2.status, errorText);
      return NextResponse.json({ error: 'LLM service unavailable' }, { status: 503 });
    }

    const glmData2 = await glmResp2.json();
    const completion = { choices: glmData2.choices };

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response');

    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const parsed = JSON.parse(jsonStr);

    return NextResponse.json({
      ...parsed,
      isAIGenerated: true,
      modelUsed: 'z-ai-llm',
    });
  } catch {
    // Fallback: return empty so client uses its own fallback data
    return NextResponse.json({
      departments: [],
      isAIGenerated: false,
    });
  }
}
