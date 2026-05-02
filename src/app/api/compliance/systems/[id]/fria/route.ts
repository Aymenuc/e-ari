import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { findComplianceSystem } from "@/lib/compliance/access";
import { generateOrUpdateFRIA } from "@/lib/compliance/fria-generator";
import { sendComplianceFriaReadyEmail } from "@/lib/email-service";

const friaStatusSchema = z.object({
  status: z.enum(["draft", "review", "finalized"]),
});

/** GET /api/compliance/systems/[id]/fria */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: systemId } = await ctx.params;
    const sys = await findComplianceSystem(systemId, session.user.id, session.user.role);
    if (!sys) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const fria = await db.fRIA.findUnique({ where: { systemId } });
    return NextResponse.json(fria);
  } catch (e) {
    console.error("fria GET:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST /api/compliance/systems/[id]/fria — generate draft */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: systemId } = await ctx.params;
    const sys = await findComplianceSystem(systemId, session.user.id, session.user.role);
    if (!sys) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await generateOrUpdateFRIA(systemId, sys);
    const fria = await db.fRIA.findUnique({ where: { systemId } });

    try {
      await db.notification.create({
        data: {
          userId: session.user.id,
          type: "fria_ready",
          title: "FRIA draft generated",
          message: `A FRIA draft is ready for ${sys.name}.`,
          actionUrl: `/compliance/systems/${systemId}/fria`,
        },
      });
    } catch {}

    void sendComplianceFriaReadyEmail(
      session.user.id,
      session.user.email || "",
      session.user.name,
      sys.name
    ).catch(() => {});

    return NextResponse.json(fria);
  } catch (e) {
    console.error("fria POST:", e);
    const msg = e instanceof Error ? e.message : "FRIA generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** PATCH — workflow status (finalize locks record for regulator pack exports) */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: systemId } = await ctx.params;
    const sys = await findComplianceSystem(systemId, session.user.id, session.user.role);
    if (!sys) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const existing = await db.fRIA.findUnique({ where: { systemId } });
    if (!existing) return NextResponse.json({ error: "Generate FRIA first" }, { status: 400 });

    const body = await req.json();
    const parsed = friaStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    if (existing.status === "finalized" && parsed.data.status !== "finalized") {
      return NextResponse.json({ error: "FRIA is finalized and cannot be reverted via API." }, { status: 409 });
    }

    const finalizedAt =
      parsed.data.status === "finalized" ? existing.finalizedAt ?? new Date() : null;

    const updated = await db.fRIA.update({
      where: { systemId },
      data: {
        status: parsed.data.status,
        finalizedAt,
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("fria PATCH:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
