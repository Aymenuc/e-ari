import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveWorkspace, canWrite } from "@/lib/workspace";
import { db } from "@/lib/db";
import { getResourceCap } from "@/lib/tier-limits";
import { parseCsvObjects } from "@/lib/csv-parse";

const ROSTER_ALIASES = {
  name: ["name", "full name", "fullname", "employee name", "display name"],
  email: ["email", "email address", "e-mail", "work email", "mail"],
  role: ["role", "title", "job title", "position"],
  department: ["department", "dept", "team", "division"],
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** GET /api/literacy/members — roster + per-member completion counts */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ws = await resolveWorkspace(session.user.id);
  const members = await db.teamMember.findMany({
    where: { userId: ws.ownerId },
    orderBy: { createdAt: "asc" },
    include: { completions: { select: { moduleId: true, completedAt: true, quizScore: true } } },
  });
  const assignments = await db.trainingAssignment.findMany({
    where: { userId: ws.ownerId },
    select: { memberId: true, moduleId: true, sentAt: true },
  });
  return NextResponse.json({ members, assignments });
}

/** POST /api/literacy/members — { name,email,role?,department? } or { csvText } */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ws = await resolveWorkspace(session.user.id);
    if (!canWrite(ws.role)) return NextResponse.json({ error: "Your seat is view-only in this workspace." }, { status: 403 });
    const user = await db.user.findUnique({ where: { id: ws.ownerId }, select: { tier: true } });
    const cap = getResourceCap(user?.tier, "member");
    const current = await db.teamMember.count({ where: { userId: ws.ownerId } });

    const body = await req.json();
    type Row = { name: string; email: string; role?: string; department?: string };
    let rows: Row[] = [];
    if (typeof body.csvText === "string") {
      rows = parseCsvObjects(body.csvText.slice(0, 2_000_000), ROSTER_ALIASES, ["name", "email"]) as unknown as Row[];
      if (rows.length === 0) {
        return NextResponse.json({ error: "Could not find name + email columns in the CSV." }, { status: 400 });
      }
    } else if (body.name && body.email) {
      rows = [{ name: String(body.name), email: String(body.email), role: body.role, department: body.department }];
    } else {
      return NextResponse.json({ error: "Provide name+email or csvText." }, { status: 400 });
    }

    rows = rows.filter((r) => EMAIL_RE.test(r.email)).slice(0, 5000);
    if (Number.isFinite(cap) && current + rows.length > cap) {
      return NextResponse.json(
        { error: `Your tier allows ${cap} team member${cap === 1 ? "" : "s"} (currently ${current}). Upgrade to add more.`, upgradeRequired: true },
        { status: 402 },
      );
    }

    let created = 0;
    for (const r of rows) {
      await db.teamMember.upsert({
        where: { userId_email: { userId: ws.ownerId, email: r.email.toLowerCase() } },
        create: {
          userId: ws.ownerId, name: r.name.slice(0, 200), email: r.email.toLowerCase().slice(0, 254),
          role: r.role?.slice(0, 120) || null, department: r.department?.slice(0, 120) || null,
        },
        update: { name: r.name.slice(0, 200), role: r.role?.slice(0, 120) || null, department: r.department?.slice(0, 120) || null },
      });
      created++;
    }
    return NextResponse.json({ imported: created }, { status: 201 });
  } catch (e) {
    console.error("literacy/members POST:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE /api/literacy/members?id=… */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ws = await resolveWorkspace(session.user.id);
    if (!canWrite(ws.role)) return NextResponse.json({ error: "Your seat is view-only in this workspace." }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const member = await db.teamMember.findFirst({ where: { id, userId: ws.ownerId } });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.trainingAssignment.deleteMany({ where: { memberId: id } });
  await db.teamMember.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
