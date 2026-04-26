import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  if (!token || !email) {
    return NextResponse.redirect(new URL('/auth/verify-email?error=invalid', req.url));
  }

  try {
    const record = await db.verificationToken.findUnique({ where: { token } });

    if (!record || record.identifier !== email) {
      return NextResponse.redirect(new URL('/auth/verify-email?error=invalid', req.url));
    }

    if (record.expires < new Date()) {
      await db.verificationToken.delete({ where: { token } });
      return NextResponse.redirect(new URL('/auth/verify-email?error=expired', req.url));
    }

    // Mark the user as verified
    await db.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });

    // Clean up the token
    await db.verificationToken.delete({ where: { token } });

    return NextResponse.redirect(new URL('/auth/verify-email?success=true', req.url));
  } catch (err) {
    console.error('[verify-email] error:', err);
    return NextResponse.redirect(new URL('/auth/verify-email?error=server', req.url));
  }
}
