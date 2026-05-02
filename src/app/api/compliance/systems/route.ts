import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(8000),
  purpose: z.string().min(1).max(8000),
  deployerRole: z.enum(["provider", "deployer", "importer", "distributor"]),
  sector: z.string().min(1).max(120),
  populationsAffected: z.string().max(8000).optional().nullable(),
  assessmentId: z.string().optional().nullable(),
});

/** GET /api/compliance/systems — list AI systems for current user */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const systems = await db.aISystem.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { evidence: true, obligationGaps: true } },
      },
    });

    return NextResponse.json(systems);
  } catch (e) {
    console.error("compliance systems GET:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST /api/compliance/systems — create AI system */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const { assessmentId: rawAid, ...rest } = parsed.data;
    const assessmentId = rawAid?.trim() || null;

    if (assessmentId) {
      const a = await db.assessment.findFirst({
        where: { id: assessmentId, userId: session.user.id, status: "completed" },
      });
      if (!a) {
        return NextResponse.json({ error: "Assessment not found or not completed" }, { status: 400 });
      }
    }

    const system = await db.aISystem.create({
      data: {
        userId: session.user.id,
        assessmentId: assessmentId ?? null,
        ...rest,
        populationsAffected: rest.populationsAffected ?? null,
      },
    });

    return NextResponse.json(system, { status: 201 });
  } catch (e) {
    console.error("compliance systems POST:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
