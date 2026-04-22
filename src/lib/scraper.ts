/**
 * E-ARI Web Scraping / Context Enrichment Service
 *
 * Uses Tavily Search API for web search and GLM-5.1 for synthesis to enrich
 * organizational context for AI readiness assessments.
 *
 * Environment variables:
 * - TAVILY_API_KEY: Tavily Search API key
 * - GLM_API_KEY: GLM-5.1 API key
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ScrapingInput {
  orgName: string;
  websiteUrl?: string;
  sector?: string;
  additionalContext?: string;
}

export interface OrgContext {
  orgName: string;
  websiteUrl?: string;
  sector?: string;
  industryContext: string;
  orgSpecificContext: string;
  aiInitiatives: string[];
  techStackSignals: string[];
  regulatoryConsiderations: string[];
  competitiveLandscape: string;
  scrapingSources: string[];
  scrapedAt: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface QuickScrapeResult {
  title: string;
  description: string;
  techSignals: string[];
}

interface TavilyResult {
  url: string;
  title: string;
  content: string;
  score: number;
}

// ─── Sector name mapping ────────────────────────────────────────────────────

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

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function parseLLMJson<T>(content: string): T {
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(jsonStr) as T;
}

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

async function tavilySearch(query: string, maxResults: number = 8): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn('[scraper] TAVILY_API_KEY not set');
    return [];
  }
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, query, max_results: maxResults, search_depth: 'basic' }),
    });
    if (!res.ok) {
      console.warn(`[scraper] Tavily search failed (${res.status}) for query: ${query}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch (error) {
    console.warn(`[scraper] Tavily search error for query "${query}":`, error);
    return [];
  }
}

async function glmComplete(systemPrompt: string, userPrompt: string, maxTokens: number = 1500): Promise<string | null> {
  const apiKey = process.env.GLM_API_KEY;
  if (!apiKey) {
    console.warn('[scraper] GLM_API_KEY not set');
    return null;
  }
  try {
    const res = await fetch('https://api.us-west-2.modal.direct/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'zai-org/GLM-5.1-FP8',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.2,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (error) {
    console.warn('[scraper] GLM completion error:', error);
    return null;
  }
}

// ─── Main Exported Functions ─────────────────────────────────────────────────

export async function scrapeOrganizationContext(input: ScrapingInput): Promise<OrgContext> {
  const timestamp = new Date().toISOString();
  const { orgName, websiteUrl, sector, additionalContext } = input;

  const domainHint = websiteUrl ? ` (${extractDomain(websiteUrl)})` : '';
  const sectorInfo = sector ? SECTOR_MAP[sector] : null;
  const sectorName = sectorInfo?.name ?? sector ?? '';

  // ── Step 1: Org-specific searches ──
  const orgSearchQueries = [
    `${orgName}${domainHint} AI artificial intelligence initiatives`,
    `${orgName}${domainHint} technology stack digital transformation`,
    `${orgName}${domainHint} partnerships AI machine learning`,
  ];
  if (sectorName) orgSearchQueries.push(`${orgName}${domainHint} ${sectorName} AI adoption`);
  if (additionalContext) orgSearchQueries.push(`${orgName} ${additionalContext}`);

  const orgResults = (await Promise.all(orgSearchQueries.map((q) => tavilySearch(q, 8)))).flat();

  const seenUrls = new Set<string>();
  const uniqueOrgResults = orgResults.filter((r) => {
    if (seenUrls.has(r.url)) return false;
    seenUrls.add(r.url);
    return true;
  });

  // ── Step 2: Sector-specific searches ──
  const sectorQueries = sectorInfo
    ? [
        `${sectorInfo.name} AI trends 2024 2025`,
        `${sectorInfo.name} AI regulation compliance requirements`,
        `${sectorInfo.searchKeywords[0]} ${sectorInfo.searchKeywords[1]} industry outlook`,
      ]
    : ['enterprise AI adoption trends 2024 2025', 'AI regulation compliance enterprise requirements'];

  const sectorResults = (await Promise.all(sectorQueries.map((q) => tavilySearch(q, 6)))).flat();

  const seenSectorUrls = new Set<string>();
  const uniqueSectorResults = sectorResults.filter((r) => {
    if (seenSectorUrls.has(r.url)) return false;
    seenSectorUrls.add(r.url);
    return true;
  });

  if (uniqueOrgResults.length === 0 && uniqueSectorResults.length === 0) {
    return buildFallbackContext(input, timestamp, 'No web search results returned');
  }

  // ── Step 3: GLM synthesis ──
  try {
    const orgSnippets = uniqueOrgResults
      .slice(0, 15)
      .map((r, i) => `[${i + 1}] "${r.title}" — ${r.content} (Source: ${extractDomain(r.url)})`)
      .join('\n');

    const sectorSnippets = uniqueSectorResults
      .slice(0, 10)
      .map((r, i) => `[${i + 1}] "${r.title}" — ${r.content} (Source: ${extractDomain(r.url)})`)
      .join('\n');

    const allSourceUrls = [
      ...uniqueOrgResults.slice(0, 15).map((r) => r.url),
      ...uniqueSectorResults.slice(0, 10).map((r) => r.url),
    ];

    const synthesisPrompt = `ORGANIZATION: ${orgName}${websiteUrl ? `\nWEBSITE: ${websiteUrl}` : ''}${sector ? `\nSECTOR: ${sectorName}` : ''}${additionalContext ? `\nADDITIONAL CONTEXT: ${additionalContext}` : ''}

ORGANIZATION SEARCH RESULTS:
${orgSnippets || 'No organization-specific results found.'}

SECTOR/INDUSTRY SEARCH RESULTS:
${sectorSnippets || 'No sector-specific results found.'}

RULES:
- Base ALL findings ONLY on the search results provided above. Do not fabricate or infer information not supported by the snippets.
- If the search results don't mention specific AI initiatives for this organization, return an empty array for aiInitiatives.
- If the search results don't mention specific technologies, return an empty array for techStackSignals.
- For regulatory considerations, combine what's in the search results with well-known sector regulations (e.g., HIPAA for healthcare, SOX for finance).
- Be conservative: it's better to return less information than to fabricate.
- Keep all text fields concise and actionable (2-4 sentences max).

Respond in this exact JSON format:
{
  "industryContext": "2-3 sentence summary of AI trends in this sector",
  "orgSpecificContext": "2-3 sentence summary of what search results reveal about THIS organization's AI readiness",
  "aiInitiatives": ["initiative 1", "initiative 2"],
  "techStackSignals": ["technology 1", "technology 2"],
  "regulatoryConsiderations": ["regulation 1", "regulation 2"],
  "competitiveLandscape": "2-3 sentence assessment of how this organization compares to sector peers"
}`;

    const content = await glmComplete(
      'You are an enterprise AI readiness research analyst. Extract only factual, source-supported insights from web search results. Never fabricate information. Be conservative and precise.',
      synthesisPrompt,
      1500,
    );

    if (!content) throw new Error('Empty GLM response');

    const parsed = parseLLMJson<{
      industryContext: string;
      orgSpecificContext: string;
      aiInitiatives: string[];
      techStackSignals: string[];
      regulatoryConsiderations: string[];
      competitiveLandscape: string;
    }>(content);

    const hasOrgSpecificData =
      (Array.isArray(parsed.aiInitiatives) && parsed.aiInitiatives.length > 0) ||
      (Array.isArray(parsed.techStackSignals) && parsed.techStackSignals.length > 0) ||
      (typeof parsed.orgSpecificContext === 'string' && parsed.orgSpecificContext.length > 50);

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
      competitiveLandscape:
        parsed.competitiveLandscape || 'Competitive positioning could not be assessed from available sources.',
      scrapingSources: allSourceUrls,
      scrapedAt: timestamp,
      confidence: assessConfidence(uniqueOrgResults, uniqueSectorResults, hasOrgSpecificData),
    };
  } catch (error) {
    console.error('[scraper] GLM synthesis failed, building context from raw results:', error);
    return buildContextFromRawResults(input, uniqueOrgResults, uniqueSectorResults, timestamp);
  }
}

export async function getSectorAITrends(sectorId: string): Promise<string> {
  const sectorInfo = SECTOR_MAP[sectorId];
  const sectorName = sectorInfo?.name ?? sectorId;

  const queries = sectorInfo
    ? [
        `${sectorInfo.name} AI trends adoption 2024 2025`,
        `${sectorInfo.searchKeywords.join(' ')} industry outlook`,
      ]
    : [
        `${sectorName} AI trends adoption 2024 2025`,
        `${sectorName} artificial intelligence industry outlook`,
      ];

  const allResults = (await Promise.all(queries.map((q) => tavilySearch(q, 6)))).flat();

  if (allResults.length === 0) {
    return `No recent AI trend information found for the ${sectorName} sector. Consider researching industry reports from McKinsey, Gartner, or Forrester for the latest insights.`;
  }

  const seenUrls = new Set<string>();
  const uniqueResults = allResults.filter((r) => {
    if (seenUrls.has(r.url)) return false;
    seenUrls.add(r.url);
    return true;
  });

  const snippets = uniqueResults
    .slice(0, 8)
    .map((r, i) => `[${i + 1}] "${r.title}" — ${r.content}`)
    .join('\n');

  const content = await glmComplete(
    'You are an industry analyst specializing in AI adoption trends. Synthesize search results into a concise, factual trend summary. Do not fabricate data. Reference only what the search results support. Write 3-5 sentences.',
    `Based on these search results about AI trends in the ${sectorName} sector, provide a concise summary:\n\n${snippets}`,
    500,
  );

  if (content) return content.trim();

  return uniqueResults
    .slice(0, 4)
    .map((r) => r.content)
    .filter(Boolean)
    .join(' ');
}

export async function quickScrapeWebsite(url: string): Promise<QuickScrapeResult> {
  const domain = extractDomain(url);
  const searchResults = await tavilySearch(`${domain} company about technology`, 5);

  if (searchResults.length === 0) {
    return { title: domain, description: 'No information found for this website.', techSignals: [] };
  }

  const snippetsText = searchResults
    .slice(0, 5)
    .map((r, i) => `[${i + 1}] "${r.title}" — ${r.content}`)
    .join('\n');

  const content = await glmComplete(
    'Extract the organization name, a brief description (1-2 sentences), and any mentioned technologies/platforms from these search results. Respond in JSON: {"title": "...", "description": "...", "techSignals": ["..."]}. Only include facts from the snippets.',
    snippetsText,
    300,
  );

  if (content) {
    try {
      const parsed = parseLLMJson<{ title: string; description: string; techSignals: string[] }>(content);
      return {
        title: parsed.title || searchResults[0]?.title || domain,
        description: parsed.description || searchResults.slice(0, 3).map((r) => r.content).join(' ').slice(0, 300),
        techSignals: Array.isArray(parsed.techSignals) ? parsed.techSignals.slice(0, 10) : [],
      };
    } catch {
      // fall through to raw fallback
    }
  }

  const descriptions = searchResults.slice(0, 3).map((r) => r.content).filter(Boolean);
  return {
    title: searchResults[0]?.title || domain,
    description: descriptions.join(' ').slice(0, 300) || 'No description available.',
    techSignals: extractTechSignalsFromSnippets(descriptions),
  };
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

function buildFallbackContext(input: ScrapingInput, timestamp: string, reason: string): OrgContext {
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

function buildContextFromRawResults(
  input: ScrapingInput,
  orgResults: TavilyResult[],
  sectorResults: TavilyResult[],
  timestamp: string,
): OrgContext {
  const allSnippets = [...orgResults.map((r) => r.content), ...sectorResults.map((r) => r.content)].filter(Boolean);
  const allUrls = [...orgResults.map((r) => r.url), ...sectorResults.map((r) => r.url)];
  const sectorInfo = input.sector ? SECTOR_MAP[input.sector] : null;
  const hasOrgData = orgResults.length > 0;

  return {
    orgName: input.orgName,
    websiteUrl: input.websiteUrl,
    sector: input.sector,
    industryContext: sectorInfo
      ? `AI trends in ${sectorInfo.name}: ${sectorResults.slice(0, 3).map((r) => r.content).filter(Boolean).join(' ').slice(0, 400) || 'No sector trends could be extracted.'}`
      : 'Sector-specific trends could not be determined.',
    orgSpecificContext: hasOrgData
      ? orgResults.slice(0, 4).map((r) => r.content).filter(Boolean).join(' ').slice(0, 500)
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

function extractAIInitiativesFromSnippets(snippets: string[]): string[] {
  const aiKeywords = [
    'AI initiative', 'AI project', 'AI program', 'machine learning', 'deep learning',
    'AI-powered', 'AI-driven', 'AI platform', 'AI center of excellence', 'AI lab',
    'generative AI', 'GenAI', 'artificial intelligence', 'AI transformation', 'AI strategy',
    'AI adoption', 'chatbot', 'virtual assistant', 'automation', 'intelligent automation',
    'predictive analytics', 'natural language processing', 'computer vision',
    'AI partnership', 'AI collaboration',
  ];

  const initiatives: string[] = [];
  for (const keyword of aiKeywords) {
    for (const snippet of snippets) {
      const idx = snippet.toLowerCase().indexOf(keyword.toLowerCase());
      if (idx !== -1) {
        const start = Math.max(0, idx - 30);
        const end = Math.min(snippet.length, idx + keyword.length + 60);
        const cleaned = snippet.slice(start, end).trim().replace(/^[^a-zA-Z]*/, '').replace(/[^a-zA-Z]*$/, '');
        if (cleaned.length > 10 && !initiatives.some((i) => i.includes(cleaned.slice(0, 20)))) {
          initiatives.push(cleaned);
        }
        break;
      }
    }
    if (initiatives.length >= 8) break;
  }
  return initiatives;
}

