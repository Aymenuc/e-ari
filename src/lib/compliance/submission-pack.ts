import { createHash } from "crypto";
import archiver from "archiver";
import { PassThrough } from "node:stream";
import { finished } from "node:stream/promises";
import { db } from "@/lib/db";
import { AI_ACT_OBLIGATIONS } from "@/lib/compliance/ai-act-obligations";
import { buildFriaDocxBuffer, buildTechnicalFileSummaryDocxBuffer } from "@/lib/compliance/compliance-docx";
import { buildFriaPdfBuffer, buildTechnicalFilePdfBuffer } from "@/lib/compliance/compliance-pdf";

export class SubmissionPackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubmissionPackError";
  }
}

export function assertSubmissionPackPreflight(sys: {
  fria: { status: string } | null;
  technicalFile: { status: string } | null;
}): void {
  if (!sys.fria || sys.fria.status !== "finalized") {
    throw new SubmissionPackError("Finalize the FRIA before downloading the regulator submission pack.");
  }
  if (!sys.technicalFile || sys.technicalFile.status !== "finalized") {
    throw new SubmissionPackError(
      "Finalize the Annex IV technical file before downloading the regulator submission pack.",
    );
  }
}

function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function csvEscape(cell: string): string {
  const s = cell.replace(/\r?\n/g, " ").trim();
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Canonical JSON for reproducible hashing (sorted keys; arrays recursively normalized where objects). */
function stableClone(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stableClone);
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o).sort()) {
      out[k] = stableClone(o[k]);
    }
    return out;
  }
  return value;
}

export async function buildSubmissionPack(systemId: string, ownerUserId: string): Promise<object> {
  const system = await db.aISystem.findFirst({
    where: { id: systemId, userId: ownerUserId },
    include: {
      evidence: {
        select: {
          id: true,
          filename: true,
          mimeType: true,
          sha256: true,
          artifactType: true,
          extractionStatus: true,
          createdAt: true,
        },
      },
      obligationGaps: true,
      fria: true,
      technicalFile: true,
      monitoring: true,
    },
  });

  if (!system) throw new SubmissionPackError("System not found");

  const clauses = await db.evidenceClause.findMany({
    where: { evidence: { systemId } },
    select: {
      id: true,
      clauseType: true,
      textExcerpt: true,
      aiActArticles: true,
      pillarIds: true,
      frameworks: true,
      confidence: true,
      evidenceId: true,
      pageNumber: true,
      createdAt: true,
    },
    orderBy: [{ evidenceId: "asc" }, { id: "asc" }],
    take: 500,
  });

  const evidenceSorted = [...system.evidence].sort((a, b) => a.id.localeCompare(b.id));
  const gapsSorted = [...system.obligationGaps].sort((a, b) => a.obligationCode.localeCompare(b.obligationCode));

  const {
    evidence,
    obligationGaps,
    fria,
    technicalFile,
    monitoring,
    ...sysCore
  } = system;

  const payload = {
    generatedAt: new Date().toISOString(),
    schemaVersion: "compliance-pack-v2",
    system: sysCore,
    evidence: evidenceSorted,
    evidenceClauses: clauses,
    obligationGaps: gapsSorted,
    fria,
    technicalFile,
    monitoringPlan: monitoring,
  };

  return stableClone(payload) as object;
}

export interface SubmissionManifestDoc {
  name: string;
  sha256: string;
  sizeBytes: number;
}

export interface SubmissionManifest {
  systemId: string;
  generatedAt: string;
  documents: SubmissionManifestDoc[];
}

async function zipBuffers(files: Map<string, Buffer>): Promise<Buffer> {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const passthrough = new PassThrough();
  const chunks: Buffer[] = [];
  passthrough.on("data", (c: Buffer) => chunks.push(Buffer.from(c)));
  archive.on("error", (err: Error) => {
    passthrough.destroy(err);
  });

  archive.pipe(passthrough);

  const names = [...files.keys()].sort();
  for (const name of names) {
    const buf = files.get(name)!;
    archive.append(buf, { name });
  }

  await archive.finalize();
  await finished(passthrough);
  return Buffer.concat(chunks);
}

/**
 * Regulator-oriented ZIP: JSON snapshot, CSV inventories, DOCX/PDF exports, manifest with hashes.
 * Caller must enforce finalize preflight.
 */
