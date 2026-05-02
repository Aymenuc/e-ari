-- Org-level evidence vault: Evidence owned by User; optional link to AISystem.

ALTER TABLE "Evidence" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Evidence" ADD COLUMN IF NOT EXISTS "organizationLevel" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Evidence" e
SET "userId" = s."userId"
FROM "AISystem" s
WHERE e."systemId" IS NOT NULL
  AND e."systemId" = s."id"
  AND e."userId" IS NULL;

ALTER TABLE "Evidence" ALTER COLUMN "systemId" DROP NOT NULL;

ALTER TABLE "Evidence" ALTER COLUMN "userId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Evidence_userId_idx" ON "Evidence"("userId");

ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
