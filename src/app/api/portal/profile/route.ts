import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * The signed-in user's organisation profile.
 *
 * These three columns already existed on User, but the portal's Edit Profile
 * dialog only ever wrote them to localStorage — so the values vanished on the
 * next device, and `sector` never reached the scoring engine even though the
 * engine re-weights pillars by sector. This is the missing server side.
 */

const VALID_SECTORS = [
  'healthcare', 'finance', 'manufacturing', 'retail', 'government',
  'technology', 'energy', 'education', 'media', 'other', '',
];

const VALID_SIZES = ['1-10', '11-50', '51-200', '201-1000', '1001-5000', '5000+', ''];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { organization: true, sector: true, orgSize: true },
  });

  return NextResponse.json({
    organization: user?.organization ?? '',
    sector: user?.sector ?? '',
    orgSize: user?.orgSize ?? '',
  });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const organization = typeof body.organization === 'string' ? body.organization.trim().slice(0, 200) : undefined;
  const sector = typeof body.sector === 'string' ? body.sector.trim() : undefined;
  const orgSize = typeof body.orgSize === 'string' ? body.orgSize.trim() : undefined;

  // Reject unknown enum values rather than storing them: a stray sector would
  // silently fall through to the "general" weighting at scoring time, which is
  // the kind of thing nobody notices until a score is challenged.
  if (sector !== undefined && !VALID_SECTORS.includes(sector)) {
    return NextResponse.json({ error: 'Unknown sector' }, { status: 400 });
  }
  if (orgSize !== undefined && !VALID_SIZES.includes(orgSize)) {
    return NextResponse.json({ error: 'Unknown organisation size' }, { status: 400 });
  }

  const updated = await db.user.update({
    where: { id: session.user.id },
    data: {
      ...(organization !== undefined ? { organization } : {}),
      ...(sector !== undefined ? { sector } : {}),
      ...(orgSize !== undefined ? { orgSize } : {}),
    },
    select: { organization: true, sector: true, orgSize: true },
  });

  return NextResponse.json(updated);
}
