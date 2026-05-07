import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkQuota } from "@/lib/tier-limits";

/**
 * GET /api/quota — current month's usage for the signed-in user.
 *
 * Returns `assessment` and `pulse` counters with used / limit / remaining
 * and the reset timestamp. Limit is `null` for unlimited (Enterprise) so
 * the JSON serialises cleanly (Infinity becomes null).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { tier: true },
    });
    const tier = user?.tier ?? 'free';

    const [assessment, pulse, report] = await Promise.all([
      checkQuota(session.user.id, tier, 'assessment'),
      checkQuota(session.user.id, tier, 'pulse'),
      checkQuota(session.user.id, tier, 'report'),
    ]);

    const serialise = (q: Awaited<ReturnType<typeof checkQuota>>) => ({
      used: q.used,
      limit: Number.isFinite(q.limit) ? q.limit : null,
      remaining: Number.isFinite(q.remaining) ? q.remaining : null,
      allowed: q.allowed,
      resetsAt: q.resetsAt.toISOString(),
    });

    return NextResponse.json({
      tier,
      assessment: serialise(assessment),
      pulse: serialise(pulse),
      report: serialise(report),
    });
  } catch (error) {
    console.error("Quota GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
