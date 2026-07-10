# Integration Brief — Hand-off Document

A brief written so another agent can pick this up cold, with zero context from this conversation. Concrete file paths, schema, and integration points only.

---

## **0. What already exists (do NOT rebuild)**

Stack: Next.js 13+ App Router, TypeScript, Prisma + PostgreSQL, NextAuth, Resend, Anthropic SDK, Tailwind.

Existing primary domain: **Readiness Assessment** (the 40-question, 8-pillar scoring engine).

Key existing files the new work must respect:
```
src/lib/
  assessment-engine.ts    ← scoring v5.3, do not modify scoring math
  pillars.ts              ← 8 pillar definitions
  ai-insights.ts          ← LLM narrative generation
  scraper.ts              ← context enrichment via Tavily
  agent.ts, orchestrator.ts ← assessment AI agent
  pulse-engine.ts, monitoring-engine.ts
  report-generator.ts
  certification.ts
  regulatory-mapping.ts   ← already maps pillars → regulations (extend, don't replace)
  email-service.ts, email-templates.ts ← unified design system

src/app/
  assessment/             ← live assessment flow
  portal/                 ← logged-in dashboard
  admin/                  ← admin panel
  results/[id]/           ← assessment results page
  api/                    ← all API routes

prisma/schema.prisma      ← User, Assessment, Response, Notification, etc.
```

The assessment engine produces an `Assessment` record with `pillarScores` and an overall `overallScore`. **Anything new must reference an existing `Assessment.id` to anchor compliance work to a readiness baseline.**

---

## **1. New domain: `Compliance`**

Add a parallel domain — does **not** replace the assessment, it **enriches** it.

Mental model:
- An **Assessment** answers "how mature are we?" (existing)
- A **ComplianceProfile** answers "what AI Act obligations apply, and are they evidenced?" (new)
- One organization → one assessment → one or more compliance profiles (one per AI system)

---

## **2. Database schema additions**

Add to `prisma/schema.prisma` — no destructive changes to existing tables.

