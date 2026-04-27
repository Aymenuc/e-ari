import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Resend } from 'resend';
import crypto from 'crypto';

const BASE_URL = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

function resetEmailHtml(resetUrl: string, name: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>Reset your E-ARI password</title>
</head>
<body style="margin:0;padding:0;background-color:#080c14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#080c14;padding:48px 16px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

        <!-- Logo row -->
        <tr><td align="center" style="padding-bottom:32px">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:linear-gradient(135deg,#1d4ed8,#0891b2);border-radius:12px;padding:10px 14px;vertical-align:middle">
                <span style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;font-family:Georgia,serif">E-ARI</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Card -->
        <tr><td style="background-color:#0d1526;border-radius:20px;border:1px solid rgba(99,130,255,0.12);overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.5)">

          <!-- Header band -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:linear-gradient(135deg,#312e81 0%,#1d4ed8 60%,#0891b2 100%);padding:36px 48px 32px;text-align:center">
              <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:50%;width:56px;height:56px;line-height:56px;text-align:center;font-size:26px;margin-bottom:16px">🔑</div>
              <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;line-height:1.2">Reset your password</h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.72);font-size:14px;line-height:1.5">We received a password reset request for your account</p>
            </td></tr>
          </table>

          <!-- Body -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:40px 48px">

              <p style="margin:0 0 6px;font-size:15px;color:#94a3b8">Hi <strong style="color:#e2e8f0">${name}</strong>,</p>
              <p style="margin:0 0 32px;font-size:15px;color:#94a3b8;line-height:1.7">
                Someone requested a password reset for the E-ARI account associated with this email address.
                Click the button below to choose a new password.
                This link expires in <strong style="color:#e2e8f0">1 hour</strong>.
              </p>

              <!-- CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 36px">
                <tr>
                  <td style="border-radius:12px;background:linear-gradient(135deg,#312e81,#1d4ed8);box-shadow:0 4px 20px rgba(49,46,129,0.5)">
                    <a href="${resetUrl}" target="_blank" style="display:block;padding:15px 40px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:0.2px;white-space:nowrap">
                      Reset Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security notice -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
                <tr>
                  <td style="background-color:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:10px;padding:14px 18px">
                    <p style="margin:0;font-size:13px;color:#d97706;line-height:1.6">
                      ⚠️&nbsp; If you didn't request this, ignore this email — your password will <strong>not</strong> change.
                      If you're concerned, <a href="mailto:hello@e-ari.com" style="color:#f59e0b;text-decoration:underline">contact support</a>.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
                <tr><td style="border-top:1px solid rgba(255,255,255,0.07)"></td></tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0 0 6px;font-size:12px;color:#475569">Button not working? Paste this link into your browser:</p>
              <p style="margin:0;font-size:11px;color:#3b82f6;word-break:break-all;line-height:1.5">${resetUrl}</p>

            </td></tr>
          </table>

          <!-- Footer -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background-color:#080c14;border-top:1px solid rgba(255,255,255,0.05);padding:24px 48px;text-align:center">
              <p style="margin:0 0 6px;font-size:12px;color:#334155;line-height:1.6">
                This email was sent to you because a password reset was requested for your E-ARI account.
              </p>
              <p style="margin:0;font-size:11px;color:#1e293b">
                © ${new Date().getFullYear()} E-ARI &nbsp;·&nbsp; Enterprise AI Readiness Platform
              </p>
            </td></tr>
          </table>

        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
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
