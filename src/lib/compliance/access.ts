import { db } from "@/lib/db";

export function isComplianceAdmin(role: string | undefined): boolean {
  return role === "admin";
}

/** Owner or admin may access the AI system row. */
export async function findComplianceSystem(
  systemId: string,
  sessionUserId: string,
  sessionRole: string | undefined,
) {
  const admin = isComplianceAdmin(sessionRole);
  return db.aISystem.findFirst({
    where: admin ? { id: systemId } : { id: systemId, userId: sessionUserId },
  });
}

/** Same as findComplianceSystem with evidence/gap counts for overview API. */
export async function findComplianceSystemDetail(
  systemId: string,
  sessionUserId: string,
  sessionRole: string | undefined,
) {
  const admin = isComplianceAdmin(sessionRole);
  return db.aISystem.findFirst({
    where: admin ? { id: systemId } : { id: systemId, userId: sessionUserId },
    include: {
      _count: { select: { evidence: true, obligationGaps: true } },
    },
  });
}

export async function findEvidenceForSession(
  systemId: string,
  evidenceId: string,
  sessionUserId: string,
  sessionRole: string | undefined,
) {
  const sys = await findComplianceSystem(systemId, sessionUserId, sessionRole);
  if (!sys) return null;
  return db.evidence.findFirst({ where: { id: evidenceId, systemId } });
}
