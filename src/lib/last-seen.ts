import { db } from './db';

/**
 * Last-seen telemetry: when an account was last active, and roughly where.
 *
 * Scope is deliberately narrow. This exists to answer two operational
 * questions — is this account actually being used, and is it being signed into
 * from somewhere unexpected — and nothing else. It is not analytics, it is not
 * a session log, and it does not accumulate history: each sign-in overwrites
 * the last, so there is one row per account, never a trail.
 *
 * IP and location are personal data under GDPR. Three obligations follow, and
 * all three are met rather than promised: the privacy policy discloses the
 * collection and the retention period, the values appear in the subject access
 * export, and anything older than the retention window is pruned by cron.
 *
 * The IP is truncated before it is ever written. We store 81.2.69.0, not
 * 81.2.69.142 — enough to notice a change of network, not enough to single out
 * a household. Storing the full address would buy nothing this feature needs
 * and would make E-ARI hold data it would rather not have to defend.
 */

export const LAST_SEEN_RETENTION_DAYS = 90;

/** Only re-write once an hour: this runs on ordinary requests, not just logins. */
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Drop the identifying tail of an address.
 *
 * IPv4 keeps three octets (/24). IPv6 keeps the first 48 bits, which is the
 * routing prefix — the rest identifies an interface and is worth less to us
 * than it costs to hold.
 */
export function anonymiseIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const ip = raw.split(',')[0]!.trim();
  if (!ip) return null;

  if (ip.includes(':')) {
    const parts = ip.split(':');
    return `${parts.slice(0, 3).join(':')}::`;
  }

  const octets = ip.split('.');
  if (octets.length !== 4) return null;
  return `${octets[0]}.${octets[1]}.${octets[2]}.0`;
}

interface SeenSignals {
  ip: string | null;
  country: string | null;
  city: string | null;
}

/**
 * Read the signals off a request.
 *
 * Country and city come from the edge (Vercel sets them on every request), so
 * there is no geo-IP lookup, no third-party call and no data leaving the
 * platform to resolve a location.
 */
export function readSeenSignals(req: Request): SeenSignals {
  const h = req.headers;
  const rawIp = h.get('x-forwarded-for') ?? h.get('x-real-ip');
  const country = h.get('x-vercel-ip-country');
  const cityRaw = h.get('x-vercel-ip-city');

  return {
    ip: anonymiseIp(rawIp),
    country: country?.trim() || null,
    // Vercel percent-encodes city names ("Saint%20Denis").
    city: cityRaw ? decodeURIComponent(cityRaw).trim() || null : null,
  };
}

/**
 * Record activity for a user. Best-effort: this must never fail a request the
 * user actually asked for, so errors are swallowed after logging.
 */
export async function recordLastSeen(userId: string, req: Request): Promise<void> {
  try {
    const existing = await db.user.findUnique({
      where: { id: userId },
      select: { lastSeenAt: true },
    });

    if (
      existing?.lastSeenAt &&
      Date.now() - existing.lastSeenAt.getTime() < TOUCH_INTERVAL_MS
    ) {
      return; // seen recently — nothing worth another write
    }

    const { ip, country, city } = readSeenSignals(req);
    await db.user.update({
      where: { id: userId },
      data: {
        lastSeenAt: new Date(),
        // Keep the previous location if the edge gave us nothing this time,
        // rather than blanking a good value with a null.
        ...(ip ? { lastSeenIp: ip } : {}),
        ...(country ? { lastSeenCountry: country } : {}),
        ...(city ? { lastSeenCity: city } : {}),
      },
    });
  } catch (err) {
    console.error('[last-seen] record failed:', err);
  }
}

/**
 * Retention. Clears location and address once the window has passed, keeping
 * only the timestamp — "this account was last used in March" is an operational
 * fact with no personal-data weight, while the place it was used from is.
 */
export async function pruneLastSeen(): Promise<{ pruned: number }> {
  const cutoff = new Date(Date.now() - LAST_SEEN_RETENTION_DAYS * 86_400_000);
  const res = await db.user.updateMany({
    where: {
      lastSeenAt: { lt: cutoff },
      OR: [
        { lastSeenIp: { not: null } },
        { lastSeenCountry: { not: null } },
        { lastSeenCity: { not: null } },
      ],
    },
    data: { lastSeenIp: null, lastSeenCountry: null, lastSeenCity: null },
  });
  return { pruned: res.count };
}
