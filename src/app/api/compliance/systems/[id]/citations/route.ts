import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findComplianceSystem } from "@/lib/compliance/access";
import { getCitationsForObligation, getCitationsForPillar } from "@/lib/compliance/defensibility";

/** GET ?pillar=id | ?obligation=CODE */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: systemId } = await ctx.params;
    const sys = await findComplianceSystem(systemId, session.user.id, session.user.role);
    if (!sys) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const pillar = searchParams.get("pillar");
    const obligation = searchParams.get("obligation");

    if (pillar) {
      const citations = await getCitationsForPillar(systemId, pillar);
      return NextResponse.json({ pillar, citations });
    }
    if (obligation) {
      const citations = await getCitationsForObligation(systemId, obligation);
      return NextResponse.json({ obligation, citations });
    }

    return NextResponse.json({ error: "Specify pillar or obligation query param" }, { status: 400 });
  } catch (e) {
    console.error("citations GET:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
