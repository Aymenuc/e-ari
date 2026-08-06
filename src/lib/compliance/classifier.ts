import type { AISystem, Evidence } from "@prisma/client";
import { complianceLLMChat, complianceParseJson } from "@/lib/compliance/llm";
import { scopeRulesForPrompt } from "@/lib/ai-act-scope";
import {
  classifyByRules, explainClassification,
  type RuleClassification, type ClassificationFacts,
} from "@/lib/ai-act-classify";

/**
 * Risk classification: rules decide, the model explains.
 *
 * This used to be one LLM call returning `riskTier`. The most consequential
 * output in the product — the thing that decides whether an organisation owes
 * a technical file, a FRIA and post-market monitoring — was a model assertion
 * with no trace. Stanford RegLab found purpose-built, retrieval-backed legal
 * tools still hallucinate 17–33% of the time, and mostly by *misgrounding*:
 * citing a real article that does not support the claim. A reader cannot spot
 * that, and neither can a citation check.
 *
 * Article 5 and Annex III are lists, and lists belong in code. The tier now
 * comes from ai-act-classify.ts, which matches the enumerated provisions and
 * returns which rules fired. The model keeps the job it is actually good at:
 * reading messy evidence and writing the rationale. It is handed the trace and
 * told to explain it. It cannot change the tier, and where it reaches for an
 * article the engine never applied, that citation is dropped.
 */

const RATIONALE_PROMPT = `You are writing the rationale for an EU AI Act risk classification that has ALREADY been decided by a rules engine.

You are given the tier, the rules that fired, and any open questions. Explain that determination to a compliance officer in 3–8 sentences.

Output ONLY valid JSON with keys:
  riskRationale (string),
  citedArticles (string array of article refs like "Art.6", "Annex III").

Hard constraints:
- You MUST NOT contradict the tier or propose a different one. It is not yours to change.
- Cite ONLY articles that appear in the fired rules or the scope rules below. Do not reach for an article that was not applied — citing a real provision that does not support the point is the most common failure in this task and the hardest for a reader to catch.
- Where an open question is listed, say plainly that the determination is provisional until a person answers it. Do not answer it yourself.
- Where the evidence is thin, say which fact is missing rather than filling the gap.
- No court cases, no recital numbers you were not given, no invented guidance.

${scopeRulesForPrompt()}`;

export interface ClassificationResult {
  riskTier: string;
  riskRationale: string;
  citedArticles: string[];
  /** The deterministic trace behind the tier. */
  rules: RuleClassification;
}

function factsFrom(system: AISystem): ClassificationFacts {
  return {
    name: system.name,
    description: system.description,
    purpose: system.purpose,
    sector: system.sector,
    deployerRole: system.deployerRole,
    populationsAffected: system.populationsAffected,
  };
}

export function buildRationaleUserPrompt(
  system: AISystem,
  evidence: Pick<Evidence, "filename" | "artifactType" | "extractedText">[],
  rules: RuleClassification,
): string {
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

DETERMINATION (already made — explain it, do not revisit it):
Tier: ${rules.tier}
Confidence: ${rules.confidence}
Basis: ${rules.basis}

Rules that fired:
${explainClassification(rules).map((l) => `- ${l}`).join("\n")}

${rules.openQuestions.length > 0
    ? `Open questions a person must answer before this is settled:\n${rules.openQuestions.map((q) => `- ${q}`).join("\n")}`
    : "No open questions — the determination follows from the recorded facts."}

Evidence snippets (may be empty):
${evBlob || "(no extracted text yet)"}

Return JSON only.`;
}

/**
 * The articles the model is allowed to cite.
 *
 * Anything outside this set is dropped rather than shown. A citation the
 * engine never applied is exactly the misgrounding case: it reads as support
 * and is not, and a reader who checks it finds a real article and assumes the
 * reasoning held.
 */
function allowedCitations(rules: RuleClassification): Set<string> {
  const allowed = new Set<string>(['Art.4', 'Art.6', 'Art.50', 'Art.99', 'Annex III']);
  for (const r of rules.firedRules) {
    allowed.add(r.article);
    // "Annex III(4)" also licenses the bare "Annex III".
    const base = r.article.split('(')[0]!.trim();
    if (base) allowed.add(base);
  }
  return allowed;
}

export async function classifyAISystem(
  system: AISystem,
  evidence: Pick<Evidence, "filename" | "artifactType" | "extractedText">[],
): Promise<ClassificationResult> {
  // The tier is decided here, before any model is called, from the facts alone.
  const rules = classifyByRules(factsFrom(system));

  let riskRationale = rules.basis;
  let citedArticles = rules.firedRules.map((r) => r.article);

  try {
    const raw = await complianceLLMChat(
      RATIONALE_PROMPT,
      buildRationaleUserPrompt(system, evidence, rules),
      { operation: "risk_classifier" },
    );
    const parsed = complianceParseJson(raw) as Record<string, unknown>;

    const text = String(parsed.riskRationale || "").trim();
    if (text.length > 0) riskRationale = text;

    const allowed = allowedCitations(rules);
    const proposed = Array.isArray(parsed.citedArticles)
      ? (parsed.citedArticles as unknown[]).map((x) => String(x).trim())
      : [];
    const kept = proposed.filter((a) => allowed.has(a));
    // Fired rules are cited whether or not the model remembered them.
    citedArticles = [...new Set([...rules.firedRules.map((r) => r.article), ...kept])].slice(0, 24);
  } catch (err) {
    // A narrative failure must not take the determination with it — the tier
    // is already known, so the deterministic basis stands in for the prose.
    console.error("[classifier] rationale generation failed; using rule basis:", err);
  }

  return { riskTier: rules.tier, riskRationale, citedArticles, rules };
}
