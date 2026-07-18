import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimitFromRequest } from "@/lib/rate-limit";
import { sendContactFormEmail } from "@/lib/email-service";

/**
 * POST /api/careers/apply — real application intake (replaces mailto links).
 *
 * Stores the application as a ContactMessage (subject-prefixed so it is
 * filterable in the admin inbox) and emails it to the support address via
 * the existing contact plumbing. No CV upload in v1 — applicants link their
 * LinkedIn/portfolio/CV instead, which keeps the surface storage-free.
 */
export async function POST(req: NextRequest) {
  try {
    const rateLimitError = await checkRateLimitFromRequest(req, "careers-apply", 3, 60);
    if (rateLimitError) return rateLimitError;

    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim().slice(0, 120);
    const email = String(body.email ?? "").trim().toLowerCase().slice(0, 160);
    const role = String(body.role ?? "").trim().slice(0, 80);
    const link = String(body.link ?? "").trim().slice(0, 300);
    const motivation = String(body.motivation ?? "").trim().slice(0, 3000);

    if (!name || !email || !role || !motivation) {
      return NextResponse.json(
        { error: "Name, email, role, and motivation are required" },
        { status: 400 },
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    if (link && !/^https?:\/\//i.test(link)) {
      return NextResponse.json(
        { error: "Link must start with http(s)://" },
        { status: 400 },
      );
    }

    const subject = `Application — ${role}`;
    const message = `${motivation}\n\n---\nCV / LinkedIn / portfolio: ${link || "not provided"}`;

    await db.contactMessage.create({
      data: { name, email, company: null, subject, message },
    });

    // Email delivery is best-effort: the application is already persisted,
    // so a mail outage must not turn into a lost candidate.
    try {
      await sendContactFormEmail(name, email, null, subject, message);
    } catch (err) {
      console.error("[careers-apply] email failed (application stored):", err);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[careers-apply]", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
