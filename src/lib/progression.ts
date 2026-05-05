import { db } from "@/lib/db";
import {
  AI_ACT_OBLIGATIONS,
  type AiActObligation,
} from "@/lib/compliance/ai-act-obligations";

export interface ProgressionState {
  currentStep: "assessed" | "verifying" | "complying" | "monitoring";
  assessed: {
    complete: boolean;
    assessmentId: string | null;
    completedAt: Date | null;
    overallScore: number | null;
  };
  verifying: {
    obligationsApplicable: number;
    obligationsEvidenced: number;
    documentsUploaded: number;
  };
  complying: {
    friasTotal: number;
    friasFinalized: number;
    technicalFilesTotal: number;
    technicalFilesFinalized: number;
  };
  monitoring: {
    activeUseCases: number;
    criticalGaps: number;
    attestationsDueWithin30Days: number;
  };
  /** First use case by creation time — for default CTAs */
  firstUseCaseId: string | null;
}

/** Obligations that apply for a classified risk tier (union catalogue entries). */
export function applicableObligationsForTier(
  riskTier: string | null,
): readonly AiActObligation[] {
  const t = (riskTier || "minimal").toLowerCase();
  if (t === "prohibited" || t === "high") {
    return AI_ACT_OBLIGATIONS;
  }
  if (t === "limited") {
    return AI_ACT_OBLIGATIONS.filter(
      (o) =>
        /^AI_ACT_ART_5/.test(o.code) ||
        o.hintArticles.some((h) => /Art\.5[0-3]|Annex III/i.test(h)),
    );
  }
  return AI_ACT_OBLIGATIONS.filter(
    (o) =>
      o.code === "AI_ACT_ART_50" ||
      o.code === "AI_ACT_ART_52" ||
      o.code === "AI_ACT_ART_53",
  );
}

function normalizeArticleToken(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "").replace(/§.*$/, "");
}

/** Whether extracted clause articles materially reference an obligation's hints. */
export function clauseSupportsObligation(
  clauseArticles: string[],
  obligation: AiActObligation,
): boolean {
  if (clauseArticles.length === 0) return false;
  const normClause = clauseArticles.map(normalizeArticleToken);
  for (const hint of obligation.hintArticles) {
    const h = normalizeArticleToken(hint);
    if (normClause.some((c) => c.includes(h) || h.includes(c))) return true;
  }
  return false;
}

function deriveCurrentStep(state: Omit<ProgressionState, "currentStep">): ProgressionState["currentStep"] {
  if (!state.assessed.complete) return "assessed";
  if (state.verifying.obligationsEvidenced === 0) return "verifying";
  const anyFriaFinalized = state.complying.friasFinalized > 0;
  if (!anyFriaFinalized) return "complying";
  return "monitoring";
}

/**
 * Aggregates progression across all AISystem rows for the user plus latest completed assessment.
 */
export async function getProgressionState(userId: string): Promise<ProgressionState> {
  const [latestAssessment, systems, clausesAgg, evidenceCount, gapsAgg, plans] =
    await Promise.all([
      db.assessment.findFirst({
        where: {
          userId,
          status: "completed",
          isPulse: false,
        },
        orderBy: { completedAt: "desc" },
        select: {
          id: true,
          completedAt: true,
          overallScore: true,
        },
      }),
      db.aISystem.findMany({
        where: { userId },
        select: {
          id: true,
          riskTier: true,
          classifiedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      // EvidenceClause hot-path — capped at 2000 rows. The dashboard only
      // needs to know which obligations are evidenced per system, which a
      // sample this size easily covers. Previous take=8000 ran a join that
      // scanned tens of thousands of rows on accounts with active vaults.
      db.evidenceClause.findMany({
        where: {
          evidence: {
            OR: [
              { system: { userId } },
              { userId, organizationLevel: true },
            ],
          },
        },
        select: {
          aiActArticles: true,
          evidence: { select: { systemId: true, organizationLevel: true } },
        },
        take: 2000,
      }),
      db.evidence.count({
        where: {
          OR: [
            { system: { userId } },
            { userId, organizationLevel: true },
          ],
        },
      }),
      db.obligationGap.count({
        where: {
          system: { userId },
          severity: "critical",
          status: "open",
        },
      }),
      db.monitoringPlan.findMany({
        where: { system: { userId } },
        select: { nextAttestationAt: true },
      }),
    ]);

  const systemIds = systems.map((s) => s.id);
  const clausesBySystem = new Map<string, typeof clausesAgg>();
  for (const sid of systemIds) clausesBySystem.set(sid, []);
  const orgWideClauses = clausesAgg.filter(
    (r) => r.evidence.systemId == null && r.evidence.organizationLevel,
  );
  for (const row of clausesAgg) {
    const sid = row.evidence.systemId;
    if (!sid) continue;
    const bucket = clausesBySystem.get(sid);
    if (bucket) bucket.push(row);
  }

  const applicableCodes = new Set<string>();
  const evidencedCodes = new Set<string>();

  for (const sys of systems) {
    const tier = sys.classifiedAt ? sys.riskTier : null;
    const applicable = applicableObligationsForTier(tier);
    const clauses = [...(clausesBySystem.get(sys.id) ?? []), ...orgWideClauses];
    for (const ob of applicable) {
      applicableCodes.add(ob.code);
      if (
        clauses.some((c) =>
          clauseSupportsObligation(c.aiActArticles ?? [], ob),
        )
      ) {
        evidencedCodes.add(ob.code);
      }
    }
  }

  let friasTotal = 0;
  let friasFinalized = 0;
  let technicalFilesTotal = 0;
  let technicalFilesFinalized = 0;

  if (systemIds.length > 0) {
    const [friaRows, tfRows] = await Promise.all([
      db.fRIA.findMany({
        where: { systemId: { in: systemIds } },
        select: { status: true, finalizedAt: true },
      }),
      db.technicalFile.findMany({
        where: { systemId: { in: systemIds } },
        select: { status: true },
      }),
    ]);
    friasTotal = systemIds.length;
    technicalFilesTotal = systemIds.length;
    friasFinalized = friaRows.filter(
      (f) => f.status === "finalized" || f.finalizedAt != null,
    ).length;
    technicalFilesFinalized = tfRows.filter((t) => t.status === "finalized").length;
  }

  const now = Date.now();
  const in30d = now + 30 * 24 * 60 * 60 * 1000;
  let attestationsDueWithin30Days = 0;
  for (const p of plans) {
    if (!p.nextAttestationAt) continue;
    const t = p.nextAttestationAt.getTime();
    if (t <= in30d) attestationsDueWithin30Days++;
  }

  const base: Omit<ProgressionState, "currentStep"> = {
    assessed: {
      complete: !!latestAssessment,
      assessmentId: latestAssessment?.id ?? null,
      completedAt: latestAssessment?.completedAt ?? null,
      overallScore: latestAssessment?.overallScore ?? null,
    },
    verifying: {
      obligationsApplicable: applicableCodes.size,
      obligationsEvidenced: evidencedCodes.size,
      documentsUploaded: evidenceCount,
    },
    complying: {
      friasTotal,
      friasFinalized,
      technicalFilesTotal,
      technicalFilesFinalized,
    },
    monitoring: {
      activeUseCases: systems.length,
      criticalGaps: gapsAgg,
      attestationsDueWithin30Days,
    },
    firstUseCaseId: systems[0]?.id ?? null,
  };

  return {
    ...base,
    currentStep: deriveCurrentStep(base),
  };
}
