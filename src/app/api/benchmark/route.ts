import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSectorStats, recomputeBenchmarks } from "@/lib/benchmark-engine";

// GET /api/benchmark?sector=healthcare — Returns benchmark data for a sector
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sector = searchParams.get("sector");

    if (!sector) {
      return NextResponse.json(
        { error: "sector query parameter is required" },
        { status: 400 }
      );
    }

    const sectorStats = await getSectorStats(sector);

    return NextResponse.json(sectorStats);
  } catch (error) {
    console.error("Benchmark GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/benchmark — Recompute benchmark snapshots (admin-only)
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    }

    const snapshotCount = await recomputeBenchmarks();

    return NextResponse.json({
      message: "Benchmarks recomputed successfully",
      snapshotCount,
    });
  } catch (error) {
    console.error("Benchmark POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
