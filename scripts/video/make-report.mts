/**
 * Generate the report the film holds up.
 *
 * The video shows a real artefact, not a mockup — so this runs the actual
 * scoring engine and the actual PDF builder. If the cover changes, re-running
 * this is the whole update; there is no second copy of the design to drift.
 *
 * Usage: npx tsx scripts/video/make-report.mts
 */
import { writeFileSync } from 'node:fs';
import { scoreAssessment } from '../../src/lib/assessment-engine';
import { generateAssessmentPdf } from '../../src/lib/report-pdf';
import { PILLARS } from '../../src/lib/pillars';

// Aurora Health Group — the organisation the film follows from the first shot.
// Strong on people and use cases, weak on governance and data: the shape that
// makes the film's "governance is the constraint" beat true rather than staged.
const BY_PILLAR: Record<string, number> = {
  strategy: 4, governance: 2, data: 2, technology: 4,
  talent: 4, culture: 4, process: 3, security: 3,
};

const responses: Record<string, number> = {};
for (const p of PILLARS) {
  const v = BY_PILLAR[p.id];
  if (v === undefined) throw new Error(`no answer set for pillar "${p.id}"`);
  for (const q of p.questions) responses[q.id] = v;
}

const scoringResult = scoreAssessment(responses, 'healthcare');

const pdf = await generateAssessmentPdf({
  scoringResult,
  insights: {
    executiveSummary:
      'Aurora Health Group operates AI across clinical triage and scheduling with capable teams and clear executive sponsorship. The constraint is governance: systems are in production without a maintained inventory, documented human oversight, or an owner named against each deployment. Under the EU AI Act these are obligations that fall on the deployer, and evidence is what a regulator asks for first.',
    strengths: [
      'Executive sponsorship is explicit and funded, not delegated to IT',
      'Clinical teams already run AI in triage and scheduling at scale',
      'A culture of measured adoption — pilots are evaluated before rollout',
    ],
    gaps: [
      'No maintained inventory of AI systems in production',
      'Human oversight exists in practice but is not documented',
      'Data lineage for training and inference is not traceable end to end',
    ],
    risks: [
      'Clinical triage is likely high-risk under Annex III; obligations apply on the deployer',
      'Without an inventory there is no basis for a conformity conversation',
      'Undocumented oversight cannot be evidenced under Article 26',
    ],
    nextSteps: [
      'Stand up the AI system inventory — owner, purpose, risk class, per system',
      'Document the human-oversight arrangement already in place clinically',
      'Trace data lineage for the triage model back to source',
    ],
    isAIGenerated: false,
  },
  organization: 'Aurora Health Group',
  userName: 'Chief Compliance Officer',
  sector: 'Healthcare',
  completedAt: new Date('2026-07-31T09:00:00Z').toISOString(),
  previousScore: null,
});

const out = new URL('./report.pdf', import.meta.url).pathname;
writeFileSync(out, pdf);
console.log(`${out}  ${Math.round(pdf.length / 1024)}KB  score=${scoringResult.overallScore.toFixed(1)}`);
