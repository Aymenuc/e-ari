/**
 * Public API v1 — key generation + request authentication.
 *
 * Keys: `eari_live_<40 hex>`. Only the SHA-256 of the full key is stored;
 * the secret is shown once at creation. Scope 'read' (Growth+) or 'write'
 * (Enterprise). Lookup is O(1) on the unique keyHash index.
 */

import { createHash, randomBytes } from "crypto";
import { db } from "./db";
import { isGrowthOrAbove, isEnterprise } from "./tier";

export interface GeneratedKey {
  secret: string; // full key — show once, never persisted
  prefix: string;
  keyHash: string;
}

export function generateApiKey(): GeneratedKey {
  const secret = `eari_live_${randomBytes(20).toString("hex")}`;
  return {
    secret,
    prefix: secret.slice(0, 15), // "eari_live_ab12c"
    keyHash: createHash("sha256").update(secret).digest("hex"),
  };
}

export interface ApiAuthResult {
  ok: boolean;
  status?: number;
  error?: string;
  userId?: string;
  keyId?: string;
  scope?: "read" | "write";
}

/**
 * Authenticate a v1 request from its Authorization header.
 * `requiredScope: 'write'` additionally requires an Enterprise account and
 * a write-scoped key. Tier is checked live — a downgraded account's keys
 * stop working immediately.
 */
export async function authenticateApiKey(
  authHeader: string | null,
  requiredScope: "read" | "write" = "read",
): Promise<ApiAuthResult> {
  const m = /^Bearer\s+(eari_live_[a-f0-9]{40})$/.exec(authHeader ?? "");
  if (!m) return { ok: false, status: 401, error: "Missing or malformed API key. Use: Authorization: Bearer eari_live_…" };

  const keyHash = createHash("sha256").update(m[1]!).digest("hex");
  const key = await db.apiKey.findUnique({ where: { keyHash } });
  if (!key || key.revokedAt) return { ok: false, status: 401, error: "Invalid or revoked API key." };

  const user = await db.user.findUnique({ where: { id: key.userId }, select: { tier: true } });
  if (!isGrowthOrAbove(user?.tier)) {
    return { ok: false, status: 403, error: "API access requires the Growth tier or above." };
  }
  if (requiredScope === "write") {
    if (key.scope !== "write") return { ok: false, status: 403, error: "This key is read-only. Create a write-scoped key." };
    if (!isEnterprise(user?.tier)) return { ok: false, status: 403, error: "Write access requires the Enterprise tier." };
  }

  // Fire-and-forget usage stamp — never block the request on it.
  db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return { ok: true, userId: key.userId, keyId: key.id, scope: key.scope as "read" | "write" };
}
