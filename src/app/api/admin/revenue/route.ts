import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Pricing constants — directional MRR until Stripe webhooks are fully wired
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

// GET /api/admin/revenue — Revenue & billing analytics
export async function GET() {
  try {
    const authError = await verifyAdmin();
    if (authError) return authError;

    // Get all users with their tier and createdAt
    const users = await db.user.findMany({
      select: {
        id: true,
        tier: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const proUsers = users.filter((u) => u.tier === "professional");
    const enterpriseUsers = users.filter((u) => u.tier === "enterprise");
    const freeUsers = users.filter((u) => u.tier === "free" || u.tier !== "professional" && u.tier !== "enterprise");

    // MRR: count of active professional * $99 + count of active enterprise * $499
    const mrr = proUsers.length * PRO_MONTHLY + enterpriseUsers.length * ENTERPRISE_MONTHLY;

    // ARR: MRR * 12
    const arr = mrr * 12;

    // Total revenue: estimate based on when each paid user joined
    // For each pro/enterprise user, calculate months since they joined
    const now = new Date();
    let totalRevenue = 0;

    const monthlyRevenueMap: Record<string, number> = {};

    // Seed last 12 months with 0
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyRevenueMap[key] = 0;
    }

    // Calculate revenue per user per month
    for (const user of [...proUsers, ...enterpriseUsers]) {
      const joinDate = new Date(user.createdAt);
      const monthlyAmount = user.tier === "enterprise" ? ENTERPRISE_MONTHLY : PRO_MONTHLY;

      // Calculate months this user has been active
      const monthsActive =
        (now.getFullYear() - joinDate.getFullYear()) * 12 +
        (now.getMonth() - joinDate.getMonth()) +
        1;

      totalRevenue += monthlyAmount * Math.max(1, monthsActive);

      // Distribute revenue across months
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;

        // Check if user was active in this month
        if (joinDate <= new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)) {
          monthlyRevenueMap[key] += monthlyAmount;
        }
      }
    }

    // Build monthly revenue array for chart
    const monthlyRevenue = Object.entries(monthlyRevenueMap).map(([month, revenue]) => ({
      month,
      revenue,
    }));

    // ARPU: total revenue / total users
    const arpu = users.length > 0 ? Math.round((mrr / users.length) * 100) / 100 : 0;

    // Plan distribution
    const planDistribution = {
      free: freeUsers.length,
      professional: proUsers.length,
      enterprise: enterpriseUsers.length,
    };

    // Recent transactions — simulate from recent paid users
    // In production, this would come from Stripe
    const recentPaidUsers = await db.user.findMany({
      where: {
        tier: { in: ["professional", "enterprise"] },
      },
      select: {
        email: true,
        tier: true,
        createdAt: true,
        name: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const recentTransactions = recentPaidUsers.map((u, i) => ({
      id: `txn_${i}_${u.email.slice(0, 8)}`,
      email: u.email,
      name: u.name,
      amount: u.tier === "enterprise" ? ENTERPRISE_MONTHLY : PRO_MONTHLY,
      plan: u.tier,
      date: u.createdAt,
      status: "paid" as const,
    }));

    return NextResponse.json({
      mrr,
      arr,
      totalRevenue,
      arpu,
      monthlyRevenue,
      planDistribution,
      recentTransactions,
      proCount: proUsers.length,
      enterpriseCount: enterpriseUsers.length,
      freeCount: freeUsers.length,
    });
  } catch (error) {
    console.error("Admin revenue error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
