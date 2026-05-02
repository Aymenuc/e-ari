import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { Resend } from 'resend';
import crypto from 'crypto';
import { verificationEmailHtml } from '@/lib/email-templates';
import { getBaseUrl } from '@/lib/site-url';

const BASE_URL = getBaseUrl();

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
      userEmail = u.email.trim().toLowerCase();
      userName = u.name || u.email.split('@')[0];
    } else if (emailInput) {
      const normalizedEmail = emailInput.trim().toLowerCase();
      const u = await db.user.findUnique({ where: { email: normalizedEmail } });
      if (!u) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      if (u.emailVerified) return NextResponse.json({ message: 'Already verified' });
      userEmail = u.email.trim().toLowerCase();
      userName = u.name || u.email.split('@')[0];
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Delete any existing token for this email
    await db.verificationToken.deleteMany({ where: { identifier: userEmail } });
    await db.verificationToken.create({ data: { identifier: userEmail, token, expires } });

    const verifyUrl = `${BASE_URL}/auth/verify-email?token=${token}&email=${encodeURIComponent(userEmail)}`;

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = new Resend(apiKey);
      const result = await resend.emails.send({
        from: process.env.EMAIL_FROM_HELLO || process.env.EMAIL_FROM_ADDRESS || 'hello@e-ari.com',
        to: userEmail,
        subject: 'Verify your E-ARI email address',
        html: verificationEmailHtml(verifyUrl, userName),
        text: `Hi ${userName},\n\nVerify your E-ARI account:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
      });
      if (result.error) {
        console.error('[send-verification] resend error:', result.error);
        return NextResponse.json({ error: 'Failed to send verification email' }, { status: 502 });
      }
    } else {
      console.warn('[verify-email] RESEND not configured. Verification link:', verifyUrl);
      return NextResponse.json({ error: 'Email delivery is not configured' }, { status: 503 });
    }

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error('[send-verification] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
