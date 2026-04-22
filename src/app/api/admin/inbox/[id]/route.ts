import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const message = await db.contactMessage.findUnique({
    where: { id: params.id },
    include: { replies: { orderBy: { sentAt: "asc" } } },
  });

  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(message);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { status, adminNote } = body as { status?: string; adminNote?: string };

  const updated = await db.contactMessage.update({
    where: { id: params.id },
    data: {
      ...(status ? { status } : {}),
      ...(adminNote !== undefined ? { adminNote } : {}),
      updatedAt: new Date(),
    },
    include: { replies: { orderBy: { sentAt: "asc" } } },
  });

  return NextResponse.json(updated);
}
