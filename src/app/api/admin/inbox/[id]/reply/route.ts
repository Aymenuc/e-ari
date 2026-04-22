import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendCustomEmail } from "@/lib/email-service";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { subject, replyBody } = body as { subject: string; replyBody: string };

  if (!subject?.trim() || !replyBody?.trim()) {
    return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
  }

  const message = await db.contactMessage.findUnique({ where: { id: params.id } });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Store reply in DB
  const reply = await db.contactReply.create({
    data: { contactMessageId: params.id, subject, body: replyBody },
  });

  // Mark original message as replied
  await db.contactMessage.update({
    where: { id: params.id },
    data: { status: "replied", updatedAt: new Date() },
  });

  // Send email to the original sender
  await sendCustomEmail(message.email, message.name, subject, replyBody);

  return NextResponse.json(reply);
}
