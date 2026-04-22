/**
 * E-ARI Web Scraping / Context Enrichment Service
 *
 * Uses z-ai-web-dev-sdk's web_search and LLM capabilities to enrich
 * organizational context for AI readiness assessments. This service:
 *
 * 1. Searches the web for information about an organization
 * 2. Extracts AI readiness signals (tech stack, AI initiatives, partnerships, news)
 * 3. Returns structured OrgContext that tailors assessment questions and insights
 *
 * Design principles:
 * - Graceful degradation: if web search fails, return partial context
 * - Privacy-first: no raw PII stored in logs; only org-level signals extracted
 * - Server-side only: this module must never be imported on the client
 * - No browser scraping: only uses z-ai-web-dev-sdk's web_search + LLM
 */

import ZAI from 'z-ai-web-dev-sdk';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Input: organization info provided by the user during assessment setup */
export interface ScrapingInput {
  /** Organization name (required — the primary search key) */
  orgName: string;
  /** Organization website URL (optional — helps disambiguate and find official info) */
  websiteUrl?: string;
  /** Industry sector ID from the assessment sector selection (e.g., 'healthcare', 'finance') */
  sector?: string;
  /** Any free-text context the user provides about their organization */
  additionalContext?: string;
}

/** Output: enriched context about the organization for assessment tailoring */
export interface OrgContext {
  /** Organization name (mirrored from input) */
  orgName: string;
  /** Organization website URL (mirrored from input if provided) */
  websiteUrl?: string;
  /** Industry sector (mirrored from input if provided) */
  sector?: string;
  /** Summary of AI trends relevant to the organization's industry */
  industryContext: string;
  /** What we learned specifically about this organization from web sources */
  orgSpecificContext: string;
  /** Known AI projects, initiatives, or programs the organization is involved in */
  aiInitiatives: string[];
  /** Technologies, platforms, or tools mentioned in connection with the organization */
  techStackSignals: string[];
  /** Sector-specific regulations and compliance requirements that affect AI adoption */
  regulatoryConsiderations: string[];
  /** How the organization compares within its sector regarding AI maturity */
  competitiveLandscape: string;
  /** URLs that were used as sources for the enrichment */
  scrapingSources: string[];
  /** ISO 8601 timestamp of when the context was scraped */
  scrapedAt: string;
  /** Confidence level in the accuracy of the scraped data */
  confidence: 'high' | 'medium' | 'low';
}

/** Result from a quick website scrape */
export interface QuickScrapeResult {
  /** Inferred title or organization name from the website */
  title: string;
  /** Brief description of what the organization does */
  description: string;
  /** Technology signals detected from search snippets */
  techSignals: string[];
}

// ─── Sector name mapping ────────────────────────────────────────────────────

/**
 * Maps sector IDs from the E-ARI sector definitions to human-readable names
 * and search-friendly keywords for web queries.
 */
