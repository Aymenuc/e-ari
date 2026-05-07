import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const VALID_TIERS = ["free", "professional", "growth", "enterprise"];
const VALID_ROLES = ["user", "admin"];

// GET /api/admin/users — List all users with assessment counts
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        tier: true,
        role: true,
        organization: true,
        createdAt: true,
        _count: {
          select: { assessments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      tier: user.tier,
      role: user.role,
      organization: user.organization,
      createdAt: user.createdAt,
      assessmentCount: user._count.assessments,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Admin users list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users — Update user tier or role
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, tier, role } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // At least one of tier or role must be provided
    if (!tier && !role) {
      return NextResponse.json(
        { error: "At least one of tier or role must be provided" },
        { status: 400 }
      );
    }

    // Validate tier if provided
    if (tier && !VALID_TIERS.includes(tier)) {
      return NextResponse.json(
        { error: `Invalid tier. Must be one of: ${VALID_TIERS.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate role if provided
    if (role && !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    // Check user exists
    const existingUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Last-admin guard — refuse a role change that would leave the platform
    // with zero admins. Without this check, the only admin could downgrade
    // themselves (or the last remaining admin could be downgraded by another
    // admin in a race) and lock the platform out of admin operations.
    if (role && role !== "admin" && existingUser.role === "admin") {
      const remainingAdmins = await db.user.count({
        where: { role: "admin", id: { not: userId } },
      });
      if (remainingAdmins === 0) {
        return NextResponse.json(
          { error: "Cannot demote the last remaining admin. Promote another user first." },
          { status: 400 },
        );
      }
    }

    // Build update data
    const updateData: { tier?: string; role?: string } = {};
    if (tier) updateData.tier = tier;
    if (role) updateData.role = role;

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        tier: true,
        role: true,
        organization: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Admin user update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users?userId=... — Delete a user account
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own admin account" },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await db.user.delete({ where: { id: userId } });
    return NextResponse.json({ success: true, deletedUserId: userId });
  } catch (error) {
    console.error("Admin user delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
