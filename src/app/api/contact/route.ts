import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendContactFormEmail } from "@/lib/email-service";
import { checkRateLimit, getRateLimitHeaders, resolveIdentifier } from "@/lib/rate-limit";

// Hard caps to limit abuse on this public endpoint.
const MAX_NAME_LEN = 200;
const MAX_EMAIL_LEN = 254; // RFC 5321 max
const MAX_COMPANY_LEN = 200;
const MAX_SUBJECT_LEN = 300;
const MAX_MESSAGE_LEN = 5000;

export async function POST(req: NextRequest) {
  // Rate limit — this is an unauthenticated public endpoint that writes
  // to the DB and sends email. Without a limit, anyone could fill the
  // contact table with junk or use it as a spam relay against support.
  const identifier = resolveIdentifier(null, req);
  const rateResult = checkRateLimit('default', identifier);
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.', retryAfter: rateResult.retryAfter },
      { status: 429, headers: getRateLimitHeaders('default', rateResult) }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { name, email, company, subject, message } = (body ?? {}) as {
    name?: string;
    email?: string;
    company?: string;
    subject?: string;
    message?: string;
  };

  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  // Length caps — stops oversized payloads and DB bloat.
  if (
    name.length > MAX_NAME_LEN ||
    email.length > MAX_EMAIL_LEN ||
    (company && company.length > MAX_COMPANY_LEN) ||
    subject.length > MAX_SUBJECT_LEN ||
    message.length > MAX_MESSAGE_LEN
  ) {
    return NextResponse.json({ error: "Field length exceeded." }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  await db.contactMessage.create({
    data: {
      name: name.slice(0, MAX_NAME_LEN),
      email: email.slice(0, MAX_EMAIL_LEN),
      company: company ? company.slice(0, MAX_COMPANY_LEN) : null,
      subject: subject.slice(0, MAX_SUBJECT_LEN),
      message: message.slice(0, MAX_MESSAGE_LEN),
    },
  });

  sendContactFormEmail(name, email, company || null, subject, message).catch(() => {});

  return NextResponse.json({ message: "Message sent successfully" });
}
