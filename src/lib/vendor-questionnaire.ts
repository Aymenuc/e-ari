/**
 * Third-party AI vendor risk questionnaire — versioned definition + scoring.
 *
 * Sent to vendor contacts via magic link (no account). Answers are scored
 * deterministically: each option carries points (0 = best, higher = riskier)
 * and optional severity flags. Risk tier derives from the normalised score.
 * The LLM only writes a short summary GROUNDED in the answers — it never
 * changes the score.
 */

export const QUESTIONNAIRE_VERSION = '1.0.0';

export interface VendorQuestion {
  id: string;
  section: 'data' | 'security' | 'ai' | 'legal';
  text: string;
  options: { label: string; points: number; flag?: string }[];
}

export const VENDOR_QUESTIONS: VendorQuestion[] = [
  // ── Data handling ──────────────────────────────────────────────────────
  { id: 'd1', section: 'data', text: 'Is customer-submitted data used to train your models (or your subprocessors\' models)?', options: [
    { label: 'Never', points: 0 },
    { label: 'Opt-in only', points: 1 },
    { label: 'Default on, opt-out available', points: 3, flag: 'trains-on-data' },
    { label: 'Yes, no opt-out', points: 5, flag: 'trains-on-data' },
    { label: 'Unknown / cannot confirm', points: 4, flag: 'unknown-training' } ] },
  { id: 'd2', section: 'data', text: 'Where is customer data stored and processed?', options: [
    { label: 'EU/EEA only', points: 0 },
    { label: 'EU + adequacy countries', points: 1 },
    { label: 'US with SCCs / DPF', points: 2 },
    { label: 'Other / mixed jurisdictions', points: 3 },
    { label: 'Unknown', points: 4, flag: 'unknown-residency' } ] },
  { id: 'd3', section: 'data', text: 'What is your default retention period for customer inputs/outputs?', options: [
    { label: 'Not retained (zero retention)', points: 0 },
    { label: '≤ 30 days', points: 1 },
    { label: '≤ 12 months', points: 2 },
    { label: 'Indefinite / until deletion request', points: 4 },
    { label: 'Unknown', points: 4 } ] },
  { id: 'd4', section: 'data', text: 'Can customers delete their data (inputs, outputs, fine-tunes) on request?', options: [
    { label: 'Yes, self-service', points: 0 },
    { label: 'Yes, via support', points: 1 },
    { label: 'Partially', points: 3 },
    { label: 'No', points: 5, flag: 'no-deletion' } ] },
  // ── Security ───────────────────────────────────────────────────────────
  { id: 's1', section: 'security', text: 'Which security certifications do you hold? (best applicable)', options: [
    { label: 'ISO 27001 and SOC 2 Type II', points: 0 },
    { label: 'SOC 2 Type II', points: 1 },
    { label: 'ISO 27001', points: 1 },
    { label: 'In progress', points: 3 },
    { label: 'None', points: 4, flag: 'no-cert' } ] },
  { id: 's2', section: 'security', text: 'Have you had a reportable data breach in the last 36 months?', options: [
    { label: 'No', points: 0 },
    { label: 'Yes — disclosed, remediated', points: 2 },
    { label: 'Yes — details not public', points: 4, flag: 'breach-history' },
    { label: 'Cannot answer', points: 3 } ] },
  { id: 's3', section: 'security', text: 'Is customer data encrypted at rest and in transit?', options: [
    { label: 'Yes, both', points: 0 },
    { label: 'In transit only', points: 3 },
    { label: 'Unknown', points: 4 } ] },
  { id: 's4', section: 'security', text: 'Do you support SSO/SAML and role-based access control for customer accounts?', options: [
    { label: 'Both', points: 0 },
    { label: 'SSO only', points: 1 },
    { label: 'RBAC only', points: 2 },
    { label: 'Neither', points: 3 } ] },
  // ── AI-specific ────────────────────────────────────────────────────────
  { id: 'a1', section: 'ai', text: 'Which foundation models power your product?', options: [
    { label: 'Own models, documented', points: 0 },
    { label: 'Major providers (OpenAI/Anthropic/Google), documented', points: 1 },
    { label: 'Mix, partially documented', points: 2 },
    { label: 'Not disclosed', points: 4, flag: 'opaque-models' } ] },
  { id: 'a2', section: 'ai', text: 'Are you a GPAI model provider under the EU AI Act (Art. 51+), and if so are you meeting those obligations?', options: [
    { label: 'Not a GPAI provider', points: 0 },
    { label: 'Yes — obligations met (docs available)', points: 1 },
    { label: 'Yes — in progress', points: 3 },
    { label: 'Unsure', points: 3, flag: 'gpai-unclear' } ] },
  { id: 'a3', section: 'ai', text: 'Do you provide documentation to support customers\' EU AI Act compliance (model cards, intended-purpose statements, technical documentation)?', options: [
    { label: 'Yes, standard package', points: 0 },
    { label: 'On request', points: 1 },
    { label: 'Planned', points: 3 },
    { label: 'No', points: 4, flag: 'no-aia-docs' } ] },
  { id: 'a4', section: 'ai', text: 'Can customers disable AI features / model logging per workspace?', options: [
    { label: 'Yes, granular controls', points: 0 },
    { label: 'Workspace-level toggle', points: 1 },
    { label: 'No', points: 3 } ] },
  { id: 'a5', section: 'ai', text: 'Do outputs include provenance signals (citations, watermarking, or AI-content labels) where applicable?', options: [
    { label: 'Yes', points: 0 },
    { label: 'Partially', points: 1 },
    { label: 'No', points: 2 } ] },
  // ── Legal ──────────────────────────────────────────────────────────────
  { id: 'l1', section: 'legal', text: 'Do you offer a GDPR Data Processing Agreement (DPA)?', options: [
    { label: 'Yes, standard', points: 0 },
    { label: 'Yes, on enterprise plans only', points: 2 },
    { label: 'No', points: 5, flag: 'no-dpa' } ] },
  { id: 'l2', section: 'legal', text: 'Is your subprocessor list public and change-notified?', options: [
    { label: 'Yes, with notification', points: 0 },
    { label: 'Public, no notification', points: 1 },
    { label: 'On request', points: 2 },
    { label: 'Not available', points: 4 } ] },
  { id: 'l3', section: 'legal', text: 'Do your terms grant you rights over customer inputs/outputs beyond service delivery?', options: [
    { label: 'No — customer retains all rights', points: 0 },
    { label: 'Limited licence for service improvement', points: 2 },
    { label: 'Broad licence', points: 4, flag: 'broad-ip-grab' },
    { label: 'Unknown', points: 3 } ] },
  { id: 'l4', section: 'legal', text: 'Do you carry cyber/tech E&O insurance adequate for enterprise customers?', options: [
    { label: 'Yes (≥ €5M)', points: 0 },
    { label: 'Yes (lower cover)', points: 1 },
    { label: 'No / unknown', points: 3 } ] },
];

