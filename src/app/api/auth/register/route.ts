import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/email-service";
import { checkRateLimitFromRequest } from "@/lib/rate-limit";

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

    // Send welcome email (fire-and-forget)
    sendWelcomeEmail(user.id, user.email, user.name).catch(() => {});

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        name: user.name,
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
