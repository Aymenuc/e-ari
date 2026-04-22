import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Helper: verify the requesting user is an admin via DB lookup
async function verifyAdmin(): Promise<NextResponse | null> {
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

  return null; // null means authorized
}

// GET /api/admin/assessments — List all assessments with user details
export async function GET(req: NextRequest) {
  try {
    const authError = await verifyAdmin();
    if (authError) return authError;

    const url = new URL(req.url);
    const status = url.searchParams.get("status"); // filter by status
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const where = status ? { status } : {};

    const [assessments, total] = await Promise.all([
      db.assessment.findMany({
        where,
        select: {
          id: true,
          status: true,
          sector: true,
          overallScore: true,
          maturityBand: true,
          scoringVersion: true,
          completedAt: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              organization: true,
              tier: true,
            },
          },
          _count: {
            select: { responses: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.assessment.count({ where }),
    ]);

    const formatted = assessments.map((a) => ({
      id: a.id,
      status: a.status,
      sector: a.sector,
      overallScore: a.overallScore,
      maturityBand: a.maturityBand,
      scoringVersion: a.scoringVersion,
      completedAt: a.completedAt,
      createdAt: a.createdAt,
      responseCount: a._count.responses,
      user: {
        id: a.user.id,
        name: a.user.name,
        email: a.user.email,
        organization: a.user.organization,
        tier: a.user.tier,
      },
    }));

    return NextResponse.json({ assessments: formatted, total, limit, offset });
  } catch (error) {
    console.error("Admin assessments list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/assessments — Update assessment status (e.g., archive)
export async function PATCH(req: NextRequest) {
  try {
    const authError = await verifyAdmin();
    if (authError) return authError;

    const body = await req.json();
    const { assessmentId, status } = body;

    if (!assessmentId || typeof assessmentId !== "string") {
      return NextResponse.json(
        { error: "assessmentId is required" },
        { status: 400 }
      );
    }

    const VALID_STATUSES = ["draft", "completed", "archived"];
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const existing = await db.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    const updated = await db.assessment.update({
      where: { id: assessmentId },
      data: { status },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Admin assessment update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
