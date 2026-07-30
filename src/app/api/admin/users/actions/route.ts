import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { clearRateLimit } from '@/lib/rate-limit';
import { recordAdminAction } from '@/lib/admin-audit';
import { buildUserExport } from '@/lib/user-export';
import { sendVerificationEmail } from '@/lib/email-service';

/**
 * Per-user admin support actions.
 *
 * POST /api/admin/users/actions  { userId, action }
 *   unlock              — clear a login lockout (the 8-attempt limit)
 *   resend_verification — re-send the verification email
 *   export              — GDPR subject access / portability document
 *
 * These are the three things support actually gets asked for and previously
 * had no answer to: "I'm locked out", "I never got the email", and "send me
 * everything you hold on me".
 */

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId, action } = await req.json().catch(() => ({}));
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, emailVerified: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const actor = { actorId: session.user.id, actorEmail: session.user.email ?? 'unknown', req };

  switch (action) {
    case 'unlock': {
      // Keyed by the account, matching how authorize() consumes the limit.
      const { cleared } = await clearRateLimit('login', user.email.toLowerCase().trim());
      await recordAdminAction({
        ...actor, action: 'user.unlock', targetId: user.id, targetEmail: user.email,
        detail: { cleared },
      });
      return NextResponse.json({
        ok: true,
        cleared,
        message: cleared
          ? `Sign-in lockout cleared for ${user.email}.`
          : `No active lockout was found for ${user.email}.`,
      });
    }

    case 'resend_verification': {
      if (user.emailVerified) {
        return NextResponse.json(
          { ok: false, message: `${user.email} is already verified.` },
          { status: 400 },
        );
      }
      const result = await sendVerificationEmail(user.id, user.email, user.name);
      await recordAdminAction({
        ...actor, action: 'user.resend_verification', targetId: user.id, targetEmail: user.email,
        detail: { sent: result?.sent ?? false },
      });
      // Surface a failed send rather than reporting success on a silent drop —
      // the email layer degrades to notification_only and still returns 200.
      return NextResponse.json({
        ok: Boolean(result?.sent),
        message: result?.sent
          ? `Verification email sent to ${user.email}.`
          : `Could not send — the mail provider rejected it${result?.error ? `: ${result.error}` : '.'}`,
      });
    }

    case 'export': {
      const data = await buildUserExport(user.id);
      await recordAdminAction({
        ...actor, action: 'user.export', targetId: user.id, targetEmail: user.email,
      });
      return new NextResponse(JSON.stringify(data, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="e-ari-data-${user.email.replace(/[^a-z0-9]/gi, '-')}.json"`,
        },
      });
    }

    default:
      return NextResponse.json(
        { error: 'Unknown action. Expected: unlock | resend_verification | export' },
        { status: 400 },
      );
  }
}
