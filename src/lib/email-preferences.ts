import crypto from "crypto";
import { db } from "./db";
import { getBaseUrl } from "./site-url";

const UNSUBSCRIBE_TYPES = [
  "quarterly_reminder",
  "pulse_ready",
  "system_classified",
  "fria_ready",
  "gap_critical",
  "attestation_due",
] as const;
type UnsubscribeType = (typeof UNSUBSCRIBE_TYPES)[number];

function keyFor(email: string, type: UnsubscribeType): string {
  return `email_optout:${type}:${email.toLowerCase().trim()}`;
}

function secret(): string {
  return process.env.NEXTAUTH_SECRET || "dev-email-preferences-secret";
}

function signPayload(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

export function createUnsubscribeToken(email: string, type: UnsubscribeType): string {
  const payload = `${email.toLowerCase().trim()}|${type}`;
  return signPayload(payload);
}

export function verifyUnsubscribeToken(email: string, type: string, token: string): boolean {
  if (!UNSUBSCRIBE_TYPES.includes(type as UnsubscribeType)) return false;
  const expected = createUnsubscribeToken(email, type as UnsubscribeType);
  const expectedBuf = Buffer.from(expected);
  const tokenBuf = Buffer.from(token);
  if (expectedBuf.length !== tokenBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, tokenBuf);
}

export function unsubscribeUrl(email: string, type: UnsubscribeType): string {
  const token = createUnsubscribeToken(email, type);
  return `${getBaseUrl()}/api/email-preferences/unsubscribe?email=${encodeURIComponent(email)}&type=${type}&token=${token}`;
}

export async function isOptedOut(email: string, type: UnsubscribeType): Promise<boolean> {
  try {
    const row = await db.platformSetting.findUnique({ where: { key: keyFor(email, type) } });
    if (!row) return false;
    return JSON.parse(row.value) === true;
  } catch {
    return false;
  }
}

export async function setOptOut(email: string, type: UnsubscribeType, optedOut: boolean): Promise<void> {
  await db.platformSetting.upsert({
    where: { key: keyFor(email, type) },
    create: {
      key: keyFor(email, type),
      value: JSON.stringify(optedOut),
    },
    update: {
      value: JSON.stringify(optedOut),
    },
  });
}

export function isSupportedUnsubscribeType(type: string): type is UnsubscribeType {
  return UNSUBSCRIBE_TYPES.includes(type as UnsubscribeType);
}
