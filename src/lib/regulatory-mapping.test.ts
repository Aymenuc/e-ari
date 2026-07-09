import { describe, expect, it } from "vitest";
import { getComplianceSummary } from "@/lib/regulatory-mapping";

describe("getComplianceSummary", () => {
  it("returns null compliance rate when no pillar scores map", () => {
    const summaries = getComplianceSummary([]);
    expect(summaries.length).toBeGreaterThan(0);
    for (const s of summaries) {
      expect(s.totalRelevant).toBe(0);
      expect(s.complianceRate).toBeNull();
    }
  });

  it("returns numeric rate when pillars cover mappings", () => {
    const summaries = getComplianceSummary([
      { pillarId: "governance", normalizedScore: 80 },
      { pillarId: "data", normalizedScore: 80 },
      { pillarId: "strategy", normalizedScore: 80 },
      { pillarId: "culture", normalizedScore: 80 },
      { pillarId: "talent", normalizedScore: 80 },
      { pillarId: "process", normalizedScore: 80 },
      { pillarId: "security", normalizedScore: 80 },
      { pillarId: "technology", normalizedScore: 80 },
    ]);
    for (const s of summaries) {
      expect(s.totalRelevant).toBeGreaterThan(0);
      expect(s.complianceRate).not.toBeNull();
      expect(s.complianceRate).toBeGreaterThanOrEqual(0);
      expect(s.complianceRate).toBeLessThanOrEqual(100);
    }
  });
});
