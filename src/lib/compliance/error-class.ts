/** Pure helpers for compliance LLM observability — safe to unit test without DB. */

export function normalizeErrorClass(e: unknown): string {
  if (e instanceof Error) {
    const m = e.message;
    if (m.includes("429")) return "http_429";
    if (m.includes("503") || m.includes("502") || m.includes("500")) return "http_5xx";
    if (m.includes("LLM error")) return "http_llm_error";
    if (m.includes("Empty LLM response")) return "empty_response";
    if (m.includes("API key")) return "config_error";
    return "exception";
  }
  return "unknown";
}
