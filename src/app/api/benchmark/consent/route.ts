import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { recomputeSectorBenchmarks } from "@/lib/benchmark-engine";

// POST /api/benchmark/consent — Create/update benchmark consent
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { assessmentId, consented } = body;

    if (!assessmentId || typeof consented !== "boolean") {
      return NextResponse.json(
        { error: "assessmentId and consented (boolean) are required" },
        { status: 400 }
      );
    }

    // Verify the assessment belongs to the user
    const assessment = await db.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    if (assessment.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Upsert the consent record
    const existingConsent = await db.benchmarkConsent.findUnique({
      where: { assessmentId },
    });

    const isNewConsent = !existingConsent;
    const wasNotConsented = existingConsent && !existingConsent.consented;

    const consent = await db.benchmarkConsent.upsert({
      where: { assessmentId },
      create: {
        assessmentId,
        userId: session.user.id,
        consented,
      },
      update: {
        consented,
      },
    });

    // Update the assessment's benchmarkConsented field
    await db.assessment.update({
      where: { id: assessmentId },
      data: { benchmarkConsented: consented },
    });

    // If newly consented, trigger background benchmark recomputation for that sector
    if (consented && (isNewConsent || wasNotConsented)) {
      const sector = assessment.sector || "general";
      recomputeSectorBenchmarks(sector).catch(err => {
        console.error("Background benchmark recomputation failed:", err);
      });
    }

    return NextResponse.json(consent);
  } catch (error) {
    console.error("Benchmark consent POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
