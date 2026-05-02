import { db } from "@/lib/db";
import { downloadEvidenceBuffer } from "@/lib/compliance/evidence-download";
import { extractTextFromUpload } from "@/lib/compliance/extract-text";
import { classifyEvidenceArtifact } from "@/lib/compliance/evidence-classifier";
import { extractClauses } from "@/lib/compliance/clause-extractor";
import { mapClauseToObligations } from "@/lib/compliance/evidence-mapper";

export async function runEvidenceExtractionPipeline(evidenceId: string): Promise<{ clausesCreated: number; textLen: number }> {
  const row = await db.evidence.findUnique({ where: { id: evidenceId } });
  if (!row) throw new Error("Evidence not found");

  await db.evidence.update({
    where: { id: evidenceId },
    data: { extractionStatus: "processing", extractionError: null },
  });

  try {
    const buf = await downloadEvidenceBuffer(row.storageKey);
    let text = row.extractedText || "";
    if (!text?.trim()) {
      const extracted = await extractTextFromUpload(buf, row.mimeType, row.filename);
      text = extracted || "";
    }

    if (!text.trim()) {
      await db.evidence.update({
        where: { id: evidenceId },
        data: {
          extractionStatus: "failed",
          extractionError: "No extractable text (try PDF or TXT)",
          extractedText: null,
        },
      });
      return { clausesCreated: 0, textLen: 0 };
    }

    await db.evidence.update({
      where: { id: evidenceId },
      data: { extractedText: text },
    });

    let artifactType = row.artifactType;
    if (!artifactType) {
      artifactType = await classifyEvidenceArtifact(row.filename, text.slice(0, 8000));
      await db.evidence.update({
        where: { id: evidenceId },
        data: { artifactType, classifiedAt: new Date() },
      });
    }

    const extracted = await extractClauses(artifactType || "other", text);

    await db.evidenceClause.deleteMany({ where: { evidenceId } });

    let created = 0;
    for (const ex of extracted) {
      const mapping = mapClauseToObligations(ex);
      await db.evidenceClause.create({
        data: {
          evidenceId,
          clauseType: ex.clauseType,
          textExcerpt: ex.textExcerpt,
          pageNumber: ex.pageNumber,
          confidence: ex.confidence,
          aiActArticles: mapping.aiActArticles,
          pillarIds: mapping.pillarIds,
          frameworks: mapping.frameworks,
        },
      });
      created++;
    }

    await db.evidence.update({
      where: { id: evidenceId },
      data: { extractionStatus: "extracted", extractionError: null },
    });

    return { clausesCreated: created, textLen: text.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    await db.evidence.update({
      where: { id: evidenceId },
      data: { extractionStatus: "failed", extractionError: msg.slice(0, 500) },
    });
    throw e;
  }
}
