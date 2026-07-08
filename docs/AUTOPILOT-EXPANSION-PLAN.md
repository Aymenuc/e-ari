# E-ARI → "Vanta-for-AI" Expansion Plan

**Goal:** evolve E-ARI from readiness-index + compliance tooling into the mid-market
continuous AI-compliance platform (50–1,000 employees, €12K–€25K ACV band), by adding
the two missing modules (Shadow AI Discovery, Vendor AI Risk), converting Literacy
into Article 4 compliance evidence, and reframing the existing obligation/evidence
model as continuous controls.

**Guiding constraint:** maximum reuse. Every phase builds on tables, engines, and UI
patterns that already exist. No OAuth integrations in v1 — CSV-import-first, the same
wedge Vanta used before building integrations.

---

## Phase 0 — Foundations shared by every module (Day 1)

These are built once and reused by Phases 1–3.

### 0.1 TeamMember model (the missing piece flagged in the tier audit)
```prisma
model TeamMember {
  id        String   @id @default(cuid())
  userId    String   // account owner (the E-ARI customer)
  name      String
  email     String
  role      String?  // job title, free text
  department String?
  createdAt DateTime @default(now())
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  completions TrainingCompletion[]
  @@unique([userId, email])
  @@index([userId])
}
```
- Members do **not** get auth accounts. All member interaction happens through
  HMAC-signed magic links (same pattern as the existing unsubscribe tokens in
  `email-preferences`). This avoids multi-tenant auth work entirely.
- CSV roster import (name, email, role, department) with the same flexible
  column-mapping parser Phase 3 needs — build the parser here, reuse there.
- Enforce the already-advertised team limits via `tier-limits.ts`
  (free 1 / pro 5 / growth 25 / autopilot+ unlimited) — closes the gap left
  open in the tier audit.

### 0.2 Magic-link token module (`src/lib/member-tokens.ts`)
- `signMemberToken(memberId, purpose, expiresAt)` / `verifyMemberToken(...)`
  using HMAC-SHA256 with NEXTAUTH_SECRET, purpose ∈ {training, vendor_questionnaire}.
- 30-day expiry, single-purpose, includes tokenVersion for revocation.

### 0.3 Runtime migration + version bump
- All new tables go into `src/lib/compliance/apply-runtime-schema.ts`
  (CREATE TABLE IF NOT EXISTS pattern), SCHEMA_VERSION bumped once per phase.

---

## Phase 1 — Article 4 Literacy Compliance (Days 2–4)
*Already enforceable since Feb 2025. Fastest path from existing feature to
chargeable compliance evidence.*

### Schema
```prisma
model TrainingCompletion {
  id           String   @id @default(cuid())
  memberId     String
  moduleId     String   // maps to existing Literacy Hub content IDs
  completedAt  DateTime @default(now())
  quizScore    Float?
  attestationHash String // sha256(memberId+moduleId+completedAt+content version) — tamper-evident
  member TeamMember @relation(fields: [memberId], references: [id], onDelete: Cascade)
  @@unique([memberId, moduleId])
}
model TrainingAssignment {
  id        String   @id @default(cuid())
  userId    String   // account owner
  memberId  String
  moduleId  String
  dueAt     DateTime?
  sentAt    DateTime?
  @@unique([memberId, moduleId])
  @@index([userId])
}
```

### API routes
- `POST/GET /api/literacy/members` — roster CRUD + CSV import
- `POST /api/literacy/assignments` — bulk assign modules to members, sends magic-link
  emails via existing `email-service`
- `GET/POST /api/literacy/train/[token]` — **public** tokenized training page:
  serves module content + quiz, records TrainingCompletion. Rate-limited.
- `GET /api/literacy/article4-report` — generates the **Article 4 Evidence Report**
  (.docx via existing `report-generator` patterns): roster, per-member completion
  status, quiz scores, attestation hashes, content version, org context. This
  document is the product.

### UI
- New portal section `/portal/literacy-compliance`: roster table, assign wizard,
  completion dashboard (n of m trained, overdue list), "Export Article 4 Report"
  button. Reuse existing portal card/table components.

### Gating
- Roster size by tier (0.1). Report export gated Growth+ (uses report quota).

