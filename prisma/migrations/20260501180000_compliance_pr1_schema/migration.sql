-- Compliance domain (PR #1): AI systems, evidence vault, FRIA / Annex IV placeholders

CREATE TABLE "AISystem" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AISystem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Evidence" (
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
);

CREATE TABLE "EvidenceClause" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "clauseType" TEXT NOT NULL,
    "textExcerpt" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "confidence" DOUBLE PRECISION NOT NULL,
    "aiActArticles" TEXT[],
    "pillarIds" TEXT[],
    "frameworks" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceClause_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FRIA" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "affectedGroups" JSONB NOT NULL,
    "rightsAtRisk" JSONB NOT NULL,
    "mitigations" JSONB NOT NULL,
    "residualRisk" TEXT,
    "oversightDesign" TEXT,
    "generatedPdfKey" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FRIA_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TechnicalFile" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicalFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MonitoringPlan" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "conformityRoute" TEXT NOT NULL,
    "nextAttestationAt" TIMESTAMP(3),
    "triggers" JSONB NOT NULL,
    "incidents" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitoringPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ObligationGap" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObligationGap_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AISystem_userId_idx" ON "AISystem"("userId");
CREATE INDEX "AISystem_assessmentId_idx" ON "AISystem"("assessmentId");
CREATE INDEX "Evidence_systemId_idx" ON "Evidence"("systemId");
CREATE INDEX "Evidence_artifactType_idx" ON "Evidence"("artifactType");
CREATE INDEX "EvidenceClause_evidenceId_idx" ON "EvidenceClause"("evidenceId");
CREATE UNIQUE INDEX "FRIA_systemId_key" ON "FRIA"("systemId");
CREATE UNIQUE INDEX "TechnicalFile_systemId_key" ON "TechnicalFile"("systemId");
CREATE UNIQUE INDEX "MonitoringPlan_systemId_key" ON "MonitoringPlan"("systemId");
CREATE INDEX "ObligationGap_systemId_idx" ON "ObligationGap"("systemId");

ALTER TABLE "AISystem" ADD CONSTRAINT "AISystem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AISystem" ADD CONSTRAINT "AISystem_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AISystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenceClause" ADD CONSTRAINT "EvidenceClause_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FRIA" ADD CONSTRAINT "FRIA_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AISystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TechnicalFile" ADD CONSTRAINT "TechnicalFile_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AISystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MonitoringPlan" ADD CONSTRAINT "MonitoringPlan_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AISystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ObligationGap" ADD CONSTRAINT "ObligationGap_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "AISystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
