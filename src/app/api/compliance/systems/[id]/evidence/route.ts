import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sha256Hex, uploadEvidenceBlob } from "@/lib/compliance/evidence-vault";
import { findComplianceSystem } from "@/lib/compliance/access";
import { checkRateLimit, getRateLimitHeaders, resolveIdentifier } from "@/lib/rate-limit";
import { EVIDENCE_UPLOAD_TYPE_HINT, isEvidenceUploadAllowed } from "@/lib/compliance/evidence-upload-policy";

/** GET /api/compliance/systems/[id]/evidence */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: systemId } = await ctx.params;
    const sys = await findComplianceSystem(systemId, session.user.id, session.user.role);
    if (!sys) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const rows = await db.evidence.findMany({
      where: { systemId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        sha256: true,
        artifactType: true,
        extractionStatus: true,
        createdAt: true,
      },
    });
    return NextResponse.json(rows);
  } catch (e) {
    console.error("evidence list:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST /api/compliance/systems/[id]/evidence — multipart file */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const identifier = resolveIdentifier(session.user.id, req);
    const rateResult = checkRateLimit("compliance_upload", identifier);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: "Upload rate limit exceeded.", retryAfter: rateResult.retryAfter },
        { status: 429, headers: getRateLimitHeaders("compliance_upload", rateResult) },
      );
    }
    const { id: systemId } = await ctx.params;
    const sys = await findComplianceSystem(systemId, session.user.id, session.user.role);
    if (!sys) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file field" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const hash = sha256Hex(buf);

    let mimeType = file.type || "";
    if (!mimeType || mimeType === "application/octet-stream") {
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".pdf")) mimeType = "application/pdf";
      else if (lower.endsWith(".docx")) {
        mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      } else if (lower.endsWith(".txt")) mimeType = "text/plain";
      else if (lower.endsWith(".md")) mimeType = "text/markdown";
      else mimeType = "application/octet-stream";
    }

    if (!isEvidenceUploadAllowed(mimeType, file.name)) {
      return NextResponse.json({ error: EVIDENCE_UPLOAD_TYPE_HINT }, { status: 400 });
    }

    let storageKey: string;
    try {
      const up = await uploadEvidenceBlob({
        userId: session.user.id,
        systemId,
        filename: file.name,
        mimeType,
        buffer: buf,
      });
      storageKey = up.storageKey;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      console.error("blob upload:", err);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const row = await db.evidence.create({
      data: {
        systemId,
        userId: session.user.id,
        organizationLevel: false,
        filename: file.name,
        mimeType,
        storageKey,
        sizeBytes: buf.length,
        sha256: hash,
      },
    });

    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error("evidence POST:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
