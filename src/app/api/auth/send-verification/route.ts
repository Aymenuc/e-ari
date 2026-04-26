import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { Resend } from 'resend';
import crypto from 'crypto';

const BASE_URL = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

function verificationEmailHtml(verifyUrl: string, name: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080c14;font-family:system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080c14;padding:40px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0f1521;border-radius:16px;border:1px solid rgba(255,255,255,0.06);overflow:hidden;max-width:100%">
        <tr><td style="background:linear-gradient(135deg,#2563eb,#06b6d4);padding:32px 40px;text-align:center">
          <p style="margin:0;font-size:28px;font-weight:700;color:#fff;letter-spacing:-0.5px">E-ARI</p>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px">Enterprise AI Readiness Platform</p>
        </td></tr>
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 12px;color:#e6edf3;font-size:22px;font-weight:600">Verify your email address</h2>
          <p style="margin:0 0 8px;color:#8b949e;font-size:15px;line-height:1.6">Hi ${name},</p>
          <p style="margin:0 0 32px;color:#8b949e;font-size:15px;line-height:1.6">Click the button below to verify your email address and activate your E-ARI account. This link expires in 24 hours.</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px">
            <tr><td align="center" style="background:linear-gradient(135deg,#2563eb,#06b6d4);border-radius:10px">
              <a href="${verifyUrl}" style="display:block;padding:14px 36px;color:#fff;font-weight:600;font-size:15px;text-decoration:none;white-space:nowrap">Verify Email Address</a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;color:#484f58;font-size:13px">If the button doesn't work, copy this link:</p>
          <p style="margin:0;color:#3b82f6;font-size:12px;word-break:break-all">${verifyUrl}</p>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:32px 0">
          <p style="margin:0;color:#484f58;font-size:12px;line-height:1.5">If you didn't create an E-ARI account, you can safely ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function POST(req: NextRequest) {
  try {
    // Can be called by logged-in user (resend) or right after registration (no session yet)
    const session = await getServerSession(authOptions);
    const body = await req.json().catch(() => ({}));
    const emailInput: string | undefined = body.email;

    let userEmail: string;
    let userName: string;

    if (session?.user?.id) {
      const u = await db.user.findUnique({ where: { id: session.user.id } });
      if (!u) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      if (u.emailVerified) return NextResponse.json({ message: 'Already verified' });
      userEmail = u.email;
      userName = u.name || u.email.split('@')[0];
    } else if (emailInput) {
      const u = await db.user.findUnique({ where: { email: emailInput } });
      if (!u) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      if (u.emailVerified) return NextResponse.json({ message: 'Already verified' });
      userEmail = u.email;
      userName = u.name || u.email.split('@')[0];
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Delete any existing token for this email
    await db.verificationToken.deleteMany({ where: { identifier: userEmail } });

    await db.verificationToken.create({
      data: { identifier: userEmail, token, expires },
    });

    const verifyUrl = `${BASE_URL}/auth/verify-email?token=${token}&email=${encodeURIComponent(userEmail)}`;

    // Send email via Resend
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: process.env.EMAIL_FROM_HELLO || process.env.EMAIL_FROM_ADDRESS || 'hello@e-ari.com',
        to: userEmail,
        subject: 'Verify your E-ARI email address',
        html: verificationEmailHtml(verifyUrl, userName),
        text: `Hi ${userName},\n\nVerify your E-ARI account by visiting:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
      });
    } else {
      // Dev fallback — log the link
      console.log('[verify-email] RESEND not configured. Verification link:', verifyUrl);
    }

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error('[send-verification] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
