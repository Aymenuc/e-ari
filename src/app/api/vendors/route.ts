import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getResourceCap } from "@/lib/tier-limits";
import { signMemberToken } from "@/lib/member-tokens";
import { sendCustomEmail } from "@/lib/email-service";
import { getBaseUrl } from "@/lib/site-url";

/** GET /api/vendors — list with linked AI-system counts */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vendors = await db.vendor.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" } });
  const systems = await db.aISystem.findMany({
    where: { userId: session.user.id, vendorId: { not: null } },
    select: { id: true, name: true, vendorId: true },
  });
  return NextResponse.json({ vendors, systems });
}

/** POST /api/vendors — create { name, websiteUrl?, category?, contactEmail? } */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { tier: true } });
    const cap = getResourceCap(user?.tier, "vendor");
    const current = await db.vendor.count({ where: { userId: session.user.id } });
    if (Number.isFinite(cap) && current >= cap) {
      return NextResponse.json(
        { error: cap === 0 ? "Vendor risk management requires Professional or above." : `Your tier allows ${cap} vendors. Upgrade to Autopilot for unlimited.`, upgradeRequired: true },
        { status: 402 },
      );
    }
    const body = await req.json();
    if (!body.name || typeof body.name !== "string") return NextResponse.json({ error: "name required" }, { status: 400 });
    const vendor = await db.vendor.create({
      data: {
        userId: session.user.id,
        name: String(body.name).slice(0, 200),
        websiteUrl: body.websiteUrl ? String(body.websiteUrl).slice(0, 300) : null,
        category: body.category ? String(body.category).slice(0, 120) : null,
        contactEmail: body.contactEmail ? String(body.contactEmail).slice(0, 254) : null,
      },
    });
    return NextResponse.json(vendor, { status: 201 });
  } catch (e) {
    console.error("vendors POST:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PATCH /api/vendors — { id, action: 'send_questionnaire' } | { id, dpaStatus? contactEmail? ... } */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const vendor = await db.vendor.findFirst({ where: { id: String(body.id || ""), userId: session.user.id } });
    if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (body.action === "send_questionnaire") {
      const email = body.contactEmail ? String(body.contactEmail) : vendor.contactEmail;
      if (!email) return NextResponse.json({ error: "Vendor contact email required" }, { status: 400 });
      const owner = await db.user.findUnique({ where: { id: session.user.id }, select: { organization: true, name: true } });
      const orgName = owner?.organization || owner?.name || "one of your customers";
      const token = signMemberToken(vendor.id, "vendor_questionnaire");
      const link = `${getBaseUrl().replace(/\/+$/, "")}/vendor-response/${token}`;
      const res = await sendCustomEmail(
        email,
        vendor.name,
        `AI vendor risk questionnaire from ${orgName}`,
        `${orgName} is assessing its AI vendors as part of its EU AI Act compliance programme and has asked ${vendor.name} to complete a short (~10 minute) AI risk questionnaire.\n\nComplete it here (no account needed):\n${link}\n\nThe link expires in 30 days.`,
      );
      await db.vendor.update({ where: { id: vendor.id }, data: { contactEmail: email, questionnaireStatus: "sent" } });
      return NextResponse.json({ sent: res.sent });
    }

    const data: Record<string, unknown> = {};
    if (body.dpaStatus && ["signed", "pending", "none", "unknown"].includes(body.dpaStatus)) data.dpaStatus = body.dpaStatus;
    if (body.contactEmail !== undefined) data.contactEmail = String(body.contactEmail).slice(0, 254) || null;
    if (body.category !== undefined) data.category = String(body.category).slice(0, 120) || null;
    if (body.nextReviewAt) data.nextReviewAt = new Date(body.nextReviewAt);
    const updated = await db.vendor.update({ where: { id: vendor.id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("vendors PATCH:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE /api/vendors?id=… */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const vendor = await db.vendor.findFirst({ where: { id, userId: session.user.id } });
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.aISystem.updateMany({ where: { vendorId: id }, data: { vendorId: null } });
  await db.vendor.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
