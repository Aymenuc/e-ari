import { AI_ACT_OBLIGATIONS } from "@/lib/compliance/ai-act-obligations";
import {
  CLAUSE_TYPES,
  mapClauseToObligations,
  type ExtractedClause,
} from "@/lib/compliance/evidence-mapper";
import { PILLARS } from "@/lib/pillars";

const OBLIGATION_CODES = new Set(AI_ACT_OBLIGATIONS.map((o) => o.code));
const PILLAR_IDS = new Set(PILLARS.map((p) => p.id));

function runMappingChecks(): void {
  for (const ct of CLAUSE_TYPES) {
    const sample: ExtractedClause = {
      clauseType: ct,
      textExcerpt: "sample",
      pageNumber: null,
      confidence: 1,
    };
    const m = mapClauseToObligations(sample);
    for (const pid of m.pillarIds) {
      if (!PILLAR_IDS.has(pid)) {
        console.warn(`[compliance-mapper] clause "${ct}" references unknown pillar "${pid}"`);
      }
    }
    for (const code of m.aiActArticles) {
      if (!OBLIGATION_CODES.has(code)) {
        console.warn(
          `[compliance-mapper] clause "${ct}" maps to obligation code "${code}" missing from AI_ACT_OBLIGATIONS — add catalogue row or adjust mapper.`,
        );
      }
    }
  }
}

if (process.env.NODE_ENV !== "production") {
  runMappingChecks();
}
