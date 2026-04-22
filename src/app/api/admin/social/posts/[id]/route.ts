import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { content, platform, mediaUrls, status, scheduledAt, category, failedReason } = body;

    const existing = await db.socialPost.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    const post = await db.socialPost.update({
      where: { id },
      data: {
        ...(content !== undefined && { content }),
        ...(platform !== undefined && { platform }),
        ...(mediaUrls !== undefined && { mediaUrls }),
        ...(status !== undefined && { status }),
        ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
        ...(category !== undefined && { category }),
        ...(failedReason !== undefined && { failedReason }),
      },
    });

    return Response.json(post);
  } catch (error) {
    console.error("[SOCIAL_POST_PATCH]", error);
    return Response.json({ error: "Failed to update social post" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    await db.socialPost.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (error) {
    console.error("[SOCIAL_POST_DELETE]", error);
    return Response.json({ error: "Failed to delete social post" }, { status: 500 });
  }
}
