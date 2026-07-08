import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseCsvObjects } from "@/lib/csv-parse";
import { matchCatalog, getCatalogEntry } from "@/lib/ai-tool-catalog";
import { getDiscoveryScanLimit, countMonthlyDiscoveryScans, recordDiscoveryScan } from "@/lib/tier-limits";

/**
 * Shadow AI Discovery.
 * GET  → discovered tools (with catalog enrichment)
 * POST → { source: 'gworkspace'|'okta'|'entra'|'expense', csvText } — parse,
 *        match against the AI tool catalog, upsert DiscoveredTool rows.
 */

const SOURCE_ALIASES: Record<string, Record<string, string[]>> = {
  gworkspace: {
    name: ["app name", "application", "app", "client name", "oauth client", "product name", "name"],
    users: ["users", "user count", "number of users", "unique users"],
  },
  okta: {
    name: ["application", "app name", "app label", "application label", "name"],
    users: ["users", "assigned users", "user count"],
  },
  entra: {
    name: ["application name", "app display name", "application", "resource display name", "name"],
    users: ["users", "user count", "sign-in count"],
  },
  expense: {
    name: ["merchant", "merchant name", "vendor", "payee", "description", "supplier"],
    users: ["users", "quantity", "seats"],
  },
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tools = await db.discoveredTool.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" } });
  const enriched = tools.map((t) => ({ ...t, catalog: t.catalogId ? getCatalogEntry(t.catalogId) ?? null : null }));
  const stats = {
    total: tools.length,
    undeclared: tools.filter((t) => t.status === "undeclared").length,
    registered: tools.filter((t) => t.status === "registered").length,
    trainsOnData: enriched.filter((t) => t.catalog && ["yes", "default_on"].includes(t.catalog.trainsOnData) && t.status !== "ignored").length,
  };
  return NextResponse.json({ tools: enriched, stats });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { tier: true } });

    const limit = getDiscoveryScanLimit(user?.tier);
    if (limit === 0) {
      return NextResponse.json({ error: "Shadow AI Discovery requires the Growth tier (1 scan/month) or Autopilot (unlimited).", upgradeRequired: true }, { status: 402 });
    }
    if (Number.isFinite(limit)) {
      const used = await countMonthlyDiscoveryScans(session.user.id);
      if (used >= limit) {
        return NextResponse.json({ error: `Your tier includes ${limit} discovery scan${limit === 1 ? "" : "s"} per month. Upgrade to Autopilot for unlimited scans.`, upgradeRequired: true }, { status: 402 });
      }
    }

    const body = (await req.json()) as { source?: string; csvText?: string };
    const source = String(body.source || "");
    if (!SOURCE_ALIASES[source]) return NextResponse.json({ error: "source must be gworkspace | okta | entra | expense" }, { status: 400 });
    if (!body.csvText || typeof body.csvText !== "string") return NextResponse.json({ error: "csvText required" }, { status: 400 });

    const rows = parseCsvObjects(body.csvText.slice(0, 5_000_000), SOURCE_ALIASES[source]!, ["name"]);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Could not find an app/merchant name column in this CSV. Check the export format." }, { status: 400 });
    }

    // Aggregate duplicate names, match against catalog
    const agg = new Map<string, { users: number }>();
    for (const r of rows.slice(0, 20000)) {
      const key = r.name!.trim();
      if (!key) continue;
      const prev = agg.get(key) ?? { users: 0 };
      prev.users += Math.max(1, parseInt(r.users ?? "1", 10) || 1);
      agg.set(key, prev);
    }

    let matched = 0;
    let unmatchedAi = 0;
    const now = new Date();
    for (const [rawName, info] of agg) {
      const entry = matchCatalog(rawName);
      if (!entry) {
        // Only keep unmatched rows that LOOK ai-related (avoid importing the
        // entire app estate as noise).
        if (!/\b(ai|gpt|copilot|ml|llm)\b/i.test(rawName)) continue;
        unmatchedAi++;
      } else {
        matched++;
      }
      await db.discoveredTool.upsert({
        where: { userId_rawName_source: { userId: session.user.id, rawName: rawName.slice(0, 200), source } },
        create: {
          userId: session.user.id, rawName: rawName.slice(0, 200), source,
          catalogId: entry?.id ?? null, userCount: info.users, lastSeenAt: now,
        },
        update: { catalogId: entry?.id ?? null, userCount: info.users, lastSeenAt: now },
      });
    }

    void recordDiscoveryScan(session.user.id, source);
    return NextResponse.json({ scanned: agg.size, matched, unmatchedAi }, { status: 201 });
  } catch (e) {
    console.error("discovery POST:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PATCH /api/discovery — { id, action: 'register' | 'ignore' | 'restore' } */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const tool = await db.discoveredTool.findFirst({ where: { id: String(body.id || ""), userId: session.user.id } });
    if (!tool) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (body.action === "ignore") {
      await db.discoveredTool.update({ where: { id: tool.id }, data: { status: "ignored" } });
      return NextResponse.json({ status: "ignored" });
    }
    if (body.action === "restore") {
      await db.discoveredTool.update({ where: { id: tool.id }, data: { status: "undeclared" } });
      return NextResponse.json({ status: "undeclared" });
    }
    if (body.action === "register") {
      const entry = tool.catalogId ? getCatalogEntry(tool.catalogId) : undefined;
      const owner = await db.user.findUnique({ where: { id: session.user.id }, select: { sector: true } });
      // Auto-create/link vendor for matched catalog entries (dedup by name).
      // Ignores the tier vendor cap on purpose — a vendor auto-created from
      // discovery is bookkeeping, not a new questionnaire seat.
      let vendorId: string | null = null;
      if (entry) {
        const existing = await db.vendor.findFirst({ where: { userId: session.user.id, name: entry.vendor } });
        const vendor = existing ?? await db.vendor.create({
          data: {
            userId: session.user.id, name: entry.vendor, category: entry.category,
            websiteUrl: entry.domains[0] ? `https://${entry.domains[0]}` : null,
          },
        });
        vendorId = vendor.id;
      }
      const system = await db.aISystem.create({
        data: {
          userId: session.user.id,
          name: entry?.name ?? tool.rawName,
          description: entry ? `${entry.category} by ${entry.vendor}. ${entry.note || ""}`.trim() : `Discovered via ${tool.source} import.`,
          purpose: entry?.category ?? "General AI tool discovered in use",
          deployerRole: "deployer",
          sector: owner?.sector || "general",
          vendorId,
        },
      });
      await db.discoveredTool.update({ where: { id: tool.id }, data: { status: "registered", aiSystemId: system.id } });
      return NextResponse.json({ status: "registered", aiSystemId: system.id });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("discovery PATCH:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
