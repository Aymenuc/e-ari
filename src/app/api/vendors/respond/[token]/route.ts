import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyMemberToken } from "@/lib/member-tokens";
import { VENDOR_QUESTIONS, QUESTIONNAIRE_VERSION, scoreVendorQuestionnaire } from "@/lib/vendor-questionnaire";
import { checkRateLimit, resolveIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";

/** PUBLIC tokenized vendor questionnaire. GET → questions; POST → answers. */

function rateLimited(req: NextRequest) {
  const rate = checkRateLimit("default", resolveIdentifier(null, req));
  if (!rate.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: getRateLimitHeaders("default", rate) });
  return null;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const limited = rateLimited(req);
  if (limited) return limited;
  const { token } = await ctx.params;
  const payload = verifyMemberToken(token, "vendor_questionnaire");
  if (!payload) return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 401 });
  const vendor = await db.vendor.findUnique({ where: { id: payload.id } });
  if (!vendor) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const owner = await db.user.findUnique({ where: { id: vendor.userId }, select: { organization: true, name: true } });
  return NextResponse.json({
    vendorName: vendor.name,
    requesterOrg: owner?.organization || owner?.name || "the requesting organisation",
    alreadyCompleted: vendor.questionnaireStatus === "completed",
    version: QUESTIONNAIRE_VERSION,
    questions: VENDOR_QUESTIONS.map((q) => ({ id: q.id, section: q.section, text: q.text, options: q.options.map((o) => o.label) })),
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const limited = rateLimited(req);
  if (limited) return limited;
  const { token } = await ctx.params;
  const payload = verifyMemberToken(token, "vendor_questionnaire");
  if (!payload) return NextResponse.json({ error: "Invalid or expired link." }, { status: 401 });
  const vendor = await db.vendor.findUnique({ where: { id: payload.id } });
  if (!vendor) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = (await req.json()) as { answers?: Record<string, number> };
  if (!body.answers || typeof body.answers !== "object") return NextResponse.json({ error: "answers required" }, { status: 400 });

  // Sanitize: keep only known question ids with valid option indexes
  const clean: Record<string, number> = {};
  for (const q of VENDOR_QUESTIONS) {
    const v = body.answers[q.id];
    if (typeof v === "number" && v >= 0 && v < q.options.length) clean[q.id] = v;
  }
  const result = scoreVendorQuestionnaire(clean);

  await db.vendor.update({
    where: { id: vendor.id },
    data: {
      questionnaireStatus: "completed",
      questionnaireJson: JSON.stringify({ answers: clean, result, submittedAt: new Date().toISOString() }),
      questionnaireVersion: QUESTIONNAIRE_VERSION,
      riskScore: result.score,
      riskTier: result.riskTier,
      riskSummary: buildSummary(vendor.name, result),
      reviewedAt: new Date(),
      nextReviewAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  return NextResponse.json({ submitted: true, score: result.score, riskTier: result.riskTier });
}

function buildSummary(name: string, r: ReturnType<typeof scoreVendorQuestionnaire>): string {
  const flagText = r.flags.length > 0 ? ` Flags: ${[...new Set(r.flags)].join(", ")}.` : " No critical flags raised.";
  const weakest = Object.entries(r.sectionScores).sort((a, b) => a[1] - b[1])[0];
  return `${name} scored ${r.score}/100 (${r.riskTier} risk) across ${r.answered}/${VENDOR_QUESTIONS.length} answered questions.${flagText}${weakest ? ` Weakest area: ${weakest[0]} (${weakest[1]}/100).` : ""}`;
}
