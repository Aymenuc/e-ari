import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const VALID_PROVIDERS = [
  "slack",
  "teams",
  "jira",
  "asana",
  "google_workspace",
  "microsoft_365",
];

// GET /api/integrations — Returns user's integrations
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integrations = await db.integration.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    // Parse JSON config fields for response
    const parsed = integrations.map(integration => ({
      ...integration,
      config: JSON.parse(integration.config),
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Integrations GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/integrations — Create/update integration
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { provider, config } = body;

    if (!provider || !config || typeof config !== "object") {
      return NextResponse.json(
        { error: "provider and config (object) are required" },
        { status: 400 }
      );
    }

    if (!VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(", ")}` },
        { status: 400 }
      );
    }

    const configString = JSON.stringify(config);

    // Upsert integration (unique on userId + provider)
    const integration = await db.integration.upsert({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider,
        },
      },
      create: {
        userId: session.user.id,
        provider,
        status: "pending",
        config: configString,
      },
      update: {
        status: "pending",
        config: configString,
      },
    });

    return NextResponse.json({
      ...integration,
      config: JSON.parse(integration.config),
    }, { status: integration.createdAt === integration.updatedAt ? 201 : 200 });
  } catch (error) {
    console.error("Integrations POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/integrations — Remove integration
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { provider } = body;

    if (!provider) {
      return NextResponse.json(
        { error: "provider is required" },
        { status: 400 }
      );
    }

    const integration = await db.integration.findUnique({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider,
        },
      },
    });

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    await db.integration.delete({
      where: { id: integration.id },
    });

    return NextResponse.json({ deleted: true, provider });
  } catch (error) {
    console.error("Integrations DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
