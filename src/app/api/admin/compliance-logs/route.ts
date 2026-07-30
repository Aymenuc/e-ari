import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/** GET /api/admin/compliance-logs — paginated Compliance LLM observability (admin only). */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestingUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!requestingUser || requestingUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10));
    let pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
    pageSize = Math.min(100, Math.max(1, pageSize));
    const maxOffset = 2000;
    if (page * pageSize > maxOffset) {
      return NextResponse.json({ error: "page out of range" }, { status: 400 });
    }

    const operationRaw = searchParams.get("operation");
    const operation =
      operationRaw && operationRaw.trim().length > 0 ? operationRaw.trim() : undefined;
    const successParam = searchParams.get("success");
    const success =
      successParam === "true" ? true : successParam === "false" ? false : undefined;

    const where = {
      ...(operation ? { operation } : {}),
      ...(success !== undefined ? { success } : {}),
    };

    /**
     * Spend rollups.
     *
     * The table already showed input/output tokens per call, but with no
     * aggregate anywhere an operator could read individual rows and still have
     * no idea what the month costs. These windows answer "what am I spending,
     * and did it just change" — which is the question a per-row log cannot.
     *
     * Unpriced deliberately: rates differ per model and change without notice,
     * so a hardcoded €/token would quietly go stale and be worse than no number
     * at all. Tokens are the honest unit; multiply by your current rate card.
     */
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [logs, total, day, month, byModel, failures] = await Promise.all([
      db.complianceLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: page * pageSize,
        take: pageSize,
      }),
      db.complianceLog.count({ where }),
      db.complianceLog.aggregate({
        where: { createdAt: { gte: dayAgo } },
        _sum: { inputTokens: true, outputTokens: true },
        _count: true,
      }),
      db.complianceLog.aggregate({
        where: { createdAt: { gte: monthAgo } },
        _sum: { inputTokens: true, outputTokens: true },
        _count: true,
      }),
      db.complianceLog.groupBy({
        by: ["model"],
        where: { createdAt: { gte: monthAgo } },
        _sum: { inputTokens: true, outputTokens: true },
        _count: true,
      }),
      db.complianceLog.count({
        where: { createdAt: { gte: monthAgo }, success: false },
      }),
    ]);

    const spend = {
      day: {
        calls: day._count,
        inputTokens: day._sum.inputTokens ?? 0,
        outputTokens: day._sum.outputTokens ?? 0,
      },
      month: {
        calls: month._count,
        inputTokens: month._sum.inputTokens ?? 0,
        outputTokens: month._sum.outputTokens ?? 0,
        failures,
      },
      byModel: byModel
        .map((m) => ({
          model: m.model,
          calls: m._count,
          tokens: (m._sum.inputTokens ?? 0) + (m._sum.outputTokens ?? 0),
        }))
        .sort((a, b) => b.tokens - a.tokens),
    };

    return NextResponse.json({
      logs,
      total,
      page,
      pageSize,
      hasMore: (page + 1) * pageSize < total,
      spend,
    });
  } catch (error) {
    console.error("Admin compliance-logs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
