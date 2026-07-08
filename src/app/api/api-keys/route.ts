import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateApiKey } from "@/lib/api-keys";
import { isGrowthOrAbove, isEnterprise } from "@/lib/tier";

/** Session-authed API-key management (list / create / revoke). */

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const keys = await db.apiKey.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prefix: true, scope: true, lastUsedAt: true, revokedAt: true, createdAt: true },
  });
  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { tier: true } });
    if (!isGrowthOrAbove(user?.tier)) {
      return NextResponse.json({ error: "API access requires Growth, Autopilot, or Enterprise.", upgradeRequired: true }, { status: 402 });
    }
    const body = await req.json();
    const scope = body.scope === "write" ? "write" : "read";
    if (scope === "write" && !isEnterprise(user?.tier)) {
      return NextResponse.json({ error: "Write-scoped keys require the Enterprise tier.", upgradeRequired: true }, { status: 402 });
    }
    const active = await db.apiKey.count({ where: { userId: session.user.id, revokedAt: null } });
    if (active >= 10) return NextResponse.json({ error: "Maximum 10 active keys. Revoke one first." }, { status: 400 });

    const { secret, prefix, keyHash } = generateApiKey();
    const key = await db.apiKey.create({
      data: {
        userId: session.user.id,
        name: String(body.name || "API key").slice(0, 100),
        keyHash, prefix, scope,
      },
    });
    // The full secret is returned exactly once.
    return NextResponse.json({ id: key.id, name: key.name, prefix, scope, secret }, { status: 201 });
  } catch (e) {
    console.error("api-keys POST:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const key = await db.apiKey.findFirst({ where: { id, userId: session.user.id } });
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  return NextResponse.json({ revoked: true });
}
