import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { findComplianceSystem } from "@/lib/compliance/access";
import { generateOrUpdateTechnicalFile } from "@/lib/compliance/technical-file-generator";
import { ensureMonitoringPlan } from "@/lib/compliance/monitoring-plan";

const tfStatusSchema = z.object({
  status: z.enum(["draft", "finalized"]),
});

/** GET /api/compliance/systems/[id]/technical-file */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: systemId } = await ctx.params;
    const sys = await findComplianceSystem(systemId, session.user.id, session.user.role);
    if (!sys) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const tf = await db.technicalFile.findUnique({ where: { systemId } });
    return NextResponse.json(tf);
  } catch (e) {
    console.error("technical-file GET:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST /api/compliance/systems/[id]/technical-file — generate Annex IV draft */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: systemId } = await ctx.params;
    const sys = await findComplianceSystem(systemId, session.user.id, session.user.role);
    if (!sys) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await generateOrUpdateTechnicalFile(systemId, sys);
    await ensureMonitoringPlan(systemId);

    const tf = await db.technicalFile.findUnique({ where: { systemId } });
    return NextResponse.json(tf);
  } catch (e) {
    console.error("technical-file POST:", e);
    const msg = e instanceof Error ? e.message : "Technical file generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** PATCH — lifecycle status (finalize locks for regulator submission pack) */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: systemId } = await ctx.params;
    const sys = await findComplianceSystem(systemId, session.user.id, session.user.role);
    if (!sys) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const existing = await db.technicalFile.findUnique({ where: { systemId } });
    if (!existing) return NextResponse.json({ error: "Generate technical file first" }, { status: 400 });

    const body = await req.json();
    const parsed = tfStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    if (existing.status === "finalized" && parsed.data.status !== "finalized") {
      return NextResponse.json(
        { error: "Technical file is finalized and cannot be reverted via API." },
        { status: 409 },
      );
    }

    const updated = await db.technicalFile.update({
      where: { systemId },
      data: { status: parsed.data.status },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("technical-file PATCH:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
