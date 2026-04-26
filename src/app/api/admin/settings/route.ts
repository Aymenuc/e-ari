import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const ALLOWED_KEYS = new Set([
  'allow_registrations',
  'require_email_verification',
  'enable_ai_assistant',
  'public_proposals_default',
  'maintenance_mode',
  'require_2fa',
  'session_timeout',
  'rate_limiting',
  'audit_logging',
  'ip_whitelisting',
]);

const DEFAULTS: Record<string, unknown> = {
  allow_registrations: true,
  require_email_verification: false,
  enable_ai_assistant: true,
  public_proposals_default: false,
  maintenance_mode: false,
  require_2fa: false,
  session_timeout: 30,
  rate_limiting: true,
  audit_logging: true,
  ip_whitelisting: false,
};

async function ensureTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PlatformSetting" (
      "key"       TEXT NOT NULL,
      "value"     TEXT NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
    )
  `);
  // Seed defaults (no-op if rows already exist)
  for (const [key, value] of Object.entries(DEFAULTS)) {
    await db.$executeRawUnsafe(
      `INSERT INTO "PlatformSetting" ("key","value","updatedAt") VALUES ($1,$2,NOW()) ON CONFLICT ("key") DO NOTHING`,
      key,
      JSON.stringify(value)
    );
  }
}

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') return null;
  return session;
}

export async function GET() {
  if (!await assertAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    await ensureTable();
    const rows = await db.platformSetting.findMany();
    const settings: Record<string, unknown> = { ...DEFAULTS };
    for (const row of rows) {
      try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
    }
    return NextResponse.json(settings);
  } catch (err) {
    console.error('[settings GET] error:', err);
    return NextResponse.json(DEFAULTS);
  }
}

export async function PUT(req: NextRequest) {
  if (!await assertAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    await ensureTable();
    const body = await req.json();
    const updates: { key: string; value: unknown }[] = [];

    for (const [key, value] of Object.entries(body)) {
      if (!ALLOWED_KEYS.has(key)) continue;
      updates.push({ key, value });
    }

    await Promise.all(
      updates.map(({ key, value }) =>
        db.platformSetting.upsert({
          where: { key },
          create: { key, value: JSON.stringify(value) },
          update: { value: JSON.stringify(value) },
        })
      )
    );

    return NextResponse.json({ updated: updates.map(u => u.key) });
  } catch (err) {
    console.error('[settings PUT] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
