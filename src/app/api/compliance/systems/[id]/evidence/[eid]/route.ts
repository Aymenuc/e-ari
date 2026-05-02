import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { del } from "@vercel/blob";
import { findEvidenceForSession } from "@/lib/compliance/access";

/** GET /api/compliance/systems/[id]/evidence/[eid] */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string; eid: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: systemId, eid } = await ctx.params;
    const row = await findEvidenceForSession(systemId, eid, session.user.id, session.user.role);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token?.trim()) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
    }

    const { head } = await import("@vercel/blob");
    const meta = await head(row.storageKey, { token }).catch(() => null);

    return NextResponse.json({
      ...row,
      blobExists: !!meta,
    });
  } catch (e) {
    console.error("evidence GET:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE /api/compliance/systems/[id]/evidence/[eid] */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string; eid: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: systemId, eid } = await ctx.params;
    const row = await findEvidenceForSession(systemId, eid, session.user.id, session.user.role);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token?.trim()) {
      try {
        await del(row.storageKey, { token });
      } catch {
        // continue DB delete even if blob missing
      }
    }

    await db.evidence.delete({ where: { id: row.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("evidence DELETE:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
