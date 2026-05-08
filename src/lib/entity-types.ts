/**
 * Entity-type awareness — the missing axis next to "sector".
 *
 * Until now the platform assumed every assessment subject was a commercial
 * for-profit company. Sector got us partway (healthcare vs. finance vs.
 * manufacturing) but the *entity TYPE* (commercial vs. public-sector vs.
 * NGO vs. academic vs. international body) drives which regulations apply,
 * which roles read the report, and what language fits in the narrative.
 *
 * UNU-EGOV is the canonical breakage: a UN body whose mandate is e-government,
 * which the old code rendered with FERPA/COPPA, ROI claims, and a CEO/CFO
 * executive brief. None of those are right for them. This module makes the
 * distinction explicit so every downstream prompt and template can adapt.
 *
 * Single source of truth — every agent reads from here.
 */

export type EntityType =
  | 'commercial'         // for-profit company, scale-up, SaaS, corporate
  | 'public_sector'      // government agency, ministry, regulator, public body
  | 'nonprofit'          // NGO, foundation, charity, association
  | 'academic'           // university, research institute, school
  | 'international_body' // UN body, OECD, World Bank, multilateral
  | 'unknown';           // fallback when classification is ambiguous

export const ALL_ENTITY_TYPES: readonly EntityType[] = [
  'commercial',
  'public_sector',
  'nonprofit',
  'academic',
  'international_body',
  'unknown',
] as const;

/**
 * Entity-aware vocabulary the synthesis prompt + report templates draw from.
 * The point isn't to forbid the word "company" — it's to give every template
 * a noun that fits the actual reader's mental model. A UN body director
 * reading "scale across business units" disengages immediately.
 */
export interface EntityVocab {
  /** What to call the org itself in narrative text. */
  noun: string;
  /** Plural — for comparisons. */
  pluralNoun: string;
  /** What the reader's peers are called in benchmarks. */
  peerNoun: string;
  /** What "scaling" looks like for this entity. */
  scalingNoun: string;
  /** What "business value" maps to. */
  valueNoun: string;
  /** Top-of-org role reading the executive brief. */
  topRole: string;
  /** Whether the C-suite executive brief (CEO/CFO/CTO/CISO/CHRO/COO) makes sense. */
  showCSuiteBrief: boolean;
  /** Whether ROI / payback / business-case language is appropriate. */
  showRoiLanguage: boolean;
  /** Whether the multi-org / SSO / corporate-IT modules apply. */
  showMultiOrgModule: boolean;
}

export const ENTITY_VOCAB: Record<EntityType, EntityVocab> = {
  commercial: {
    noun: 'company',
    pluralNoun: 'companies',
    peerNoun: 'industry peers',
    scalingNoun: 'business units',
    valueNoun: 'business value and ROI',
    topRole: 'CEO',
    showCSuiteBrief: true,
    showRoiLanguage: true,
    showMultiOrgModule: true,
  },
  public_sector: {
    noun: 'public-sector body',
    pluralNoun: 'public-sector bodies',
    peerNoun: 'peer agencies',
    scalingNoun: 'directorates and programmes',
    valueNoun: 'public value and service-delivery outcomes',
    topRole: 'Director-General',
    showCSuiteBrief: false,
    showRoiLanguage: false,
    showMultiOrgModule: true,
  },
  nonprofit: {
    noun: 'organisation',
    pluralNoun: 'organisations',
    peerNoun: 'peer organisations',
    scalingNoun: 'programmes',
    valueNoun: 'mission impact and beneficiary outcomes',
    topRole: 'Executive Director',
    showCSuiteBrief: false,
    showRoiLanguage: false,
    showMultiOrgModule: false,
  },
  academic: {
    noun: 'institution',
    pluralNoun: 'institutions',
    peerNoun: 'peer institutions',
    scalingNoun: 'departments and research groups',
    valueNoun: 'research output and educational outcomes',
    topRole: 'Vice-Chancellor / President',
    showCSuiteBrief: false,
    showRoiLanguage: false,
    showMultiOrgModule: true,
  },
  international_body: {
    noun: 'international body',
    pluralNoun: 'international bodies',
    peerNoun: 'peer multilateral organisations',
    scalingNoun: 'programmes and country offices',
    valueNoun: 'mandate delivery and member-state impact',
    topRole: 'Director / Rector',
    showCSuiteBrief: false,
    showRoiLanguage: false,
    showMultiOrgModule: false,
  },
  unknown: {
    noun: 'organisation',
    pluralNoun: 'organisations',
    peerNoun: 'peer organisations',
    scalingNoun: 'teams and programmes',
    valueNoun: 'outcomes against your stated objectives',
    topRole: 'senior leadership',
    showCSuiteBrief: false,
    showRoiLanguage: false,
    showMultiOrgModule: false,
  },
};

/**
 * Default regulatory considerations per (sector × entityType). The old
 * lookup was sector-only, which meant any "education"-tagged org got
 * FERPA / COPPA / ADA — wrong for academic research institutes outside
 * the US, wrong for international bodies, wrong for public-sector
 * agencies that happen to do education work.
 *
 * Order: most-relevant first. Reports + UI display the first 4 for
 * compactness, but the full list is preserved on the OrgContext object
 * for downstream agents to query.
 */