export async function buildSubmissionPackZip(
  systemId: string,
  ownerUserId: string,
): Promise<{ zipBuffer: Buffer; manifest: SubmissionManifest }> {
  const system = await db.aISystem.findFirst({
    where: { id: systemId, userId: ownerUserId },
    include: {
      evidence: {
        select: {
          id: true,
          filename: true,
          mimeType: true,
          sha256: true,
          artifactType: true,
          createdAt: true,
        },
      },
      fria: true,
      technicalFile: true,
    },
  });

  if (!system) throw new SubmissionPackError("System not found");

  assertSubmissionPackPreflight(system);

  const packObj = await buildSubmissionPack(systemId, ownerUserId);
  const packJson = Buffer.from(JSON.stringify(stableClone(packObj), null, 2), "utf8");

  const clauses = await db.evidenceClause.findMany({
    where: { evidence: { systemId } },
    select: { aiActArticles: true },
    take: 5000,
  });
  const counts = new Map<string, number>();
  for (const c of clauses) {
    for (const code of c.aiActArticles) {
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
  }

  const covLines = [["obligation_code", "label", "severity", "citation_count"].join(",")];
  for (const o of [...AI_ACT_OBLIGATIONS].sort((a, b) => a.code.localeCompare(b.code))) {
    covLines.push(
      [
        csvEscape(o.code),
        csvEscape(o.label),
        csvEscape(o.severity),
        String(counts.get(o.code) ?? 0),
      ].join(","),
    );
  }
  const coverageCsv = Buffer.from(covLines.join("\n"), "utf8");

  const evSorted = [...system.evidence].sort((a, b) => a.id.localeCompare(b.id));
  const evLines = [["filename", "sha256", "artifact_type", "mime_type", "uploaded_at"].join(",")];
  for (const e of evSorted) {
    evLines.push(
      [
        csvEscape(e.filename),
        csvEscape(e.sha256),
        csvEscape(e.artifactType ?? ""),
        csvEscape(e.mimeType),
        csvEscape(e.createdAt.toISOString()),
      ].join(","),
    );
  }
  const evidenceCsv = Buffer.from(evLines.join("\n"), "utf8");

  const friaJson = Buffer.from(JSON.stringify(stableClone(system.fria), null, 2), "utf8");
  const techJson = Buffer.from(JSON.stringify(stableClone(system.technicalFile), null, 2), "utf8");

  const friaDocx = await buildFriaDocxBuffer({
    systemName: system.name,
    fria: {
      affectedGroups: system.fria!.affectedGroups,
      rightsAtRisk: system.fria!.rightsAtRisk,
      mitigations: system.fria!.mitigations,
      residualRisk: system.fria!.residualRisk,
      oversightDesign: system.fria!.oversightDesign,
      status: system.fria!.status,
    },
  });

  const tf = system.technicalFile!;
  const technicalDocx = await buildTechnicalFileSummaryDocxBuffer({
    systemName: system.name,
    technical: {
      status: tf.status,
      systemDescription: tf.systemDescription,
      designSpecs: tf.designSpecs,
      dataGovernance: tf.dataGovernance,
      monitoringPlan: tf.monitoringPlan,
      riskManagement: tf.riskManagement,
      performanceMetrics: tf.performanceMetrics,
      instructionsForUse: tf.instructionsForUse,
      euDeclaration: tf.euDeclaration,
    },
  });

  const friaPdf = await buildFriaPdfBuffer({
    systemName: system.name,
    friaJson: {
      affectedGroups: system.fria!.affectedGroups,
      rightsAtRisk: system.fria!.rightsAtRisk,
      mitigations: system.fria!.mitigations,
      residualRisk: system.fria!.residualRisk,
      oversightDesign: system.fria!.oversightDesign,
      status: system.fria!.status,
    },
    status: system.fria!.status,
  });

  const technicalPdf = await buildTechnicalFilePdfBuffer({
    systemName: system.name,
    tfJson: {
      status: tf.status,
      systemDescription: tf.systemDescription,
      designSpecs: tf.designSpecs,
      dataGovernance: tf.dataGovernance,
      monitoringPlan: tf.monitoringPlan,
      riskManagement: tf.riskManagement,
      performanceMetrics: tf.performanceMetrics,
      instructionsForUse: tf.instructionsForUse,
      euDeclaration: tf.euDeclaration,
    },
    status: tf.status,
  });

  const files = new Map<string, Buffer>();
  files.set("coverage-matrix.csv", coverageCsv);
  files.set("evidence-inventory.csv", evidenceCsv);
  files.set("fria.docx", friaDocx);
  files.set("fria.json", friaJson);
  files.set("fria.pdf", friaPdf);
  files.set("submission-pack.json", packJson);
  files.set("technical-file.json", techJson);
  files.set("technical-file-summary.docx", technicalDocx);
  files.set("technical-file-summary.pdf", technicalPdf);

  const generatedAt = new Date().toISOString();
  const documents: SubmissionManifestDoc[] = [...files.keys()]
    .sort()
    .map((name) => {
      const buf = files.get(name)!;
      return { name, sha256: sha256Hex(buf), sizeBytes: buf.length };
    });

  const manifest: SubmissionManifest = {
    systemId,
    generatedAt,
    documents,
  };

  files.set("manifest.json", Buffer.from(JSON.stringify(stableClone(manifest), null, 2), "utf8"));

  const zipBuffer = await zipBuffers(files);
  return { zipBuffer, manifest };
}
