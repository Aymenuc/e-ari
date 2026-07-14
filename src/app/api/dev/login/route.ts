import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { db } from "@/lib/db";

/**
 * DEV-ONLY auto-login — design-iteration harness.
 *
 * Lets the local browser preview reach authenticated surfaces (wizard,
 * results, portal) without a real sign-in flow: it issues the NextAuth
 * session JWT for the seeded demo user directly as an httpOnly cookie and
 * redirects to the requested page.
 *
 * Hard-disabled outside development: returns 404 in production builds AND
 * on any Vercel environment, before touching the database.
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    return new NextResponse(null, { status: 404 });
  }

  const email = req.nextUrl.searchParams.get("as") ?? "demo@e-ari.local";
  const next = req.nextUrl.searchParams.get("next") ?? "/portal";

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: `No local user ${email} — run: npx tsx scripts/seed-dev.ts` },
      { status: 404 },
    );
  }

  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tier: user.tier,
    },
    secret: process.env.NEXTAUTH_SECRET ?? "dev-secret",
  });

  const res = NextResponse.redirect(new URL(next, req.url));
  res.cookies.set("next-auth.session-token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return res;
}
