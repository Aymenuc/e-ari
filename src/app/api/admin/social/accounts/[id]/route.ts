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
    const { isActive, accessToken, refreshToken, accountName, accountHandle } = body;

    const existing = await db.socialAccount.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Account not found" }, { status: 404 });
    }

    const account = await db.socialAccount.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(accessToken !== undefined && { accessToken }),
        ...(refreshToken !== undefined && { refreshToken }),
        ...(accountName !== undefined && { accountName }),
        ...(accountHandle !== undefined && { accountHandle }),
      },
    });

    return Response.json(account);
  } catch (error) {
    console.error("[SOCIAL_ACCOUNT_PATCH]", error);
    return Response.json({ error: "Failed to update social account" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.socialAccount.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Account not found" }, { status: 404 });
    }

    await db.socialAccount.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (error) {
    console.error("[SOCIAL_ACCOUNT_DELETE]", error);
    return Response.json({ error: "Failed to delete social account" }, { status: 500 });
  }
}
