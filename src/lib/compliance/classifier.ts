import type { AISystem, Evidence } from "@prisma/client";
import { complianceLLMChat, complianceParseJson } from "@/lib/compliance/llm";

const SYSTEM_PROMPT = `You are an EU AI Act compliance classifier. Output ONLY valid JSON with keys:
riskTier (string: one of prohibited | high | limited | minimal — use minimal if unsure),
riskRationale (string: 3–8 sentences citing plausible AI Act articles by label only, no fabricated court cases),
citedArticles (string array of article refs like Art.6, Annex III).

Temperature-equivalent discipline: be conservative; prefer "high" only when description matches high-risk patterns (biometric ID, critical infra, employment scoring, etc.).`;

export interface ClassificationResult {
  riskTier: string;
  riskRationale: string;
  citedArticles: string[];
}

export function buildClassificationUserPrompt(system: AISystem, evidence: Pick<Evidence, "filename" | "artifactType" | "extractedText">[]): string {
  const evBlob = evidence
    .slice(0, 24)
    .map((e) => {
      const snippet = (e.extractedText || "").replace(/\s+/g, " ").slice(0, 900);
      return `- ${e.filename}${e.artifactType ? ` [${e.artifactType}]` : ""}${snippet ? `: "${snippet}"` : ""}`;
    })
    .join("\n");

  return `AI System profile:
Name: ${system.name}
Sector: ${system.sector}
Deployer role: ${system.deployerRole}
Purpose: ${system.purpose}
Description: ${system.description}
Affected populations note: ${system.populationsAffected || "not specified"}

Evidence snippets (may be empty):
${evBlob || "(no extracted text yet)"}

Return JSON only.`;
}

export async function classifyAISystem(system: AISystem, evidence: Pick<Evidence, "filename" | "artifactType" | "extractedText">[]): Promise<ClassificationResult> {
  const raw = await complianceLLMChat(SYSTEM_PROMPT, buildClassificationUserPrompt(system, evidence), {
    operation: "risk_classifier",
  });
  const parsed = complianceParseJson(raw) as Record<string, unknown>;
  const riskTier = String(parsed.riskTier || "minimal").toLowerCase();
  const allowed = ["prohibited", "high", "limited", "minimal"];
  const tier = allowed.includes(riskTier) ? riskTier : "minimal";
  const riskRationale = String(parsed.riskRationale || "Classification pending detailed evidence extraction.");
  const citedArticles = Array.isArray(parsed.citedArticles)
    ? (parsed.citedArticles as unknown[]).map((x) => String(x)).slice(0, 24)
    : [];
  return { riskTier: tier, riskRationale, citedArticles };
}