```prisma
// ─── Compliance domain ───────────────────────────────────────────────────────

model AISystem {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  assessmentId    String?              // optional link to the readiness baseline
  assessment      Assessment? @relation(fields: [assessmentId], references: [id])

  name            String
  description     String   @db.Text
  purpose         String   @db.Text
  deployerRole    String               // 'provider' | 'deployer' | 'importer' | 'distributor'
  sector          String
  populationsAffected String? @db.Text

  riskTier        String?              // 'prohibited' | 'high' | 'limited' | 'minimal' | null = unclassified
  riskRationale   String?  @db.Text   // LLM-generated explanation with cited articles
  classifiedAt    DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  evidence        Evidence[]
  fria            FRIA?
  technicalFile   TechnicalFile?
  monitoring      MonitoringPlan?
  gaps            ComplianceGap[]

  @@index([userId])
  @@index([assessmentId])
}

model Evidence {
  id              String   @id @default(cuid())
  systemId        String
  system          AISystem @relation(fields: [systemId], references: [id], onDelete: Cascade)

  filename        String
  mimeType        String
  storageKey      String               // S3/blob key
  sizeBytes       Int
  sha256          String               // chain-of-custody hash

  artifactType    String?              // 'contract' | 'policy' | 'model_card' | 'dpia' | 'minutes' | 'training_record' | 'incident_report' | 'other'
  classifiedAt    DateTime?

  extractedText   String?  @db.Text
  extractionStatus String  @default("pending") // pending | processing | extracted | failed
  extractionError String?

  createdAt       DateTime @default(now())

  clauses         EvidenceClause[]

  @@index([systemId])
  @@index([artifactType])
}

model EvidenceClause {
  id              String   @id @default(cuid())
  evidenceId      String
  evidence        Evidence @relation(fields: [evidenceId], references: [id], onDelete: Cascade)

  clauseType      String               // e.g. 'data_minimization' | 'human_oversight' | 'bias_testing'
  textExcerpt     String   @db.Text
  pageNumber      Int?
  confidence      Float                // 0..1, LLM confidence

  // Mapping
  aiActArticles   String[]             // e.g. ['Art.10', 'Art.14']
  pillarIds       String[]             // e.g. ['governance', 'risk']
  frameworks      String[]             // ['AI_ACT', 'GDPR', 'NIS2', ...]

  createdAt       DateTime @default(now())

  @@index([evidenceId])
}

model FRIA {
  id              String   @id @default(cuid())
  systemId        String   @unique
  system          AISystem @relation(fields: [systemId], references: [id], onDelete: Cascade)

  status          String   @default("draft") // draft | review | finalized
  affectedGroups  Json
  rightsAtRisk    Json
  mitigations    Json
  residualRisk    String?  @db.Text
  oversightDesign String?  @db.Text

  generatedPdfKey String?              // storage key for exported PDF
  finalizedAt     DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model TechnicalFile {
  id              String   @id @default(cuid())
  systemId        String   @unique
  system          AISystem @relation(fields: [systemId], references: [id], onDelete: Cascade)

  // Annex IV sections — JSON for flexibility
  systemDescription   Json?
  designSpecs         Json?
  dataGovernance      Json?
  monitoringPlan      Json?
  riskManagement      Json?
  performanceMetrics  Json?
  instructionsForUse  Json?
  euDeclaration       Json?

  status              String   @default("draft")
  generatedPdfKey     String?
  generatedJsonKey    String?              // for EU database submission

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model MonitoringPlan {
  id              String   @id @default(cuid())
  systemId        String   @unique
  system          AISystem @relation(fields: [systemId], references: [id], onDelete: Cascade)

  conformityRoute String               // 'internal_control' | 'notified_body'
  nextAttestationAt DateTime?
  triggers        Json                 // re-assessment triggers
  incidents       Json                 // logged Art. 73 incidents

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model ComplianceGap {
  id              String   @id @default(cuid())
  systemId        String
  system          AISystem @relation(fields: [systemId], references: [id], onDelete: Cascade)

  obligationCode  String               // e.g. 'AI_ACT_ART_10' or 'AI_ACT_ANNEX_IV_S3'
  obligationLabel String
  severity        String               // 'critical' | 'major' | 'minor'
  recommendedArtifactType String
  draftDocumentText       String? @db.Text  // LLM-drafted starter doc
  ownerRoleHint   String?              // 'DPO' | 'CIO' | 'Head of Procurement' | etc.
  status          String   @default("open") // open | in_progress | closed | wont_do

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

After adding, run `prisma migrate deploy` — but follow the **runtime migration pattern** the codebase already uses in `src/instrumentation.ts` (DATABASE_URL is runtime-only on Vercel). Add the new tables there with `CREATE TABLE IF NOT EXISTS` guards.

---

## **3. New file/route layout**

```
src/lib/compliance/
  classifier.ts           ← A1: risk-tier classifier (LLM)
  fria-generator.ts     ← A2
  technical-file.ts       ← A3: Annex IV JSON/PDF
  monitoring.ts           ← A4
  submission-pack.ts      ← A5
  evidence-vault.ts       ← B1: storage adapter (S3/Vercel Blob)
  evidence-classifier.ts  ← B2
  clause-extractor.ts     ← B3
  evidence-mapper.ts      ← B4: maps clauses → AI Act articles + pillars
  defensibility.ts        ← B5: citation builder
  gap-radar.ts            ← B6
  ai-act-obligations.ts   ← static data: full obligation tree (AI Act + Annex IV)

src/app/compliance/                  ← new top-level public route
  page.tsx                           ← compliance dashboard (list of AI systems)
  systems/
    new/page.tsx                     ← create system → triggers A1
    [id]/page.tsx                    ← system overview
    [id]/evidence/page.tsx           ← B1 vault UI
    [id]/fria/page.tsx               ← A2 workflow
    [id]/technical-file/page.tsx     ← A3 viewer
    [id]/gaps/page.tsx               ← B6 radar
    [id]/submission/page.tsx         ← A5 pack

