import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { recordLastSeen } from '@/lib/last-seen';

/**
 * POST /api/session/touch — record that this account is active, and roughly where.
 *
 * A dedicated endpoint rather than a side effect bolted onto a GET: writing to
 * the database from a route whose job is to read something is the kind of thing
 * that surprises whoever debugs it next. It is also the only honest place to
 * put a call whose entire purpose is to record the caller.
 *
 * Called once when the portal mounts, and throttled to one write an hour inside
 * recordLastSeen, so ordinary navigation costs nothing.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await recordLastSeen(session.user.id, req);
  return NextResponse.json({ ok: true });
}
