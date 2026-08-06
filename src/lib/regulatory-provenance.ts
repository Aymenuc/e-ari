/**
 * Which version of the law each engine was written against.
 *
 * A superseded application date survived in eight files at once because
 * nothing recorded what any of them had been checked against. There was no
 * mechanism to notice — every file simply looked like it had always been
 * right. For a product whose entire claim is auditability, regulatory content
 * with no provenance is the same defect it sells the cure for.
 *
 * So each engine that encodes law declares its corpus and the date it was last
 * checked, and `staleEngines()` names the ones lagging. This does not make
 * anything correct; it makes staleness visible, which is the part that failed.
 */

export interface RegulatorySource {
  id: string;
  /** How the instrument should be cited to a reader. */
  citation: string;
  /** Where the text was read. */
  url?: string;
  /** In force from — null for non-binding instruments. */
  inForce: string | null;
}

export const SOURCES: Record<string, RegulatorySource> = {
  'ai-act': {
    id: 'ai-act',
    citation: 'Regulation (EU) 2024/1689 (Artificial Intelligence Act)',
    url: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
    inForce: '2024-08-01',
  },
  'omnibus-ai': {
    id: 'omnibus-ai',
    citation: 'Regulation (EU) 2026/1744 (Digital Omnibus on AI), amending 2024/1689',
    inForce: '2026-07-27',
  },
  'smc-recommendation': {
    id: 'smc-recommendation',
    citation: 'Commission Recommendation (EU) 2025/1099 on the definition of small mid-cap enterprises',
    url: 'https://eur-lex.europa.eu/eli/reco/2025/1099/oj/eng',
    inForce: null,
  },
  'hr-classification-guidelines': {
    id: 'hr-classification-guidelines',
    citation:
      'Draft Commission guidelines on the classification of high-risk AI systems (19 May 2026) — DRAFT, consultation closed 23 July 2026, not adopted',
    url: 'https://digital-strategy.ec.europa.eu/en/library/draft-commission-guidelines-classification-high-risk-ai-systems',
    inForce: null,
  },
  'nist-ai-rmf': {
    id: 'nist-ai-rmf',
    citation: 'NIST AI Risk Management Framework 1.0',
    inForce: null,
  },
  'iso-42001': {
    id: 'iso-42001',
    citation: 'ISO/IEC 42001:2023 — AI management systems',
    inForce: null,
  },
};

export interface EngineProvenance {
  /** Module path, relative to src/lib. */
  engine: string;
  /** What it encodes, for a human reading the audit. */
  encodes: string;
  sources: string[];
  /** ISO date the content was last checked against those sources. */
  checked: string;
}

/**
 * Every module that encodes regulatory content.
 *
 * Adding regulatory content without adding a row here is the failure mode this
 * file exists to catch, so the test asserts the list covers what it should.
 */
export const ENGINE_PROVENANCE: EngineProvenance[] = [
  {
    engine: 'ai-act-timeline.ts',
    encodes: 'Application dates for each part of the Act',
    sources: ['ai-act', 'omnibus-ai'],
    checked: '2026-08-04',
  },
  {
    engine: 'ai-act-scope.ts',
    encodes: 'Safety-component test, Art. 6(1a) exclusions, small mid-cap thresholds',
    sources: ['omnibus-ai', 'smc-recommendation'],
    checked: '2026-08-04',
  },
  {
    engine: 'compliance/ai-act-obligations.ts',
    encodes: 'Obligation catalogue behind the gap radar and coverage matrix',
    sources: ['ai-act', 'omnibus-ai'],
    checked: '2026-08-04',
  },
  {
    engine: 'ai-act-annex.ts',
    encodes: 'Annex III areas, Art. 5 prohibitions and Art. 50 triggers, as data',
    sources: ['ai-act', 'omnibus-ai'],
    checked: '2026-08-06',
  },
  {
    engine: 'ai-act-classify.ts',
    encodes: 'Deterministic risk-tier rules and the trace behind each determination',
    sources: ['ai-act', 'omnibus-ai'],
    checked: '2026-08-06',
  },
  {
    engine: 'compliance/classifier.ts',
    encodes: 'Rationale prompt and citation guard over the rule-decided tier',
    sources: ['ai-act', 'omnibus-ai'],
    checked: '2026-08-06',
  },
  {
    engine: 'regulatory-mapping.ts',
    encodes: 'Pillar-to-obligation mapping across the Act, NIST AI RMF and ISO 42001',
    sources: ['ai-act', 'omnibus-ai', 'nist-ai-rmf', 'iso-42001'],
    checked: '2026-08-04',
  },
  {
    engine: 'training-modules.ts',
    encodes: 'Article 4 literacy curriculum, including the risk-tier explainer',
    sources: ['ai-act', 'omnibus-ai'],
    checked: '2026-08-04',
  },
  {
    engine: 'ai-tool-catalog.ts',
    encodes: 'Per-tool risk notes, including which tools carry the Art. 50 transparency duty',
    sources: ['ai-act', 'omnibus-ai'],
    checked: '2026-08-04',
  },
  {
    engine: 'progression.ts',
    encodes: 'Which obligations gate each stage of the compliance journey',
    sources: ['ai-act', 'omnibus-ai'],
    checked: '2026-08-04',
  },
  {
    engine: 'vendor-questionnaire.ts',
    encodes: 'Supplier questions mapped to provider obligations, incl. Art. 51 GPAI',
    sources: ['ai-act', 'omnibus-ai'],
    checked: '2026-08-04',
  },
  {
    engine: 'plain-summary.ts',
    encodes: 'The timing paragraph on every results page',
    sources: ['ai-act', 'omnibus-ai'],
    checked: '2026-08-04',
  },
  {
    engine: 'marketing-engine.ts',
    encodes: 'Ground-truth block handed to the language model',
    sources: ['ai-act', 'omnibus-ai'],
    checked: '2026-08-04',
  },
];

/** The most recent instrument any engine has been checked against. */
export const CURRENT_CORPUS = SOURCES['omnibus-ai']!;

/**
 * Engines not checked since a given date.
 *
 * Default is the day the Digital Omnibus entered into force: anything last
 * verified before then was written against superseded law.
 */
export function staleEngines(since: string = SOURCES['omnibus-ai']!.inForce!): EngineProvenance[] {
  return ENGINE_PROVENANCE.filter((e) => e.checked < since);
}

/** One line for a report footer or an admin panel. */
export function provenanceLine(): string {
  const stale = staleEngines();
  const base = `Regulatory content current to ${CURRENT_CORPUS.citation}`;
  return stale.length === 0
    ? `${base}. All ${ENGINE_PROVENANCE.length} engines verified.`
    : `${base}. ${stale.length} of ${ENGINE_PROVENANCE.length} engines pending re-verification: ${stale.map((e) => e.engine).join(', ')}.`;
}
