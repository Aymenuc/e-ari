import { PILLARS } from "@/lib/pillars";

export const CLAUSE_TYPES = [
  "data_minimization",
  "human_oversight",
  "bias_testing",
  "incident_reporting",
  "data_governance",
  "logging",
  "transparency_user_facing",
  "risk_assessment",
  "training_data_provenance",
  "model_evaluation",
  "security_measures",
  "third_party_assessment",
  "data_subject_rights",
  "retention_policy",
  "access_controls",
  "monitoring_metrics",
  "rollback_procedure",
  "vendor_dpa",
] as const;

export type ClauseTypeId = (typeof CLAUSE_TYPES)[number];

export interface ExtractedClause {
  clauseType: string;
  textExcerpt: string;
  pageNumber: number | null;
  confidence: number;
}

export interface ClauseMapping {
  aiActArticles: string[];
  pillarIds: string[];
  frameworks: ("AI_ACT" | "GDPR" | "NIS2" | "ISO_42001")[];
}

const PILLAR_IDS = new Set(PILLARS.map((p) => p.id));

/** Obligation codes must exist on catalogue rows used by gap radar / UI (subset of AI_ACT_OBLIGATIONS). */
const CLAUSE_TO_MAP: Record<string, ClauseMapping> = {
  data_minimization: {
    aiActArticles: ["AI_ACT_ART_10"],
    pillarIds: ["data", "governance"],
    frameworks: ["AI_ACT", "GDPR"],
  },
  human_oversight: {
    aiActArticles: ["AI_ACT_ART_14"],
    pillarIds: ["governance", "process"],
    frameworks: ["AI_ACT"],
  },
  bias_testing: {
    aiActArticles: ["AI_ACT_ART_15"],
    pillarIds: ["technology", "culture"],
    frameworks: ["AI_ACT"],
  },
  incident_reporting: {
    aiActArticles: ["AI_ACT_ART_12"],
    pillarIds: ["security", "governance"],
    frameworks: ["AI_ACT", "NIS2"],
  },
  data_governance: {
    aiActArticles: ["AI_ACT_ART_10"],
    pillarIds: ["data", "governance"],
    frameworks: ["AI_ACT", "GDPR"],
  },
  logging: {
    aiActArticles: ["AI_ACT_ART_12"],
    pillarIds: ["security", "technology"],
    frameworks: ["AI_ACT"],
  },
  transparency_user_facing: {
    aiActArticles: ["AI_ACT_ART_13"],
    pillarIds: ["culture", "strategy"],
    frameworks: ["AI_ACT"],
  },
  risk_assessment: {
    aiActArticles: ["AI_ACT_ART_9"],
    pillarIds: ["governance", "strategy"],
    frameworks: ["AI_ACT", "ISO_42001"],
  },
  training_data_provenance: {
    aiActArticles: ["AI_ACT_ART_10"],
    pillarIds: ["data", "technology"],
    frameworks: ["AI_ACT"],
  },
  model_evaluation: {
    aiActArticles: ["AI_ACT_ART_15"],
    pillarIds: ["technology"],
    frameworks: ["AI_ACT", "ISO_42001"],
  },
  security_measures: {
    aiActArticles: ["AI_ACT_ART_15"],
    pillarIds: ["security", "technology"],
    frameworks: ["AI_ACT", "NIS2"],
  },
  third_party_assessment: {
    aiActArticles: ["AI_ACT_ART_9"],
    pillarIds: ["governance"],
    frameworks: ["AI_ACT"],
  },
  data_subject_rights: {
    aiActArticles: ["AI_ACT_ART_10"],
    pillarIds: ["data", "governance"],
    frameworks: ["GDPR", "AI_ACT"],
  },
  retention_policy: {
    aiActArticles: ["AI_ACT_ART_10"],
    pillarIds: ["data", "governance"],
    frameworks: ["GDPR", "AI_ACT"],
  },
  access_controls: {
    aiActArticles: ["AI_ACT_ART_15"],
    pillarIds: ["security", "data"],
    frameworks: ["AI_ACT", "ISO_42001"],
  },
  monitoring_metrics: {
    aiActArticles: ["AI_ACT_ART_72"],
    pillarIds: ["process", "governance"],
    frameworks: ["AI_ACT", "ISO_42001"],
  },
  rollback_procedure: {
    aiActArticles: ["AI_ACT_ART_15"],
    pillarIds: ["process", "technology"],
    frameworks: ["AI_ACT"],
  },
  vendor_dpa: {
    aiActArticles: ["AI_ACT_ART_10"],
    pillarIds: ["governance", "data"],
    frameworks: ["GDPR", "AI_ACT"],
  },
};

const DEFAULT_MAPPING: ClauseMapping = {
  aiActArticles: ["AI_ACT_ART_11"],
  pillarIds: ["governance"],
  frameworks: ["AI_ACT"],
};

function normalizeClauseType(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if ((CLAUSE_TYPES as readonly string[]).includes(s)) return s;
  return s;
}

export function mapClauseToObligations(clause: ExtractedClause): ClauseMapping {
  const key = normalizeClauseType(clause.clauseType);
  const base = CLAUSE_TO_MAP[key] ?? DEFAULT_MAPPING;
  const pillars = base.pillarIds.filter((id) => PILLAR_IDS.has(id));
  return {
    aiActArticles: [...base.aiActArticles],
    pillarIds: pillars.length > 0 ? pillars : ["governance"],
    frameworks: [...base.frameworks],
  };
}