### Definition of done
- Upload 20-person roster → assign "AI Fundamentals" → member completes via
  emailed link with no login → report exports listing them as trained, with hash.

---

## Phase 2 — Third-Party AI Vendor Risk (Days 5–8)
*~80% code reuse from the compliance module.*

### Schema
```prisma
model Vendor {
  id           String  @id @default(cuid())
  userId       String
  name         String
  websiteUrl   String?
  category     String? // LLM provider, analytics, HR tool, ...
  dpaStatus    String  @default("unknown") // signed | pending | none | unknown
  riskScore    Float?  // 0-100 deterministic rubric
  riskTier     String? // low | medium | high | critical
  questionnaireStatus String @default("not_sent") // not_sent | sent | completed | expired
  questionnaireJson   String? // responses
  reviewedAt   DateTime?
  nextReviewAt DateTime?
  createdAt    DateTime @default(now())
  @@index([userId])
}
```
- `AISystem.vendorId String?` — link registry entries to their vendor.

### Questionnaire (v1: static, ~22 questions)
Defined in `src/lib/vendor-questionnaire.ts` as versioned JSON. Sections:
data handling (training on customer data? residency? retention), security
(SOC2/ISO27001? breach history?), AI-specific (model provenance, GPAI provider
obligations, human oversight hooks, opt-outs), legal (DPA, SCCs, sub-processors).
Sent to a vendor contact via the Phase-0 magic-link page — vendor fills it with
no account. Deterministic scoring rubric (each answer has points + severity flags);
LLM (DeepSeek) writes a 3-sentence summary grounded ONLY in the responses.

### API + UI
- `/api/vendors` CRUD, `/api/vendors/[id]/questionnaire` (send/remind),
  public `/api/vendors/respond/[token]`.
- `/portal/vendors`: list with risk badges, per-vendor drawer (responses,
  evidence uploads → existing Evidence vault with vendorId scope, gaps).
- Evidence + clause extraction reused as-is (a vendor's DPA upload runs through
  the same `clause-pipeline` and can satisfy obligations).

### Gating
- Vendors count: growth 5 / autopilot unlimited. New quota in `tier-limits.ts`.

### Definition of done
- Add "OpenAI" as vendor → send questionnaire link → fill it as the vendor →
  risk score + tier + summary appear → upload their DPA → clauses extracted.

---

## Phase 3 — Shadow AI Discovery (Days 9–14)
*The demo-that-sells. No integrations in v1 — three CSV importers + a catalog.*

### 3.1 The AI Tool Catalog (the real long-term asset)
- New table `AiToolCatalog`: name, aliases[], domains[], category, vendorName,
  trainsOnCustomerData (yes/no/configurable/unknown), dataResidency,
  gpaiProvider (bool), euAiActNotes, riskLevel, sourceUrl, catalogVersion.
- Seed ~250 entries generated + hand-checked (ChatGPT, Claude, Gemini, Copilot,
  Midjourney, Grammarly, Notion AI, Otter, Fireflies, Jasper, Synthesia,
  Perplexity, HuggingFace, Replicate, ElevenLabs, ...). Stored as
  `src/data/ai-tool-catalog.json`, loaded/synced into DB at boot (same
  sentinel pattern as schema migrations). Growing this catalog weekly is a
  moat — cheap for us, expensive for buyers to replicate.

### 3.2 Importers (flexible CSV parser from Phase 0)
1. **Google Workspace** — Admin console "App access / token activity" export
2. **Okta / Entra ID** — app usage or enterprise-app sign-in export
3. **Expense export** — merchant-name matching (Ramp/Brex/generic columns)

Matching: normalize (lowercase, strip suffixes) → exact domain match →
alias match → fuzzy name match (Levenshtein ≤ 2) → unmatched bucket shown
for manual tagging (feeds catalog growth).

### 3.3 Results model + flow
```prisma
model DiscoveredTool {
  id         String @id @default(cuid())
  userId     String
  catalogId  String?    // null = unmatched
  rawName    String
  source     String     // gworkspace | okta | entra | expense | manual
  userCount  Int?
  lastSeenAt DateTime?
  status     String @default("undeclared") // undeclared | registered | ignored
  aiSystemId String?    // set when promoted to registry
  @@index([userId])
}
```
- One-click **"Register"** → creates prefilled `AISystem` (name, purpose from
  catalog, vendor auto-created/linked from Phase 2) → risk classifier runs.
