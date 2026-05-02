import { db } from "@/lib/db";

export { normalizeErrorClass } from "./error-class";

export interface ComplianceLLMLogInput {
  operation?: string | null;
  model: string;
  durationMs: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  success: boolean;
  errorClass?: string | null;
}

/** Best-effort insert; never throws to callers. */
export async function insertComplianceLLMLog(entry: ComplianceLLMLogInput): Promise<void> {
  try {
    await db.complianceLog.create({
      data: {
        operation: entry.operation?.slice(0, 64) ?? null,
        model: entry.model.slice(0, 120),
        durationMs: Math.max(0, Math.min(entry.durationMs, 2_147_483_647)),
        inputTokens: entry.inputTokens != null ? Math.max(0, entry.inputTokens) : null,
        outputTokens: entry.outputTokens != null ? Math.max(0, entry.outputTokens) : null,
        success: entry.success,
        errorClass: entry.errorClass?.slice(0, 120) ?? null,
      },
    });
  } catch (err) {
    console.error("[compliance-log] insert failed:", err);
  }
}
