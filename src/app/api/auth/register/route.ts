import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/email-service";
import { checkRateLimitFromRequest } from "@/lib/rate-limit";
import { getSetting } from "@/lib/platform-settings";
import { Resend } from "resend";
import crypto from "crypto";
import { verificationEmailHtml } from "@/lib/email-templates";
import { getBaseUrl } from "@/lib/site-url";

export async function POST(req: NextRequest) {
  try {
    // Rate limit registration (5 per minute)
    const rateLimitError = checkRateLimitFromRequest(req, 'register', 5, 60);
    if (rateLimitError) return rateLimitError;

    const body = await req.json();
    const { email, password, name, organization, sector, orgSize } = body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
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
      where: { email: normalizedEmail },
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
        email: normalizedEmail,
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
      const baseUrl = getBaseUrl();
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });
      await db.verificationToken.create({ data: { identifier: normalizedEmail, token, expires } });
      const verifyUrl = `${baseUrl}/auth/verify-email?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "Email delivery is not configured" },
          { status: 503 }
        );
      }
      const resend = new Resend(apiKey);
      const userName = user.name || normalizedEmail.split("@")[0];
      const result = await resend.emails.send({
        from: process.env.EMAIL_FROM_HELLO || process.env.EMAIL_FROM_ADDRESS || "hello@e-ari.com",
        to: normalizedEmail,
        subject: "Verify your E-ARI email address",
        html: verificationEmailHtml(verifyUrl, userName),
        text: `Hi ${userName},\n\nVerify your E-ARI account:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
      });
      if (result.error) {
        console.error("[register] verification email error:", result.error);
        return NextResponse.json(
          { error: "Failed to send verification email" },
          { status: 502 }
        );
      }
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
