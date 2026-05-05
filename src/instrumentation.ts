/**
 * Next.js Instrumentation Hook
 *
 * Runs once when the Next.js server starts (in production).
 *
 * Two responsibilities:
 *   1. Auto-detect NEXTAUTH_URL from the deployment platform if it's not set.
 *   2. Apply runtime schema migrations on FIRST cold boot of a new deployment.
 *
 * On cold start, we used to unconditionally run ~52 raw SQL statements
 * (`ALTER TABLE … IF NOT EXISTS`, `CREATE TABLE …`, etc.). That added
 * 15–20 s of latency to the first request of every container, which
 * happens often on serverless platforms that scale containers up/down
 * aggressively.
 *
 * Now: a single sentinel SELECT checks whether the current SCHEMA_VERSION
 * has already been applied. If so, we skip all 52 round-trips. Cost on
 * the warm-schema path drops to ~50–100 ms (one query). Migrations only
 * actually run after a deploy that bumps SCHEMA_VERSION.
 */

// Bump this whenever a new migration is added to `apply-runtime-schema.ts`
// or to the inline migrations below. Format: YYYY-MM-DD-N where N counts
// migrations within the same day.
const SCHEMA_VERSION = "2026-05-04-1";

// Module-scope guard: once a container has run instrumentation, never re-run.
let migrationsApplied = false;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // ── NEXTAUTH_URL auto-detection ────────────────────────────────────────
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (!nextAuthUrl || nextAuthUrl.includes("localhost")) {
    const deployedUrl =
      process.env.VERCEL_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      process.env.RAILWAY_STATIC_URL ||
      process.env.DEPLOYMENT_URL;
    if (deployedUrl) {
      const protocol = deployedUrl.startsWith("http") ? "" : "https://";
      process.env.NEXTAUTH_URL = `${protocol}${deployedUrl}`;
      console.log(
        `[instrumentation] NEXTAUTH_URL auto-detected: ${process.env.NEXTAUTH_URL}`,
      );
    }
  }

  if (migrationsApplied) return;

  // ── Schema migrations (sentinel-gated) ────────────────────────────────
  try {
    const { db } = await import("@/lib/db");

    // Sentinel: has THIS schema version already been applied to the DB?
    // One round-trip on the warm-schema path; we then skip the other 50+.
    let alreadyApplied = false;
    try {
      const rows = await db.$queryRaw<Array<{ value: string }>>`
        SELECT "value" FROM "PlatformSetting" WHERE "key" = 'schema_version' LIMIT 1
      `;
      alreadyApplied = rows[0]?.value === SCHEMA_VERSION;
    } catch {
      // PlatformSetting may not exist yet on a brand-new database — fall
      // through and run the full migration suite.
      alreadyApplied = false;
    }

    if (alreadyApplied) {
      migrationsApplied = true;
      return;
    }

    console.log(
      `[instrumentation] Schema version mismatch — applying migrations to reach ${SCHEMA_VERSION}…`,
    );

    // ── Inline migrations ────────────────────────────────────────────────
    await db.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3)
    `);
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PlatformSetting" (
        "key"       TEXT NOT NULL,
        "value"     TEXT NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
      )
    `);
    await db.$executeRawUnsafe(`
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
      ON CONFLICT ("key") DO NOTHING
    `);

    // ── Compliance migrations (49 idempotent statements) ─────────────────
    const { applyComplianceRuntimeMigrations } = await import(
      "@/lib/compliance/apply-runtime-schema"
    );
    await applyComplianceRuntimeMigrations(db);

    // ── Stamp this deployment as up-to-date so the next cold boot skips ──
    await db.$executeRawUnsafe(`
      INSERT INTO "PlatformSetting" ("key", "value", "updatedAt")
      VALUES ('schema_version', '${SCHEMA_VERSION}', NOW())
      ON CONFLICT ("key") DO UPDATE
        SET "value" = '${SCHEMA_VERSION}',
            "updatedAt" = NOW()
    `);

    migrationsApplied = true;
    console.log(
      `[instrumentation] Schema migrations applied — version ${SCHEMA_VERSION}.`,
    );
  } catch (err) {
    console.error("[instrumentation] Schema migration error:", err);
  }
}
