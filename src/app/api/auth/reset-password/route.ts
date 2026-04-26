import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { token, email, password } = await req.json();

    if (!token || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json({ error: 'Password must contain at least one uppercase letter' }, { status: 400 });
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json({ error: 'Password must contain at least one number' }, { status: 400 });
    }

    const identifier = `reset:${email}`;
    const record = await db.verificationToken.findUnique({ where: { token } });

    if (!record || record.identifier !== identifier) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    if (record.expires < new Date()) {
      await db.verificationToken.delete({ where: { token } });
      return NextResponse.json({ error: 'Reset link has expired. Please request a new one.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.user.update({
      where: { email },
      data: { passwordHash },
    });

    await db.verificationToken.delete({ where: { token } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[reset-password] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
