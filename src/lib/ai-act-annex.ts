/**
 * The enumerated parts of the Act, as data rather than prose in a prompt.
 *
 * Risk tier was decided by a single LLM call returning "high" or "minimal".
 * That is the most consequential output this product produces and the least
 * defensible way to produce it: Stanford RegLab found purpose-built,
 * retrieval-backed commercial legal tools still hallucinate 17–33% of the
 * time, and their failure mode is usually *misgrounding* — citing a real
 * article that does not support the claim — which no citation check catches
 * and no reader can spot.
 *
 * Article 5 and Annex III are lists. Lists belong in code, where a match
 * produces a trace someone can argue with. What is left over — "intended
 * purpose", "significant risk of harm", whether a profiling exception applies
 * — is genuine interpretation, and this file marks it as such rather than
 * pretending a table settles it.
 *
 * Source: Regulation (EU) 2024/1689 Article 5 and Annex III, as amended by
 * Regulation (EU) 2026/1744. Headings are the Act's; the trigger phrases are
 * matching aids for evidence, not a restatement of the legal text. Nothing
 * here is a legal conclusion — see classifyByRules() for what it does emit.
 */

export interface EnumeratedArea {
  /** Stable code, shared with the obligation catalogue. */
  code: string;
  /** The Act's own heading for the area. */
  heading: string;
  article: string;
  /**
   * Phrases whose presence in a system's purpose or description makes this
   * area a candidate. Deliberately over-inclusive: a candidate is something a
   * human confirms, so a false positive costs a question and a false negative
   * costs a missed obligation.
   */
  triggers: string[];
  /**
   * What still has to be decided by a person once the area is a candidate.
   * Empty means nothing beyond the area-specific question remains — for Annex
   * III the Art. 6(3) derogation question is added by the classifier and always
   * applies, so no Annex III match is ever settled from a description.
   */
  openQuestions: string[];
}

/** Annex III — the standalone high-risk areas. Obligations from 2 Dec 2027. */
export const ANNEX_III_AREAS: readonly EnumeratedArea[] = [
  {
    code: 'AI_ACT_ANNEX_III_1',
    heading: 'Biometrics',
    article: 'Annex III(1)',
    triggers: [
      'biometric', 'facial recognition', 'face recognition', 'fingerprint',
      'iris', 'voice identification', 'emotion recognition', 'biometric categorisation',
    ],
    openQuestions: [
      'Is the system used for remote biometric identification, categorisation, or emotion inference — and in which setting?',
    ],
  },
  {
    code: 'AI_ACT_ANNEX_III_2',
    heading: 'Critical infrastructure',
    article: 'Annex III(2)',
    triggers: [
      'critical infrastructure', 'water supply', 'gas supply', 'electricity grid',
      'power grid', 'district heating', 'heating supply', 'road traffic',
      'traffic management', 'utility network',
    ],
    openQuestions: [
      'Is the system a safety component of the infrastructure, applying the Art. 3(14) test?',
    ],
  },
  {
    code: 'AI_ACT_ANNEX_III_3',
    heading: 'Education and vocational training',
    article: 'Annex III(3)',
    triggers: [
      'admission', 'student assessment', 'exam', 'examination', 'grading',
      'proctoring', 'learning outcome', 'educational placement', 'vocational training',
    ],
    openQuestions: [
      'Does it determine access, assign people to institutions, evaluate outcomes, or monitor prohibited behaviour during tests?',
    ],
  },
  {
    code: 'AI_ACT_ANNEX_III_4',
    heading: 'Employment, workers management and access to self-employment',
    article: 'Annex III(4)',
    triggers: [
      'recruitment', 'cv screening', 'candidate ranking', 'applicant', 'hiring',
      'promotion', 'termination', 'task allocation', 'performance evaluation',
      'worker monitoring',
    ],
    openQuestions: [
      'Is it used to recruit or select, or to make or materially influence decisions on terms, promotion, termination, task allocation or monitoring?',
    ],
  },
  {
    code: 'AI_ACT_ANNEX_III_5',
    heading: 'Access to essential private and public services and benefits',
    article: 'Annex III(5)',
    triggers: [
      'creditworthiness', 'credit scoring', 'credit score', 'loan approval',
      'benefit eligibility', 'public assistance', 'social benefit', 'insurance pricing',
      'risk pricing', 'emergency triage', 'emergency dispatch', 'patient triage',
    ],
    openQuestions: [
      'Does it evaluate eligibility, creditworthiness (excluding fraud detection), life or health insurance risk, or emergency call triage?',
    ],
  },
  {
    code: 'AI_ACT_ANNEX_III_6',
    heading: 'Law enforcement',
    article: 'Annex III(6)',
    triggers: [
      'law enforcement', 'police', 'crime prediction', 'recidivism',
      'polygraph', 'criminal investigation', 'evidence reliability',
    ],
    openQuestions: [
      'Is the deployer a law-enforcement authority, or acting on its behalf?',
    ],
  },
  {
    code: 'AI_ACT_ANNEX_III_7',
    heading: 'Migration, asylum and border control management',
    article: 'Annex III(7)',
    // Not bare "migration" or "visa". Both are ordinary IT and payments
    // vocabulary — "cloud migration", "Visa reconciliation" — and this area
    // used to return high risk at high confidence with nothing to confirm.
    triggers: [
      'asylum', 'border control', 'border management', 'visa application',
      'visa decision', 'residence permit', 'immigration', 'migration management',
      'irregular migration', 'travel document verification', 'deportation',
    ],
    openQuestions: [
      'Is the deployer a competent public authority, or acting on its behalf, in migration, asylum or border control?',
    ],
  },
  {
    code: 'AI_ACT_ANNEX_III_8',
    heading: 'Administration of justice and democratic processes',
    article: 'Annex III(8)',
    triggers: [
      'judicial', 'court', 'legal research for a judge', 'dispute resolution',
      'election', 'voting', 'referendum', 'influencing voters',
    ],
    openQuestions: [
      'Does it assist a judicial authority in researching or interpreting facts and law, or influence an election outcome?',
    ],
  },
] as const;

