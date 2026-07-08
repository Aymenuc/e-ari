import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deriveControls } from "@/lib/controls-derive";

/**
 * GET /api/controls — portal controls dashboard. Derivation lives in
 * src/lib/controls-derive.ts (shared with /api/v1/controls and the
 * weekly digest cron).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const result = await deriveControls(session.user.id);
    return NextResponse.json(result);
  } catch (e) {
    console.error("controls GET:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
