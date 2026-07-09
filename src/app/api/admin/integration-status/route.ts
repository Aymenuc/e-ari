import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/verify-admin";

/**
 * GET /api/admin/integration-status — REAL integration health from actual
 * env presence + a live DB ping. Replaces the hardcoded "Connected" badges
 * that showed green even when keys were missing (which genuinely happened —
 * the LLM keys were empty for days while this card claimed "Active").
 */
export async function GET() {
  const adminCheck = await verifyAdmin();
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: adminCheck.message }, { status: adminCheck.status });
  }

  const has = (v?: string) => typeof v === "string" && v.trim().length > 0 && !v.includes("placeholder");

  // DB: actually ping it.
  let dbOk = false;
  try {
    const { db } = await import("@/lib/db");
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch { dbOk = false; }

  const integrations = [
    { name: "PostgreSQL", ok: dbOk, detail: dbOk ? "Reachable" : "Unreachable" },
    { name: "Stripe", ok: has(process.env.STRIPE_SECRET_KEY), detail: has(process.env.STRIPE_SECRET_KEY) ? (process.env.STRIPE_SECRET_KEY!.startsWith("sk_live") ? "Live key" : "Test key") : "No key" },
    { name: "Resend Email", ok: has(process.env.RESEND_API_KEY), detail: has(process.env.RESEND_API_KEY) ? "Configured" : "No key" },
    { name: "Gemini / LLM", ok: has(process.env.GEMINI_API_KEY) || has(process.env.GLM_API_KEY) || has(process.env.DEEPSEEK_API_KEY), detail: has(process.env.GEMINI_API_KEY) ? "Gemini" : has(process.env.DEEPSEEK_API_KEY) ? "DeepSeek" : has(process.env.GLM_API_KEY) ? "GLM" : "No key" },
    { name: "Tavily Search", ok: has(process.env.TAVILY_API_KEY), detail: has(process.env.TAVILY_API_KEY) ? "Configured" : "No key" },
    { name: "Cron Secret", ok: has(process.env.CRON_SECRET), detail: has(process.env.CRON_SECRET) ? "Set" : "Unset (crons fail-closed)" },
    { name: "Sentry", ok: has(process.env.SENTRY_DSN), detail: has(process.env.SENTRY_DSN) ? "Active" : "Not configured" },
    { name: "SSO (OIDC)", ok: has(process.env.SSO_ISSUER), detail: has(process.env.SSO_ISSUER) ? "Configured" : "Not configured" },
  ];

  return NextResponse.json({ integrations });
}
