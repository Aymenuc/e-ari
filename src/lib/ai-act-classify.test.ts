import { describe, it, expect } from 'vitest';
import { classifyByRules, explainClassification, type ClassificationFacts } from './ai-act-classify';
import { ANNEX_III_AREAS, PROHIBITED_PRACTICES, TRANSPARENCY_TRIGGERS } from './ai-act-annex';

function sys(over: Partial<ClassificationFacts>): ClassificationFacts {
  return { name: 'System', description: '', purpose: '', ...over };
}

describe('classifyByRules', () => {
  it('is deterministic — the same facts always give the same tier and trace', () => {
    const f = sys({ purpose: 'Rank applicants for hiring', description: 'CV screening' });
    const a = classifyByRules(f);
    const b = classifyByRules(f);
    expect(a).toEqual(b);
    expect(a.tier).toBe('high');
  });

  it('puts Article 5 above everything else', () => {
    // A banned practice dressed up with governance language is still banned,
    // and an Annex III match alongside it must not soften the answer.
    const r = classifyByRules(sys({
      purpose: 'Social scoring of citizens to set benefit eligibility',
      description: 'Human oversight and a full audit trail are in place',
    }));
    expect(r.tier).toBe('prohibited');
    expect(r.confidence).toBe('high');
    expect(r.basis).toMatch(/cannot be brought into compliance/i);
  });

  it('flags a prohibited match for confirmation, because detecting is not doing', () => {
    // A CSAM *detector* is the opposite of a CSAM generator. The trigger cannot
    // tell them apart, so the result must never read as a settled finding.
    const r = classifyByRules(sys({
      name: 'Moderation filter',
      purpose: 'Detect and block child sexual abuse material before upload',
    }));
    expect(r.tier).toBe('prohibited');
    expect(r.requiresHumanConfirmation).toBe(true);
  });

  it('treats Annex III as a candidate, not a conclusion', () => {
    const r = classifyByRules(sys({ purpose: 'Creditworthiness assessment for loan approval' }));
    expect(r.tier).toBe('high');
    expect(r.requiresHumanConfirmation).toBe(true);
    expect(r.openQuestions.length).toBeGreaterThan(0);
    expect(r.confidence).toBe('medium');
    expect(r.firedRules[0]!.article).toBe('Annex III(5)');
  });

  it('never settles an Annex III match from a description alone', () => {
    // Art. 6(3) lets a provider rebut the presumption for narrow procedural or
    // preparatory tasks. Nothing in a text field shows whether that applies, so
    // no Annex III match may come back as a finished determination.
    for (const purpose of [
      'Automated asylum application triage',
      'Creditworthiness assessment for loan approval',
      'Recruitment screening for candidate ranking',
    ]) {
      const r = classifyByRules(sys({ purpose }));
      expect(r.tier, purpose).toBe('high');
      expect(r.requiresHumanConfirmation, purpose).toBe(true);
      expect(r.confidence, purpose).toBe('medium');
      expect(r.openQuestions[0], purpose).toMatch(/Article 6\(3\) derogation/);
    }
  });

  it('says out loud that Annex I safety components are outside this check', () => {
    // Art. 6(1) high-risk — a safety component of a regulated product — cannot
    // be detected from a purpose string. Silence there would read as clearance.
    const r = classifyByRules(sys({ purpose: 'Recruitment screening' }));
    expect(r.basis).toMatch(/Annex I/);
  });

  it('falls to Article 50 only when no Annex III area matched', () => {
    const r = classifyByRules(sys({ purpose: 'Customer service chatbot for order status' }));
    expect(r.tier).toBe('limited');
    expect(r.firedRules[0]!.article).toBe('Art.50');
    expect(r.requiresHumanConfirmation).toBe(false);
  });

  it('prefers Annex III over Art. 50 when a phrase appears in both', () => {
    // "emotion recognition" is a trigger in both. Annex III(1) must win: the
    // heavier obligation cannot be displaced by the lighter one.
    const r = classifyByRules(sys({ purpose: 'Emotion recognition in the workplace' }));
    expect(r.tier).toBe('high');
    expect(r.firedRules.some((f) => f.article === 'Annex III(1)')).toBe(true);
  });

  it('never reports a clean sweep as a confident clearance', () => {
    const r = classifyByRules(sys({ name: 'Widget', purpose: 'Summarise meeting notes' }));
    expect(r.tier).toBe('minimal');
    expect(r.confidence).toBe('low');
    expect(r.requiresHumanConfirmation).toBe(true);
    expect(r.basis).toMatch(/absence of evidence/i);
    // The literacy duty is not tier-dependent, and the copy must say so.
    expect(r.basis).toMatch(/Article 4/);
  });

  it('records every area that matched, not just the first', () => {
    const r = classifyByRules(sys({
      purpose: 'Recruitment screening',
      description: 'Also scores student exam performance for placement',
    }));
    const arts = r.firedRules.map((f) => f.article);
    expect(arts).toContain('Annex III(3)');
    expect(arts).toContain('Annex III(4)');
  });

  it('quotes the phrase and the field, so the trace can be checked', () => {
    const r = classifyByRules(sys({ purpose: 'Predictive policing for crime prediction' }));
    const line = explainClassification(r)[0]!;
    expect(line).toContain('Annex III(6)');
    expect(line).toContain('crime prediction');
    expect(line).toContain('purpose');
  });

  it('says so plainly when nothing matched', () => {
    expect(explainClassification(classifyByRules(sys({ purpose: 'Spellcheck' })))[0])
      .toMatch(/No enumerated provision matched/);
  });
});

