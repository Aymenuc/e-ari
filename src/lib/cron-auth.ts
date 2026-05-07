/**
 * Cron route auth — fail-closed.
 *
 * Previously every cron handler had the pattern:
 *
 *   if (cronSecret && authHeader !== `Bearer ${cronSecret}`) return 401;
 *
 * That is FAIL-OPEN: when CRON_SECRET is unset or empty in the environment,
 * the auth check is skipped entirely and any unauthenticated caller can
 * trigger expensive cron jobs (LLM-driven monitoring, broadcast emails, etc.).
 *
 * This helper inverts the pattern: if no secret is configured AND we are
 * running in production, the route refuses every request. In development we
 * still allow unauthenticated calls so local cron testing continues to work.
 */

import { NextResponse } from 'next/server';

export interface CronAuthResult {
  authorized: boolean;
  /** When unauthorized, the response to return immediately. */
  response?: NextResponse;
}

/**
 * Validate a cron-auth header. Caller does:
 *
 *   const auth = requireCronAuth(req.headers.get('authorization'));
 *   if (!auth.authorized) return auth.response!;
 */
export function requireCronAuth(authHeader: string | null | undefined): CronAuthResult {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const isProd = process.env.NODE_ENV === 'production';

  // In production, a missing secret is a deployment misconfiguration that
  // must NOT silently fail open. Refuse all calls.
  if (!cronSecret) {
    if (isProd) {
      console.error('[cron-auth] CRON_SECRET is not configured in production — refusing cron request.');
      return {
        authorized: false,
        response: NextResponse.json({ error: 'Cron auth not configured' }, { status: 503 }),
      };
    }
    // Dev / preview without a secret — allow so local jobs can be triggered.
    return { authorized: true };
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { authorized: true };
}
