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

    const [logs, total] = await Promise.all([
      db.complianceLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: page * pageSize,
        take: pageSize,
      }),
      db.complianceLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      pageSize,
      hasMore: (page + 1) * pageSize < total,
    });
  } catch (error) {
    console.error("Admin compliance-logs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
