import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.socialPost.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    if (existing.status === "published") {
      return Response.json({ error: "Post is already published" }, { status: 400 });
    }

    // ─── Simulated Publishing ────────────────────────────────────────────
    // Social API integrations (LinkedIn, Twitter/X, Facebook) require OAuth
    // app approval and platform-specific API keys. Until those are configured,
    // publishing is simulated: the post status is updated in the database,
    // and the response includes a `simulated` flag so the UI can display
    // the appropriate indicator to the admin.
    //
    // To enable real publishing:
    // 1. Register OAuth apps on each platform
    // 2. Store access tokens via the Accounts tab (already supported)
    // 3. Replace this block with platform SDK calls using stored tokens
    // ─────────────────────────────────────────────────────────────────────

    const post = await db.socialPost.update({
      where: { id },
      data: {
        status: "published",
        publishedAt: new Date(),
        failedReason: null,
      },
    });

    console.log(
      `[SOCIAL_PUBLISH] Post ${id} published to ${existing.platform} by ${session.user.email} (simulated — no platform API call made)`
    );

    return Response.json({
      success: true,
      post,
      simulated: true,
      message: `Post marked as published on ${existing.platform}. No API call was made — social platform integrations are not yet connected. Configure OAuth tokens in the Accounts tab to enable real publishing.`,
    });
  } catch (error) {
    console.error("[SOCIAL_POST_PUBLISH]", error);
    return Response.json({ error: "Failed to publish social post" }, { status: 500 });
  }
}
