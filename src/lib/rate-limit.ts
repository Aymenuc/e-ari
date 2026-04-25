/**
 * In-memory sliding window rate limiter for E-ARI.
 *
 * Designed for single-server deployment (Alibaba Cloud FC standalone mode).
 * Uses a Map keyed by `identifier:endpoint` with an array of timestamps
 * representing individual requests within the sliding window.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Per-endpoint rate limit configuration. */
export interface RateLimitConfig {
  /** Maximum number of requests allowed within the window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

/** Result returned when a request is allowed. */
export interface RateLimitAllowed {
  allowed: true;
  /** Number of requests remaining in the current window. */
  remaining: number;
  /** Timestamp (ms since epoch) when the window resets. */
  resetAt: number;
}

/** Result returned when a request is rate-limited. */
export interface RateLimitDenied {
  allowed: false;
  /** Seconds until the caller should retry. */
  retryAfter: number;
  /** Timestamp (ms since epoch) when the window resets. */
  resetAt: number;
}

export type RateLimitResult = RateLimitAllowed | RateLimitDenied;

/** Standard rate-limit HTTP headers. */
export interface RateLimitHeaders extends Record<string, string> {
  "X-RateLimit-Limit": string;
  "X-RateLimit-Remaining": string;
  "X-RateLimit-Reset": string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
  assessment: { limit: 5, windowMs: FIFTEEN_MINUTES_MS },
  insights: { limit: 10, windowMs: FIFTEEN_MINUTES_MS },
  agent: { limit: 15, windowMs: FIFTEEN_MINUTES_MS },
  assistant: { limit: 20, windowMs: FIFTEEN_MINUTES_MS },
  literacy: { limit: 10, windowMs: FIFTEEN_MINUTES_MS },
  default: { limit: 30, windowMs: FIFTEEN_MINUTES_MS },
};

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/**
 * Stores the timestamps of every request for a given key.
 * Key format: `identifier:endpointType`
 */
const requestStore = new Map<string, number[]>();

// Track the nearest future reset time so we can compute retryAfter accurately.
// This is derived per-key during the check — no separate structure needed.

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Remove entries whose timestamps are all older than the largest configured
 * window. This prevents unbounded memory growth over time.
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();

  // Determine the longest window across all endpoint types so we never
  // prematurely remove a still-valid entry.
  const maxWindowMs = Math.max(
    ...Object.values(ENDPOINT_LIMITS).map((c) => c.windowMs),
  );

  for (const [key, timestamps] of requestStore.entries()) {
    const cutoff = now - maxWindowMs;
    const filtered = timestamps.filter((ts) => ts > cutoff);

    if (filtered.length === 0) {
      requestStore.delete(key);
    } else if (filtered.length !== timestamps.length) {
      requestStore.set(key, filtered);
    }
  }
}

// Auto-cleanup runs every 5 minutes. We use `setInterval` and never clear it
// for the lifetime of the server process.
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

/** Start the automatic cleanup cycle. Idempotent — safe to call multiple times. */
export function startCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(cleanupExpiredEntries, CLEANUP_INTERVAL_MS);
  // Allow the process to exit even if the timer is still running.
  if (cleanupTimer && typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
  }
}

// Start cleanup immediately on module import.
startCleanup();

// ---------------------------------------------------------------------------
// Core rate-limit check
// ---------------------------------------------------------------------------

/**
 * Check whether a request should be allowed under the sliding window limit.
 *
 * @param endpointType - One of the configured endpoint types (e.g. "assessment",
 *   "insights", etc.) or `"default"`.
 * @param identifier   - User ID from session, or IP address as fallback.
 * @returns A `RateLimitResult` indicating whether the request is allowed and
 *   associated metadata.
 */
