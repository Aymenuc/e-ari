import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { Resend } from 'resend';
import crypto from 'crypto';

const BASE_URL = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

function verificationEmailHtml(verifyUrl: string, name: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>Verify your E-ARI email</title>
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
            <tr><td style="background:linear-gradient(135deg,#1d4ed8 0%,#0891b2 100%);padding:36px 48px 32px;text-align:center">
              <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:50%;width:56px;height:56px;line-height:56px;text-align:center;font-size:26px;margin-bottom:16px">✉️</div>
              <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;line-height:1.2">Verify your email address</h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.72);font-size:14px;line-height:1.5">One quick step to activate your E-ARI account</p>
            </td></tr>
          </table>

          <!-- Body -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:40px 48px">

              <p style="margin:0 0 6px;font-size:15px;color:#94a3b8">Hi <strong style="color:#e2e8f0">${name}</strong>,</p>
              <p style="margin:0 0 32px;font-size:15px;color:#94a3b8;line-height:1.7">
                Thanks for signing up. Click the button below to confirm your email address and get started with your AI readiness assessment.
                This link is valid for <strong style="color:#e2e8f0">24 hours</strong>.
              </p>

              <!-- CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 36px">
                <tr>
                  <td style="border-radius:12px;background:linear-gradient(135deg,#2563eb,#0891b2);box-shadow:0 4px 20px rgba(37,99,235,0.4)">
                    <a href="${verifyUrl}" target="_blank" style="display:block;padding:15px 40px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:0.2px;white-space:nowrap">
                      Verify Email Address &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
                <tr>
                  <td style="border-top:1px solid rgba(255,255,255,0.07)"></td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0 0 6px;font-size:12px;color:#475569">Button not working? Paste this link into your browser:</p>
              <p style="margin:0;font-size:11px;color:#3b82f6;word-break:break-all;line-height:1.5">${verifyUrl}</p>

            </td></tr>
          </table>

          <!-- Footer -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background-color:#080c14;border-top:1px solid rgba(255,255,255,0.05);padding:24px 48px;text-align:center">
              <p style="margin:0 0 6px;font-size:12px;color:#334155;line-height:1.6">
                If you didn't create an E-ARI account, you can safely ignore this email.
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

    const verifyUrl = `${BASE_URL}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(userEmail)}`;

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
