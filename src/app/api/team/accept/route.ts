import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyMemberToken } from "@/lib/member-tokens";

/**
 * POST /api/team/accept — { token }. Requires a signed-in session: the
 * invitee signs in (or registers free) first, then accepts. The invite
 * binds to the email it was sent to — a different account can't claim it.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Sign in first, then accept the invitation." }, { status: 401 });
    }
    const { token } = (await req.json()) as { token?: string };
    const payload = token ? verifyMemberToken(token, "training") : null;
    if (!payload) return NextResponse.json({ error: "This invitation link is invalid or has expired." }, { status: 400 });

    const membership = await db.orgMembership.findUnique({ where: { id: payload.id } });
    if (!membership || membership.status === "revoked") {
      return NextResponse.json({ error: "This invitation is no longer valid." }, { status: 404 });
    }
    if (membership.invitedEmail.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json(
        { error: `This invitation was sent to ${membership.invitedEmail}. Sign in with that email to accept it.` },
        { status: 403 },
      );
    }
    if (membership.ownerId === session.user.id) {
      return NextResponse.json({ error: "You own this workspace." }, { status: 400 });
    }

    // One workspace per account: accepting replaces any other membership.
    await db.orgMembership.updateMany({
      where: { memberUserId: session.user.id, status: "active", NOT: { id: membership.id } },
      data: { status: "revoked" },
    });
    await db.orgMembership.update({
      where: { id: membership.id },
      data: { memberUserId: session.user.id, status: "active", acceptedAt: new Date() },
    });

    const owner = await db.user.findUnique({ where: { id: membership.ownerId }, select: { organization: true, name: true } });
    return NextResponse.json({ accepted: true, workspace: owner?.organization || owner?.name || "workspace", role: membership.role });
  } catch (e) {
    console.error("team accept:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