export function checkRateLimit(
  endpointType: string,
  identifier: string,
): RateLimitResult {
  const config = ENDPOINT_LIMITS[endpointType] ?? ENDPOINT_LIMITS.default;
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const key = `${identifier}:${endpointType}`;

  // Retrieve existing timestamps and discard those outside the window.
  const existing = requestStore.get(key) ?? [];
  const withinWindow = existing.filter((ts) => ts > windowStart);

  // ----- Rate limit exceeded -----
  if (withinWindow.length >= config.limit) {
    // The earliest timestamp in the window determines when a slot opens up.
    const earliestInWindow = withinWindow[0];
    const resetAt = earliestInWindow + config.windowMs;
    const retryAfter = Math.ceil((resetAt - now) / 1000);

    // Persist the (unmodified) timestamps for this key.
    requestStore.set(key, withinWindow);

    return {
      allowed: false,
      retryAfter: retryAfter > 0 ? retryAfter : 1, // floor at 1 second
      resetAt,
    };
  }

  // ----- Request allowed -----
  withinWindow.push(now);
  requestStore.set(key, withinWindow);

  const remaining = Math.max(0, config.limit - withinWindow.length);
  // The window effectively resets when the oldest request in the window
  // expires (sliding window semantics).
  const resetAt =
    withinWindow.length > 0
      ? withinWindow[0] + config.windowMs
      : now + config.windowMs;

  return {
    allowed: true,
    remaining,
    resetAt,
  };
}

// ---------------------------------------------------------------------------
// Headers helper
// ---------------------------------------------------------------------------

/**
 * Build standard rate-limit response headers from a `RateLimitResult`.
 *
 * These headers follow the IETF draft conventions commonly used by APIs:
 * - `X-RateLimit-Limit`:     Maximum requests allowed in the window.
 * - `X-RateLimit-Remaining`: Requests remaining in the current window.
 * - `X-RateLimit-Reset`:     Unix timestamp (seconds) when the window resets.
 *
 * @param endpointType - The endpoint type used for the original check.
 * @param result       - The result returned by `checkRateLimit`.
 * @returns An object suitable for spreading into a `Response` headers init.
 */
export function getRateLimitHeaders(
  endpointType: string,
  result: RateLimitResult,
): RateLimitHeaders {
  const config = ENDPOINT_LIMITS[endpointType] ?? ENDPOINT_LIMITS.default;

  const remaining =
    result.allowed === true ? result.remaining : 0;

  return {
    "X-RateLimit-Limit": String(config.limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

// ---------------------------------------------------------------------------
// Convenience: check rate limit from request, return 429 response or null
// ---------------------------------------------------------------------------

/**
 * Check rate limit from a request object directly.
 * Returns a 429 NextResponse if rate-limited, or null if allowed.
 * The limit/windowSeconds params override the ENDPOINT_LIMITS config.
 */
export function checkRateLimitFromRequest(
  request: Request,
  endpointType: string,
  limit: number,
  windowSeconds: number,
): import('next/server').NextResponse | null {
  const { NextResponse } = require('next/server');
  const identifier = resolveIdentifier(null, request);
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = now - windowMs;
  const key = `${identifier}:${endpointType}`;

  const existing = requestStore.get(key) ?? [];
  const withinWindow = existing.filter((ts) => ts > windowStart);

  if (withinWindow.length >= limit) {
    const resetAt = withinWindow[0] + windowMs;
    const retryAfter = Math.ceil((resetAt - now) / 1000);
    requestStore.set(key, withinWindow);
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.', retryAfter: retryAfter > 0 ? retryAfter : 1 },
      { status: 429, headers: { 'Retry-After': String(retryAfter > 0 ? retryAfter : 1) } }
    );
  }

  withinWindow.push(now);
  requestStore.set(key, withinWindow);
  return null;
}

// ---------------------------------------------------------------------------
// Convenience: derive identifier from request + session
// ---------------------------------------------------------------------------

/**
 * Resolve the best rate-limit identifier from a request.
 *
 * Prefer an authenticated user ID; fall back to the client IP address.
 *
 * @param userId - The user ID from the current session (may be `null`/`undefined`).
 * @param request - The incoming `Request` object, used to extract IP.
 * @returns A string identifier for rate-limit bucketing.
 */
export function resolveIdentifier(
  userId: string | null | undefined,
  request: Request,
): string {
  if (userId) return `user:${userId}`;

  // In Next.js App Router, the IP may be available on `request` headers
  // depending on the hosting platform. We try the standard headers as well.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for may contain a comma-separated list; the first is the
    // original client IP.
    return `ip:${forwarded.split(",")[0]!.trim()}`;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return `ip:${realIp.trim()}`;

  // Last-resort fallback — should rarely happen behind a proper proxy.
  return "ip:unknown";
}
