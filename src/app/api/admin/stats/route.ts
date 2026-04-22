import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/admin/stats — Admin dashboard statistics (enhanced)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Server-side admin check: query the DB, don't trust the session
    const requestingUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!requestingUser || requestingUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Run aggregations in parallel for performance
    const [
      totalUsers,
      proUsers,
      enterpriseUsers,
      totalAssessments,
      completedAssessments,
      draftAssessments,
      archivedAssessments,
      // New metrics
      usersThisMonth,
      assessmentsThisMonth,
      usersWithAssessment,
      paidUsers,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { tier: "professional" } }),
      db.user.count({ where: { tier: "enterprise" } }),
      db.assessment.count(),
      db.assessment.count({ where: { status: "completed" } }),
      db.assessment.count({ where: { status: "draft" } }),
      db.assessment.count({ where: { status: "archived" } }),
      // Users who signed up this month
      db.user.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      // Assessments created this month
      db.assessment.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      // Users who have at least one assessment (for conversion funnel)
      db.user.count({
        where: { assessments: { some: {} } },
      }),
      // Users on paid tiers (for conversion funnel)
      db.user.count({
        where: { tier: { in: ["professional", "enterprise"] } },
      }),
    ]);

    // Active users this month = users who logged in or had any activity
    // Since we don't have a lastLogin field, approximate by users who created assessments recently
    const activeUsersThisMonth = await db.user.count({
      where: {
        assessments: {
          some: {
            createdAt: { gte: thirtyDaysAgo },
          },
        },
      },
    });

    // Conversion funnel
    const conversionFunnel = {
      signups: totalUsers,
      firstAssessment: usersWithAssessment,
      upgradeToPro: paidUsers,
      signupToAssessment: totalUsers > 0 ? Math.round((usersWithAssessment / totalUsers) * 100) : 0,
      assessmentToUpgrade: usersWithAssessment > 0 ? Math.round((paidUsers / usersWithAssessment) * 100) : 0,
    };

    return NextResponse.json({
      totalUsers,
      totalAssessments,
      proUsers,
      enterpriseUsers,
      completedAssessments,
      draftAssessments,
      archivedAssessments,
      // Enhanced metrics
      usersThisMonth,
      assessmentsThisMonth,
      activeUsersThisMonth,
      conversionFunnel,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
