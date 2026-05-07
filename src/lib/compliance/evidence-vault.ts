/**
 * Evidence vault — Vercel Blob adapter (swap implementation here for S3 later).
 */

import { createHash, randomUUID } from "crypto";
import { put } from "@vercel/blob";

/** Max accepted evidence file size — enforced at the route layer BEFORE
 *  the buffer is allocated, and again here as a defence-in-depth check. */
export const MAX_EVIDENCE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_BYTES = MAX_EVIDENCE_BYTES;

const ALLOWED_PREFIXES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument",
  "text/plain",
  "image/png",
  "image/jpeg",
];

export function sha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "upload";
}

export function assertEvidenceMime(mimeType: string): void {
  const ok = ALLOWED_PREFIXES.some((p) => mimeType.startsWith(p));
  if (!ok) {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

export async function uploadEvidenceBlob(params: {
  userId: string;
  /** Omit or null for organization-level vault uploads */
  systemId?: string | null;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<{ storageKey: string; url: string }> {
  if (params.buffer.length > MAX_BYTES) {
    throw new Error(`File too large (max ${MAX_BYTES} bytes)`);
  }
  assertEvidenceMime(params.mimeType);

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token?.trim()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  }

  const safe = sanitizeFilename(params.filename);
  const scope =
    params.systemId?.trim() ? params.systemId.trim() : `org`;
  const path = `compliance/${params.userId}/${scope}/${randomUUID()}-${safe}`;

  const blob = await put(path, params.buffer, {
    access: "private",
    token,
    contentType: params.mimeType,
  });

  return { storageKey: blob.pathname, url: blob.url };
}
