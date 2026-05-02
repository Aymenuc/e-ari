import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";

/** Opt-in so placeholder URLs in `.env.test` do not fail `npm test`. Set `RUN_INTEGRATION_TESTS=1` in `.env.test`. */
const runIntegration =
  process.env.RUN_INTEGRATION_TESTS === "1" && Boolean(process.env.DATABASE_URL?.trim());

describe.skipIf(!runIntegration)("Supabase / Postgres via Prisma (integration)", () => {
  afterAll(async () => {
    await db.$disconnect();
  });

  it("connects ($queryRaw SELECT 1)", async () => {
    const rows = await db.$queryRaw<Array<{ ok: number }>>`SELECT 1::int AS ok`;
    expect(rows[0]?.ok).toBe(1);
  });

  it("ComplianceLog table is reachable", async () => {
    const count = await db.complianceLog.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