/** Article 5 — banned outright. Two added by Reg. 2026/1744 from 2 Dec 2026. */
export const PROHIBITED_PRACTICES: readonly EnumeratedArea[] = [
  {
    code: 'AI_ACT_ART_5_SOCIAL_SCORING',
    heading: 'Social scoring leading to detrimental or disproportionate treatment',
    article: 'Art.5(1)(c)',
    triggers: ['social scoring', 'social credit', 'citizen scoring', 'trustworthiness score'],
    openQuestions: ['Does the treatment arise in a context unrelated to where the data was collected, or is it disproportionate?'],
  },
  {
    code: 'AI_ACT_ART_5_MANIPULATION',
    heading: 'Subliminal, manipulative or exploitative techniques causing significant harm',
    article: 'Art.5(1)(a)-(b)',
    // "exploit vulnerability" alone is security vocabulary — it would have made
    // a vulnerability scanner a banned practice. Art. 5(1)(b) is about
    // vulnerabilities *of persons*: age, disability, socio-economic situation.
    triggers: [
      'subliminal', 'manipulative technique', 'dark pattern',
      'exploit vulnerabilities of persons', 'exploit vulnerable', 'exploits vulnerable',
      'target vulnerable groups', 'prey on vulnerable',
    ],
    openQuestions: ['Does it materially distort behaviour and cause or be reasonably likely to cause significant harm?'],
  },
  {
    code: 'AI_ACT_ART_5_SCRAPING',
    heading: 'Untargeted scraping of facial images to build recognition databases',
    article: 'Art.5(1)(e)',
    triggers: ['scrape facial images', 'untargeted scraping', 'facial image database', 'face database from internet'],
    openQuestions: [],
  },
  {
    code: 'AI_ACT_ART_5_NCII',
    heading: 'Non-consensual intimate imagery of identifiable people',
    article: 'Art.5 (added by Reg. 2026/1744)',
    triggers: ['nudify', 'nudifier', 'intimate imagery', 'undress', 'deepfake nude', 'non-consensual intimate'],
    openQuestions: [],
  },
  {
    code: 'AI_ACT_ART_5_CSAM',
    heading: 'Child sexual abuse material',
    article: 'Art.5 (added by Reg. 2026/1744)',
    triggers: ['child sexual abuse', 'csam', 'child abuse material'],
    openQuestions: [],
  },
] as const;

/** Article 50 — transparency duties. Applicable since 2 August 2026. */
export const TRANSPARENCY_TRIGGERS: readonly EnumeratedArea[] = [
  {
    code: 'AI_ACT_ART_50',
    heading: 'Interaction with people, or generated or manipulated content',
    article: 'Art.50',
    triggers: [
      'chatbot', 'conversational', 'virtual assistant', 'customer service assistant',
      'generative', 'synthetic content', 'deepfake', 'text generation',
      'image generation', 'voice synthesis', 'emotion recognition',
    ],
    openQuestions: [],
  },
] as const;
