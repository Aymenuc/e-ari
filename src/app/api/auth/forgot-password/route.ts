import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Resend } from 'resend';
import crypto from 'crypto';
import { resetEmailHtml } from '@/lib/email-templates';

const BASE_URL = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

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
        text: `Hi ${name},\n\nReset your password:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`,
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
