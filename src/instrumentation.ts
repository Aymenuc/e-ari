/**
 * Next.js Instrumentation Hook
 *
 * Runs once when the Next.js server starts (in production).
 * We use it to ensure NEXTAUTH_URL is set correctly for the deployment,
 * so that OAuth callback redirects work regardless of whether the
 * NEXTAUTH_URL env var was explicitly set.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // ── NEXTAUTH_URL auto-detection ──────────────────────────────────────────
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
        console.log(`[instrumentation] NEXTAUTH_URL auto-detected: ${process.env.NEXTAUTH_URL}`);
      }
    }
    console.log(`[instrumentation] NEXTAUTH_URL = ${process.env.NEXTAUTH_URL || "(not set)"}`);

    // ── Runtime schema migrations ────────────────────────────────────────────
    // Apply any schema additions that may not have run via `prisma migrate deploy`
    // during build (e.g. when DATABASE_URL is only available at runtime).
    // All statements use IF NOT EXISTS / ON CONFLICT so they are safe to re-run.
    try {
      const { db } = await import("@/lib/db");
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
      // Seed default platform settings
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
      console.log("[instrumentation] Runtime schema migrations applied.");
    } catch (err) {
      console.error("[instrumentation] Schema migration error:", err);
    }
  }
}
