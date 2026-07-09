import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// ─── Global security headers ─────────────────────────────────────────────────
// Attached to every response that flows through the proxy. Defence-in-depth:
// X-Frame-Options stops clickjacking, X-Content-Type-Options stops MIME
// sniffing, Referrer-Policy stops referrer leakage cross-origin,
// Permissions-Policy disables browser features we never use, HSTS forces
// HTTPS for 6 months in production. NextAuth, Stripe webhooks and cron
// callers don't need most of these (no UI to protect), so we skip them
// for those paths to avoid perturbing third-party flows.
const isProd = process.env.NODE_ENV === "production";
const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()",
  "X-XSS-Protection": "0",
  ...(isProd ? { "Strict-Transport-Security": "max-age=15552000; includeSubDomains" } : {}),
};

function applySecurityHeaders(res: NextResponse, pathname: string): NextResponse {
  // Skip header injection for NextAuth / webhooks / cron — these are
  // third-party-managed flows where extra headers add zero value and risk
  // breaking cookie / signature handling.
  if (
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/api/cron/")
  ) {
    return res;
  }
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

// Routes that require authentication
const PROTECTED_ROUTES = [
  "/assessment",
  "/portal",
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
  "/api/portal",
];

// Admin-only API routes
const ADMIN_API_ROUTES = [
  "/api/admin",
];


// ─── Maintenance-mode check (cached per edge isolate) ─────────────────────
let _maintCache: { value: boolean; at: number } | null = null;
const MAINT_TTL_MS = 30_000;
async function isMaintenanceOn(request: NextRequest): Promise<boolean> {
  const now = Date.now();
  if (_maintCache && now - _maintCache.at < MAINT_TTL_MS) return _maintCache.value;
  try {
    const res = await fetch(new URL("/api/maintenance-status", request.url), {
      headers: { "x-internal": "proxy" },
    });
    const json = (await res.json()) as { maintenance?: boolean };
    _maintCache = { value: json.maintenance === true, at: now };
    return _maintCache.value;
  } catch {
    return false; // fail open
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".") // static files
  ) {
    return applySecurityHeaders(NextResponse.next(), pathname);
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;
  const role = (token?.role as string | undefined) ?? null;

  // ─── Maintenance mode ─────────────────────────────────────────────────
  // Admin toggle at /admin. Non-admins get the maintenance page; admins,
  // the maintenance page itself, the status endpoint, and auth routes pass
  // through so an admin can still sign in and flip it back off. Checked via
  // a tiny public endpoint with an in-isolate cache so we hit the DB at most
  // once per 30 s per edge isolate rather than on every request.
  if (
    !pathname.startsWith("/api/") &&
    pathname !== "/maintenance" &&
    !pathname.startsWith("/auth/") &&
    role !== "admin"
  ) {
    if (await isMaintenanceOn(request)) {
      return applySecurityHeaders(
        NextResponse.rewrite(new URL("/maintenance", request.url)),
        pathname,
      );
    }
  }


  // ─── API Route Protection ────────────────────────────────────────────

  if (pathname.startsWith("/api/")) {
    // NextAuth routes handle their own auth
    if (pathname.startsWith("/api/auth/")) {
      return applySecurityHeaders(NextResponse.next(), pathname);
    }

    // Stripe webhooks need raw body, skip JWT check
    if (pathname.startsWith("/api/webhooks/")) {
      return applySecurityHeaders(NextResponse.next(), pathname);
    }

    // Cron routes use bearer token auth, skip JWT check
    if (pathname.startsWith("/api/cron/")) {
      return applySecurityHeaders(NextResponse.next(), pathname);
    }

    // Public API routes
    if (pathname === "/api/benchmark/consent") {
      return applySecurityHeaders(NextResponse.next(), pathname);
    }

    // Check admin API routes
    const isAdminApiRoute = ADMIN_API_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    );
    if (isAdminApiRoute) {
      if (!isAuthenticated) {
        return applySecurityHeaders(NextResponse.json({ error: "Authentication required" }, { status: 401 }), pathname);
      }
      const role = token.role as string;
      if (role !== "admin") {
        return applySecurityHeaders(NextResponse.json({ error: "Admin access required" }, { status: 403 }), pathname);
      }
      return applySecurityHeaders(NextResponse.next(), pathname);
    }

    // Check protected API routes
    const isProtectedApiRoute = PROTECTED_API_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    );
    if (isProtectedApiRoute && !isAuthenticated) {
      return applySecurityHeaders(NextResponse.json({ error: "Authentication required" }, { status: 401 }), pathname);
    }

    return applySecurityHeaders(NextResponse.next(), pathname);
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
    return applySecurityHeaders(NextResponse.redirect(loginUrl), pathname);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && isAuthenticated) {
    return applySecurityHeaders(NextResponse.redirect(new URL("/portal", request.url)), pathname);
  }

  // Check admin access
  if (isAdminRoute) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return applySecurityHeaders(NextResponse.redirect(loginUrl), pathname);
    }
    const role = token.role as string;
    if (role !== "admin") {
      return applySecurityHeaders(NextResponse.redirect(new URL("/portal", request.url)), pathname);
    }
  }

  return applySecurityHeaders(NextResponse.next(), pathname);
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
