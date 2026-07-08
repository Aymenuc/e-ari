/**
 * Shared controls derivation — used by /api/controls (portal), /api/v1/controls
 * (public API), and the weekly digest cron. One derivation, three consumers.
 */

import { db } from "./db";
import { applicableObligationsForTier, clauseSupportsObligation } from "./progression";

export interface DerivedControl {
  code: string;
  label: string;
  severity: string;
  status: "passing" | "failing" | "pending";
  systems: string[];
}

export interface ControlsResult {
  controls: DerivedControl[];
  summary: {
    total: number;
    passing: number;
    failing: number;
    pending: number;
    expiringAttestations: string[];
    systemsTotal: number;
    systemsClassified: number;
  };
}

export async function deriveControls(userId: string): Promise<ControlsResult> {
  const [systems, gaps, plans] = await Promise.all([
    db.aISystem.findMany({ where: { userId }, select: { id: true, name: true, riskTier: true, classifiedAt: true } }),
    db.obligationGap.findMany({
      where: { system: { userId }, status: "open" },
      select: { obligationCode: true, severity: true },
    }),
    db.monitoringPlan.findMany({ where: { system: { userId } }, select: { systemId: true, nextAttestationAt: true } }),
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

  const applicableMap = new Map<string, { code: string; label: string; severity: string; systems: string[] }>();
  const allObs: ReturnType<typeof applicableObligationsForTier>[number][] = [];
  for (const sys of systems) {
    for (const ob of applicableObligationsForTier(sys.classifiedAt ? sys.riskTier : null)) {
      if (!applicableMap.has(ob.code)) allObs.push(ob);
      const entry = applicableMap.get(ob.code) ?? { code: ob.code, label: ob.label, severity: ob.severity, systems: [] };
      entry.systems.push(sys.name);
      applicableMap.set(ob.code, entry);
    }
  }

  const failingCodes = new Set(gaps.filter((g) => g.severity === "critical" || g.severity === "high").map((g) => g.obligationCode));
  const soon = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const expiringAttestations = plans
    .filter((p) => p.nextAttestationAt && p.nextAttestationAt.getTime() <= soon)
    .map((p) => systems.find((s) => s.id === p.systemId)?.name ?? p.systemId);

  const controls: DerivedControl[] = [...applicableMap.values()].map((c) => {
    const ob = allObs.find((o) => o.code === c.code);
    const evidenced = ob ? clauses.some((cl) => clauseSupportsObligation(cl.aiActArticles ?? [], ob)) : false;
    const status: DerivedControl["status"] = failingCodes.has(c.code) ? "failing" : evidenced ? "passing" : "pending";
    return { code: c.code, label: c.label, severity: c.severity, status, systems: [...new Set(c.systems)] };
  }).sort((a, b) => {
    const rank = (s: string) => (s === "failing" ? 0 : s === "pending" ? 1 : 2);
    return rank(a.status) - rank(b.status);
  });

  return {
    controls,
    summary: {
      total: controls.length,
      passing: controls.filter((c) => c.status === "passing").length,
      failing: controls.filter((c) => c.status === "failing").length,
      pending: controls.filter((c) => c.status === "pending").length,
      expiringAttestations,
      systemsTotal: systems.length,
      systemsClassified: systems.filter((s) => s.classifiedAt).length,
    },
  };
}
