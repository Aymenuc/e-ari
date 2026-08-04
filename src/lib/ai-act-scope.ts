/**
 * Scope rules as amended by the Digital Omnibus on AI.
 *
 * Regulation (EU) 2026/1744, published in the Official Journal on 24 July 2026
 * and in force from 27 July 2026, amends Regulation (EU) 2024/1689. Two of its
 * changes decide whether a system is in scope at all, and neither was encoded
 * anywhere in this product — the classifier prompt said only "prefer high only
 * when description matches high-risk patterns", which is not the test.
 *
 * Nothing here is a legal conclusion. It is the statutory test written out so
 * the classifier applies the current one rather than the 2024 one, and so the
 * reasoning it returns can be checked against the article it claims.
 */

/**
 * The amended safety-component test — two limbs, either sufficient.
 *
 * Art. 3(14) now anchors "safety component" to the safety function as an
 * intended purpose determined by the provider. Art. 6(1a) then excludes
 * systems used solely for non-safety aspects, and Art. 6(1b) keeps the
 * objective criterion so a provider cannot define its way out: if failure
 * would endanger health or safety, it is a safety component regardless of
 * stated intent.
 */
export const SAFETY_COMPONENT_TEST = {
  /** Limb 1 — subjective, Art. 3(14). */
  intendedPurpose:
    'the component\'s intended purpose is to prevent or mitigate risks to the health and safety of persons or property',
  /** Limb 2 — objective, Art. 6(1b). Survives any stated intent. */
  failureEndangers:
    'its failure or malfunctioning would endanger the health and safety of persons or property',
  /** Art. 6(1a) — out of scope when the use is solely one of these. */
  excludedUses: [
    'user assistance',
    'performance optimisation',
    'service efficiency',
    'automation',
    'convenience',
    'quality control',
  ],
} as const;

/**
 * The classification rules the model must apply, as prompt text.
 *
 * Kept beside the test rather than inline in the prompt so the wording the
 * classifier is held to is the same wording this file documents.
 */
export function scopeRulesForPrompt(): string {
  return [
    'Apply the EU AI Act as amended by Regulation (EU) 2026/1744 (Digital Omnibus on AI, in force 27 July 2026). Do not apply the 2024 text unamended.',
    '',
    'SAFETY COMPONENT (Art. 3(14), Art. 6(1)) — a two-limb test, either limb sufficient:',
    `  (a) intended purpose: ${SAFETY_COMPONENT_TEST.intendedPurpose}; OR`,
    `  (b) objective: ${SAFETY_COMPONENT_TEST.failureEndangers}.`,
    `Art. 6(1a) EXCLUDES a system used SOLELY for: ${SAFETY_COMPONENT_TEST.excludedUses.join(', ')}.`,
    'A system that merely assists a user or optimises performance, and whose failure does not endanger anyone, is NOT a safety component and is NOT high-risk on that basis. Say so plainly when it applies — an over-classification costs the reader real money in controls they do not owe.',
    'But a provider cannot define its way out: if limb (b) is met, it is a safety component whatever the stated purpose.',
    '',
    'ANNEX III (Art. 6(2)) is a separate route to high-risk and is unaffected by the safety-component test. Assess it on its own.',
    '',
    'APPLICATION DATES — state these accurately if asked, and never say high-risk obligations applied from 2 August 2026:',
    '  Annex III standalone high-risk: 2 December 2027.',
    '  Annex I product-embedded high-risk: 2 August 2028.',
    '  Art. 4 AI literacy and Art. 50 transparency: unchanged and already applicable.',
    '  Two further Art. 5 prohibitions (non-consensual intimate imagery; child sexual abuse material): 2 December 2026.',
  ].join('\n');
}

/* ─── Small mid-cap enterprise ──────────────────────────────────────────── */

/**
 * Small mid-caps get proportionate treatment under the amended Act.
 *
 * The category comes from Commission Recommendation (EU) 2025/1099: an
 * enterprise that is NOT an SME under Recommendation 2003/361/EC, employs
 * fewer than 750 persons, AND has either turnover of at most EUR 150 million
 * or a balance-sheet total of at most EUR 129 million. The financial limbs are
 * OR, not AND — an enterprise leaves the category only by exceeding both.
 */
export const SMALL_MID_CAP = {
  maxHeadcount: 750,
  maxTurnoverEur: 150_000_000,
  maxBalanceSheetEur: 129_000_000,
  /** What the status is worth under Regulation (EU) 2026/1744. */
  entitlements: [
    'Simplified technical documentation, on templates the Commission provides',
    'A quality management system proportionate to the size of the organisation',
    'Priority access to regulatory sandboxes',
    'Caps on administrative fines — the lower of the percentage or the fixed amount',
  ],
} as const;

export type SmcLikelihood = 'unlikely' | 'possible' | 'likely' | 'unknown';

export interface SmcAssessment {
  likelihood: SmcLikelihood;
  reason: string;
  /** What the organisation would need to supply to settle it. */
  missing: string[];
}

/**
 * What the recorded org-size band can honestly say about small mid-cap status.
 *
 * The bands this product collects ('201-1000') straddle the 750 threshold, and
 * the category also turns on turnover, balance sheet, and not already being an
 * SME — none of which is captured. So this rules the category OUT where the
 * band makes it impossible and otherwise says what is still needed. It never
 * asserts the status: telling an organisation it qualifies for reduced
 * documentation when it does not is a costly thing to be wrong about.
 */
export function assessSmallMidCap(orgSize: string | null | undefined): SmcAssessment {
  const financials = ['annual turnover', 'balance-sheet total'];
  switch (orgSize) {
    case '1-50':
    case '51-200':
      return {
        likelihood: 'unlikely',
        reason:
          'A small mid-cap must first not be an SME. At this headcount the organisation is likely an SME under Recommendation 2003/361/EC, which carries its own proportionate treatment rather than the small mid-cap regime.',
        missing: financials,
      };
    case '201-1000':
      return {
        likelihood: 'possible',
        reason:
          'This band straddles the 750-employee ceiling, so headcount alone cannot settle it.',
        missing: ['exact headcount', ...financials],
      };
    case '1001-5000':
    case '5000+':
      return {
        likelihood: 'unlikely',
        reason:
          'Small mid-cap status requires fewer than 750 employees, which this band exceeds.',
        missing: [],
      };
    default:
      return {
        likelihood: 'unknown',
        reason: 'No organisation size on record.',
        missing: ['headcount', ...financials],
      };
  }
}
