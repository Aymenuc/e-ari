import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendCustomEmail } from "@/lib/email-service";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { recipientId, tier, subject, body: messageBody } = body as {
    recipientId?: string;
    tier?: string;
    subject: string;
    body: string;
  };

  if (!subject?.trim() || !messageBody?.trim()) {
    return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
  }

  // ── Single user ──────────────────────────────────────────────────────────
  if (recipientId) {
    const user = await db.user.findUnique({ where: { id: recipientId }, select: { email: true, name: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await sendCustomEmail(user.email, user.name, subject, messageBody);
    return NextResponse.json({ message: `Email sent to ${user.email}` });
  }

  // ── Broadcast ────────────────────────────────────────────────────────────
  const where = tier && tier !== "all" ? { tier } : {};
  const users = await db.user.findMany({ where, select: { email: true, name: true } });

  if (users.length === 0) {
    return NextResponse.json({ error: "No users found for the selected tier" }, { status: 404 });
  }

  // Send in batches of 10 to avoid overwhelming the email service
  const results: PromiseSettledResult<Awaited<ReturnType<typeof sendCustomEmail>>>[] = [];
  for (let i = 0; i < users.length; i += 10) {
    const batch = users.slice(i, i + 10);
    const batchResults = await Promise.allSettled(
      batch.map((u) => sendCustomEmail(u.email, u.name, subject, messageBody))
    );
    results.push(...batchResults);
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ message: `Email sent to ${sent} of ${users.length} users` });
}