const SECTOR_MAP: Record<string, { name: string; searchKeywords: string[] }> = {
  healthcare: {
    name: 'Healthcare & Life Sciences',
    searchKeywords: ['healthcare AI', 'medical AI adoption', 'clinical AI', 'health tech'],
  },
  finance: {
    name: 'Financial Services & Banking',
    searchKeywords: ['fintech AI', 'banking AI adoption', 'financial services AI', 'AI risk management'],
  },
  manufacturing: {
    name: 'Manufacturing & Industrial',
    searchKeywords: ['Industry 4.0', 'smart manufacturing AI', 'industrial AI', 'predictive maintenance'],
  },
  retail: {
    name: 'Retail & E-Commerce',
    searchKeywords: ['retail AI', 'e-commerce AI', 'retail technology', 'AI personalization'],
  },
  government: {
    name: 'Government & Public Sector',
    searchKeywords: ['government AI', 'public sector AI', 'civic tech', 'digital government'],
  },
  technology: {
    name: 'Technology & Software',
    searchKeywords: ['tech company AI', 'software AI', 'SaaS AI', 'AI platform'],
  },
  energy: {
    name: 'Energy & Utilities',
    searchKeywords: ['energy AI', 'utilities AI', 'smart grid', 'renewable energy AI'],
  },
  education: {
    name: 'Education & EdTech',
    searchKeywords: ['education AI', 'EdTech AI', 'learning technology', 'AI in education'],
  },
  general: {
    name: 'General / Cross-Industry',
    searchKeywords: ['enterprise AI', 'AI adoption', 'AI transformation'],
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Get the z-ai-web-dev-sdk client instance.
 * Wraps creation in error handling so callers don't need to.
 */
async function getZAIClient() {
  const ZAIModule = await import('z-ai-web-dev-sdk');
  const zai = await ZAIModule.default.create();
  return zai;
}

/**
 * Build a domain hint from a website URL for disambiguation.
 * e.g., "https://www.acme.com" → "acme.com"
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Execute a web search with error handling, returning an empty array on failure.
 */
async function safeWebSearch(
  zai: Awaited<ReturnType<typeof getZAIClient>>,
  query: string,
  num: number = 8,
): Promise<Array<{ url: string; name: string; snippet: string; host_name: string; rank: number; date?: string; favicon?: string }>> {
  try {
    const results = await zai.functions.invoke('web_search', { query, num });
    return Array.isArray(results) ? results : [];
  } catch (error) {
    console.warn(`[scraper] Web search failed for query "${query}":`, error);
    return [];
  }
}

/**
 * Parse a JSON response from the LLM, handling markdown code block wrapping.
 */
function parseLLMJson<T>(content: string): T {
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(jsonStr) as T;
}

/**
 * Determine confidence level based on how many sources returned useful data.
 */
function assessConfidence(
  orgResults: unknown[],
  sectorResults: unknown[],
  hasOrgSpecificData: boolean,
): 'high' | 'medium' | 'low' {
  const totalResults = orgResults.length + sectorResults.length;
  if (hasOrgSpecificData && totalResults >= 6) return 'high';
  if (hasOrgSpecificData || totalResults >= 4) return 'medium';
  return 'low';
}

// ─── Main Exported Functions ─────────────────────────────────────────────────

/**
 * Scrape and enrich organizational context using web search and LLM analysis.
 *
 * This is the primary entry point for context enrichment. It performs multiple
 * web searches about the organization and its sector, then uses an LLM to
 * synthesize the results into a structured {@link OrgContext} object.
 *
 * @param input - Organization identification provided by the user
 * @returns Structured organizational context for assessment tailoring
 *
 * @example
 * ```typescript
 * const context = await scrapeOrganizationContext({
 *   orgName: 'Acme Corp',
 *   websiteUrl: 'https://acme.com',
 *   sector: 'manufacturing',
 *   additionalContext: 'Recently announced AI strategy',
 * });
 * console.log(context.aiInitiatives);
 * console.log(context.confidence);
 * ```
 */
export async function scrapeOrganizationContext(input: ScrapingInput): Promise<OrgContext> {
  const timestamp = new Date().toISOString();
  const { orgName, websiteUrl, sector, additionalContext } = input;

  // Build disambiguation hints
  const domainHint = websiteUrl ? ` (${extractDomain(websiteUrl)})` : '';
  const sectorInfo = sector ? SECTOR_MAP[sector] : null;
  const sectorName = sectorInfo?.name ?? sector ?? '';

  // Initialize ZAI client
  let zai: Awaited<ReturnType<typeof getZAIClient>>;
  try {
    zai = await getZAIClient();
  } catch (error) {
    console.error('[scraper] Failed to initialize ZAI client:', error);
    return buildFallbackContext(input, timestamp, 'ZAI client initialization failed');
  }

  // ── Step 1: Search for org-specific AI and technology information ──
  const orgSearchQueries = [
    `${orgName}${domainHint} AI artificial intelligence initiatives`,
    `${orgName}${domainHint} technology stack digital transformation`,
    `${orgName}${domainHint} partnerships AI machine learning`,
  ];

  // Add a sector-specific query if sector is known
  if (sectorName) {
    orgSearchQueries.push(`${orgName}${domainHint} ${sectorName} AI adoption`);
  }

  // Add additional context query if provided
  if (additionalContext) {
    orgSearchQueries.push(`${orgName} ${additionalContext}`);
  }

  const orgSearchPromises = orgSearchQueries.map((q) => safeWebSearch(zai, q, 8));
  const orgSearchResults = await Promise.all(orgSearchPromises);
  const allOrgResults = orgSearchResults.flat();

  // Deduplicate by URL
  const seenUrls = new Set<string>();
  const uniqueOrgResults = allOrgResults.filter((r) => {
    if (seenUrls.has(r.url)) return false;
    seenUrls.add(r.url);
    return true;
  });

  // ── Step 2: Search for sector-specific AI trends and regulations ──
  const sectorSearchQueries: string[] = [];
  if (sectorInfo) {
    sectorSearchQueries.push(`${sectorInfo.name} AI trends 2024 2025`);
    sectorSearchQueries.push(`${sectorInfo.name} AI regulation compliance requirements`);
    sectorSearchQueries.push(`${sectorInfo.searchKeywords[0]} ${sectorInfo.searchKeywords[1]} industry outlook`);
  } else {
    // Generic sector-agnostic queries
    sectorSearchQueries.push('enterprise AI adoption trends 2024 2025');
    sectorSearchQueries.push('AI regulation compliance enterprise requirements');
  }

  const sectorSearchPromises = sectorSearchQueries.map((q) => safeWebSearch(zai, q, 6));
  const sectorSearchResults = await Promise.all(sectorSearchPromises);
  const allSectorResults = sectorSearchResults.flat();

  // Deduplicate sector results
  const seenSectorUrls = new Set<string>();
  const uniqueSectorResults = allSectorResults.filter((r) => {
    if (seenSectorUrls.has(r.url)) return false;
    seenSectorUrls.add(r.url);
    return true;
  });

  // ── Step 3: If no results at all, return fallback ──
  if (uniqueOrgResults.length === 0 && uniqueSectorResults.length === 0) {
    return buildFallbackContext(input, timestamp, 'No web search results returned');
  }

  // ── Step 4: Use LLM to synthesize search results into structured context ──
  try {
    const orgSnippets = uniqueOrgResults
      .slice(0, 15)
      .map((r, i) => `[${i + 1}] "${r.name}" — ${r.snippet} (Source: ${r.host_name})`)
      .join('\n');

    const sectorSnippets = uniqueSectorResults
      .slice(0, 10)
      .map((r, i) => `[${i + 1}] "${r.name}" — ${r.snippet} (Source: ${r.host_name})`)
      .join('\n');

    const allSourceUrls = [
      ...uniqueOrgResults.slice(0, 15).map((r) => r.url),
      ...uniqueSectorResults.slice(0, 10).map((r) => r.url),
    ];

    const synthesisPrompt = `You are an enterprise AI readiness research analyst. Analyze the following web search results about an organization and its industry to extract AI readiness context.

ORGANIZATION: ${orgName}${websiteUrl ? `\nWEBSITE: ${websiteUrl}` : ''}${sector ? `\nSECTOR: ${sectorName}` : ''}${additionalContext ? `\nADDITIONAL CONTEXT: ${additionalContext}` : ''}

ORGANIZATION SEARCH RESULTS:
${orgSnippets || 'No organization-specific results found.'}

SECTOR/INDUSTRY SEARCH RESULTS:
${sectorSnippets || 'No sector-specific results found.'}

RULES:
- Base ALL findings ONLY on the search results provided above. Do not fabricate or infer information not supported by the snippets.
- If the search results don't mention specific AI initiatives for this organization, return an empty array for aiInitiatives — do NOT guess.
- If the search results don't mention specific technologies, return an empty array for techStackSignals.
- For regulatory considerations, combine what's in the search results with well-known sector regulations (e.g., HIPAA for healthcare, SOX for finance).
- Be conservative: it's better to return less information than to fabricate.
- Keep all text fields concise and actionable (2-4 sentences max for summaries).
- For competitiveLandscape, describe how this organization's AI maturity appears relative to its sector peers based on the search data.

Respond in this exact JSON format:
{
  "industryContext": "2-3 sentence summary of AI trends and adoption patterns in this organization's sector",
  "orgSpecificContext": "2-3 sentence summary of what the search results reveal about THIS organization's AI readiness posture",
  "aiInitiatives": ["initiative 1", "initiative 2"],
  "techStackSignals": ["technology 1", "technology 2"],
  "regulatoryConsiderations": ["regulation 1", "regulation 2"],
  "competitiveLandscape": "2-3 sentence assessment of how this organization compares to sector peers in AI maturity"
}`;

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'You are an enterprise AI readiness research analyst. Extract only factual, source-supported insights from web search results. Never fabricate information. Be conservative and precise.',
        },
        {
          role: 'user',
          content: synthesisPrompt,
        },
      ],
      temperature: 0.2, // Very low temperature for factual extraction
      max_tokens: 1500,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty LLM response from synthesis');
    }

    const parsed = parseLLMJson<{
      industryContext: string;
      orgSpecificContext: string;
      aiInitiatives: string[];
      techStackSignals: string[];
      regulatoryConsiderations: string[];
      competitiveLandscape: string;
    }>(content);

    // Validate essential fields exist
    const hasOrgSpecificData =
      (Array.isArray(parsed.aiInitiatives) && parsed.aiInitiatives.length > 0) ||
      (Array.isArray(parsed.techStackSignals) && parsed.techStackSignals.length > 0) ||
      (typeof parsed.orgSpecificContext === 'string' && parsed.orgSpecificContext.length > 50);

    const confidence = assessConfidence(uniqueOrgResults, uniqueSectorResults, hasOrgSpecificData);

    return {
      orgName,
      websiteUrl,
      sector,
      industryContext: parsed.industryContext || 'Industry context could not be determined from available sources.',
      orgSpecificContext: parsed.orgSpecificContext || 'No organization-specific information found in web sources.',
      aiInitiatives: Array.isArray(parsed.aiInitiatives) ? parsed.aiInitiatives.slice(0, 10) : [],
      techStackSignals: Array.isArray(parsed.techStackSignals) ? parsed.techStackSignals.slice(0, 15) : [],
      regulatoryConsiderations: Array.isArray(parsed.regulatoryConsiderations)
        ? parsed.regulatoryConsiderations.slice(0, 8)
        : [],
      competitiveLandscape: parsed.competitiveLandscape || 'Competitive positioning could not be assessed from available sources.',
      scrapingSources: allSourceUrls,
      scrapedAt: timestamp,
      confidence,
    };
  } catch (error) {
    console.error('[scraper] LLM synthesis failed, building context from raw search results:', error);

    // Fallback: build context from raw snippets without LLM analysis
    return buildContextFromRawResults(input, uniqueOrgResults, uniqueSectorResults, timestamp);
  }
}

