/**
 * E-ARI Scraping API Route
 *
 * POST /api/scrape
 *
 * Supports three actions:
 * - "enrich": Full context enrichment with ScrapingInput
 * - "quick": Quick website scrape with just a URL
 * - "trends": Get sector AI trends with just a sectorId
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  scrapeOrganizationContext,
  quickScrapeWebsite,
  getSectorAITrends,
  type ScrapingInput,
} from '@/lib/scraper';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Auth check - scraping requires authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ─── Tier enforcement: Context enrichment requires Professional or Enterprise ───
    // Scraping uses web search + LLM synthesis; enforce server-side tier gating.
    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { tier: true } });
    const userTier = user?.tier || 'free';
    if (userTier === 'free') {
      return NextResponse.json(
        { error: 'Context enrichment requires Professional or Enterprise tier. Upgrade to unlock AI-powered organizational analysis.', tierRequired: 'professional' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'enrich': {
        const { orgName, websiteUrl, sector, additionalContext } = body;

        if (!orgName || typeof orgName !== 'string' || !orgName.trim()) {
          return NextResponse.json(
            { error: 'Organization name is required.' },
            { status: 400 },
          );
        }

        const input: ScrapingInput = {
          orgName: orgName.trim(),
          websiteUrl: typeof websiteUrl === 'string' && websiteUrl.trim() ? websiteUrl.trim() : undefined,
          sector: typeof sector === 'string' && sector.trim() ? sector.trim() : undefined,
          additionalContext: typeof additionalContext === 'string' && additionalContext.trim() ? additionalContext.trim() : undefined,
        };

        const context = await scrapeOrganizationContext(input);
        return NextResponse.json(context);
      }

      case 'quick': {
        const { url } = body;

        if (!url || typeof url !== 'string' || !url.trim()) {
          return NextResponse.json(
            { error: 'URL is required for quick scrape.' },
            { status: 400 },
          );
        }

        const result = await quickScrapeWebsite(url.trim());
        return NextResponse.json(result);
      }

      case 'trends': {
        const { sectorId } = body;

        if (!sectorId || typeof sectorId !== 'string' || !sectorId.trim()) {
          return NextResponse.json(
            { error: 'sectorId is required for trends action.' },
            { status: 400 },
          );
        }

        const trends = await getSectorAITrends(sectorId.trim());
        return NextResponse.json({ sectorId, trends });
      }

      default:
        return NextResponse.json(
          { error: `Invalid action "${action}". Supported actions: "enrich", "quick", "trends".` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('[api/scrape] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error during context enrichment';
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
