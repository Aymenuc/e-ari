import { NextRequest, NextResponse } from "next/server";
import { sendContactFormEmail } from "@/lib/email-service";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, company, subject, message } = body as {
    name: string;
    email: string;
    company?: string;
    subject: string;
    message: string;
  };

  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  await sendContactFormEmail(name, email, company || null, subject, message);
  return NextResponse.json({ message: "Message sent successfully" });
}
