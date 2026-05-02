import type { AISystem } from "@prisma/client";
import { db } from "@/lib/db";
import { complianceLLMChat, complianceParseJson } from "@/lib/compliance/llm";

const SYS = `You produce Annex IV–style technical documentation SECTIONS as JSON only (no prose outside JSON).
Keys all optional objects or strings: systemDescription, designSpecs, dataGovernance, monitoringPlan, riskManagement, performanceMetrics, instructionsForUse, euDeclaration.
Each top-level value should be an object with bullet-style fields as strings where helpful. Stay factual and tied to supplied context.`;

export async function generateOrUpdateTechnicalFile(systemId: string, system: AISystem): Promise<void> {
  const evidenceSnippets = await db.evidence.findMany({
    where: { systemId },
    select: { filename: true, extractedText: true },
    take: 12,
  });
  const ctx = evidenceSnippets.map((e) => `${e.filename}: ${(e.extractedText || "").slice(0, 500)}`).join("\n");

  const user = `System:\n${system.name}\nPurpose: ${system.purpose}\nDescription:\n${system.description}\nSector:${system.sector}\nEvidence:\n${ctx || "(none)"}`;
  const raw = await complianceLLMChat(SYS, user, { maxTokens: 8000, operation: "technical_file_generate" });
  const parsed = complianceParseJson(raw) as Record<string, unknown>;

  const pick = (k: string): object => {
    const v = parsed[k];
    if (v != null && typeof v === "object" && !Array.isArray(v)) return v as object;
    if (Array.isArray(v)) return { items: v };
    if (typeof v === "string") return { text: v };
    return {};
  };

  await db.technicalFile.upsert({
    where: { systemId },
    create: {
      systemId,
      systemDescription: pick("systemDescription"),
      designSpecs: pick("designSpecs"),
      dataGovernance: pick("dataGovernance"),
      monitoringPlan: pick("monitoringPlan"),
      riskManagement: pick("riskManagement"),
      performanceMetrics: pick("performanceMetrics"),
      instructionsForUse: pick("instructionsForUse"),
      euDeclaration: pick("euDeclaration"),
      status: "draft",
    },
    update: {
      systemDescription: pick("systemDescription"),
      designSpecs: pick("designSpecs"),
      dataGovernance: pick("dataGovernance"),
      monitoringPlan: pick("monitoringPlan"),
      riskManagement: pick("riskManagement"),
      performanceMetrics: pick("performanceMetrics"),
      instructionsForUse: pick("instructionsForUse"),
      euDeclaration: pick("euDeclaration"),
      status: "draft",
    },
  });
}
