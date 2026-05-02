import { db } from "@/lib/db";
import { AI_ACT_OBLIGATIONS } from "@/lib/compliance/ai-act-obligations";
import { complianceLLMChat, complianceParseJson } from "@/lib/compliance/llm";

const SYS = `You are mapping evidence clauses to EU AI Act obligations.
You receive a JSON list of obligations (code, label, hintArticles) and snippets of extracted clauses.
Return ONLY JSON: { "gaps": [ { "obligationCode": string, "obligationLabel": string, "severity": "critical"|"major"|"minor", "recommendedArtifactType": string, "draftDocumentText": string|null, "ownerRoleHint": string|null, "status": "open" } ] }
Include an obligation as a gap ONLY if evidence does not materially cover it. If uncertain, omit it (prefer fewer false positives).
draftDocumentText: optional 2–4 sentence starter memo if gap exists.`;

export async function regenerateObligationGaps(systemId: string): Promise<number> {
  const sys = await db.aISystem.findUnique({
    where: { id: systemId },
    select: { userId: true },
  });
  if (!sys) return 0;

  const clauses = await db.evidenceClause.findMany({
    where: {
      OR: [
        { evidence: { systemId } },
        {
          evidence: {
            userId: sys.userId,
            organizationLevel: true,
            systemId: null,
          },
        },
      ],
    },
    select: {
      clauseType: true,
      textExcerpt: true,
      aiActArticles: true,
      pillarIds: true,
      frameworks: true,
    },
    take: 200,
  });

  const obligationJson = AI_ACT_OBLIGATIONS.map((o) => ({
    code: o.code,
    label: o.label,
    severity: o.severity,
    hintArticles: o.hintArticles,
    recommendedArtifactType: o.recommendedArtifactType,
    ownerRoleHint: o.ownerRoleHint || null,
  }));

  const clauseBlob = clauses
    .map((c) => ({
      clauseType: c.clauseType,
      excerpt: c.textExcerpt.slice(0, 400),
      aiActArticles: c.aiActArticles,
      pillarIds: c.pillarIds,
      frameworks: c.frameworks,
    }))
    .slice(0, 120);

  let gapsPayload: Array<{
    obligationCode: string;
    obligationLabel: string;
    severity: string;
    recommendedArtifactType: string;
    draftDocumentText?: string | null;
    ownerRoleHint?: string | null;
    status?: string;
  }>;

  try {
    const raw = await complianceLLMChat(
      SYS,
      `Obligations:\n${JSON.stringify(obligationJson)}\n\nEvidence clauses:\n${JSON.stringify(clauseBlob)}`,
      { maxTokens: 6000, operation: "gap_radar" },
    );
    const parsed = complianceParseJson(raw) as { gaps?: unknown[] };
    gapsPayload = Array.isArray(parsed.gaps)
      ? (parsed.gaps as Record<string, unknown>[]).map((g) => ({
          obligationCode: String(g.obligationCode || ""),
          obligationLabel: String(g.obligationLabel || ""),
          severity: String(g.severity || "minor"),
          recommendedArtifactType: String(g.recommendedArtifactType || "policy"),
          draftDocumentText: g.draftDocumentText != null ? String(g.draftDocumentText).slice(0, 8000) : null,
          ownerRoleHint: g.ownerRoleHint != null ? String(g.ownerRoleHint).slice(0, 120) : null,
          status: "open",
        }))
      : [];
  } catch {
    gapsPayload = heuristicGaps(clauses.length === 0);
  }

  await db.obligationGap.deleteMany({ where: { systemId } });

  const allowedSev = new Set(["critical", "major", "minor"]);
  let count = 0;
  for (const g of gapsPayload) {
    if (!g.obligationCode || !g.obligationLabel) continue;
    const sev = allowedSev.has(g.severity) ? g.severity : "minor";
    await db.obligationGap.create({
      data: {
        systemId,
        obligationCode: g.obligationCode.slice(0, 120),
        obligationLabel: g.obligationLabel.slice(0, 500),
        severity: sev,
        recommendedArtifactType: (g.recommendedArtifactType || "policy").slice(0, 120),
        draftDocumentText: g.draftDocumentText || null,
        ownerRoleHint: g.ownerRoleHint || null,
        status: "open",
      },
    });
    count++;
  }

  return count;
}

/** If LLM fails: either flag all critical obligations (no evidence) or none. */
function heuristicGaps(noEvidence: boolean) {
  if (!noEvidence) return [];
  return AI_ACT_OBLIGATIONS.filter((o) => o.severity === "critical").map((o) => ({
    obligationCode: o.code,
    obligationLabel: o.label,
    severity: o.severity,
    recommendedArtifactType: o.recommendedArtifactType,
    draftDocumentText: `Starter note: draft controls and artifacts addressing ${o.label} (${o.hintArticles.join(", ")}).`,
    ownerRoleHint: o.ownerRoleHint || null,
    status: "open",
  }));
}
