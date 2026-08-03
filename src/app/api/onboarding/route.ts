import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Mark onboarding as seen.
 *
 * Called when the concierge is finished *or* deliberately skipped — both count.
 * Only the skip case needs saying out loud: without recording it, /portal would
 * bounce the user straight back to the page they just chose to leave.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await db.user.update({
      where: { id: session.user.id },
      data: { onboardedAt: new Date() },
    });
    return NextResponse.json({ onboarded: true });
  } catch (err) {
    // Never block the navigation on this: a user who cannot record the flag
    // should still reach the dashboard, even if they see the concierge again.
    console.error("[onboarding] could not record completion:", err);
    return NextResponse.json({ onboarded: false }, { status: 200 });
  }
}
