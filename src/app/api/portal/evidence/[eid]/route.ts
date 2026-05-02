import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { del } from "@vercel/blob";

/** DELETE /api/portal/evidence/[eid] */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ eid: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { eid } = await ctx.params;

    const row = await db.evidence.findFirst({
      where: {
        id: eid,
        userId: session.user.id,
        organizationLevel: true,
      },
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token?.trim()) {
      try {
        await del(row.storageKey, { token });
      } catch {
        /* continue */
      }
    }

    await db.evidence.delete({ where: { id: row.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("portal evidence DELETE:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
