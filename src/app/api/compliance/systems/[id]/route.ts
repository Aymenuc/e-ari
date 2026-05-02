import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { findComplianceSystem, findComplianceSystemDetail } from "@/lib/compliance/access";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(8000).optional(),
  purpose: z.string().min(1).max(8000).optional(),
  deployerRole: z.enum(["provider", "deployer", "importer", "distributor"]).optional(),
  sector: z.string().min(1).max(120).optional(),
  populationsAffected: z.string().max(8000).optional().nullable(),
});

/** GET /api/compliance/systems/[id] */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await ctx.params;
    const system = await findComplianceSystemDetail(id, session.user.id, session.user.role);
    if (!system) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(system);
  } catch (e) {
    console.error("compliance system GET:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PATCH /api/compliance/systems/[id] */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await ctx.params;
    const existing = await findComplianceSystem(id, session.user.id, session.user.role);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await db.aISystem.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("compliance system PATCH:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE /api/compliance/systems/[id] */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await ctx.params;
    const existing = await findComplianceSystem(id, session.user.id, session.user.role);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.aISystem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("compliance system DELETE:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
