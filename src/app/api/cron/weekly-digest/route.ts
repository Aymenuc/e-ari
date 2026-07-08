import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCronAuth } from "@/lib/cron-auth";
import { applicableObligationsForTier, clauseSupportsObligation } from "@/lib/progression";
import { signMemberToken } from "@/lib/member-tokens";
import { getTrainingModule } from "@/lib/training-modules";
import { sendCustomEmail } from "@/lib/email-service";
import { getBaseUrl } from "@/lib/site-url";
import { isPaidTier } from "@/lib/tier";

export const maxDuration = 300;

/**
 * POST /api/cron/weekly-digest — Mondays 07:00 UTC (vercel.json).
 *
 * Two jobs in one weekly pass:
 * 1. CONTROLS DIGEST — for each paid user with registered AI systems,
 *    derive control states (same derivation as /api/controls) and email a
 *    summary when something needs action (failing controls, missing
 *    evidence, attestations due ≤30 days). Silence when all green — a
 *    digest that always arrives trains people to ignore it.
 * 2. TRAINING REMINDERS — members with assignments sent ≥7 days ago and
 *    still incomplete get their magic link re-sent (fresh token). At most
 *    one reminder email per member per run.
 */
export async function POST(req: NextRequest) {
  const auth = requireCronAuth(req.headers.get("authorization"));
  if (!auth.authorized) return auth.response!;

  const base = getBaseUrl().replace(/\/+$/, "");
  let digestsSent = 0;
  let remindersSent = 0;

  // ── Job 1: controls digest ────────────────────────────────────────────
  try {
    const owners = await db.aISystem.groupBy({ by: ["userId"], _count: { id: true } });
    for (const owner of owners) {
      const user = await db.user.findUnique({
        where: { id: owner.userId },
        select: { id: true, email: true, name: true, tier: true },
      });
      if (!user?.email || !isPaidTier(user.tier)) continue;

      const [systems, gaps, plans] = await Promise.all([
        db.aISystem.findMany({ where: { userId: user.id }, select: { id: true, name: true, riskTier: true, classifiedAt: true } }),
        db.obligationGap.findMany({
          where: { system: { userId: user.id }, status: "open", severity: { in: ["critical", "high"] } },
          select: { obligationCode: true },
        }),
        db.monitoringPlan.findMany({ where: { system: { userId: user.id } }, select: { systemId: true, nextAttestationAt: true } }),
      ]);
      const systemIds = systems.map((s) => s.id);
      const clauses = systemIds.length === 0 ? [] : await db.evidenceClause.findMany({
        where: { evidence: { OR: [{ systemId: { in: systemIds } }, { userId: user.id, organizationLevel: true, systemId: null }] } },
        select: { aiActArticles: true },
        take: 2000,
      });

      const failingCodes = new Set(gaps.map((g) => g.obligationCode));
      let pending = 0;
      let passing = 0;
      const seen = new Set<string>();
      for (const sys of systems) {
        for (const ob of applicableObligationsForTier(sys.classifiedAt ? sys.riskTier : null)) {
          if (seen.has(ob.code)) continue;
          seen.add(ob.code);
          if (failingCodes.has(ob.code)) continue;
          if (clauses.some((c) => clauseSupportsObligation(c.aiActArticles ?? [], ob))) passing++;
          else pending++;
        }
      }
      const soon = Date.now() + 30 * 24 * 60 * 60 * 1000;
      const expiring = plans.filter((p) => p.nextAttestationAt && p.nextAttestationAt.getTime() <= soon).length;

      // Only email when something needs action.
      if (failingCodes.size === 0 && expiring === 0 && pending === 0) continue;

      const lines = [
        `Weekly compliance controls summary for your AI systems (${systems.length} registered):`,
        ``,
        `• Passing (evidenced): ${passing}`,
        `• Needs evidence: ${pending}`,
        `• Failing (open critical/high gaps): ${failingCodes.size}`,
        expiring > 0 ? `• Attestations due within 30 days: ${expiring}` : ``,
        ``,
        failingCodes.size > 0
          ? `Failing controls need attention first — each one is an open critical or high-severity gap a regulator or auditor would flag.`
          : `No failing controls this week. Upload evidence against the pending obligations to move them to passing.`,
        ``,
        `Controls dashboard: ${base}/portal/controls`,
      ].filter((l) => l !== "").join("\n");

      const res = await sendCustomEmail(
        user.email, user.name,
        failingCodes.size > 0
          ? `⚠ ${failingCodes.size} failing control${failingCodes.size === 1 ? "" : "s"} — weekly compliance digest`
          : `Weekly compliance digest — ${pending} obligation${pending === 1 ? "" : "s"} awaiting evidence`,
        lines,
      );
      if (res.sent) digestsSent++;
    }
  } catch (e) {
    console.error("[weekly-digest] controls digest failed:", e);
  }

  // ── Job 2: training reminders ─────────────────────────────────────────
  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const stale = await db.trainingAssignment.findMany({
      where: { sentAt: { lte: cutoff } },
      take: 500,
    });
    // Group by member, drop assignments already completed.
    const byMember = new Map<string, string[]>();
    for (const a of stale) {
      const doneAlready = await db.trainingCompletion.findUnique({
        where: { memberId_moduleId: { memberId: a.memberId, moduleId: a.moduleId } },
      });
      if (doneAlready) continue;
      byMember.set(a.memberId, [...(byMember.get(a.memberId) ?? []), a.moduleId]);
    }
    for (const [memberId, moduleIds] of byMember) {
      const member = await db.teamMember.findUnique({ where: { id: memberId } });
      if (!member) continue;
      const owner = await db.user.findUnique({ where: { id: member.userId }, select: { organization: true, name: true } });
      const orgName = owner?.organization || owner?.name || "your organisation";
      const titles = moduleIds.map((m) => getTrainingModule(m)?.title ?? m).join(", ");
      const link = `${base}/train/${signMemberToken(member.id, "training")}`;
      const res = await sendCustomEmail(
        member.email, member.name,
        `Reminder: AI literacy training pending for ${orgName}`,
        `You still have AI literacy training to complete for ${orgName} (required under Article 4 of the EU AI Act):\n\n${titles}\n\nComplete it here (no account needed):\n${link}\n\nThis personal link expires in 30 days.`,
      );
      if (res.sent) {
        remindersSent++;
        await db.trainingAssignment.updateMany({
          where: { memberId, moduleId: { in: moduleIds } },
          data: { sentAt: new Date() },
        });
      }
    }
  } catch (e) {
    console.error("[weekly-digest] training reminders failed:", e);
  }

  return NextResponse.json({ digestsSent, remindersSent });
}

// Vercel cron uses GET
export async function GET(req: NextRequest) {
  return POST(req);
}
