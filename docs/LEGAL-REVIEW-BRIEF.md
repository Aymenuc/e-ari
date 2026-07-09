# Legal Review Brief — E-ARI Obligation Mappings

**Purpose:** engagement brief for external counsel to review E-ARI's EU AI Act
obligation catalogue before Autopilot-tier customers rely on it commercially.
Prepared 2026-05-09. This is a self-audit + scoping document, **not** legal advice.

## What needs review

One file is the single source of truth:
`src/lib/compliance/ai-act-obligations.ts` — 61 obligation entries, each with a
stable code, plain-language label, severity, recommended evidence artifact type,
and the Article/Annex references used for clause matching.

Two consumers of that file determine what customers see:
- `src/lib/progression.ts` → which obligations apply per risk tier
  (prohibited/high → all; limited → Art. 4/5/50–53 + Annex III hints; minimal → Art. 4/50/52/53)
- `src/lib/controls-derive.ts` → whether each obligation shows as passing/failing
  based on extracted evidence clauses

## Self-audit findings (already fixed in code, verify the fixes)

| Item | Issue found | Fix applied |
|---|---|---|
| Art. 16 | Was labelled "deployer core duties" — Art. 16 in the final Act is **provider** obligations | Relabelled "Obligations of providers of high-risk AI systems" |
| Art. 18 | Was "operator-facing documentation" — final Art. 18 is provider **documentation keeping** (10-year retention) | Relabelled |
| Art. 19 | Was "(deployer)" — final Art. 19 is provider log retention; deployer log duties live in Art. 26(6) | Relabelled |
| Art. 4 | Missing entirely, despite the platform selling Article 4 literacy training | Added; applies at **every** risk tier |

## Open items for counsel — highest risk first

1. **Draft-vs-final numbering drift (HIGH).** The catalogue includes Arts. 28, 29,
   30 and Arts. 61–65. In the *final* Regulation (EU) 2024/1689, 28–30 concern
   notifying authorities / notified bodies and 60–65 concern real-world testing,
   SME measures, and governance bodies — but in earlier *drafts* these numbers
   carried value-chain and post-market-monitoring duties (now Arts. 25–27 and
   72–73). Please verify each of these eight entries' labels and hintArticles
   against the final OJ text, and check for **double counting** between the
   61–65 block and the 71–73 block.
2. **Severity assignments (MEDIUM).** Severities (critical/major/minor) drive
   which gaps show as "failing" controls and appear in the weekly digest. They
   are E-ARI editorial judgements, not statutory categories — confirm none are
   misleading (e.g. Art. 21 cooperation marked "minor").
3. **Provider vs deployer applicability (MEDIUM).** The tier filter applies the
   full catalogue to any high-risk system regardless of the customer's role.
   A pure *deployer* is not subject to most provider duties (Arts. 16–22).
   Recommend: counsel confirms whether role-based filtering (using the
   `deployerRole` field already captured per system) is required before the
   controls view can be described as role-accurate.
4. **Annex III subcategory phrasing (LOW).** The eight ANNEX_III_x entries
   summarise high-risk categories; confirm the summaries don't over- or
   under-include (esp. III-1 biometrics vs the Art. 5 prohibitions boundary).
5. **Clause-matching hints (LOW).** `hintArticles` regexes drive evidence
   auto-mapping. False positives inflate "passing" states. Counsel should
   spot-check 5–10 mappings from a sample DPIA.

## Product claims to review alongside the mappings

- Article 4 evidence report wording (`/api/literacy/article4-report`): states it
  "documents training evidence… does not by itself constitute a determination of
  legal compliance" — confirm sufficiency.
- FRIA (Art. 27) and Annex IV Technical File generators: confirm the generated
  section structure matches the final Act, and that export wording avoids
  implying conformity-assessment status.
- Pricing/marketing: "EU AI Act native", deadline strip (2 Aug 2026, €35M/7%),
  vendor questionnaire GPAI question (Art. 51+) — confirm accuracy.

## Suggested engagement scope

- Reviewer profile: EU technology counsel with AI Act practice (DE/FR/NL/BE bar
  or UK firm with EU desk), 8–12 hours estimated.
- Deliverable: redlined obligation catalogue + short opinion letter that E-ARI
  may reference as "mappings reviewed by [firm], [date]" in sales materials.
- Cadence: re-review on each Commission implementing act / harmonised-standard
  publication affecting Annex III/IV (subscribe counsel to the same regulatory
  scanner the platform runs).

## Sign-off record

| Date | Reviewer | Scope | Result |
|---|---|---|---|
| _pending_ | | | |