src/app/api/compliance/
  systems/route.ts                   ← list / create
  systems/[id]/route.ts              ← read / update / delete
  systems/[id]/classify/route.ts     ← run A1
  systems/[id]/evidence/route.ts     ← upload, list (POST/GET)
  systems/[id]/evidence/[eid]/route.ts
  systems/[id]/evidence/[eid]/extract/route.ts ← trigger B3
  systems/[id]/fria/route.ts         ← A2 generate / save
  systems/[id]/fria/export/route.ts  ← FRIA → PDF
  systems/[id]/technical-file/route.ts
  systems/[id]/technical-file/export/route.ts
  systems/[id]/gaps/route.ts         ← B6 list / regenerate
  systems/[id]/submission/route.ts   ← A5 export bundle
```

---

## **4. Integration points with the existing system**

These are the **specific seams** where new code touches old code. Treat these as the contract.

### **4.1 Onboarding hand-off from Assessment → Compliance**
On `Assessment.status === 'completed'`, the results page (`src/app/results/[id]/page.tsx`) gets a new CTA: **"Move from readiness to compliance →"** that creates a starter `AISystem` pre-filled from the assessment's organisation profile.

### **4.2 Pillar score becomes evidence-aware**
`src/lib/assessment-engine.ts` stays untouched. But `src/lib/ai-insights.ts` (the narrative generator) gets a new optional input: an array of `EvidenceClause` records mapped to that pillar. When evidence exists, the insight reads "Score: 72/100 — backed by 4 evidence clauses across 3 documents" with citation links instead of "based on self-report." **The math doesn't change. The presentation does.**

### **4.3 `regulatory-mapping.ts` becomes the obligation tree**
The existing `regulatory-mapping.ts` file already maps pillars → regulations. **Extend it** with the full AI Act obligation tree (Annex III high-risk areas, Annex IV sections, Art. 9–15 requirements). Move the static obligation data to `src/lib/compliance/ai-act-obligations.ts` and re-export it from `regulatory-mapping.ts` so existing imports keep working.

### **4.4 Reports/PDF**
`src/lib/report-generator.ts` already produces PDFs. Reuse its template engine for FRIA and Annex IV exports. Add new template variants in the same file rather than a parallel system.

### **4.5 Email & notifications**
- New email templates in `src/lib/email-templates.ts`:
  - `aiSystemClassifiedEmailHtml` — fires after A1 completes
  - `friaReadyEmailHtml` — fires after A2 generation
  - `complianceGapAlertEmailHtml` — fires when B6 finds critical gaps
- New `Notification.type` values: `system_classified`, `fria_ready`, `gap_critical`, `attestation_due`
- Send from `src/lib/email-service.ts` following the existing pattern

### **4.6 Navigation**
`src/components/shared/navigation.tsx` adds one item for logged-in users: **"Compliance"** between **Portal** and **Admin**.

### **4.7 Authentication & roles**
Use existing NextAuth + middleware. New route guard in `src/middleware.ts`: `/compliance/*` requires authenticated user, same as `/portal/*`. No new role required initially.

### **4.8 LLM layer**
Reuse the existing Anthropic SDK setup in `src/lib/llm-config.ts`. Add prompts under `src/lib/compliance/prompts/` — separate file per task (classifier, fria, clause-extractor) for testability. Keep `temperature: 0` for compliance work — outputs must be deterministic.

### **4.9 Storage**
The codebase has no document storage today. **Add Vercel Blob** (cheapest, native to the platform) — wrap it in `src/lib/compliance/evidence-vault.ts` so swapping to S3 later is one file. Store `storageKey` and `sha256` in the `Evidence` record.

---

## **5. Phased delivery plan for the receiving agent**

Hand off in **5 PRs**, each shippable on its own.

| PR | Scope | Why this order |
|---|---|---|
| **#1 Schema + Vault** | Prisma schema, runtime migration, `src/lib/compliance/evidence-vault.ts`, `/api/compliance/systems/[id]/evidence` upload route, basic UI to drag-drop docs | Nothing else works without document storage |
| **#2 Classifier** | A1 + B2 (LLM artifact classifier + risk-tier classifier), system creation flow, `/compliance/systems/new` UI | First end-to-end demo: "create system → upload doc → see risk tier" |
| **#3 Extraction + Mapping** | B3 clause extractor, B4 mapper, `EvidenceClause` records, citation links on existing E-ARI pillar scores | Defensibility moat. The "click any score, see the doc" wow |
| **#4 FRIA + Annex IV** | A2 + A3 generation, PDF export reusing `report-generator.ts`, email notifications | The €100k consulting replacement. Sales artifact |
| **#5 Gaps + Monitoring + Submission** | B6 gap radar with auto-drafted starter docs, A4 monitoring, A5 submission pack | Closes the loop. Sticky recurring value |

Each PR must:
- Pass `tsc --noEmit`
- Not modify scoring math in `assessment-engine.ts`
- Not break any existing route
- Add migration to `instrumentation.ts` with `IF NOT EXISTS`

---

## **6. What NOT to touch**

- `src/lib/assessment-engine.ts` scoring math — versioned at v5.3, deterministic, do not modify
- `src/lib/pillars.ts` — pillar IDs are referenced everywhere, treat as immutable
- Existing email templates — extend the file, don't refactor
- `src/middleware.ts` route protection rules for `/admin` and `/portal` — only add new rules
- Database tables `User`, `Assessment`, `Response`, `Notification`, `PlatformSetting` — only **add columns** if needed, never rename

---

## **7. Single-paragraph summary for the receiving agent**

> Build a new `Compliance` domain alongside the existing `Assessment` domain. It introduces AI systems (one per use case), an evidence vault (uploaded org documents), an LLM pipeline that classifies risk under the AI Act and extracts compliance-relevant clauses, and three regulator-facing artifact generators (FRIA, Annex IV technical file, EU database submission pack). It does NOT modify the existing 8-pillar readiness scoring engine — instead it enriches the existing pillar scores with evidence citations so users can defend every score with actual document quotes. Ship in 5 PRs in the order above. The end-state demo: drop a folder of org documents, watch the system auto-populate a risk classification + readiness score with citations, then generate a regulator-ready FRIA and Annex IV in 90 seconds.

---

## **8. Implementation notes**

**Inverse relations:** After adding models in §2, extend `User` with `aisystems AISystem[]` (or equivalent) and `Assessment` with `aiSystems AISystem[]` so Prisma validates `@relation` on `AISystem`.

**Name collision:** `src/lib/regulatory-mapping.ts` already exports a TypeScript interface **`ComplianceGap`**. In this repo the Prisma model is implemented as **`ObligationGap`** with relation **`obligationGaps`** on **`AISystem`** to avoid TypeScript/import clashes.

**PR #1 shipped:** Schema + runtime DDL (`apply-runtime-schema.ts` + `instrumentation.ts`), `evidence-vault.ts` (Vercel Blob private uploads), `/api/compliance/systems` & evidence routes, `/compliance` UI, middleware + nav, results-page hand-off link with `?assessmentId=`. Set **`BLOB_READ_WRITE_TOKEN`** (Vercel Blob) for uploads in prod.

**PR #2–#5 (initial implementation in repo):** `classifier.ts` + `POST .../classify`; `evidence-classifier.ts` + clause LLM pipeline in `clause-pipeline.ts` + `POST .../evidence/[eid]/extract` (PDF/TXT via `pdf-parse@1.1.1`); `gap-radar.ts` + `GET/POST .../gaps`; `fria-generator.ts` + `technical-file-generator.ts` + `monitoring-plan.ts` + matching API routes; DOCX via `compliance-docx.ts`; submission JSON via `GET .../submission`; compliance email templates + `sendCompliance*` in `email-service.ts`. `regulatory-mapping.ts` re-exports `AI_ACT_OBLIGATIONS`. **Not yet done:** optional `ai-insights.ts` enrichment with `EvidenceClause` citations (spec §4.2); EU database JSON export keying; richer obligation tree.