/**
 * Get sector-specific AI trends without org-specific information.
 *
 * Useful for providing industry context during assessment onboarding
 * when the user hasn't yet provided their organization details.
 *
 * @param sectorId - The sector identifier (e.g., 'healthcare', 'finance', 'manufacturing')
 * @returns A narrative summary of AI trends for the specified sector
 *
 * @example
 * ```typescript
 * const trends = await getSectorAITrends('healthcare');
 * // "Healthcare AI adoption is accelerating, with clinical decision support
 * //  and drug discovery leading investment priorities..."
 * ```
 */
export async function getSectorAITrends(sectorId: string): Promise<string> {
  const sectorInfo = SECTOR_MAP[sectorId];
  const sectorName = sectorInfo?.name ?? sectorId;

  let zai: Awaited<ReturnType<typeof getZAIClient>>;
  try {
    zai = await getZAIClient();
  } catch (error) {
    console.error('[scraper] Failed to initialize ZAI client for sector trends:', error);
    return `AI adoption trends for the ${sectorName} sector could not be retrieved at this time.`;
  }

  // Search for sector-specific AI trends
  const queries = sectorInfo
    ? [
        `${sectorInfo.name} AI trends adoption 2024 2025`,
        `${sectorInfo.searchKeywords.join(' ')} industry outlook`,
      ]
    : [
        `${sectorName} AI trends adoption 2024 2025`,
        `${sectorName} artificial intelligence industry outlook`,
      ];

  const searchPromises = queries.map((q) => safeWebSearch(zai, q, 6));
  const searchResults = await Promise.all(searchPromises);
  const allResults = searchResults.flat();

  if (allResults.length === 0) {
    return `No recent AI trend information found for the ${sectorName} sector. Consider researching industry reports from McKinsey, Gartner, or Forrester for the latest insights.`;
  }

  // Deduplicate
  const seenUrls = new Set<string>();
  const uniqueResults = allResults.filter((r) => {
    if (seenUrls.has(r.url)) return false;
    seenUrls.add(r.url);
    return true;
  });

  // Use LLM to synthesize trends
  try {
    const snippets = uniqueResults
      .slice(0, 8)
      .map((r, i) => `[${i + 1}] "${r.name}" — ${r.snippet}`)
      .join('\n');

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'You are an industry analyst specializing in AI adoption trends. Synthesize search results into a concise, factual trend summary. Do not fabricate data. Reference only what the search results support. Write 3-5 sentences.',
        },
        {
          role: 'user',
          content: `Based on these search results about AI trends in the ${sectorName} sector, provide a concise summary:\n\n${snippets}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      return content.trim();
    }
  } catch (error) {
    console.error('[scraper] LLM sector trends synthesis failed:', error);
  }

  // Fallback: concatenate snippets
  return uniqueResults
    .slice(0, 4)
    .map((r) => r.snippet)
    .filter(Boolean)
    .join(' ');
}

/**
 * Get quick context for a website URL using web search.
 *
 * Performs a lightweight search to identify the organization behind a URL,
 * extracting a title, description, and any technology signals from snippets.
 * Does NOT perform deep scraping or LLM analysis.
 *
 * @param url - The website URL to look up
 * @returns Basic information about the website and detected tech signals
 *
 * @example
 * ```typescript
 * const info = await quickScrapeWebsite('https://acme.com');
 * // { title: 'Acme Corp', description: '...', techSignals: ['AWS', 'React'] }
 * ```
 */
export async function quickScrapeWebsite(url: string): Promise<QuickScrapeResult> {
  const domain = extractDomain(url);

  let zai: Awaited<ReturnType<typeof getZAIClient>>;
  try {
    zai = await getZAIClient();
  } catch (error) {
    console.error('[scraper] Failed to initialize ZAI client for quick scrape:', error);
    return {
      title: domain,
      description: 'Context could not be retrieved at this time.',
      techSignals: [],
    };
  }

  const searchResults = await safeWebSearch(zai, `${domain} company about technology`, 5);

  if (searchResults.length === 0) {
    return {
      title: domain,
      description: 'No information found for this website.',
      techSignals: [],
    };
  }

  // Extract info from the first few results
  const topResult = searchResults[0];
  const title = topResult?.name || domain;

  const descriptions = searchResults
    .slice(0, 3)
    .map((r) => r.snippet)
    .filter(Boolean);

  // Use LLM for quick extraction if we have snippets
  try {
    const snippetsText = searchResults
      .slice(0, 5)
      .map((r, i) => `[${i + 1}] "${r.name}" — ${r.snippet}`)
      .join('\n');

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'Extract the organization name, a brief description (1-2 sentences), and any mentioned technologies/platforms from these search results. Respond in JSON: {"title": "...", "description": "...", "techSignals": ["..."]}. Only include facts from the snippets.',
        },
        {
          role: 'user',
          content: snippetsText,
        },
      ],
      temperature: 0.2,
      max_tokens: 300,
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = parseLLMJson<{ title: string; description: string; techSignals: string[] }>(content);
      return {
        title: parsed.title || title,
        description: parsed.description || descriptions.join(' ').slice(0, 300),
        techSignals: Array.isArray(parsed.techSignals) ? parsed.techSignals.slice(0, 10) : [],
      };
    }
  } catch (error) {
    console.warn('[scraper] Quick scrape LLM extraction failed, using raw snippets:', error);
  }

  // Fallback: use raw snippets without LLM
  return {
    title,
    description: descriptions.join(' ').slice(0, 300) || 'No description available.',
    techSignals: extractTechSignalsFromSnippets(descriptions),
  };
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Build a fallback OrgContext when web search or LLM analysis fails entirely.
 * Returns a minimal but valid context structure with low confidence.
 */
function buildFallbackContext(
  input: ScrapingInput,
  timestamp: string,
  reason: string,
): OrgContext {
  const sectorInfo = input.sector ? SECTOR_MAP[input.sector] : null;

  return {
    orgName: input.orgName,
    websiteUrl: input.websiteUrl,
    sector: input.sector,
    industryContext: sectorInfo
      ? `AI adoption context for the ${sectorInfo.name} sector could not be retrieved. ${sectorInfo.searchKeywords.join(', ')} are key areas to research.`
      : 'Industry AI context could not be retrieved at this time.',
    orgSpecificContext: `Context enrichment was unavailable (${reason}). Organization-provided context: ${input.additionalContext || 'None provided.'}`,
    aiInitiatives: [],
    techStackSignals: [],
    regulatoryConsiderations: getDefaultRegulations(input.sector),
    competitiveLandscape: 'Competitive assessment was unavailable due to insufficient data sources.',
    scrapingSources: [],
    scrapedAt: timestamp,
    confidence: 'low',
  };
}

/**
 * Build context from raw search results when the LLM synthesis step fails.
 * Extracts what it can from snippets using simple heuristics.
 */
function buildContextFromRawResults(
  input: ScrapingInput,
  orgResults: Array<{ url: string; name: string; snippet: string; host_name: string }>,
  sectorResults: Array<{ url: string; name: string; snippet: string; host_name: string }>,
  timestamp: string,
): OrgContext {
  const allSnippets = [
    ...orgResults.map((r) => r.snippet),
    ...sectorResults.map((r) => r.snippet),
  ].filter(Boolean);

  const allUrls = [
    ...orgResults.map((r) => r.url),
    ...sectorResults.map((r) => r.url),
  ];

  const sectorInfo = input.sector ? SECTOR_MAP[input.sector] : null;
  const hasOrgData = orgResults.length > 0;

  return {
    orgName: input.orgName,
    websiteUrl: input.websiteUrl,
    sector: input.sector,
    industryContext: sectorInfo
      ? `AI trends in ${sectorInfo.name}: ${sectorResults
          .slice(0, 3)
          .map((r) => r.snippet)
          .filter(Boolean)
          .join(' ')
          .slice(0, 400) || 'No sector trends could be extracted.'}`
      : 'Sector-specific trends could not be determined.',
    orgSpecificContext: hasOrgData
      ? orgResults
          .slice(0, 4)
          .map((r) => r.snippet)
          .filter(Boolean)
          .join(' ')
          .slice(0, 500)
      : `No web results found for ${input.orgName}. ${input.additionalContext || ''}`,
    aiInitiatives: extractAIInitiativesFromSnippets(allSnippets),
    techStackSignals: extractTechSignalsFromSnippets(allSnippets),
    regulatoryConsiderations: getDefaultRegulations(input.sector),
    competitiveLandscape: hasOrgData
      ? 'Partial data retrieved; competitive positioning requires deeper analysis.'
      : 'Insufficient data to assess competitive positioning.',
    scrapingSources: allUrls,
    scrapedAt: timestamp,
    confidence: assessConfidence(orgResults, sectorResults, hasOrgData),
  };
}

/**
 * Extract AI initiative mentions from search snippets using keyword matching.
 * This is a heuristic fallback when the LLM is unavailable.
 */
function extractAIInitiativesFromSnippets(snippets: string[]): string[] {
  const aiKeywords = [
    'AI initiative',
    'AI project',
    'AI program',
    'machine learning',
    'deep learning',
    'AI-powered',
    'AI-driven',
    'AI platform',
    'AI center of excellence',
    'AI lab',
    'generative AI',
    'GenAI',
    'artificial intelligence',
    'AI transformation',
    'AI strategy',
    'AI adoption',
    'chatbot',
    'virtual assistant',
    'automation',
    'intelligent automation',
    'predictive analytics',
    'natural language processing',
    'computer vision',
    'AI partnership',
    'AI collaboration',
  ];

  const initiatives: string[] = [];
  const combined = snippets.join(' ').toLowerCase();

  for (const keyword of aiKeywords) {
    if (combined.includes(keyword.toLowerCase())) {
      // Find the snippet containing this keyword and extract a relevant phrase
      for (const snippet of snippets) {
        const lowerSnippet = snippet.toLowerCase();
        const idx = lowerSnippet.indexOf(keyword.toLowerCase());
        if (idx !== -1) {
          // Extract a window around the keyword
          const start = Math.max(0, idx - 30);
          const end = Math.min(snippet.length, idx + keyword.length + 60);
          const phrase = snippet.slice(start, end).trim();
          // Clean up the phrase
          const cleaned = phrase.replace(/^[^a-zA-Z]*/, '').replace(/[^a-zA-Z]*$/, '');
          if (cleaned.length > 10 && !initiatives.some((i) => i.includes(cleaned.slice(0, 20)))) {
            initiatives.push(cleaned);
          }
          break; // Only take the first snippet per keyword
        }
      }
    }
    if (initiatives.length >= 8) break;
  }

  return initiatives;
}

/**
 * Extract technology signals from search snippets using pattern matching.
 * This is a heuristic fallback when the LLM is unavailable.
 */
function extractTechSignalsFromSnippets(snippets: string[]): string[] {
  const techPatterns = [
    // Cloud providers
    /\b(AWS|Amazon Web Services)\b/gi,
    /\b(Azure|Microsoft Azure)\b/gi,
    /\b(GCP|Google Cloud|Google Cloud Platform)\b/gi,
    // AI/ML platforms
    /\b(TensorFlow)\b/gi,
    /\b(PyTorch)\b/gi,
    /\b(SageMaker)\b/gi,
    /\b(OpenAI)\b/gi,
    /\b(Azure AI)\b/gi,
    /\b(Vertex AI)\b/gi,
    /\b(Hugging Face)\b/gi,
    /\b(DataRobot)\b/gi,
    /\b(Palantir)\b/gi,
    /\b(C3\.ai)\b/gi,
    /\b(Databricks)\b/gi,
    /\b(Snowflake)\b/gi,
    // Data engineering
    /\b(Spark|Apache Spark)\b/gi,
    /\b(Kafka|Apache Kafka)\b/gi,
    /\b(Kubernetes)\b/gi,
    /\b(Docker)\b/gi,
    // ERPs & enterprise
    /\b(SAP)\b/gi,
    /\b(Salesforce)\b/gi,
    /\b(ServiceNow)\b/gi,
    /\b(Workday)\b/gi,
    /\b(Oracle)\b/gi,
    // Programming
    /\b(Python)\b/gi,
    /\b(R lang|R programming)\b/gi,
    /\b(Scala)\b/gi,
    // Databases
    /\b(PostgreSQL)\b/gi,
    /\b(MongoDB)\b/gi,
    /\b(Redis)\b/gi,
  ];

  const signals = new Set<string>();
  const combined = snippets.join(' ');

  for (const pattern of techPatterns) {
    const matches = combined.match(pattern);
    if (matches) {
      for (const match of matches) {
        signals.add(match.trim());
      }
    }
  }

  return Array.from(signals).slice(0, 15);
}

/**
 * Get default regulatory considerations for a sector.
 * These are well-known, factual regulations that don't require web search.
 */
function getDefaultRegulations(sector?: string): string[] {
  const regulationMap: Record<string, string[]> = {
    healthcare: [
      'HIPAA (Health Insurance Portability and Accountability Act)',
      'FDA AI/ML-based Software as a Medical Device (SaMD) guidance',
      'HITECH Act',
      'EU MDR (Medical Device Regulation) for AI-based medical devices',
    ],
    finance: [
      'SR 11-7 (Federal Reserve Model Risk Management guidance)',
      'Basel III/IV capital and risk management requirements',
      'SOX (Sarbanes-Oxley Act) compliance',
      'GDPR (General Data Protection Regulation) for EU operations',
      'EU AI Act high-risk classification for credit scoring',
    ],
    manufacturing: [
      'ISO 27001 information security management',
      'NIST Cybersecurity Framework for OT/IT convergence',
      'EU Machinery Regulation for AI-enabled equipment',
      'Industry-specific safety standards (ISO 13849, IEC 62443)',
    ],
    retail: [
      'GDPR and CCPA consumer data privacy regulations',
      'PCI DSS (Payment Card Industry Data Security Standard)',
      'EU AI Act for AI in consumer-facing applications',
      'FTC guidelines on AI-driven consumer decisions',
    ],
    government: [
      'FedRAMP for cloud service authorization',
      'NIST AI Risk Management Framework (AI RMF)',
      'OMB Memo M-24-10 on AI governance in federal agencies',
      'CISA cybersecurity requirements',
    ],
    technology: [
      'GDPR data protection and algorithmic transparency',
      'EU AI Act obligations for AI system providers',
      'CCPA/CPRA consumer privacy regulations',
      'SOC 2 Type II compliance for SaaS platforms',
    ],
    energy: [
      'NERC CIP (Critical Infrastructure Protection) standards',
      'IEC 62351 cybersecurity for power systems',
      'EU AI Act for critical infrastructure AI systems',
      'NRC regulations for nuclear facility AI applications',
    ],
    education: [
      'FERPA (Family Educational Rights and Privacy Act)',
      'COPPA (Children\'s Online Privacy Protection Act)',
      'GDPR for EU student data',
      'ADA/Section 508 accessibility requirements for AI tools',
    ],
  };

  return regulationMap[sector ?? ''] || [
    'GDPR (General Data Protection Regulation) where applicable',
    'EU AI Act risk classification requirements',
    'Industry-specific data protection regulations',
  ];
}
