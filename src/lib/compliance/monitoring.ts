import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export interface MonitoringTrigger {
  type: "model_retrained" | "use_case_change" | "regulation_update" | "incident_reported";
  occurredAt: string;
  description: string;
}

/** Append a structured trigger entry onto `MonitoringPlan.triggers` JSON (best-effort). */
export async function logTrigger(systemId: string, trigger: MonitoringTrigger): Promise<void> {
  const plan = await db.monitoringPlan.findUnique({ where: { systemId } });
  if (!plan) return;

  const base =
    plan.triggers && typeof plan.triggers === "object" && !Array.isArray(plan.triggers)
      ? { ...(plan.triggers as Record<string, unknown>) }
      : {};
  const prev = Array.isArray(base.log) ? [...(base.log as unknown[])] : [];
  prev.push(trigger);

  await db.monitoringPlan.update({
    where: { systemId },
    data: { triggers: { ...base, log: prev } as Prisma.InputJsonValue },
  });
}

export async function monitoringPlansDueWithinDays(days: number) {
  const horizon = new Date();
  horizon.setUTCDate(horizon.getUTCDate() + days);

  return db.monitoringPlan.findMany({
    where: {
      nextAttestationAt: { not: null, lte: horizon },
    },
    include: {
      system: {
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });
}

/** Systems whose next attestation falls within the horizon (via monitoring plan). */
export async function dueAttestations(withinDays = 30) {
  const rows = await monitoringPlansDueWithinDays(withinDays);
  return rows.map((r) => r.system);
}
