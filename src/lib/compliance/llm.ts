import {
  LLM_API_URL_PRO,
  LLM_API_KEY,
  withRetry,
  COMPLIANCE_MODEL,
  COMPLIANCE_TEMPERATURE,
} from "@/lib/llm-config";
import { insertComplianceLLMLog, normalizeErrorClass } from "@/lib/compliance/compliance-log";

export type ComplianceLLMChatOptions = {
  maxTokens?: number;
  /** Short operation tag for ComplianceLog (no PII). */
  operation?: string | null;
};

function readUsageTokens(data: Record<string, unknown>): { input?: number; output?: number } {
  const u = data.usage;
  if (!u || typeof u !== "object") return {};
  const usage = u as Record<string, unknown>;
  const pi = usage.prompt_tokens ?? usage.promptTokens;
  const co = usage.completion_tokens ?? usage.completionTokens;
  const input = typeof pi === "number" && Number.isFinite(pi) ? Math.round(pi) : undefined;
  const output = typeof co === "number" && Number.isFinite(co) ? Math.round(co) : undefined;
  return { input, output };
}

/** Compliance prompts use temperature 0 for reproducibility. Logs each completed request to ComplianceLog. */
export async function complianceLLMChat(
  systemPrompt: string,
  userPrompt: string,
  options?: ComplianceLLMChatOptions,
): Promise<string> {
  if (!LLM_API_KEY?.trim()) {
    throw new Error("LLM API key not configured (GEMINI_API_KEY / GLM_API_KEY)");
  }

  const maxTokens = options?.maxTokens ?? 8192;
  const operation = options?.operation ?? null;
  const model = COMPLIANCE_MODEL;
  const t0 = Date.now();

  let inputTok: number | undefined;
  let outputTok: number | undefined;

  try {
    const content = await withRetry(async () => {
      const response = await fetch(LLM_API_URL_PRO, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: COMPLIANCE_TEMPERATURE,
        }),
        signal: AbortSignal.timeout(120000),
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error("[compliance-llm]", response.status, errText.slice(0, 500));
        throw new Error(`LLM error ${response.status}`);
      }
      const data = (await response.json()) as Record<string, unknown>;
      const u = readUsageTokens(data);
      if (u.input != null) inputTok = u.input;
      if (u.output != null) outputTok = u.output;

      const rawContent = data.choices?.[0] as { message?: { content?: unknown } } | undefined;
      const c = rawContent?.message?.content;
      if (!c || typeof c !== "string") throw new Error("Empty LLM response");
      return c;
    }, { maxAttempts: 3, baseDelayMs: 2500 });

    void insertComplianceLLMLog({
      operation,
      model,
      durationMs: Date.now() - t0,
      inputTokens: inputTok ?? null,
      outputTokens: outputTok ?? null,
      success: true,
      errorClass: null,
    });

    return content;
  } catch (e) {
    void insertComplianceLLMLog({
      operation,
      model,
      durationMs: Date.now() - t0,
      inputTokens: inputTok ?? null,
      outputTokens: outputTok ?? null,
      success: false,
      errorClass: normalizeErrorClass(e),
    });
    throw e;
  }
}

export function complianceParseJson(content: string): unknown {
  let s = content.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "");
  }
  return JSON.parse(s);
}
