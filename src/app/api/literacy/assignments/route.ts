import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { signMemberToken } from "@/lib/member-tokens";
import { getTrainingModule } from "@/lib/training-modules";
import { sendCustomEmail } from "@/lib/email-service";
import { getBaseUrl } from "@/lib/site-url";
import { checkRateLimit, resolveIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";

/**
 * POST /api/literacy/assignments — { memberIds: string[], moduleIds: string[] }
 * Creates assignments and emails each member ONE magic link covering all
 * their assigned modules (the training page lists them).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const identifier = resolveIdentifier(session.user.id, req);
    const rate = checkRateLimit("default", identifier);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded.", retryAfter: rate.retryAfter }, { status: 429, headers: getRateLimitHeaders("default", rate) });
    }

    const { memberIds, moduleIds } = (await req.json()) as { memberIds?: string[]; moduleIds?: string[] };
    if (!Array.isArray(memberIds) || !Array.isArray(moduleIds) || memberIds.length === 0 || moduleIds.length === 0) {
      return NextResponse.json({ error: "memberIds and moduleIds required" }, { status: 400 });
    }
    const validModules = moduleIds.filter((m) => getTrainingModule(m));
    if (validModules.length === 0) return NextResponse.json({ error: "No valid module IDs" }, { status: 400 });

    const members = await db.teamMember.findMany({
      where: { id: { in: memberIds.slice(0, 500) }, userId: session.user.id },
    });
    if (members.length === 0) return NextResponse.json({ error: "No matching members" }, { status: 404 });

    const owner = await db.user.findUnique({ where: { id: session.user.id }, select: { organization: true, name: true } });
    const orgName = owner?.organization || owner?.name || "your organisation";
    const base = getBaseUrl().replace(/\/+$/, "");

    let assigned = 0;
    let emailed = 0;
    for (const member of members) {
      for (const moduleId of validModules) {
        await db.trainingAssignment.upsert({
          where: { memberId_moduleId: { memberId: member.id, moduleId } },
          create: { userId: session.user.id, memberId: member.id, moduleId, sentAt: new Date() },
          update: { sentAt: new Date() },
        });
        assigned++;
      }
      const token = signMemberToken(member.id, "training");
      const link = `${base}/train/${token}`;
      const res = await sendCustomEmail(
        member.email,
        member.name,
        `Action required: AI literacy training for ${orgName}`,
        `${orgName} has assigned you AI literacy training required under Article 4 of the EU AI Act.\n\nComplete your modules here (no account needed, ~10-15 minutes each):\n${link}\n\nThis link is personal to you and expires in 30 days.`,
      );
      if (res.sent) emailed++;
    }

    return NextResponse.json({ assigned, emailed, members: members.length });
  } catch (e) {
    console.error("literacy/assignments POST:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
