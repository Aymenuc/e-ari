import { NextRequest, NextResponse } from "next/server";
import {
  isSupportedUnsubscribeType,
  setOptOut,
  verifyUnsubscribeToken,
} from "@/lib/email-preferences";

function html(message: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email Preferences</title></head><body style="font-family:Arial,sans-serif;background:#0b1020;color:#e5e7eb;padding:24px"><div style="max-width:640px;margin:40px auto;background:#111827;border:1px solid #374151;border-radius:12px;padding:24px"><h1 style="margin:0 0 12px;font-size:22px">Email preferences updated</h1><p style="margin:0;color:#cbd5e1;line-height:1.6">${message}</p></div></body></html>`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const type = searchParams.get("type");
  const token = searchParams.get("token");

  if (!email || !type || !token || !isSupportedUnsubscribeType(type)) {
    return new NextResponse(html("Invalid unsubscribe link."), { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  if (!verifyUnsubscribeToken(email, type, token)) {
    return new NextResponse(html("This unsubscribe link is invalid or has been modified."), { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  await setOptOut(email, type, true);
  return new NextResponse(html(`You have been unsubscribed from <strong>${type.replace("_", " ")}</strong> emails for <strong>${email}</strong>.`), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
