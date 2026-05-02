import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Routes that require authentication
const PROTECTED_ROUTES = [
  "/assessment",
  "/portal",
  "/compliance",
  "/checkout",
  "/results",
  "/pulse",
  "/integrations",
];

// Routes that redirect to portal if already authenticated
const AUTH_ROUTES = [
  "/auth/login",
  "/auth/register",
];

// Admin-only routes
const ADMIN_ROUTES = [
  "/admin",
];

// API routes that require authentication
const PROTECTED_API_ROUTES = [
  "/api/assessment",
  "/api/agent",
  "/api/assistant",
  "/api/pipeline",
  "/api/pulse",
  "/api/integrations",
  "/api/refunds",
  "/api/billing-portal",
  "/api/checkout",
  "/api/notifications",
  "/api/compliance",
];

// Admin-only API routes
const ADMIN_API_ROUTES = [
  "/api/admin",
];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".") // static files
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;

  // ─── API Route Protection ────────────────────────────────────────────

  if (pathname.startsWith("/api/")) {
    // NextAuth routes handle their own auth
    if (pathname.startsWith("/api/auth/")) {
      return NextResponse.next();
    }

    // Stripe webhooks need raw body, skip JWT check
    if (pathname.startsWith("/api/webhooks/")) {
      return NextResponse.next();
    }

    // Cron routes use bearer token auth, skip JWT check
    if (pathname.startsWith("/api/cron/")) {
      return NextResponse.next();
    }

    // Public API routes
    if (pathname === "/api/benchmark/consent") {
      return NextResponse.next();
    }

    // Check admin API routes
    const isAdminApiRoute = ADMIN_API_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    );
    if (isAdminApiRoute) {
      if (!isAuthenticated) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
      const role = token.role as string;
      if (role !== "admin") {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
      }
      return NextResponse.next();
    }

    // Check protected API routes
    const isProtectedApiRoute = PROTECTED_API_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    );
    if (isProtectedApiRoute && !isAuthenticated) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    return NextResponse.next();
  }

  // ─── Page Route Protection ───────────────────────────────────────────

  // Check if current path is a protected route
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // Check if current path is an auth route
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // Check if current path is an admin route
  const isAdminRoute = ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // Redirect unauthenticated users to login for protected routes
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  // Check admin access
  if (isAdminRoute) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const role = token.role as string;
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|logo\\.svg|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
  ],
};
