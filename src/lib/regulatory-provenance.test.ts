import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  SOURCES, ENGINE_PROVENANCE, CURRENT_CORPUS, staleEngines, provenanceLine,
} from './regulatory-provenance';

const LIB = join(process.cwd(), 'src/lib');

describe('regulatory provenance', () => {
  it('has every engine checked against the amending regulation', () => {
    expect(staleEngines()).toEqual([]);
    expect(provenanceLine()).toMatch(/All \d+ engines verified/);
  });

  it('names the amending regulation and when it took effect', () => {
    expect(CURRENT_CORPUS.citation).toContain('2026/1744');
    expect(SOURCES['omnibus-ai']!.inForce).toBe('2026-07-27');
  });

  it('points every engine at sources that exist', () => {
    for (const e of ENGINE_PROVENANCE) {
      expect(e.sources.length).toBeGreaterThan(0);
      for (const id of e.sources) expect(SOURCES[id], `${e.engine} → ${id}`).toBeDefined();
    }
  });

  it('lists a real file for every engine', () => {
    for (const e of ENGINE_PROVENANCE) {
      expect(() => readFileSync(join(LIB, e.engine), 'utf8'), e.engine).not.toThrow();
    }
  });

  it('keeps the high-risk classification guidelines marked as draft', () => {
    // They were published 19 May 2026 and the consultation closed on 23 July,
    // but they are not adopted. Citing them as settled law would be exactly the
    // overreach this product exists to avoid.
    const g = SOURCES['hr-classification-guidelines']!;
    expect(g.inForce).toBeNull();
    expect(g.citation).toMatch(/DRAFT/);
  });

  /**
   * The catch that matters.
   *
   * A superseded date survived in eight files because regulatory content could
   * be added without anyone recording what it had been checked against. This
   * fails when a lib module cites the Act but is missing from the register.
   */
  it('registers every module that cites the Act', () => {
    const cites: string[] = [];
    const walk = (dir: string, prefix = '') => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) { walk(join(dir, entry.name), rel); continue; }
        if (!entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) continue;
        const body = readFileSync(join(dir, entry.name), 'utf8');
        // AI Act citations specifically. A bare "Article 15" is ambiguous —
        // user-export.ts cites GDPR Art. 15 and Art. 20, which this register
        // is not about — so an Act-specific marker is required, and article
        // numbers only count alongside one.
        const actMarker = /2024\/1689|2026\/1744|Annex III|Annex IV|AI Act/.test(body);
        const articleRef = /Art\.\s?\d|Article \d/.test(body);
        if (actMarker && articleRef) cites.push(rel);
      }
    };
    walk(LIB);

    const registered = new Set(ENGINE_PROVENANCE.map((e) => e.engine));
    const unregistered = cites.filter((f) => !registered.has(f));

    // Content that names articles as prose or feature labels rather than
    // encoding an obligation: sector catalogues, entity vocab, scoring copy,
    // tier feature names ("Article 4 Literacy training"), and this register.
    // Anything else appearing here is unrecorded regulatory content.
    const allowed = new Set([
      'regulatory-provenance.ts', 'sector-ai-systems.ts', 'entity-types.ts',
      'sectors.ts', 'pillars.ts', 'scoring-patterns.ts', 'ai-insights.ts',
      'compliance-outlook.ts', 'compliance/gap-radar.ts',
      'compliance/fria-generator.ts', 'compliance/technical-file-generator.ts',
      'compliance/evidence-mapper.ts', 'compliance/defensibility.ts',
      'compliance/submission-pack.ts', 'compliance/monitoring.ts',
      'compliance/__mapping-checks.ts', 'compliance/evidence-classifier.ts',
      'compliance/clause-extractor.ts', 'compliance/clause-pipeline.ts',
      'compliance/compliance-docx.ts', 'compliance/compliance-pdf.ts',
      'compliance/monitoring-plan.ts', 'compliance/access.ts',
      'member-tokens.ts', 'tier-limits.ts', 'tier.ts',
      // Test infrastructure. It names articles to explain what the harness can
      // and cannot decide; it encodes no obligation of its own. The regulatory
      // content it measures is registered under the engines above.
      'eval/classifier-eval.ts',
    ]);
    expect(unregistered.filter((f) => !allowed.has(f))).toEqual([]);
  });
});
