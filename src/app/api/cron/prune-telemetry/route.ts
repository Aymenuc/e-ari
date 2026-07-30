import { NextRequest, NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/cron-auth';
import { pruneLastSeen, LAST_SEEN_RETENTION_DAYS } from '@/lib/last-seen';

/**
 * Retention for last-seen telemetry.
 *
 * A stated retention period that nothing enforces is not a retention period,
 * it is a sentence in a privacy policy. This is the thing that makes the
 * policy true.
 */
export async function GET(req: NextRequest) {
  const auth = requireCronAuth(req.headers.get('authorization'));
  if (!auth.authorized) return auth.response!;

  const { pruned } = await pruneLastSeen();
  return NextResponse.json({
    ok: true,
    pruned,
    retentionDays: LAST_SEEN_RETENTION_DAYS,
  });
}
