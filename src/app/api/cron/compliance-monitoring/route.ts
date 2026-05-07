import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { monitoringPlansDueWithinDays } from "@/lib/compliance/monitoring";
import { sendComplianceAttestationDueEmail } from "@/lib/email-service";
import { requireCronAuth } from "@/lib/cron-auth";

async function handleCron(req: NextRequest) {
  // Fail-closed cron auth (was previously fail-open when CRON_SECRET unset).
  const auth = requireCronAuth(req.headers.get("authorization"));
  if (!auth.authorized) return auth.response!;

  const plans = await monitoringPlansDueWithinDays(30);
  let remindersSent = 0;

  for (const plan of plans) {
    const sys = plan.system;
    const user = sys.user;
    const due = plan.nextAttestationAt;
    if (!user?.email || !due) continue;

    const actionUrl = `/portal/use-cases/systems/${sys.id}`;
    const recent = await db.notification.findFirst({
      where: {
        userId: user.id,
        type: "attestation_due",
        actionUrl,
        createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
      },
    });
    if (recent) continue;

    await sendComplianceAttestationDueEmail(user.id, user.email, user.name, sys.name, due.toISOString()).catch(() => {});

    try {
      await db.notification.create({
        data: {
          userId: user.id,
          type: "attestation_due",
          title: "Compliance attestation coming due",
          message: `${sys.name}: next attestation ${due.toISOString().slice(0, 10)}.`,
          actionUrl,
        },
      });
    } catch {
      /* ignore duplicate burst */
    }

    remindersSent++;
  }

  return NextResponse.json({
    success: true,
    remindersSent,
    plansConsidered: plans.length,
    processedAt: new Date().toISOString(),
  });
}

/** Vercel Cron uses GET by default */
export async function GET(req: NextRequest) {
  try {
    return await handleCron(req);
  } catch (e) {
    console.error("compliance-monitoring cron:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** External schedulers may POST with the same bearer secret */
export async function POST(req: NextRequest) {
  try {
    return await handleCron(req);
  } catch (e) {
    console.error("compliance-monitoring cron:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
