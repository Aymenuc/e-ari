-- Add emailVerified to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3);

-- Create PlatformSetting table
CREATE TABLE IF NOT EXISTS "PlatformSetting" (
    "key"       TEXT NOT NULL,
    "value"     TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- Seed default settings
INSERT INTO "PlatformSetting" ("key", "value", "updatedAt") VALUES
  ('allow_registrations',        'true',  NOW()),
  ('require_email_verification', 'false', NOW()),
  ('enable_ai_assistant',        'true',  NOW()),
  ('public_proposals_default',   'false', NOW()),
  ('maintenance_mode',           'false', NOW()),
  ('require_2fa',                'false', NOW()),
  ('session_timeout',            '30',    NOW()),
  ('rate_limiting',              'true',  NOW()),
  ('audit_logging',              'true',  NOW()),
  ('ip_whitelisting',            'false', NOW())
ON CONFLICT ("key") DO NOTHING;
