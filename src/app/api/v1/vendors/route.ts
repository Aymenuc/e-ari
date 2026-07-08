import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardV1 } from "../_lib";

/** GET /api/v1/vendors — vendor registry with risk results (read scope). */
export async function GET(req: NextRequest) {
  const { auth, fail } = await guardV1(req, "read");
  if (fail) return fail;
  const vendors = await db.vendor.findMany({
    where: { userId: auth.userId! },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true, name: true, category: true, dpaStatus: true, riskScore: true,
      riskTier: true, riskSummary: true, questionnaireStatus: true,
      questionnaireVersion: true, reviewedAt: true, nextReviewAt: true, createdAt: true,
    },
  });
  return NextResponse.json({ data: vendors });
}
