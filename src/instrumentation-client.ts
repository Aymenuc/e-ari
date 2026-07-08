/**
 * Client-side error monitoring (Sentry) — no-op until
 * NEXT_PUBLIC_SENTRY_DSN is set, so the platform runs identically with
 * monitoring off. Set the DSN in Vercel env and redeploy to activate.
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
    // Error monitoring first; keep performance sampling light.
    tracesSampleRate: 0.05,
    // Never attach request bodies / PII by default — this is a compliance product.
    sendDefaultPii: false,
  });
}

export const onRouterTransitionStart = dsn ? Sentry.captureRouterTransitionStart : () => {};
