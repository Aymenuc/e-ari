import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProgressionState } from "@/lib/progression";

/** Serializable progression payload for client pages (`use client`). */
export function progressionStateToJson(state: Awaited<ReturnType<typeof getProgressionState>>) {
  return {
    ...state,
    assessed: {
      ...state.assessed,
      completedAt: state.assessed.completedAt?.toISOString() ?? null,
    },
  };
}

/** GET /api/compliance/progression — current user progression snapshot */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const state = await getProgressionState(session.user.id);
    return NextResponse.json(progressionStateToJson(state));
  } catch (e) {
    console.error("compliance/progression:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
