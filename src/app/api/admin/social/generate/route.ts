import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  generateMarketingPack,
  MARKETING_TOPICS,
  type MarketingChannel,
} from "@/lib/marketing-engine";

/**
 * POST /api/admin/social/generate — LLM marketing drafts grounded in
 * compiled product facts (see lib/marketing-engine).
 *
 * Replaces the template generator that fabricated benchmark numbers
 * (Math.random), invented certification announcements, claimed "500+
 * organizations", and called the framework "6-pillar". Every draft this
 * returns is grounded or it errors — no silent fallback to fiction.
 *
 * Body: { topic?: keyof MARKETING_TOPICS, channels?: MarketingChannel[],
 *         brief?: string, type?: string (legacy alias for topic) }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    // Legacy UI sent { type: benchmark|compliance|certification|promotion }.
    const LEGACY_MAP: Record<string, string> = {
      benchmark: "methodology",
      compliance: "aiact-deadline",
      certification: "methodology",
      promotion: "leverage",
    };
    const topic: string =
      body.topic && MARKETING_TOPICS[body.topic]
        ? body.topic
        : LEGACY_MAP[body.type] ?? "methodology";

    const valid: MarketingChannel[] = ["linkedin", "twitter", "newsletter"];
    const channels: MarketingChannel[] =
      Array.isArray(body.channels) && body.channels.length > 0
        ? body.channels.filter((c: string): c is MarketingChannel => valid.includes(c as MarketingChannel))
        : ["linkedin"];
    if (channels.length === 0) {
      return Response.json({ error: "No valid channels requested" }, { status: 400 });
    }

    const brief = typeof body.brief === "string" ? body.brief.slice(0, 1200) : undefined;

    const drafts = await generateMarketingPack(topic, channels, brief);

    // Legacy shape compatibility: old UI reads { content, platform, category }
    // of a single draft; new UI reads { drafts }.
    return Response.json({ ...drafts[0], drafts });
  } catch (error) {
    console.error("[SOCIAL_GENERATE]", error);
    const message = error instanceof Error ? error.message : "Failed to generate content";
    return Response.json({ error: message }, { status: 502 });
  }
}
