// Gemini OpenAI-compatible endpoint
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

// Flash — assistant chatbot, literacy learning paths.
// Note: gemini-2.0-flash was retired by Google ("no longer available to new
// users"). Default is now gemini-2.5-flash. Override via LLM_MODEL env var.
export const LLM_API_URL = process.env.LLM_API_URL || GEMINI_BASE;
export const LLM_MODEL = process.env.LLM_MODEL || 'gemini-2.5-flash';

// Pro — agentic tasks (roadmap, benchmark, discovery, insights, context enrichment)
export const LLM_API_URL_PRO = process.env.LLM_API_URL_PRO || GEMINI_BASE;
export const LLM_MODEL_PRO = process.env.LLM_MODEL_PRO || 'gemini-2.5-pro';

/** Compliance domain (classification, clauses, gaps) — deterministic; always temperature 0 in call sites. */
export const COMPLIANCE_MODEL = process.env.COMPLIANCE_LLM_MODEL || LLM_MODEL_PRO;
export const COMPLIANCE_TEMPERATURE = 0;

// Key resolver — uses GEMINI_API_KEY, falls back to GLM_API_KEY for backwards compatibility
export const LLM_API_KEY = process.env.GEMINI_API_KEY || process.env.GLM_API_KEY || '';

/**
 * Retry an async operation with exponential backoff.
 * Retries on HTTP 429 (rate limit) and 5xx errors.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { maxAttempts = 3, baseDelayMs = 2000 }: { maxAttempts?: number; baseDelayMs?: number } = {}
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isRetryable =
        err instanceof Error &&
        (err.message.includes('429') || err.message.includes('503') || err.message.includes('502') || err.message.includes('500'));
      if (!isRetryable || attempt === maxAttempts) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`[llm-retry] attempt ${attempt} failed (${err instanceof Error ? err.message : err}), retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}
