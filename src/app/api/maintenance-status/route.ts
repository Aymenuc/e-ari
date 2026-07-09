import { NextResponse } from "next/server";
import { getSetting } from "@/lib/platform-settings";

/**
 * PUBLIC GET /api/maintenance-status — read by the edge proxy on every
 * request (with a 30 s in-isolate cache) to enforce the admin's
 * maintenance-mode toggle. Deliberately tiny and unauthenticated.
 */
export async function GET() {
  try {
    const maintenance = await getSetting("maintenance_mode");
    return NextResponse.json(
      { maintenance: maintenance === true },
      { headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" } },
    );
  } catch {
    // If the DB is unreachable we fail OPEN (site stays up) — maintenance
    // mode is an operator convenience, not a security control.
    return NextResponse.json({ maintenance: false });
  }
}
