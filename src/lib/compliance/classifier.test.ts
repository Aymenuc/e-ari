import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AISystem } from '@prisma/client';
import {
  splitRationale, RATIONALE_TRACE_MARKER, RATIONALE_PROVISIONAL_MARKER,
  classifyByRules, explainClassification,
} from '../ai-act-classify';

const chat = vi.fn();
vi.mock('@/lib/compliance/llm', () => ({
  complianceLLMChat: (...a: unknown[]) => chat(...a),
  complianceParseJson: (s: string) => JSON.parse(s),
}));

const { classifyAISystem } = await import('./classifier');

function system(over: Partial<AISystem> = {}): AISystem {
  return {
    id: 's1', name: 'Screener', description: 'Ranks CVs',
    purpose: 'Recruitment screening for candidate ranking',
    sector: 'technology', deployerRole: 'deployer', populationsAffected: null,
    riskTier: null, riskRationale: null, classifiedAt: null,
    ...over,
  } as unknown as AISystem;
}

// Braces matter: a hook that *returns* a value hands Vitest a teardown
// callback, and mockReset() returns the mock — so vitest called chat() with no
// arguments after every test, which read as the mock failing on its own.
beforeEach(() => {
  chat.mockReset();
});

describe('classifyAISystem', () => {
  it('takes the tier from the rules, not from the model', async () => {
    // The model is told the tier is not its to change. If it tries anyway, the
    // attempt must not reach the caller — this is the whole point of the split.
    chat.mockResolvedValue(JSON.stringify({
      riskTier: 'minimal',
      riskRationale: 'On reflection this looks minimal.',
      citedArticles: ['Annex III(4)'],
    }));

    const r = await classifyAISystem(system(), []);
    expect(r.riskTier).toBe('high');
    expect(r.rules.firedRules[0]!.article).toBe('Annex III(4)');
  });

  /**
   * Misgrounding is the failure mode that matters.
   *
   * Stanford RegLab's finding was not that legal tools invent article numbers —
   * it is that they cite real ones that do not support the claim. A reader who
   * checks the citation finds a genuine provision and concludes the reasoning
   * held. So any article the engine never applied is dropped.
   */
  it('drops citations the engine never applied', async () => {
    chat.mockResolvedValue(JSON.stringify({
      riskRationale: 'Recruitment ranking falls in Annex III(4).',
      citedArticles: ['Annex III(4)', 'Art.5(1)(c)', 'Annex III(6)', 'Art.22 GDPR'],
    }));

    const r = await classifyAISystem(system(), []);
    expect(r.citedArticles).toContain('Annex III(4)');
    expect(r.citedArticles).not.toContain('Art.5(1)(c)');
    expect(r.citedArticles).not.toContain('Annex III(6)');
    expect(r.citedArticles).not.toContain('Art.22 GDPR');
  });

  it('keeps the general articles that always apply', async () => {
    chat.mockResolvedValue(JSON.stringify({
      riskRationale: 'x', citedArticles: ['Art.6', 'Art.4'],
    }));
    const r = await classifyAISystem(system(), []);
    expect(r.citedArticles).toEqual(expect.arrayContaining(['Art.6', 'Art.4']));
  });

  it('cites the fired rules even when the model forgets them', async () => {
    chat.mockResolvedValue(JSON.stringify({ riskRationale: 'x', citedArticles: [] }));
    const r = await classifyAISystem(system(), []);
    expect(r.citedArticles).toContain('Annex III(4)');
  });

  it('still returns a determination when the model call fails', async () => {
    // A narrative outage must not take the tier with it. The tier was decided
    // before the model was called and does not depend on it.
    chat.mockRejectedValue(new Error('502 upstream'));
    const r = await classifyAISystem(system(), []);
    expect(r.riskTier).toBe('high');
    expect(r.riskRationale).toBe(r.rules.basis);
    expect(r.citedArticles).toContain('Annex III(4)');
  });

  it('falls back rather than storing an empty rationale', async () => {
    chat.mockResolvedValue(JSON.stringify({ riskRationale: '   ', citedArticles: [] }));
    const r = await classifyAISystem(system(), []);
    expect(r.riskRationale).toBe(r.rules.basis);
  });

  it('survives malformed model output', async () => {
    chat.mockResolvedValue('not json at all');
    const r = await classifyAISystem(system(), []);
    expect(r.riskTier).toBe('high');
    expect(r.riskRationale.length).toBeGreaterThan(0);
  });

  it('never calls the model before the tier exists', async () => {
    // Ordering is the guarantee: if the model ran first, its output could
    // influence the determination through any later edit.
    chat.mockResolvedValue(JSON.stringify({ riskRationale: 'x', citedArticles: [] }));
    await classifyAISystem(system(), []);
    const userPrompt = String(chat.mock.calls[0]![1]);
    expect(userPrompt).toContain('Tier: high');
    expect(userPrompt).toMatch(/already made — explain it, do not revisit it/);
  });
});

/**
 * The rationale is stored as one text column, then split apart for display.
 * If writer and reader drift, the provisional warning silently becomes prose.
 */
describe('stored rationale round-trip', () => {
  function store(prose: string, cited: string[], rules = classifyByRules({
    name: 'x', description: '', purpose: 'Recruitment screening',
  })) {
    const citedLine = cited.length ? `\nArticles referenced: ${cited.join(', ')}` : '';
    const trace = explainClassification(rules).map((l) => `  · ${l}`).join('\n');
    const provisional = rules.requiresHumanConfirmation
      ? `\n\n${RATIONALE_PROVISIONAL_MARKER}\n${rules.openQuestions.map((q) => `  · ${q}`).join('\n')}`
      : '';
    return `${prose}${citedLine}\n\n${RATIONALE_TRACE_MARKER} (deterministic, ${rules.confidence} confidence):\n${trace}${provisional}`;
  }

  it('recovers all three parts', () => {
    const rules = classifyByRules({ name: 'x', description: '', purpose: 'Recruitment screening' });
    const split = splitRationale(store('Because it ranks candidates.', ['Annex III(4)'], rules));

    expect(split.prose).toContain('Because it ranks candidates.');
    expect(split.prose).toContain('Annex III(4)');
    expect(split.prose).not.toContain(RATIONALE_TRACE_MARKER);
    expect(split.trace).toHaveLength(rules.firedRules.length);
    expect(split.trace[0]).toContain('Annex III(4)');
    expect(split.provisional).toEqual(rules.openQuestions);
  });

  it('leaves the provisional block empty when nothing is outstanding', () => {
    const rules = classifyByRules({ name: 'x', description: '', purpose: 'Customer service chatbot' });
    expect(rules.requiresHumanConfirmation).toBe(false);
    expect(splitRationale(store('Art. 50 applies.', ['Art.50'], rules)).provisional).toEqual([]);
  });

  it('treats a rationale with no markers as prose', () => {
    const split = splitRationale('A legacy rationale written before the split existed.');
    expect(split.prose).toBe('A legacy rationale written before the split existed.');
    expect(split.trace).toEqual([]);
    expect(split.provisional).toEqual([]);
  });

  it('handles an empty rationale', () => {
    expect(splitRationale('')).toEqual({ prose: '', trace: [], provisional: [] });
  });
});
