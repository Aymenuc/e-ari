import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const VALID_TIERS = ["free", "professional", "enterprise"];
const VALID_ROLES = ["user", "admin"];

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

// GET /api/admin/users — List all users with assessment counts
export async function GET() {
  try {
    const authError = await verifyAdmin();
    if (authError) return authError;

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
    const authError = await verifyAdmin();
    if (authError) return authError;

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
