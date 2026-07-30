import { db } from './db';

/**
 * Admin action audit trail.
 *
 * Every privileged mutation records who did it, to whom, and what changed.
 * Before this existed an admin could change any user's tier or role, or delete
 * an account, and nothing anywhere remembered it — which is an awkward gap for
 * a platform that sells immutable evidence trails to its customers.
 *
 * Writes are best-effort by design: an audit failure must never block the
 * operation the operator asked for, and must never surface as a 500 on an
 * action that actually succeeded. Failures are logged loudly instead.
 */

export type AdminAction =
  | 'user.tier'
  | 'user.role'
  | 'user.delete'
  | 'user.unlock'
  | 'user.resend_verification'
  | 'user.export'
  | 'settings.update'
  | 'refund.process'
  | 'email.send';

interface AuditInput {
  actorId: string;
  actorEmail: string;
  action: AdminAction;
  targetId?: string | null;
  targetEmail?: string | null;
  /** What changed. Keep it small and free of credentials. */
  detail?: Record<string, unknown> | null;
  req?: Request;
}

/** Best-effort client IP from the usual proxy headers. */
function clientIp(req?: Request): string | null {
  if (!req) return null;
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip');
}

export async function recordAdminAction(input: AuditInput): Promise<void> {
  try {
    await db.adminAudit.create({
      data: {
        actorId: input.actorId,
        actorEmail: input.actorEmail,
        action: input.action,
        targetId: input.targetId ?? null,
        targetEmail: input.targetEmail ?? null,
        detail: input.detail ? JSON.stringify(input.detail).slice(0, 2000) : null,
        ip: clientIp(input.req),
      },
    });
  } catch (err) {
    // Loud, because a silent audit trail is worse than none: it looks complete.
    console.error('[admin-audit] FAILED to record', input.action, err);
  }
}
