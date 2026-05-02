import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

interface PortalInboxItem {
  id: string;
  kind: "critical_gap" | "attestation_due" | "unclassified" | "draft_fria";
  title: string;
  subtitle?: string;
  href: string;
}

/** GET /api/portal/inbox — prioritized compliance actions */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const [systems, criticalGaps, plans] = await Promise.all([
      db.aISystem.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          riskTier: true,
          classifiedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 24,
      }),
      db.obligationGap.findMany({
        where: {
          system: { userId },
          severity: "critical",
          status: "open",
        },
        take: 15,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          obligationLabel: true,
          systemId: true,
          system: { select: { name: true } },
        },
      }),
      db.monitoringPlan.findMany({
        where: {
          system: { userId },
          nextAttestationAt: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        },
        select: {
          nextAttestationAt: true,
          system: { select: { id: true, name: true } },
        },
        take: 12,
      }),
    ]);

    const items: PortalInboxItem[] = [];

    for (const g of criticalGaps) {
      items.push({
        id: `gap-${g.id}`,
        kind: "critical_gap",
        title: g.obligationLabel,
        subtitle: g.system.name,
        href: `/portal/use-cases/systems/${g.systemId}/gaps`,
      });
    }

    const seenPlan = new Set<string>();
    for (const p of plans) {
      const sid = p.system.id;
      if (seenPlan.has(sid)) continue;
      seenPlan.add(sid);
      const due = p.nextAttestationAt
        ? `Due ${p.nextAttestationAt.toISOString().slice(0, 10)}`
        : "Due soon";
      items.push({
        id: `plan-${sid}`,
        kind: "attestation_due",
        title: `Monitoring attestation · ${p.system.name}`,
        subtitle: due,
        href: `/portal/use-cases/systems/${sid}`,
      });
    }

    for (const s of systems) {
      if (!s.classifiedAt) {
        items.push({
          id: `classify-${s.id}`,
          kind: "unclassified",
          title: `Classify risk tier · ${s.name}`,
          subtitle: "AI Act classification pending",
          href: `/portal/use-cases/systems/${s.id}`,
        });
      }
    }

    const frias = await db.fRIA.findMany({
      where: {
        system: { userId },
        status: { not: "finalized" },
        finalizedAt: null,
      },
      take: 8,
      select: {
        id: true,
        systemId: true,
        system: { select: { name: true } },
      },
    });
    for (const f of frias) {
      items.push({
        id: `fria-${f.id}`,
        kind: "draft_fria",
        title: `Finalize FRIA · ${f.system.name}`,
        subtitle: "Required for regulator submission pack",
        href: `/portal/use-cases/systems/${f.systemId}/fria`,
      });
    }

    items.splice(25);

    return NextResponse.json({ items });
  } catch (e) {
    console.error("portal inbox:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
