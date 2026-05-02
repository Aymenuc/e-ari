import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getBaseUrl } from '@/lib/site-url';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  if (!token || !email) {
    return NextResponse.redirect(new URL('/auth/verify-email?error=invalid', getBaseUrl()));
  }

  return NextResponse.redirect(
    new URL(`/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`, getBaseUrl())
  );
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let token: string | null = null;
    let email: string | null = null;

    if (contentType.includes('application/json')) {
      const body = await req.json();
      token = body?.token ?? null;
      email = body?.email ?? null;
    } else {
      const form = await req.formData();
      token = form.get('token')?.toString() ?? null;
      email = form.get('email')?.toString() ?? null;
    }

    const jsonMode = contentType.includes('application/json');
    const normalizedToken = token?.trim() || null;
    const normalizedEmail = email?.trim().toLowerCase() || null;
    if (!normalizedToken || !normalizedEmail) {
      if (jsonMode) return NextResponse.json({ error: 'invalid' }, { status: 400 });
      return NextResponse.redirect(new URL('/auth/verify-email?error=invalid', getBaseUrl()));
    }

    const record = await db.verificationToken.findUnique({ where: { token: normalizedToken } });
    if (!record || record.identifier.trim().toLowerCase() !== normalizedEmail) {
      if (jsonMode) return NextResponse.json({ error: 'invalid' }, { status: 400 });
      return NextResponse.redirect(new URL('/auth/verify-email?error=invalid', getBaseUrl()));
    }

    if (record.expires < new Date()) {
      await db.verificationToken.delete({ where: { token: normalizedToken } });
      if (jsonMode) return NextResponse.json({ error: 'expired' }, { status: 400 });
      return NextResponse.redirect(new URL('/auth/verify-email?error=expired', getBaseUrl()));
    }

    await db.user.update({
      where: { email: normalizedEmail },
      data: { emailVerified: new Date() },
    });
    await db.verificationToken.delete({ where: { token: normalizedToken } });

    if (jsonMode) return NextResponse.json({ success: true });
    return NextResponse.redirect(new URL('/auth/verify-email?success=true', getBaseUrl()));
  } catch (err) {
    console.error('[verify-email] error:', err);
    if ((req.headers.get('content-type') || '').includes('application/json')) {
      return NextResponse.json({ error: 'server' }, { status: 500 });
    }
    return NextResponse.redirect(new URL('/auth/verify-email?error=server', getBaseUrl()));
  }
}
