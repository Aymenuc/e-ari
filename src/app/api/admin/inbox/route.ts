import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const messages = await db.contactMessage.findMany({
    where: status && status !== "all" ? { status } : undefined,
    include: { replies: { orderBy: { sentAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(messages);
}
