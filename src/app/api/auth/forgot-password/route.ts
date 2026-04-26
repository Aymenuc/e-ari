import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Resend } from 'resend';
import crypto from 'crypto';

const BASE_URL = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

function resetEmailHtml(resetUrl: string, name: string): string {
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
          <h2 style="margin:0 0 12px;color:#e6edf3;font-size:22px;font-weight:600">Reset your password</h2>
          <p style="margin:0 0 8px;color:#8b949e;font-size:15px;line-height:1.6">Hi ${name},</p>
          <p style="margin:0 0 32px;color:#8b949e;font-size:15px;line-height:1.6">We received a request to reset your E-ARI password. Click the button below to choose a new one. This link expires in 1 hour.</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px">
            <tr><td align="center" style="background:linear-gradient(135deg,#2563eb,#06b6d4);border-radius:10px">
              <a href="${resetUrl}" style="display:block;padding:14px 36px;color:#fff;font-weight:600;font-size:15px;text-decoration:none;white-space:nowrap">Reset Password</a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;color:#484f58;font-size:13px">If the button doesn't work, copy this link:</p>
          <p style="margin:0 0 24px;color:#3b82f6;font-size:12px;word-break:break-all">${resetUrl}</p>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:0 0 24px">
          <p style="margin:0;color:#484f58;font-size:12px;line-height:1.5">If you didn't request a password reset, you can safely ignore this email. Your password will not change.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    // Always return success to prevent email enumeration
    if (!user || !user.passwordHash) {
      return NextResponse.json({ sent: true });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const identifier = `reset:${email}`;

    await db.verificationToken.deleteMany({ where: { identifier } });
    await db.verificationToken.create({ data: { identifier, token, expires } });

    const resetUrl = `${BASE_URL}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    const name = user.name || email.split('@')[0];

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: process.env.EMAIL_FROM_ADDRESS || 'hello@e-ari.com',
        to: email,
        subject: 'Reset your E-ARI password',
        html: resetEmailHtml(resetUrl, name),
        text: `Hi ${name},\n\nReset your password by visiting:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`,
      });
    } else {
      console.log('[forgot-password] RESEND not configured. Reset link:', resetUrl);
    }

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error('[forgot-password] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