export function getDefaultRegulations(
  sector: string | undefined,
  entityType: EntityType,
): string[] {
  // Universal floor — every entity type sees these where relevant.
  const universal = (): string[] => [
    'GDPR — General Data Protection Regulation (where personal data is processed)',
    'EU AI Act — risk-classification regime (effective 2 August 2026)',
  ];

  // Entity-type-specific overrides win over sector defaults for non-commercial orgs.
  if (entityType === 'international_body') {
    return [
      'UN Secretary-General bulletins on data protection (ST/SGB/2007/6 and successors)',
      'UN System Personal Data Protection and Privacy Principles (HLCM, 2018)',
      'GDPR — applicable to EU staff, partners, and beneficiary data',
      'Host-country agreements and headquarters protocols',
      'OECD AI Principles + UN Principles for the Ethical Use of AI in the UN System',
      'EU AI Act — applicable when serving EU member states or EU-based deployers',
    ];
  }

  if (entityType === 'public_sector') {
    return [
      'EU AI Act — Article 6 high-risk obligations for public-authority AI use',
      'GDPR + national data-protection acts (public-task lawful basis)',
      'NIS2 Directive — cybersecurity for essential and important entities',
      'eIDAS 2.0 + EU Interoperable Europe Act',
      'National AI strategies and public-sector procurement frameworks',
      'OECD Recommendation on AI in the public sector',
    ];
  }

  if (entityType === 'academic') {
    return [
      'GDPR — research lawful-basis and special-category data handling',
      'EU AI Act — research-exemption boundaries (Article 2 scope)',
      'Research-ethics frameworks (national + institutional REC/IRB)',
      'Open science / FAIR data obligations from funders (Horizon Europe, NIH, etc.)',
      'Title IX / Section 504 / ADA where the institution is US-based and serves students',
      'National accreditation and quality-assurance regulators',
    ];
  }

  if (entityType === 'nonprofit') {
    return [
      'GDPR + national data-protection acts (legitimate-interest assessments for advocacy)',
      'EU AI Act — applicability scoped to actual AI-system role',
      'Charity-commission / fiscal-host reporting standards in operating jurisdictions',
      'Donor-imposed conditions and grant-agreement compliance clauses',
      'Beneficiary safeguarding and do-no-harm frameworks',
    ];
  }

  // Commercial (default) — keep sector-driven granularity that worked previously.
  const commercialBySector: Record<string, string[]> = {
    healthcare: [
      'HIPAA (Health Insurance Portability and Accountability Act)',
      'FDA AI/ML-based Software as a Medical Device (SaMD) guidance',
      'HITECH Act',
      'EU MDR (Medical Device Regulation) for AI-based medical devices',
      'EU AI Act — high-risk classification for clinical decision support',
    ],
    finance: [
      'SR 11-7 (Federal Reserve Model Risk Management guidance)',
      'Basel III/IV capital and risk management requirements',
      'SOX (Sarbanes-Oxley Act)',
      'GDPR for EU operations',
      'EU AI Act high-risk classification for credit scoring and pricing',
      'DORA (Digital Operational Resilience Act) for EU financial entities',
    ],
    manufacturing: [
      'ISO 27001 information security management',
      'NIST Cybersecurity Framework for OT/IT convergence',
      'EU Machinery Regulation for AI-enabled equipment',
      'Industry-specific safety standards (ISO 13849, IEC 62443)',
      'EU AI Act for safety components',
    ],
    retail: [
      'GDPR and CCPA consumer data privacy regulations',
      'PCI DSS (Payment Card Industry Data Security Standard)',
      'EU AI Act for AI in consumer-facing applications',
      'FTC guidelines on AI-driven consumer decisions',
    ],
    technology: [
      'GDPR data protection and algorithmic transparency',
      'EU AI Act obligations for AI system providers (Article 16)',
      'CCPA/CPRA consumer privacy regulations',
      'SOC 2 Type II compliance for SaaS platforms',
    ],
    energy: [
      'NERC CIP (Critical Infrastructure Protection) standards',
      'IEC 62351 cybersecurity for power systems',
      'EU AI Act for critical infrastructure AI systems',
      'NIS2 Directive (energy sector is essential entity)',
    ],
    education: [
      // Commercial EdTech — not the same as academic/research institutes.
      'FERPA — when handling US student data',
      'COPPA — when product reaches users under 13',
      'GDPR — for EU student data',
      'ADA/Section 508 accessibility requirements',
      'EU AI Act — Annex III high-risk for AI in education',
    ],
    government: [
      // Commercial vendor selling to gov — different from public_sector entity itself.
      'FedRAMP for cloud service authorization (US gov sales)',
      'NIST AI Risk Management Framework (AI RMF)',
      'OMB Memo M-24-10 on AI governance in US federal agencies',
      'CISA cybersecurity requirements',
      'EU AI Act for AI sold to public authorities',
    ],
  };

  return commercialBySector[sector ?? ''] ?? universal();
}

/**
 * Convenience helper — get the vocabulary for an entity type, falling back
 * to the unknown-entity neutral set. Use in templates: never branch on
 * EntityType inline; always read from ENTITY_VOCAB[type].
 */
export function getVocab(entityType: EntityType | string | null | undefined): EntityVocab {
  if (typeof entityType === 'string' && (ALL_ENTITY_TYPES as readonly string[]).includes(entityType)) {
    return ENTITY_VOCAB[entityType as EntityType];
  }
  return ENTITY_VOCAB.unknown;
}

/**
 * LLM detection prompt fragment — append to the existing classifier prompt
 * so we get sector AND entityType in one round-trip instead of two.
 */
export const ENTITY_TYPE_PROMPT_FRAGMENT = `
Also classify the entity type:
- commercial: for-profit company, startup, SaaS, corporation
- public_sector: government agency, ministry, regulator, public body
- nonprofit: NGO, foundation, charity, association
- academic: university, research institute, school
- international_body: UN body, OECD, World Bank, multilateral organisation
- unknown: cannot tell from the snippet

Reply on a second line with: ENTITY: <one of the keys above>
`;
