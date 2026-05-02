-- Compliance LLM observability (no PII stored)

CREATE TABLE "ComplianceLog" (
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
);

CREATE INDEX "ComplianceLog_createdAt_idx" ON "ComplianceLog"("createdAt");
CREATE INDEX "ComplianceLog_operation_idx" ON "ComplianceLog"("operation");
