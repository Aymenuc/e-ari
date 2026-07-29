import { NextResponse } from 'next/server';
import { getCohortState } from '@/lib/early-access';

/**
 * GET /api/cohort — public founding-cohort state.
 *
 * Every number here is COUNTED from real granted accounts. A fabricated
 * scarcity counter would be the fastest way to destroy the credibility this
 * platform sells, so there is no fallback that invents a figure: if the
 * database is unreachable the count reports zero and the UI hides itself.
 */
export async function GET() {
  const state = await getCohortState();
  return NextResponse.json(state, {
    headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
  });
}
