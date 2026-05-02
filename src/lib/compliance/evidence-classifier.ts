import { complianceLLMChat, complianceParseJson } from "@/lib/compliance/llm";

const ARTIFACT_TYPES = [
  "contract",
  "policy",
  "model_card",
  "dpia",
  "minutes",
  "training_record",
  "incident_report",
  "other",
] as const;

const SYS = `You label uploaded organizational documents for an AI compliance vault.
Return ONLY JSON: { "artifactType": "<one of ${ARTIFACT_TYPES.join(", ")}>" }
Use temperature discipline: pick the closest category; use "other" if ambiguous.`;

export async function classifyEvidenceArtifact(filename: string, textPreview: string): Promise<string> {
  const preview = textPreview.replace(/\s+/g, " ").slice(0, 3500);
  const raw = await complianceLLMChat(
    SYS,
    `Filename: ${filename}\n\nFirst chars of extracted text (may be empty):\n${preview || "(empty)"}`,
    { operation: "evidence_artifact" },
  );
  const parsed = complianceParseJson(raw) as { artifactType?: string };
  const t = String(parsed.artifactType || "other").toLowerCase();
  return ARTIFACT_TYPES.includes(t as (typeof ARTIFACT_TYPES)[number]) ? t : "other";
}
