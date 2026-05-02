import { db } from "@/lib/db";

export interface Citation {
  evidenceId: string;
  evidenceFilename: string;
  pageNumber: number | null;
  textExcerpt: string;
  /** Relative API path — append origin on client if needed */
  downloadUrl: string;
}

function downloadPath(systemId: string, evidenceId: string): string {
  return `/api/compliance/systems/${systemId}/evidence/${evidenceId}/download`;
}

export async function getCitationsForObligation(systemId: string, obligationCode: string): Promise<Citation[]> {
  const clauses = await db.evidenceClause.findMany({
    where: {
      evidence: { systemId },
      aiActArticles: { has: obligationCode },
    },
    include: {
      evidence: { select: { id: true, filename: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return clauses.map((c) => ({
    evidenceId: c.evidence.id,
    evidenceFilename: c.evidence.filename,
    pageNumber: c.pageNumber,
    textExcerpt: c.textExcerpt.slice(0, 600),
    downloadUrl: downloadPath(systemId, c.evidence.id),
  }));
}

export async function getCitationsForPillar(systemId: string, pillarId: string): Promise<Citation[]> {
  const clauses = await db.evidenceClause.findMany({
    where: {
      evidence: { systemId },
      pillarIds: { has: pillarId },
    },
    include: {
      evidence: { select: { id: true, filename: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return clauses.map((c) => ({
    evidenceId: c.evidence.id,
    evidenceFilename: c.evidence.filename,
    pageNumber: c.pageNumber,
    textExcerpt: c.textExcerpt.slice(0, 600),
    downloadUrl: downloadPath(systemId, c.evidence.id),
  }));
}
