import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { verifyMemberToken } from "@/lib/member-tokens";
import { getTrainingModule, TRAINING_MODULES, MODULE_CONTENT_VERSION } from "@/lib/training-modules";
import { checkRateLimit, resolveIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";

/**
 * PUBLIC tokenized training endpoints (no auth account — HMAC magic link).
 * GET  → member's assigned modules + lesson content (quiz WITHOUT answers)
 * POST → { moduleId, answers: number[] } → grade, record completion on pass
 */

async function rateLimited(req: NextRequest) {
  const rate = await checkRateLimit("default", resolveIdentifier(null, req));
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: getRateLimitHeaders("default", rate) });
  }
  return null;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const limited = await rateLimited(req);
  if (limited) return limited;
  const { token } = await ctx.params;
  const payload = verifyMemberToken(token, "training");
  if (!payload) return NextResponse.json({ error: "This link is invalid or has expired. Ask your administrator to resend it." }, { status: 401 });

  const member = await db.teamMember.findUnique({ where: { id: payload.id } });
  if (!member) return NextResponse.json({ error: "Member not found." }, { status: 404 });

  const assignments = await db.trainingAssignment.findMany({ where: { memberId: member.id } });
  const completions = await db.trainingCompletion.findMany({ where: { memberId: member.id } });
  const owner = await db.user.findUnique({ where: { id: member.userId }, select: { organization: true, name: true } });

  const modules = assignments
    .map((a) => getTrainingModule(a.moduleId))
    .filter((m): m is NonNullable<typeof m> => !!m)
    .map((m) => ({
      id: m.id, title: m.title, minutes: m.minutes, lessons: m.lessons,
      // Strip correct-answer indexes before sending to the browser.
      quiz: m.quiz.map((q) => ({ q: q.q, options: q.options })),
      passThreshold: m.passThreshold,
      completed: completions.some((c) => c.moduleId === m.id),
      score: completions.find((c) => c.moduleId === m.id)?.quizScore ?? null,
    }));

  return NextResponse.json({
    memberName: member.name,
    orgName: owner?.organization || owner?.name || "your organisation",
    modules,
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const limited = await rateLimited(req);
  if (limited) return limited;
  const { token } = await ctx.params;
  const payload = verifyMemberToken(token, "training");
  if (!payload) return NextResponse.json({ error: "Invalid or expired link." }, { status: 401 });

  const member = await db.teamMember.findUnique({ where: { id: payload.id } });
  if (!member) return NextResponse.json({ error: "Member not found." }, { status: 404 });

  const body = (await req.json()) as { moduleId?: string; answers?: number[] };
  const mod = body.moduleId ? getTrainingModule(body.moduleId) : undefined;
  if (!mod || !Array.isArray(body.answers)) return NextResponse.json({ error: "moduleId and answers required" }, { status: 400 });

  // Must actually be assigned (prevents random module completion via token reuse)
  const assigned = await db.trainingAssignment.findUnique({
    where: { memberId_moduleId: { memberId: member.id, moduleId: mod.id } },
  });
  if (!assigned) return NextResponse.json({ error: "This module is not assigned to you." }, { status: 403 });

  const correct = mod.quiz.reduce((n, q, i) => n + (body.answers![i] === q.correct ? 1 : 0), 0);
  const score = correct / mod.quiz.length;
  const passed = score >= mod.passThreshold;

  if (passed) {
    const completedAt = new Date();
    const attestationHash = createHash("sha256")
      .update(`${member.id}|${mod.id}|${completedAt.toISOString()}|${MODULE_CONTENT_VERSION}`)
      .digest("hex");
    await db.trainingCompletion.upsert({
      where: { memberId_moduleId: { memberId: member.id, moduleId: mod.id } },
      create: { memberId: member.id, moduleId: mod.id, completedAt, quizScore: Math.round(score * 100), attestationHash },
      update: { completedAt, quizScore: Math.round(score * 100), attestationHash },
    });
  }

  return NextResponse.json({
    passed,
    score: Math.round(score * 100),
    required: Math.round(mod.passThreshold * 100),
    // Reveal correct answers only after an attempt, so the page can show feedback.
    correctAnswers: mod.quiz.map((q) => q.correct),
  });
}

/** Sanity export so the module list stays importable server-side. */
export const dynamic = "force-dynamic";
void TRAINING_MODULES;
