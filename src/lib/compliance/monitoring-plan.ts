import { db } from "@/lib/db";

export async function ensureMonitoringPlan(systemId: string): Promise<void> {
  await db.monitoringPlan.upsert({
    where: { systemId },
    create: {
      systemId,
      conformityRoute: "internal_control",
      triggers: {
        reassessOn: ["material_model_change", "new_high_risk_use_case", "incident_severity_2plus"],
      },
      incidents: [],
    },
    update: {},
  });
}
