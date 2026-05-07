import { NextRequest, NextResponse } from "next/server";
import { processQuarterlyReminders, processScoreChangeAlerts } from "@/lib/email-service";
import { db } from "@/lib/db";
import { runPulse, savePulseRun } from "@/lib/pulse-engine";
import { sendMonthlyPulseEmail } from "@/lib/email-service";

/**
 * POST /api/cron/notifications
 *
 * Scheduled endpoint for processing email notifications and monthly pulse runs.
 * Called by external cron service (Vercel Cron, EasyCron, etc.)
 *
 * Protected by CRON_SECRET environment variable.
 *
 * Actions:
 * 1. Process quarterly re-assessment reminders
 * 2. Process significant score change alerts
 * 3. Run monthly pulse analysis for users with completed assessments
 * 4. Send monthly pulse email notifications
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [remindersSent, alertsSent] = await Promise.all([
      processQuarterlyReminders(),
      processScoreChangeAlerts(),
    ]);

    // Run monthly pulse for active users
    let pulsesProcessed = 0;
    let pulseEmailsSent = 0;
    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Find users who have completed assessments but no pulse this month
      const activeUsers = await db.user.findMany({
        where: {
          // Growth was missing — paid users on Growth weren't getting cron notifications.
          tier: { in: ['professional', 'growth', 'enterprise'] },
          assessments: {
            some: { status: 'completed' },
          },
        },
        select: { id: true, email: true, name: true },
      });

      for (const user of activeUsers) {
        try {
          // Check if pulse already exists for this month
          const existingPulse = await db.pulseRun.findFirst({
            where: { userId: user.id, month: currentMonth },
          });

          if (existingPulse) continue;

          // Run pulse analysis
          const pulseResult = await runPulse(user.id);
          const pulseRunId = await savePulseRun(user.id, pulseResult);
          pulsesProcessed++;

          // Send monthly pulse email
          try {
            await sendMonthlyPulseEmail(
              user.id,
              user.email,
              user.name,
              pulseResult.overallScore,
              pulseResult.previousOverallScore,
              pulseResult.topRisks,
              pulseResult.topQuickWins,
              pulseResult.month
            );
            pulseEmailsSent++;
          } catch (emailErr) {
            console.error(`Failed to send pulse email to ${user.email}:`, emailErr);
          }
        } catch (pulseErr) {
          console.error(`Failed to run pulse for user ${user.id}:`, pulseErr);
        }
      }
    } catch (pulseBatchErr) {
      console.error("Pulse batch processing error:", pulseBatchErr);
    }

    return NextResponse.json({
      success: true,
      remindersSent,
      alertsSent,
      pulsesProcessed,
      pulseEmailsSent,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
