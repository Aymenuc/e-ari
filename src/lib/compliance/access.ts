import { db } from "@/lib/db";
import { resolveWorkspace } from "@/lib/workspace";

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
  if (admin) return db.aISystem.findFirst({ where: { id: systemId } });
  // Team seats: a session acting inside a shared workspace accesses the
  // OWNER's systems. resolveWorkspace returns the caller's own id when no
  // active membership exists, so solo accounts behave exactly as before.
  const ws = await resolveWorkspace(sessionUserId);
  return db.aISystem.findFirst({ where: { id: systemId, userId: ws.ownerId } });
}

/** Same as findComplianceSystem with evidence/gap counts for overview API. */
export async function findComplianceSystemDetail(
  systemId: string,
  sessionUserId: string,
  sessionRole: string | undefined,
) {
  const admin = isComplianceAdmin(sessionRole);
  if (admin) {
    return db.aISystem.findFirst({
      where: { id: systemId },
      include: { _count: { select: { evidence: true, obligationGaps: true } } },
    });
  }
  const ws = await resolveWorkspace(sessionUserId);
  return db.aISystem.findFirst({
    where: { id: systemId, userId: ws.ownerId },
    include: { _count: { select: { evidence: true, obligationGaps: true } } },
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