- This is the funnel: Discovery → Registry → Classification → Obligations →
  Evidence. Every step already exists after this phase.

### UI
- `/portal/discovery`: 3-step wizard (choose source → upload → review),
  results table with risk highlights, hero stat ("23 AI tools in use ·
  20 undeclared · 4 train on your data"). This stat also goes on the
  portal dashboard and in the sales deck.

### Gating
- 1 discovery scan on Growth (teaser), unlimited on Autopilot.

---

## Phase 4 — Continuous Controls reframe (Days 15–17)
*Mostly derivation + dashboard; the data already exists.*

- Derive control states from existing data — no new source of truth:
  - **Passing** = obligation has ≥1 supporting EvidenceClause (progression engine)
  - **Failing** = open ObligationGap severity ≥ high
  - **Expiring** = monitoring plan `nextAttestationAt` within 30 days, or
    evidence older than its review cadence
  - **Attention** = X-Ray critical finding touching the mapped pillar
- New page `/portal/controls`: Vanta-style grid grouped by framework
  (EU AI Act / NIST AI RMF / ISO 42001 — mappings exist in `regulatory-mapping.ts`),
  status chips, drill-through to the evidence/gap that drives each state.
- Weekly **control digest email** (existing email-service + cron): what flipped
  to failing/expiring this week. This one email is the retention feature.
- Small schema: `ControlOverride` (userId, controlKey, status, note) for
  DPO manual overrides — auditors expect override trails.

---

## Phase 5 — Autopilot tier + GTM surfaces (Days 18–19)

### Pricing
- New tier `autopilot` in `tier.ts` between growth and enterprise:
  - **€1,250/mo billed annually (€15K ACV)** — inside the unserved band
  - Gates: unlimited discovery scans, unlimited vendors, unlimited members,
    Article 4 org-wide reporting, controls dashboard + digest, EU residency
  - Stripe: one annual price ID; checkout allowlist + webhook allowlist +
    TIER_QUOTAS + TIER_ACCESS + admin VALID_TIERS all updated (the tier-audit
    checklist from May 8 is the regression test)
- Existing free/pro/growth untouched — they are the PLG funnel into Autopilot.

### Marketing surfaces
- Landing page: new section "From readiness score to continuous compliance"
  with the Discovery hero stat; pricing page row; handbook §6 additions
  (Discovery, Vendor Risk, Article 4, Controls); update the FAQ.

---

## Cross-cutting requirements (apply to every phase)

| Concern | Action |
|---|---|
| Migrations | Runtime `CREATE TABLE IF NOT EXISTS` + SCHEMA_VERSION bump per phase |
| Quotas | Every new resource gets a `tier-limits.ts` entry before the route ships |
| Rate limits | Public token routes (train, vendor respond) rate-limited per IP |
| GDPR | Roster emails + vendor contacts = personal data → update `/privacy`, `/data-processing`, DPA sub-processor list **in Phase 1**, not later |
| Entity-type | Vendor questionnaire + Article 4 report use `entity-types` vocab |
| Security | Magic links: HMAC, expiry, purpose-scoped, no PII in URL |
| Honesty | Reports say "evidence of training/assessment", never "guarantees compliance" |
| Legal review | Before charging Autopilot money: one external legal review of the obligation mappings; reviewer named in sales materials |

## Timeline & sequencing

```
Week 1:  Phase 0 + Phase 1  → deploy → first sellable artifact (Article 4 report)
Week 2:  Phase 2 + start 3  → deploy → vendor risk live
Week 3:  Phase 3 + Phase 4  → deploy → discovery demo + controls dashboard
Week 4:  Phase 5 + polish   → Autopilot tier live, GTM pages updated
```

Each phase deploys independently — revenue-relevant from week 1, no big-bang.

## Success metrics (Year 1, from the market brief)
- Target: 200 customers × €20K avg = €4M ARR equivalent → realistic solo-founder
  reframe: **10 Autopilot customers (€150K) + PLG base** proves the wedge;
  discovery-scan-to-registry conversion is the leading indicator to track.