function extractTechSignalsFromSnippets(snippets: string[]): string[] {
  const techPatterns = [
    /\b(AWS|Amazon Web Services)\b/gi, /\b(Azure|Microsoft Azure)\b/gi,
    /\b(GCP|Google Cloud|Google Cloud Platform)\b/gi, /\b(TensorFlow)\b/gi,
    /\b(PyTorch)\b/gi, /\b(SageMaker)\b/gi, /\b(OpenAI)\b/gi,
    /\b(Azure AI)\b/gi, /\b(Vertex AI)\b/gi, /\b(Hugging Face)\b/gi,
    /\b(DataRobot)\b/gi, /\b(Palantir)\b/gi, /\b(C3\.ai)\b/gi,
    /\b(Databricks)\b/gi, /\b(Snowflake)\b/gi, /\b(Spark|Apache Spark)\b/gi,
    /\b(Kafka|Apache Kafka)\b/gi, /\b(Kubernetes)\b/gi, /\b(Docker)\b/gi,
    /\b(SAP)\b/gi, /\b(Salesforce)\b/gi, /\b(ServiceNow)\b/gi,
    /\b(Workday)\b/gi, /\b(Oracle)\b/gi, /\b(Python)\b/gi,
    /\b(PostgreSQL)\b/gi, /\b(MongoDB)\b/gi, /\b(Redis)\b/gi,
  ];

  const signals = new Set<string>();
  const combined = snippets.join(' ');
  for (const pattern of techPatterns) {
    const matches = combined.match(pattern);
    if (matches) matches.forEach((m) => signals.add(m.trim()));
  }
  return Array.from(signals).slice(0, 15);
}

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
      "COPPA (Children's Online Privacy Protection Act)",
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
