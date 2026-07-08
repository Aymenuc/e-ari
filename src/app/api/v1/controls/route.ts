import { NextRequest, NextResponse } from "next/server";
import { deriveControls } from "@/lib/controls-derive";
import { guardV1 } from "../_lib";

/** GET /api/v1/controls — derived control states (read scope). */
export async function GET(req: NextRequest) {
  const { auth, fail } = await guardV1(req, "read");
  if (fail) return fail;
  const result = await deriveControls(auth.userId!);
  return NextResponse.json({ data: result });
}
