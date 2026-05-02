import { describe, expect, it } from "vitest";
import { normalizeErrorClass } from "./error-class";

describe("normalizeErrorClass", () => {
  it("classifies rate limit / 429", () => {
    expect(normalizeErrorClass(new Error("upstream returned 429"))).toBe("http_429");
  });

  it("classifies server errors", () => {
    expect(normalizeErrorClass(new Error("bad gateway 502"))).toBe("http_5xx");
    expect(normalizeErrorClass(new Error("service unavailable 503"))).toBe("http_5xx");
    expect(normalizeErrorClass(new Error("internal error 500"))).toBe("http_5xx");
  });

  it("classifies LLM-specific messages", () => {
    expect(normalizeErrorClass(new Error("LLM error: timeout"))).toBe("http_llm_error");
    expect(normalizeErrorClass(new Error("Empty LLM response"))).toBe("empty_response");
  });

  it("classifies configuration mistakes", () => {
    expect(normalizeErrorClass(new Error("Invalid API key"))).toBe("config_error");
  });

  it("falls back for generic errors and non-errors", () => {
    expect(normalizeErrorClass(new Error("something broke"))).toBe("exception");
    expect(normalizeErrorClass(null)).toBe("unknown");
    expect(normalizeErrorClass("string")).toBe("unknown");
  });
});
