/**
 * Edge middleware — applies global security headers to every response.
 *
 * Defence-in-depth. Vercel's defaults are already reasonable, but explicit
 * headers protect against framing attacks, MIME sniffing, referrer leakage,
 * and unintended permissions — and document our intent for auditors who ask.
 *
 * If a CSP needs to be loosened for a specific page (e.g. a checkout
 * redirect that needs to load Stripe.js), do it on the page itself. The
 * middleware sets a baseline only.
 */

import { NextResponse, type NextRequest } from 'next/server';

// Strict-Transport-Security: only enable when running over HTTPS in prod.
// Setting this on http://localhost:3000 would break local dev because the
// browser would memoize the requirement.
function buildSecurityHeaders(): Record<string, string> {
  const isProd = process.env.NODE_ENV === 'production';
  const headers: Record<string, string> = {
    // Stop pages from being framed by other origins (clickjacking).
    'X-Frame-Options': 'DENY',
    // Disable MIME sniffing — browsers must respect Content-Type.
    'X-Content-Type-Options': 'nosniff',
    // Strip referrer when navigating cross-origin so we don't leak our
    // own paths (e.g. /portal/abc123) to outbound links.
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // Disable powerful browser APIs we never use. Each entry is "feature=()"
    // meaning "no origin allowed".
    'Permissions-Policy':
      'camera=(), microphone=(), geolocation=(), payment=(self), usb=(), magnetometer=(), accelerometer=(), gyroscope=()',
    // Old-school XSS filter — modern browsers ignore this, but adds nothing
    // negative either. Most CSP-conformant guides include it for legacy UAs.
    'X-XSS-Protection': '0',
  };
  if (isProd) {
    // 6 months, include subdomains. "preload" omitted on purpose — only opt
    // into the Chrome preload list once we're confident we won't need to roll
    // back to plain HTTP for any subdomain.
    headers['Strict-Transport-Security'] = 'max-age=15552000; includeSubDomains';
  }
  return headers;
}

const SECURITY_HEADERS = buildSecurityHeaders();

export function middleware(_req: NextRequest) {
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

export const config = {
  // Apply to all routes EXCEPT Next-internal asset paths and the favicons.
  // Static assets don't benefit from these headers and adding them would
  // bloat every CDN response unnecessarily.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|favicon.svg|robots.txt|sitemap.xml).*)',
  ],
};
