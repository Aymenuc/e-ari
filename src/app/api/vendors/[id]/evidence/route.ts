import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveWorkspace, canWrite } from "@/lib/workspace";
import { db } from "@/lib/db";
import { sha256Hex, uploadEvidenceBlob, MAX_EVIDENCE_BYTES } from "@/lib/compliance/evidence-vault";
import { EVIDENCE_UPLOAD_TYPE_HINT, isEvidenceUploadAllowed } from "@/lib/compliance/evidence-upload-policy";
import { runEvidenceExtractionPipeline } from "@/lib/compliance/clause-pipeline";
import { checkRateLimit, getRateLimitHeaders, resolveIdentifier } from "@/lib/rate-limit";

/**
 * Vendor-scoped evidence (TPRM): upload a vendor's DPA / SOC 2 report /
 * subprocessor list against the Vendor record. Runs through the SAME
 * clause-extraction pipeline as system evidence, so clauses referencing
 * AI Act articles become reusable across obligations.
 */

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ws = await resolveWorkspace(session.user.id);
  const { id } = await ctx.params;
  const vendor = await db.vendor.findFirst({ where: { id, userId: ws.ownerId } });
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const evidence = await db.evidence.findMany({
    where: { vendorId: id, userId: ws.ownerId },
    orderBy: { createdAt: "desc" },
    select: { id: true, filename: true, mimeType: true, sizeBytes: true, artifactType: true, extractionStatus: true, createdAt: true },
  });
  return NextResponse.json({ evidence });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ws = await resolveWorkspace(session.user.id);
    if (!canWrite(ws.role)) return NextResponse.json({ error: "Your seat is view-only in this workspace." }, { status: 403 });
    const identifier = resolveIdentifier(session.user.id, req);
    const rate = checkRateLimit("compliance_upload", identifier);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Upload rate limit exceeded.", retryAfter: rate.retryAfter }, { status: 429, headers: getRateLimitHeaders("compliance_upload", rate) });
    }
    const { id } = await ctx.params;
    const vendor = await db.vendor.findFirst({ where: { id, userId: ws.ownerId } });
    if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Missing file field" }, { status: 400 });
    if (file.size > MAX_EVIDENCE_BYTES) {
      return NextResponse.json({ error: `File too large. Max ${Math.round(MAX_EVIDENCE_BYTES / (1024 * 1024))} MB.` }, { status: 413 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    let mimeType = file.type || "application/octet-stream";
    if (mimeType === "application/octet-stream") {
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".pdf")) mimeType = "application/pdf";
      else if (lower.endsWith(".docx")) mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      else if (lower.endsWith(".txt")) mimeType = "text/plain";
      else if (lower.endsWith(".md")) mimeType = "text/markdown";
    }
    if (!isEvidenceUploadAllowed(mimeType, file.name)) {
      return NextResponse.json({ error: EVIDENCE_UPLOAD_TYPE_HINT }, { status: 400 });
    }

    let storageKey: string;
    try {
      const up = await uploadEvidenceBlob({
        userId: ws.ownerId, systemId: null,
        filename: file.name, mimeType, buffer: buf,
      });
      storageKey = up.storageKey;
    } catch (err) {
      console.error("vendor evidence blob upload:", err);
      return NextResponse.json({ error: "Upload failed" }, { status: 400 });
    }

    const row = await db.evidence.create({
      data: {
        userId: ws.ownerId, systemId: null, vendorId: id,
        organizationLevel: false,
        filename: file.name, mimeType, storageKey,
        sizeBytes: buf.length, sha256: sha256Hex(buf),
      },
    });

    // Clause extraction in the background — same pipeline as system evidence.
    runEvidenceExtractionPipeline(row.id).catch((err) =>
      console.error("vendor evidence extraction failed:", err),
    );

    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error("vendor evidence POST:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
