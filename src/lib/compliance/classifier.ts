import type { AISystem, Evidence } from "@prisma/client";
import { complianceLLMChat, complianceParseJson } from "@/lib/compliance/llm";
import { scopeRulesForPrompt } from "@/lib/ai-act-scope";

/**
 * The prompt carries the amended scope test, not a vibe.
 *
 * It previously said only "prefer high only when description matches high-risk
 * patterns (biometric ID, critical infra, employment scoring)". That is a list
 * of examples, not the statutory test, and it predates Regulation (EU)
 * 2026/1744 — which narrowed what counts as a safety component and added an
 * express exclusion for systems used solely to assist or optimise. A model
 * given examples instead of a test over-classifies, and over-classification
 * bills the reader for controls they do not owe.
 */
const SYSTEM_PROMPT = `You are an EU AI Act compliance classifier. Output ONLY valid JSON with keys:
riskTier (string: one of prohibited | high | limited | minimal — use minimal if unsure),
riskRationale (string: 3–8 sentences applying the rules below and citing the articles you relied on by label only; no fabricated court cases, no invented recitals),
citedArticles (string array of article refs like Art.6, Annex III).

${scopeRulesForPrompt()}

Discipline: apply the test, do not pattern-match on the sector. Where the evidence does not settle a limb, say which fact is missing rather than assuming the worse tier. Classification is the reader's decision to make with counsel; your job is to show the test and where their system falls in it.`;

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
