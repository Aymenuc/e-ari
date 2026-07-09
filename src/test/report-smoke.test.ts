import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'fs';
import { generateAssessmentReport } from '@/lib/report-generator';
import { scoreAssessment, type ResponseMap } from '@/lib/assessment-engine';
import JSZip from 'jszip';

describe('report docx', () => {
  it('renders with X-Ray, sector weighting, and action table', async () => {
    const responses: ResponseMap = {};
    const answers: Record<string, number[]> = {
      strategy:[5,5,3,5,3],     // high ambition (1+2+4 = 15)
      data:[3,3,1,3,3],         // data_3 governance = 1
      technology:[5,5,3,3,4],   // tech adoption 1+2 = 10
      talent:[4,4,3,4,3],
      governance:[1,3,3,3,1],   // gov_1 + gov_5 = 1 → Shadow IT + Ambition Gap
      culture:[4,4,3,3,4], process:[3,2,3,3,3], security:[3,3,3,3,3],
    };
    for (const p of Object.keys(answers)) answers[p].forEach((a,i)=> responses[`${p}_${i+1}`]=a);

    const scoring = scoreAssessment(responses, 'government');
    expect(scoring.xRayFindings && scoring.xRayFindings.length).toBeGreaterThan(0);
    expect(scoring.sectorWeighting).toBeTruthy();

    const insights = {
      executiveSummary: 'Government body summary.',
      strengths: ['Talent supports in-house delivery.'],
      gaps: ['Strategy is the binding constraint.'],
      risks: ['Governance gaps create audit exposure.'],
      opportunities: ['Data enables iteration.'],
      nextSteps: [
        'Charter the AI investment case | Owner: Director | Timeline: 90 days | Success metric: Board-approved plan',
        'Stand up model monitoring | Owner: Head of ML | Timeline: 180 days | Success metric: Drift alerts live',
      ],
      pillarDrilldown: [],
      isAIGenerated: true, promptVersion: '3.1.0', generatedAt: new Date().toISOString(),
    };

    const buf = await generateAssessmentReport({
      scoringResult: scoring, insights,
      userName: 'Test User', organization: 'UNU-EGOV', sector: 'government',
      completedAt: new Date().toISOString(),
    } as any);

    expect(buf.length).toBeGreaterThan(10000);
    try { writeFileSync('/tmp/report.docx', buf); } catch { /* CI may lack /tmp write; not essential */ }

    // Unzip and read document.xml to confirm the new sections rendered.
    const zip = await JSZip.loadAsync(buf);
    const xml = await zip.file('word/document.xml')!.async('string');
    const has = (s: string) => expect(xml.includes(s), `missing: ${s}`).toBe(true);
    has('Structural Findings');
    has('Sector Weighting');
    has('Recommended Next Steps');
    has('Success metric');   // action table header
    has('Owner');
    // sector weighting note should mention baseline → weighted
    expect(/baseline/i.test(xml)).toBe(true);
    console.log('[report-smoke] docx bytes:', buf.length, '· xml length:', xml.length);
  });
});
