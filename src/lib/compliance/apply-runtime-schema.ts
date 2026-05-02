/**
 * Idempotent DDL for compliance tables when `prisma migrate deploy` did not run at build
 * (e.g. DATABASE_URL only at runtime). Safe to call on every cold start.
 *
 * Mirrors prisma/migrations/20260501180000_compliance_pr1_schema/migration.sql
 */

import type { PrismaClient } from "@prisma/client";

export async function applyComplianceRuntimeMigrations(db: PrismaClient): Promise<void> {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AISystem" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "assessmentId" TEXT,
      "name" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "purpose" TEXT NOT NULL,
      "deployerRole" TEXT NOT NULL,
      "sector" TEXT NOT NULL,
      "populationsAffected" TEXT,
      "riskTier" TEXT,
      "riskRationale" TEXT,
      "classifiedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AISystem_pkey" PRIMARY KEY ("id")
    )
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Evidence" (
      "id" TEXT NOT NULL,
      "systemId" TEXT NOT NULL,
      "filename" TEXT NOT NULL,
      "mimeType" TEXT NOT NULL,
      "storageKey" TEXT NOT NULL,
      "sizeBytes" INTEGER NOT NULL,
      "sha256" TEXT NOT NULL,
      "artifactType" TEXT,
      "classifiedAt" TIMESTAMP(3),
      "extractedText" TEXT,
      "extractionStatus" TEXT NOT NULL DEFAULT 'pending',
      "extractionError" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
    )
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "EvidenceClause" (
      "id" TEXT NOT NULL,
      "evidenceId" TEXT NOT NULL,
      "clauseType" TEXT NOT NULL,
      "textExcerpt" TEXT NOT NULL,
      "pageNumber" INTEGER,
      "confidence" DOUBLE PRECISION NOT NULL,
      "aiActArticles" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "pillarIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "frameworks" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "EvidenceClause_pkey" PRIMARY KEY ("id")
    )
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "FRIA" (
      "id" TEXT NOT NULL,
      "systemId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'draft',
      "affectedGroups" JSONB NOT NULL DEFAULT '{}',
      "rightsAtRisk" JSONB NOT NULL DEFAULT '{}',
      "mitigations" JSONB NOT NULL DEFAULT '{}',
      "residualRisk" TEXT,
      "oversightDesign" TEXT,
      "generatedPdfKey" TEXT,
      "finalizedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FRIA_pkey" PRIMARY KEY ("id")
    )
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TechnicalFile" (
      "id" TEXT NOT NULL,
      "systemId" TEXT NOT NULL,
      "systemDescription" JSONB,
      "designSpecs" JSONB,
      "dataGovernance" JSONB,
      "monitoringPlan" JSONB,
      "riskManagement" JSONB,
      "performanceMetrics" JSONB,
      "instructionsForUse" JSONB,
      "euDeclaration" JSONB,
      "status" TEXT NOT NULL DEFAULT 'draft',
      "generatedPdfKey" TEXT,
      "generatedJsonKey" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TechnicalFile_pkey" PRIMARY KEY ("id")
    )
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MonitoringPlan" (
      "id" TEXT NOT NULL,
      "systemId" TEXT NOT NULL,
      "conformityRoute" TEXT NOT NULL,
      "nextAttestationAt" TIMESTAMP(3),
      "triggers" JSONB NOT NULL DEFAULT '{}',
      "incidents" JSONB NOT NULL DEFAULT '[]',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MonitoringPlan_pkey" PRIMARY KEY ("id")
    )
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ObligationGap" (
      "id" TEXT NOT NULL,
      "systemId" TEXT NOT NULL,
      "obligationCode" TEXT NOT NULL,
      "obligationLabel" TEXT NOT NULL,
      "severity" TEXT NOT NULL,
      "recommendedArtifactType" TEXT NOT NULL,
      "draftDocumentText" TEXT,
      "ownerRoleHint" TEXT,
      "status" TEXT NOT NULL DEFAULT 'open',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ObligationGap_pkey" PRIMARY KEY ("id")
    )
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ComplianceLog" (
      "id" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "operation" TEXT,
      "model" TEXT NOT NULL,
      "durationMs" INTEGER NOT NULL,
      "inputTokens" INTEGER,
      "outputTokens" INTEGER,
      "success" BOOLEAN NOT NULL,
      "errorClass" TEXT,
      CONSTRAINT "ComplianceLog_pkey" PRIMARY KEY ("id")
    )
  `);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ComplianceLog_createdAt_idx" ON "ComplianceLog"("createdAt")`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ComplianceLog_operation_idx" ON "ComplianceLog"("operation")`);

  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AISystem_userId_idx" ON "AISystem"("userId")`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AISystem_assessmentId_idx" ON "AISystem"("assessmentId")`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Evidence_systemId_idx" ON "Evidence"("systemId")`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Evidence_artifactType_idx" ON "Evidence"("artifactType")`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EvidenceClause_evidenceId_idx" ON "EvidenceClause"("evidenceId")`);
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "FRIA_systemId_key" ON "FRIA"("systemId")`);
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "TechnicalFile_systemId_key" ON "TechnicalFile"("systemId")`);
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "MonitoringPlan_systemId_key" ON "MonitoringPlan"("systemId")`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ObligationGap_systemId_idx" ON "ObligationGap"("systemId")`);

  const fks = [
    `ALTER TABLE "AISystem" ADD CONSTRAINT "AISystem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    `ALTER TABLE "AISystem" ADD CONSTRAINT "AISystem_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    `ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AISystem"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    `ALTER TABLE "EvidenceClause" ADD CONSTRAINT "EvidenceClause_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    `ALTER TABLE "FRIA" ADD CONSTRAINT "FRIA_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AISystem"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    `ALTER TABLE "TechnicalFile" ADD CONSTRAINT "TechnicalFile_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AISystem"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    `ALTER TABLE "MonitoringPlan" ADD CONSTRAINT "MonitoringPlan_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AISystem"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    `ALTER TABLE "ObligationGap" ADD CONSTRAINT "ObligationGap_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AISystem"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  ];
  for (const sql of fks) {
    await db.$executeRawUnsafe(`
      DO $$ BEGIN
        ${sql};
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$
    `);
  }

  await db.$executeRawUnsafe(`
    ALTER TABLE "Evidence" ADD COLUMN IF NOT EXISTS "userId" TEXT
  `);
  await db.$executeRawUnsafe(`
    ALTER TABLE "Evidence" ADD COLUMN IF NOT EXISTS "organizationLevel" BOOLEAN NOT NULL DEFAULT false
  `);
  await db.$executeRawUnsafe(`
    UPDATE "Evidence" e SET "userId" = s."userId" FROM "AISystem" s
    WHERE e."systemId" IS NOT NULL AND e."systemId" = s."id"
      AND (e."userId" IS NULL OR e."userId" = '')
  `);
  await db.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "Evidence" ALTER COLUMN "systemId" DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$
  `);
  await db.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "Evidence" ALTER COLUMN "userId" SET NOT NULL;
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$
  `);
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Evidence_userId_idx" ON "Evidence"("userId")
  `);
  await db.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
}