/**
 * Substring matching is the failure that makes a trace untrustworthy.
 *
 * Every sentence below contains a trigger phrase as a raw substring, and every
 * one is ordinary business language: "exam" in "examples", "court" in
 * "courtesy", "election" in "selection", "grading" in "upgrading", "iris" in
 * "Irish", "voting" in "devoting", "promotion" in "promotional". Without the
 * boundary check each would produce a high-risk determination carrying a real
 * article number — which is precisely the kind of citation a reader checks,
 * finds genuine, and believes.
 */
describe('word boundaries', () => {
  const benign: Array<[string, string]> = [
    ['examples', 'Generates examples for the sales team'],
    ['irish', 'Irish market expansion analysis'],
    ['devoting', 'Devoting engineering time to reliability work'],
    ['promotional', 'Promotional email campaign builder'],
    ['examine', 'Helps staff examine invoices for errors'],
    ['courtesy', 'Sends courtesy reminders to customers'],
    ['selection', 'Colour selection tool for the design team'],
    ['upgrading', 'Upgrading legacy systems on a schedule'],
  ];

  for (const [word, sentence] of benign) {
    it(`does not fire on "${word}"`, () => {
      const r = classifyByRules(sys({ purpose: sentence }));
      expect(r.firedRules, `"${sentence}" matched ${r.firedRules.map((f) => f.matchedOn).join(', ')}`)
        .toEqual([]);
      expect(r.tier).toBe('minimal');
    });
  }

  it('still matches the same words used properly', () => {
    expect(classifyByRules(sys({ purpose: 'Deployed by police for investigations' })).tier).toBe('high');
    expect(classifyByRules(sys({ purpose: 'Automated visa decisions' })).tier).toBe('high');
  });

  /**
   * Everyday IT and payments vocabulary that used to trip the heaviest rules.
   *
   * Annex III(7) listed bare "migration" and "visa", and returned high risk at
   * high confidence with nothing left to confirm — so a data-migration tool or
   * a card-reconciliation job was a finished high-risk determination. Art.
   * 5(1)(b) listed "exploit vulnerability", which is security vocabulary, and
   * would have called a vulnerability scanner a banned practice.
   */
  const falsePositives: Array<[string, string]> = [
    ['cloud migration', 'Plans and tracks cloud migration of legacy databases'],
    ['data migration', 'Data migration between the CRM and the warehouse'],
    ['Visa payments', 'Reconciles Visa and Mastercard settlement files'],
    ['vulnerability scanning', 'Scans dependencies to exploit vulnerability classes in staging'],
    ['office heating', 'Controls office heating and cooling schedules'],
  ];

  for (const [label, purpose] of falsePositives) {
    it(`does not fire on ${label}`, () => {
      const r = classifyByRules(sys({ purpose }));
      expect(r.firedRules.map((f) => f.matchedOn), purpose).toEqual([]);
      expect(r.tier).toBe('minimal');
    });
  }

  it('still fires on the migration and border uses the Annex actually covers', () => {
    for (const purpose of [
      'Assesses visa applications for eligibility',
      'Border control passenger risk assessment',
      'Verifies residence permit documents',
    ]) {
      expect(classifyByRules(sys({ purpose })).tier, purpose).toBe('high');
    }
  });

  it('still fires on exploitation of people, which is what Art. 5(1)(b) bans', () => {
    const r = classifyByRules(sys({ purpose: 'Campaigns that target vulnerable groups by age' }));
    expect(r.tier).toBe('prohibited');
  });

  it('treats a plural as the same word', () => {
    // The boundary check is there to stop false positives, but read too
    // strictly it creates false negatives, which are the more expensive kind.
    expect(classifyByRules(sys({ purpose: 'Ships dark patterns into checkout' })).tier).toBe('prohibited');
    expect(classifyByRules(sys({ purpose: 'Ranks applicants by fit' })).tier).toBe('high');
    expect(classifyByRules(sys({ purpose: 'Allocates social benefits' })).tier).toBe('high');
  });

  it('does not treat any trailing letters as a plural', () => {
    // "promotional" is not "promotions"; only a bare trailing s counts.
    expect(classifyByRules(sys({ purpose: 'Promotional banner scheduling' })).tier).toBe('minimal');
    expect(classifyByRules(sys({ purpose: 'Employee promotions and reviews' })).tier).toBe('high');
  });

  it('matches across punctuation and casing', () => {
    const r = classifyByRules(sys({ purpose: 'Scores CREDITWORTHINESS; nothing else.' }));
    expect(r.tier).toBe('high');
  });
});

