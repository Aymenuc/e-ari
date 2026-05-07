import { db } from "@/lib/db";
import {
  applicableObligationsForTier,
  clauseSupportsObligation,
} from "@/lib/progression";

export interface ComplianceOutlook {
  assessmentId: string;
  useCaseCount: number;
  obligationsApplicable: number;
  obligationsEvidenced: number;
  coveragePct: number;
  criticalOpenGaps: number;
  documentsUploaded: number;
}

/**
 * AI Act obligation coverage for use cases linked to a baseline assessment,
 * using the same tier → obligation catalogue matching as progression.
 */
export async function getComplianceOutlookForAssessment(
  userId: string,
  assessmentId: string,
): Promise<ComplianceOutlook | null> {
  // Parallelise the ownership check and the systems lookup — they don't
  // depend on each other and the second one is what feeds the heavy queries.
  const [assessment, systems] = await Promise.all([
    db.assessment.findFirst({
      where: { id: assessmentId, userId },
      select: { id: true },
    }),
    db.aISystem.findMany({
      where: { assessmentId, userId },
      select: { id: true, riskTier: true, classifiedAt: true },
    }),
  ]);
  if (!assessment) return null;

  const ids = systems.map((s) => s.id);

  const [clauses, evidenceCount, gapsCritical] =
    ids.length === 0
      ? [[], 0, 0]
      : await Promise.all([
          db.evidenceClause.findMany({
            where: {
              evidence: {
                OR: [
                  { systemId: { in: ids } },
                  {
                    userId,
                    organizationLevel: true,
                    systemId: null,
                  },
                ],
              },
            },
            select: {
              aiActArticles: true,
              evidence: { select: { systemId: true, organizationLevel: true } },
            },
            // Cap the page — the outlook only needs to know which obligations
            // each system has at least one clause for. Was 8000.
            take: 2000,
          }),
          db.evidence.count({
            where: {
              OR: [
                { systemId: { in: ids } },
                { userId, organizationLevel: true },
              ],
            },
          }),
          db.obligationGap.count({
            where: {
              systemId: { in: ids },
              severity: "critical",
              status: "open",
            },
          }),
        ]);

  const clausesBySystem = new Map<string, typeof clauses>();
  for (const sid of ids) clausesBySystem.set(sid, []);
  const orgWideClauses = clauses.filter(
    (r) => r.evidence.systemId == null && r.evidence.organizationLevel,
  );
  for (const row of clauses) {
    const sid = row.evidence.systemId;
    if (!sid) continue;
    clausesBySystem.get(sid)?.push(row);
  }

  const applicableCodes = new Set<string>();
  const evidencedCodes = new Set<string>();

  for (const sys of systems) {
    const tier = sys.classifiedAt ? sys.riskTier : null;
    const applicable = applicableObligationsForTier(tier);
    const sysClauses = [...(clausesBySystem.get(sys.id) ?? []), ...orgWideClauses];
    for (const ob of applicable) {
      applicableCodes.add(ob.code);
      if (
        sysClauses.some((c) =>
          clauseSupportsObligation(c.aiActArticles ?? [], ob),
        )
      ) {
        evidencedCodes.add(ob.code);
      }
    }
  }

  const obligationsApplicable = applicableCodes.size;
  const obligationsEvidenced = evidencedCodes.size;
  const coveragePct =
    obligationsApplicable > 0
      ? Math.round((obligationsEvidenced / obligationsApplicable) * 100)
      : 0;

  return {
    assessmentId,
    useCaseCount: systems.length,
    obligationsApplicable,
    obligationsEvidenced,
    coveragePct,
    criticalOpenGaps: gapsCritical,
    documentsUploaded: evidenceCount,
  };
}
