import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/verify-admin";
import { db } from "@/lib/db";

/**
 * GET /api/admin/agent-health — REAL agent telemetry derived from the
 * PipelineStage table over the last 24 hours. Replaces the fabricated
 * static metrics that used to live in the admin page.
 *
 * Every pipeline run writes one PipelineStage row per agent with status,
 * durationMs, and error — so success rate, latency, run count, and last
 * failure are all genuinely measured, not invented.
 */

const AGENTS = ["scoring", "insight", "discovery", "report", "assistant", "literacy"] as const;

export async function GET() {
  const adminCheck = await verifyAdmin();
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: adminCheck.message }, { status: adminCheck.status });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const stages = await db.pipelineStage.findMany({
      where: { createdAt: { gte: since }, agent: { in: AGENTS as unknown as string[] } },
      select: { agent: true, status: true, durationMs: true, completedAt: true },
    });

    const byAgent: Record<string, {
      total: number; completed: number; failed: number; running: number;
      durations: number[]; lastFailureAt: Date | null;
    }> = {};
    for (const a of AGENTS) byAgent[a] = { total: 0, completed: 0, failed: 0, running: 0, durations: [], lastFailureAt: null };

    for (const s of stages) {
      const b = byAgent[s.agent];
      if (!b) continue;
      // Skipped stages (tier-gated) don't count toward health either way.
      if (s.status === "skipped") continue;
      b.total++;
      if (s.status === "completed") { b.completed++; if (typeof s.durationMs === "number") b.durations.push(s.durationMs); }
      else if (s.status === "failed") { b.failed++; if (s.completedAt && (!b.lastFailureAt || s.completedAt > b.lastFailureAt)) b.lastFailureAt = s.completedAt; }
      else if (s.status === "running" || s.status === "pending") b.running++;
    }

    const now = Date.now();
    const agents = AGENTS.map((id) => {
      const b = byAgent[id]!;
      const scored = b.completed + b.failed;
      const successRate = scored > 0 ? (b.completed / scored) * 100 : null;
      const sorted = [...b.durations].sort((a, c) => a - c);
      const avg = sorted.length ? Math.round(sorted.reduce((s, x) => s + x, 0) / sorted.length) : null;
      const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]! : null;
      // Status derived from measured data, not a literal.
      const status =
        scored === 0 ? "idle"
        : successRate! >= 99 ? "operational"
        : successRate! >= 90 ? "degraded"
        : "unhealthy";
      return {
        id,
        runs24h: b.total,
        completed: b.completed,
        failed: b.failed,
        running: b.running,
        successRate: successRate === null ? null : Math.round(successRate * 10) / 10,
        avgLatencyMs: avg,
        p95LatencyMs: p95,
        lastFailureMinsAgo: b.lastFailureAt ? Math.round((now - b.lastFailureAt.getTime()) / 60000) : null,
        status,
      };
    });

    return NextResponse.json({ windowHours: 24, generatedAt: new Date().toISOString(), agents });
  } catch (e) {
    console.error("agent-health:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
