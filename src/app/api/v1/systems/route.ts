import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardV1 } from "../_lib";

/** GET /api/v1/systems — AI registry (read). POST — create entry (write, Enterprise). */

export async function GET(req: NextRequest) {
  const { auth, fail } = await guardV1(req, "read");
  if (fail) return fail;
  const systems = await db.aISystem.findMany({
    where: { userId: auth.userId! },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true, name: true, description: true, purpose: true, deployerRole: true,
      sector: true, riskTier: true, riskRationale: true, classifiedAt: true,
      vendorId: true, createdAt: true,
    },
  });
  return NextResponse.json({ data: systems });
}

export async function POST(req: NextRequest) {
  const { auth, fail } = await guardV1(req, "write");
  if (fail) return fail;
  const body = await req.json().catch(() => ({}));
  const required = ["name", "description", "purpose", "deployerRole", "sector"] as const;
  for (const f of required) {
    if (!body[f] || typeof body[f] !== "string") {
      return NextResponse.json({ error: `Field '${f}' is required (string).` }, { status: 400 });
    }
  }
  if (!["provider", "deployer", "importer", "distributor"].includes(body.deployerRole)) {
    return NextResponse.json({ error: "deployerRole must be provider | deployer | importer | distributor" }, { status: 400 });
  }
  const system = await db.aISystem.create({
    data: {
      userId: auth.userId!,
      name: String(body.name).slice(0, 200),
      description: String(body.description).slice(0, 5000),
      purpose: String(body.purpose).slice(0, 5000),
      deployerRole: body.deployerRole,
      sector: String(body.sector).slice(0, 60),
      populationsAffected: body.populationsAffected ? String(body.populationsAffected).slice(0, 5000) : null,
    },
  });
  return NextResponse.json({ data: system }, { status: 201 });
}
