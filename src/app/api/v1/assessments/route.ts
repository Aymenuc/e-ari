import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardV1 } from "../_lib";

/** GET /api/v1/assessments — completed assessments (read scope). */
export async function GET(req: NextRequest) {
  const { auth, fail } = await guardV1(req, "read");
  if (fail) return fail;
  const assessments = await db.assessment.findMany({
    where: { userId: auth.userId!, status: "completed", isPulse: false },
    orderBy: { completedAt: "desc" },
    take: 100,
    select: {
      id: true, sector: true, entityType: true, overallScore: true,
      maturityBand: true, scoringVersion: true, completedAt: true, pillarScores: true,
    },
  });
  return NextResponse.json({
    data: assessments.map((a) => ({
      ...a,
      pillarScores: a.pillarScores ? JSON.parse(a.pillarScores) : null,
    })),
  });
}
