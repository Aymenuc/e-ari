import type { AISystem } from "@prisma/client";
import { db } from "@/lib/db";
import { complianceLLMChat, complianceParseJson } from "@/lib/compliance/llm";

const SYS = `You draft an EU AI Act–aligned Fundamental Rights Impact Assessment (FRIA-style) structure as JSON only.
Keys: affectedGroups (array of {group, description}), rightsAtRisk (array of {right, risk}), mitigations (array of {measure, ownerHint}), residualRisk (string), oversightDesign (string).
Use concise professional English; no legal advice disclaimer needed in JSON.`;

export async function generateOrUpdateFRIA(systemId: string, system: AISystem): Promise<void> {
  const evidenceSnippets = await db.evidence.findMany({
    where: { systemId },
    select: { filename: true, extractedText: true, artifactType: true },
    take: 12,
  });

  const ctx = evidenceSnippets
    .map((e) => `${e.filename}${e.artifactType ? ` (${e.artifactType})` : ""}: ${(e.extractedText || "").slice(0, 600)}`)
    .join("\n---\n");

  const user = `AI System:\n${system.name}\n${system.purpose}\n${system.description}\nSector: ${system.sector}\nRole: ${system.deployerRole}\nRisk tier note: ${system.riskTier || "unclassified"}\n\nEvidence excerpts:\n${ctx || "(none)"}`;

  const raw = await complianceLLMChat(SYS, user, { maxTokens: 6000, operation: "fria_generate" });
  const parsed = complianceParseJson(raw) as Record<string, unknown>;

  const affectedGroups = parsed.affectedGroups ?? [];
  const rightsAtRisk = parsed.rightsAtRisk ?? [];
  const mitigations = parsed.mitigations ?? [];
  const residualRisk = String(parsed.residualRisk || "");
  const oversightDesign = String(parsed.oversightDesign || "");

  await db.fRIA.upsert({
    where: { systemId },
    create: {
      systemId,
      affectedGroups: affectedGroups as object,
      rightsAtRisk: rightsAtRisk as object,
      mitigations: mitigations as object,
      residualRisk: residualRisk || null,
      oversightDesign: oversightDesign || null,
      status: "draft",
    },
    update: {
      affectedGroups: affectedGroups as object,
      rightsAtRisk: rightsAtRisk as object,
      mitigations: mitigations as object,
      residualRisk: residualRisk || null,
      oversightDesign: oversightDesign || null,
      status: "draft",
    },
  });
}