export interface VendorScoreResult {
  score: number;        // 0-100, higher = LOWER risk (grade-like)
  riskTier: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  answered: number;
  sectionScores: Record<string, number>; // 0-100 per section
}

const CRITICAL_FLAGS = new Set(['no-dpa', 'trains-on-data', 'no-deletion']);

/** answers: { [questionId]: optionIndex } */
export function scoreVendorQuestionnaire(answers: Record<string, number>): VendorScoreResult {
  let earned = 0;
  let max = 0;
  let answered = 0;
  const flags: string[] = [];
  const sectionEarned: Record<string, number> = {};
  const sectionMax: Record<string, number> = {};
  for (const q of VENDOR_QUESTIONS) {
    const worst = Math.max(...q.options.map((o) => o.points));
    const idx = answers[q.id];
    const opt = typeof idx === 'number' ? q.options[idx] : undefined;
    // Unanswered questions count as worst-case: an unanswered risk question
    // is not evidence of safety.
    const pts = opt ? opt.points : worst;
    if (opt) {
      answered++;
      if (opt.flag) flags.push(opt.flag);
    }
    earned += pts; max += worst;
    sectionEarned[q.section] = (sectionEarned[q.section] ?? 0) + pts;
    sectionMax[q.section] = (sectionMax[q.section] ?? 0) + worst;
  }
  const score = Math.round((1 - earned / Math.max(1, max)) * 100);
  const hasCritical = flags.some((f) => CRITICAL_FLAGS.has(f));
  const riskTier: VendorScoreResult['riskTier'] =
    hasCritical || score < 35 ? 'critical'
    : score < 55 ? 'high'
    : score < 75 ? 'medium'
    : 'low';
  const sectionScores: Record<string, number> = {};
  for (const s of Object.keys(sectionMax)) {
    sectionScores[s] = Math.round((1 - (sectionEarned[s] ?? 0) / Math.max(1, sectionMax[s] ?? 1)) * 100);
  }
  return { score, riskTier, flags, answered, sectionScores };
}
