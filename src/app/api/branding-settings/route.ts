import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getSetting } from '@/lib/platform-settings';

const BRANDING_KEYS = [
  'custom_branding_enabled',
  'custom_brand_name',
  'custom_brand_logo_url',
  'custom_brand_accent_color',
] as const;

function isEnterpriseOrAdmin(session: Awaited<ReturnType<typeof getServerSession<typeof authOptions>>>) {
  if (!session?.user?.id) return false;
  return session.user.role === 'admin' || session.user.tier === 'enterprise';
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isEnterpriseOrAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [enabled, name, logo, accent] = await Promise.all([
    getSetting('custom_branding_enabled'),
    getSetting('custom_brand_name'),
    getSetting('custom_brand_logo_url'),
    getSetting('custom_brand_accent_color'),
  ]);

  return NextResponse.json({
    custom_branding_enabled: enabled,
    custom_brand_name: name,
    custom_brand_logo_url: logo,
    custom_brand_accent_color: accent,
  });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isEnterpriseOrAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const updates = BRANDING_KEYS
    .filter((key) => key in body)
    .map((key) => ({ key, value: body[key] }));

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
}