describe('the enumerated data itself', () => {
  const all = [...ANNEX_III_AREAS, ...PROHIBITED_PRACTICES, ...TRANSPARENCY_TRIGGERS];

  it('carries all eight Annex III areas, in order', () => {
    expect(ANNEX_III_AREAS.map((a) => a.article))
      .toEqual([1, 2, 3, 4, 5, 6, 7, 8].map((n) => `Annex III(${n})`));
  });

  it('includes the two prohibitions added by Reg. 2026/1744', () => {
    const added = PROHIBITED_PRACTICES.filter((p) => p.article.includes('2026/1744'));
    expect(added.map((p) => p.code).sort()).toEqual(['AI_ACT_ART_5_CSAM', 'AI_ACT_ART_5_NCII']);
  });

  it('gives every area a unique code and a non-empty trigger set', () => {
    expect(new Set(all.map((a) => a.code)).size).toBe(all.length);
    for (const a of all) {
      expect(a.triggers.length, a.code).toBeGreaterThan(0);
      expect(a.heading.length, a.code).toBeGreaterThan(0);
    }
  });

  it('keeps triggers lower-case and untrimmed-free, since matching lower-cases both sides', () => {
    for (const a of all) {
      for (const t of a.triggers) {
        expect(t, `${a.code}: "${t}"`).toBe(t.toLowerCase().trim());
        expect(t.length, `${a.code}: "${t}"`).toBeGreaterThan(2);
      }
    }
  });
});
