import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const PRO_MONTHLY = 99;
const ENTERPRISE_MONTHLY = 499;

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

  return null;
}

// GET /api/admin/subscribers — List professional/enterprise users with billing details
export async function GET(req: NextRequest) {
  try {
    const authError = await verifyAdmin();
    if (authError) return authError;

    const url = new URL(req.url);
    const planFilter = url.searchParams.get("plan"); // "professional" | "enterprise" | null (all paid)

    const where: { tier: { in: string[] } } = {
      tier: { in: planFilter ? [planFilter] : ["professional", "enterprise"] },
    };

    const subscribers = await db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        organization: true,
        tier: true,
        createdAt: true,
        _count: {
          select: { assessments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = subscribers.map((sub) => ({
      id: sub.id,
      email: sub.email,
      name: sub.name,
      organization: sub.organization,
      plan: sub.tier,
      monthlyAmount: sub.tier === "enterprise" ? ENTERPRISE_MONTHLY : PRO_MONTHLY,
      status: "active" as const, // In production, would come from Stripe subscription status
      joinedDate: sub.createdAt,
      assessmentCount: sub._count.assessments,
    }));

    return NextResponse.json({ subscribers: formatted, total: formatted.length });
  } catch (error) {
    console.error("Admin subscribers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
