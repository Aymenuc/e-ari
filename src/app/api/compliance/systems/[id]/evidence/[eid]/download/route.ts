import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findEvidenceForSession } from "@/lib/compliance/access";
import { downloadEvidenceBuffer } from "@/lib/compliance/evidence-download";

/** GET — stream original bytes (authenticated); supports hash verification clientside */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string; eid: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: systemId, eid } = await ctx.params;
    const ev = await findEvidenceForSession(systemId, eid, session.user.id, session.user.role);
    if (!ev) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const buf = await downloadEvidenceBuffer(ev.storageKey);
    const safeName = ev.filename.replace(/[^\w.\-()+ ]/g, "_").slice(0, 200) || "evidence.bin";

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": ev.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "X-Sha256": ev.sha256,
      },
    });
  } catch (e) {
    console.error("evidence download:", e);
    const msg = e instanceof Error ? e.message : "Download failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
