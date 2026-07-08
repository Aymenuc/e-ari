import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, type ApiAuthResult } from "@/lib/api-keys";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

/**
 * Shared guard for /api/v1/* handlers: authenticate the key, enforce
 * per-key rate limits (default bucket: 30 req / 15 min), and hand back
 * the authenticated context.
 */
export async function guardV1(
  req: NextRequest,
  scope: "read" | "write" = "read",
): Promise<{ auth: ApiAuthResult; fail: NextResponse | null }> {
  const auth = await authenticateApiKey(req.headers.get("authorization"), scope);
  if (!auth.ok) {
    return { auth, fail: NextResponse.json({ error: auth.error }, { status: auth.status ?? 401 }) };
  }
  const rate = checkRateLimit("default", `apikey:${auth.keyId}`);
  if (!rate.allowed) {
    return {
      auth,
      fail: NextResponse.json(
        { error: "Rate limit exceeded.", retryAfter: rate.retryAfter },
        { status: 429, headers: getRateLimitHeaders("default", rate) },
      ),
    };
  }
  return { auth, fail: null };
}
