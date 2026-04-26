import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/email-service";
import { checkRateLimitFromRequest } from "@/lib/rate-limit";
import { getSetting } from "@/lib/platform-settings";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    // Rate limit registration (5 per minute)
    const rateLimitError = checkRateLimitFromRequest(req, 'register', 5, 60);
    if (rateLimitError) return rateLimitError;

    const body = await req.json();
    const { email, password, name, organization, sector, orgSize } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one uppercase letter" },
        { status: 400 }
      );
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one number" },
        { status: 400 }
      );
    }

    // Check registration allowed
    const allowRegistrations = await getSetting('allow_registrations');
    if (!allowRegistrations) {
      return NextResponse.json(
        { error: "New registrations are currently disabled. Please contact support." },
        { status: 403 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
        organization: organization || null,
        sector: sector || null,
        orgSize: orgSize || null,
        tier: "free",
        role: "user",
      },
    });

    // Check if email verification is required
    const requireVerification = await getSetting('require_email_verification');
    if (requireVerification) {
      const BASE_URL = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db.verificationToken.create({ data: { identifier: email, token, expires } });
      const verifyUrl = `${BASE_URL}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

      // Send verification email (fire-and-forget)
      fetch(`${BASE_URL}/api/auth/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }).catch(() => {});

      // Also log for dev
      console.log('[register] Verification link:', verifyUrl);
    } else {
      // Send welcome email (fire-and-forget)
      sendWelcomeEmail(user.id, user.email, user.name).catch(() => {});
    }

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        requiresVerification: requireVerification,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
