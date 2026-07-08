/**
 * HMAC magic-link tokens for account-less interactions.
 *
 * Team members (Article 4 training) and vendor contacts (risk questionnaires)
 * never get auth accounts. They interact through single-purpose signed links:
 *
 *   /train/<token>            → training + quiz page
 *   /vendor-response/<token>  → questionnaire page
 *
 * Token format: base64url(payload).base64url(hmac-sha256(payload, secret))
 * Payload: { id, purpose, exp }  — no PII in the URL.
 */

import { createHmac, timingSafeEqual } from 'crypto';

export type TokenPurpose = 'training' | 'vendor_questionnaire';

const SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'e-ari-dev-secret-change-in-production';
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface TokenPayload {
  /** memberId (training) or vendorId (vendor_questionnaire) */
  id: string;
  purpose: TokenPurpose;
  exp: number; // epoch ms
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sign(payload: string): string {
  return b64url(createHmac('sha256', SECRET).update(payload).digest());
}

export function signMemberToken(id: string, purpose: TokenPurpose, ttlMs: number = DEFAULT_TTL_MS): string {
  const payload: TokenPayload = { id, purpose, exp: Date.now() + ttlMs };
  const encoded = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  return `${encoded}.${sign(encoded)}`;
}

/** Returns the payload if valid + unexpired + purpose matches; null otherwise. */
export function verifyMemberToken(token: string, expectedPurpose: TokenPurpose): TokenPayload | null {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(encoded);
  // timing-safe compare (lengths must match first or timingSafeEqual throws)
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    ) as TokenPayload;
    if (payload.purpose !== expectedPurpose) return null;
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    if (!payload.id || typeof payload.id !== 'string') return null;
    return payload;
  } catch {
    return null;
  }
}
