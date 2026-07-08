import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { applicableObligationsForTier, clauseSupportsObligation } from "@/lib/progression";

/**
 * GET /api/controls — Vanta-style continuous-controls view, DERIVED from
 * existing data (no new source of truth):
 *   passing  = obligation has ≥1 supporting evidence clause on some system
 *   failing  = open ObligationGap with severity high/critical on the mapped code
 *   expiring = monitoring attestation due within 30 days (surfaced separately)
 *   pending  = applicable but no evidence yet
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const [systems, gaps, plans] = await Promise.all([
      db.aISystem.findMany({ where: { userId }, select: { id: true, name: true, riskTier: true, classifiedAt: true } }),
      db.obligationGap.findMany({
        where: { system: { userId }, status: "open" },
        select: { obligationCode: true, severity: true, systemId: true },
      }),
      db.monitoringPlan.findMany({
        where: { system: { userId } },
        select: { systemId: true, nextAttestationAt: true },
      }),
    ]);

    const systemIds = systems.map((s) => s.id);
    const clauses = systemIds.length === 0 ? [] : await db.evidenceClause.findMany({
      where: {
        evidence: {
          OR: [
            { systemId: { in: systemIds } },
            { userId, organizationLevel: true, systemId: null },
          ],
        },
      },
      select: { aiActArticles: true },
      take: 2000,
    });

    // Union of obligations applicable across the user's systems
    const applicableMap = new Map<string, { code: string; label: string; severity: string; systems: string[] }>();
    for (const sys of systems) {
      const tier = sys.classifiedAt ? sys.riskTier : null;
      for (const ob of applicableObligationsForTier(tier)) {
        const entry = applicableMap.get(ob.code) ?? { code: ob.code, label: ob.label, severity: ob.severity, systems: [] };
        entry.systems.push(sys.name);
        applicableMap.set(ob.code, entry);
      }
    }

    const failingCodes = new Set(gaps.filter((g) => g.severity === "critical" || g.severity === "high").map((g) => g.obligationCode));
    const soon = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const expiringSystems = plans
      .filter((p) => p.nextAttestationAt && p.nextAttestationAt.getTime() <= soon)
      .map((p) => systems.find((s) => s.id === p.systemId)?.name ?? p.systemId);

    const allObs = systems.length > 0
      ? [...new Set(systems.flatMap((s) => applicableObligationsForTier(s.classifiedAt ? s.riskTier : null)))]
      : [];

    const controls = [...applicableMap.values()].map((c) => {
      const ob = allObs.find((o) => o.code === c.code);
      const evidenced = ob ? clauses.some((cl) => clauseSupportsObligation(cl.aiActArticles ?? [], ob)) : false;
      const status = failingCodes.has(c.code) ? "failing" : evidenced ? "passing" : "pending";
      return { ...c, status, systems: [...new Set(c.systems)] };
    }).sort((a, b) => {
      const rank = (s: string) => (s === "failing" ? 0 : s === "pending" ? 1 : 2);
      return rank(a.status) - rank(b.status);
    });

    return NextResponse.json({
      controls,
      summary: {
        total: controls.length,
        passing: controls.filter((c) => c.status === "passing").length,
        failing: controls.filter((c) => c.status === "failing").length,
        pending: controls.filter((c) => c.status === "pending").length,
        expiringAttestations: expiringSystems,
        systemsTotal: systems.length,
        systemsClassified: systems.filter((s) => s.classifiedAt).length,
      },
    });
  } catch (e) {
    console.error("controls GET:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
