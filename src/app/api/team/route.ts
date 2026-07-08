import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveWorkspace, canManage, getSeatLimit } from "@/lib/workspace";
import { signMemberToken } from "@/lib/member-tokens";
import { sendCustomEmail } from "@/lib/email-service";
import { getBaseUrl } from "@/lib/site-url";
import { checkRateLimit, resolveIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ["admin", "member", "viewer"];

/** GET /api/team — seats + pending invites for the current workspace. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ws = await resolveWorkspace(session.user.id);

  const memberships = await db.orgMembership.findMany({
    where: { ownerId: ws.ownerId, status: { in: ["invited", "active"] } },
    orderBy: { invitedAt: "asc" },
  });
  const owner = await db.user.findUnique({
    where: { id: ws.ownerId },
    select: { name: true, email: true, organization: true, tier: true },
  });
  const memberUsers = await db.user.findMany({
    where: { id: { in: memberships.map((m) => m.memberUserId).filter((x): x is string => !!x) } },
    select: { id: true, name: true, email: true },
  });

  const seatLimit = getSeatLimit(owner?.tier);
  return NextResponse.json({
    workspace: {
      ownerName: owner?.organization || owner?.name || owner?.email,
      yourRole: ws.role,
      isGuest: ws.isGuest,
      seatLimit: Number.isFinite(seatLimit) ? seatLimit : null,
      seatsUsed: 1 + memberships.filter((m) => m.status === "active").length,
    },
    members: memberships.map((m) => ({
      id: m.id,
      email: m.invitedEmail,
      role: m.role,
      status: m.status,
      name: memberUsers.find((u) => u.id === m.memberUserId)?.name ?? null,
      invitedAt: m.invitedAt,
      acceptedAt: m.acceptedAt,
    })),
  });
}

/** POST /api/team — invite { email, role }. Owner/admin only. */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rate = await checkRateLimit("default", resolveIdentifier(session.user.id, req));
    if (!rate.allowed) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429, headers: getRateLimitHeaders("default", rate) });

    const ws = await resolveWorkspace(session.user.id);
    if (!canManage(ws.role)) return NextResponse.json({ error: "Only the owner or an admin can invite seats." }, { status: 403 });

    const body = await req.json();
    const email = String(body.email || "").toLowerCase().trim();
    const role = VALID_ROLES.includes(body.role) ? body.role : "member";
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Valid email required." }, { status: 400 });

    const owner = await db.user.findUnique({ where: { id: ws.ownerId }, select: { tier: true, organization: true, name: true, email: true } });
    if (owner?.email?.toLowerCase() === email) return NextResponse.json({ error: "That's the workspace owner." }, { status: 400 });

    const activeSeats = await db.orgMembership.count({ where: { ownerId: ws.ownerId, status: "active" } });
    const limit = getSeatLimit(owner?.tier);
    if (Number.isFinite(limit) && activeSeats + 1 >= limit) {
      // +1 for the owner's own seat
      return NextResponse.json(
        { error: `Your tier includes ${limit} seats (including the owner). Upgrade to add more.`, upgradeRequired: true },
        { status: 402 },
      );
    }

    const membership = await db.orgMembership.upsert({
      where: { ownerId_invitedEmail: { ownerId: ws.ownerId, invitedEmail: email } },
      create: { ownerId: ws.ownerId, invitedEmail: email, role },
      update: { role, status: "invited", memberUserId: null, acceptedAt: null },
    });

    const orgName = owner?.organization || owner?.name || "an E-ARI workspace";
    const token = signMemberToken(membership.id, "training"); // reuse HMAC infra; purpose disambiguated by route
    const link = `${getBaseUrl().replace(/\/+$/, "")}/team/accept?token=${encodeURIComponent(token)}`;
    const res = await sendCustomEmail(
      email, null,
      `You've been invited to join ${orgName} on E-ARI`,
      `You've been invited to join ${orgName}'s compliance workspace on E-ARI as ${role}.\n\nAccept the invitation here (you'll be asked to sign in or create a free account first):\n${link}\n\nThe invitation expires in 30 days.`,
    );

    return NextResponse.json({ invited: true, emailed: res.sent, id: membership.id }, { status: 201 });
  } catch (e) {
    console.error("team POST:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PATCH /api/team — { id, role } change a seat's role. Owner/admin only. */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ws = await resolveWorkspace(session.user.id);
  if (!canManage(ws.role)) return NextResponse.json({ error: "Only the owner or an admin can manage seats." }, { status: 403 });
  const body = await req.json();
  const role = VALID_ROLES.includes(body.role) ? body.role : null;
  if (!body.id || !role) return NextResponse.json({ error: "id and valid role required" }, { status: 400 });
  const m = await db.orgMembership.findFirst({ where: { id: String(body.id), ownerId: ws.ownerId } });
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.orgMembership.update({ where: { id: m.id }, data: { role } });
  return NextResponse.json({ updated: true });
}

/** DELETE /api/team?id=… — revoke a seat/invite. Owner/admin only. */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ws = await resolveWorkspace(session.user.id);
  if (!canManage(ws.role)) return NextResponse.json({ error: "Only the owner or an admin can manage seats." }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const m = await db.orgMembership.findFirst({ where: { id, ownerId: ws.ownerId } });
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.orgMembership.update({ where: { id }, data: { status: "revoked" } });
  return NextResponse.json({ revoked: true });
}
