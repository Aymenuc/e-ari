import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardV1 } from "../../_lib";

/** GET (read) / PATCH / DELETE (write, Enterprise) a single registry entry. */

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { auth, fail } = await guardV1(req, "read");
  if (fail) return fail;
  const { id } = await ctx.params;
  const system = await db.aISystem.findFirst({
    where: { id, userId: auth.userId! },
    include: {
      obligationGaps: { where: { status: "open" }, select: { obligationCode: true, obligationLabel: true, severity: true } },
    },
  });
  if (!system) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: system });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { auth, fail } = await guardV1(req, "write");
  if (fail) return fail;
  const { id } = await ctx.params;
  const existing = await db.aISystem.findFirst({ where: { id, userId: auth.userId! } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const data: Record<string, string> = {};
  for (const f of ["name", "description", "purpose", "populationsAffected"] as const) {
    if (typeof body[f] === "string") data[f] = body[f].slice(0, 5000);
  }
  if (typeof body.deployerRole === "string" && ["provider", "deployer", "importer", "distributor"].includes(body.deployerRole)) {
    data.deployerRole = body.deployerRole;
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "No updatable fields provided." }, { status: 400 });
  const updated = await db.aISystem.update({ where: { id }, data });
  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { auth, fail } = await guardV1(req, "write");
  if (fail) return fail;
  const { id } = await ctx.params;
  const existing = await db.aISystem.findFirst({ where: { id, userId: auth.userId! } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.aISystem.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
