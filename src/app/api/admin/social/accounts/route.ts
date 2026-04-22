import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const accounts = await db.socialAccount.findMany({
      orderBy: { createdAt: "desc" },
    });

    return Response.json(accounts);
  } catch (error) {
    console.error("[SOCIAL_ACCOUNTS_GET]", error);
    return Response.json({ error: "Failed to fetch social accounts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { provider, accountName, accountHandle, accessToken, refreshToken } = body;

    if (!provider || !accountName) {
      return Response.json({ error: "Provider and account name are required" }, { status: 400 });
    }

    if (!["linkedin", "twitter", "facebook"].includes(provider)) {
      return Response.json({ error: "Invalid provider. Must be linkedin, twitter, or facebook" }, { status: 400 });
    }

    const account = await db.socialAccount.create({
      data: {
        provider,
        accountName,
        accountHandle: accountHandle || null,
        accessToken: accessToken || null,
        refreshToken: refreshToken || null,
        isActive: true,
      },
    });

    return Response.json(account, { status: 201 });
  } catch (error) {
    console.error("[SOCIAL_ACCOUNTS_POST]", error);
    return Response.json({ error: "Failed to create social account" }, { status: 500 });
  }
}
