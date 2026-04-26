/**
 * E-ARI Web Scraping / Context Enrichment Service
 *
 * Uses Tavily Search API for web search and DeepSeek Pro for synthesis to enrich
 * organizational context for AI readiness assessments.
 *
 * Environment variables:
 * - TAVILY_API_KEY: Tavily Search API key
 * - NVIDIA_API_KEY_PRO: DeepSeek Pro API key
 */

import { LLM_API_URL, LLM_MODEL, LLM_API_KEY } from './llm-config';

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

function cleanContent(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    // Drop markdown headers
    .filter((line) => !line.startsWith('#'))
    // Drop lines that are mostly a URL or contain image format tokens
    .filter((line) => !/https?:\/\/\S+/.test(line) && !/:format\(/.test(line))
    // Drop very short lines (nav crumbs, breadcrumbs, single words)
    .filter((line) => line.length > 30)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 250);
}

function parseLLMJson<T>(content: string): T {
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(jsonStr) as T;
}

function sanitizeText(text: string): string {
  return text
    .replace(/^#+\s*/gm, '')           // markdown headers
    .replace(/https?:\/\/\S+/g, '')    // URLs
    .replace(/:format\(\w+\)[).]?/g, '') // image format tokens
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1') // bold/italic
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function sanitizeContext(obj: {
  industryContext: string;
  orgSpecificContext: string;
  aiInitiatives: string[];
  techStackSignals: string[];
  regulatoryConsiderations: string[];
  competitiveLandscape: string;
}) {
  return {
    industryContext: sanitizeText(obj.industryContext || ''),
    orgSpecificContext: sanitizeText(obj.orgSpecificContext || ''),
    aiInitiatives: (obj.aiInitiatives || []).map(sanitizeText).filter((s) => s.length > 2),
    techStackSignals: (obj.techStackSignals || []).map(sanitizeText).filter((s) => s.length > 1),
    regulatoryConsiderations: (obj.regulatoryConsiderations || []).map(sanitizeText).filter((s) => s.length > 2),
    competitiveLandscape: sanitizeText(obj.competitiveLandscape || ''),
  };
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

async function glmComplete(systemPrompt: string, userPrompt: string, maxTokens: number = 1000): Promise<string | null> {
  const apiKey = LLM_API_KEY;
  if (!apiKey) {
    console.warn('[scraper] GEMINI_API_KEY not set');
    return null;
  }
  try {
    const res = await fetch(LLM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn('[scraper] LLM API error:', res.status, errText.slice(0, 200));
      return null;
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (error) {
    console.warn('[scraper] LLM completion error:', error instanceof Error ? error.message : error);
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

  // ── Step 1: Org-specific searches (reduced to 2 queries to stay within timeout) ──
  const orgSearchQueries = [
    `${orgName}${domainHint} AI artificial intelligence strategy initiatives`,
    `${orgName}${domainHint} technology digital transformation`,
  ];
  if (additionalContext) orgSearchQueries.push(`${orgName} ${additionalContext}`);

  const orgResults = (await Promise.all(orgSearchQueries.map((q) => tavilySearch(q, 4)))).flat();

  const seenUrls = new Set<string>();
  const uniqueOrgResults = orgResults.filter((r) => {
    if (seenUrls.has(r.url)) return false;
    seenUrls.add(r.url);
    return true;
  });

  // ── Step 2: Sector-specific searches (1 query) ──
  const sectorQueries = sectorInfo
    ? [`${sectorInfo.name} AI trends adoption 2025`]
    : ['enterprise AI adoption trends 2025'];

  const sectorResults = (await Promise.all(sectorQueries.map((q) => tavilySearch(q, 4)))).flat();

  const seenSectorUrls = new Set<string>();
  const uniqueSectorResults = sectorResults.filter((r) => {
    if (seenSectorUrls.has(r.url)) return false;
    seenSectorUrls.add(r.url);
    return true;
  });

  if (uniqueOrgResults.length === 0 && uniqueSectorResults.length === 0) {
    return buildFallbackContext(input, timestamp, 'No web search results returned');
  }

  // ── Step 3: LLM synthesis ──
  try {
    const orgSnippets = uniqueOrgResults
      .slice(0, 6)
      .map((r, i) => `[${i + 1}] ${r.title}: ${cleanContent(r.content)}`)
      .join('\n');

    const sectorSnippets = uniqueSectorResults
      .slice(0, 4)
      .map((r, i) => `[${i + 1}] ${r.title}: ${cleanContent(r.content)}`)
      .join('\n');

    const allSourceUrls = [
      ...uniqueOrgResults.slice(0, 6).map((r) => r.url),
      ...uniqueSectorResults.slice(0, 4).map((r) => r.url),
    ];

    const synthesisPrompt = `ORG: ${orgName}${sector ? ` | SECTOR: ${sectorName}` : ''}${additionalContext ? ` | CONTEXT: ${additionalContext}` : ''}

ORG SEARCH RESULTS:
${orgSnippets || 'No results.'}

SECTOR RESULTS:
${sectorSnippets || 'No results.'}

Return ONLY valid JSON. No markdown, no code fences, no explanation — raw JSON only.
{"industryContext":"2-3 plain sentences on AI trends in this sector","orgSpecificContext":"2-3 plain sentences on what is known about this specific org","aiInitiatives":["short initiative label"],"techStackSignals":["technology name"],"regulatoryConsiderations":["regulation name"],"competitiveLandscape":"2-3 plain sentences on competitive positioning"}

STRICT RULES:
- Every string value must be clean plain English — no markdown, no URLs, no hashtags, no image references, no special characters
- Only include facts directly supported by the search results above
- If nothing relevant is found for a field, use empty array [] or a short honest statement
- Each string field must be under 200 characters
- Do NOT copy-paste sentences from the search results verbatim`;

    const content = await glmComplete(
      'You are an AI readiness analyst. Extract insights from web search results and return valid JSON only. Be factual and concise.',
      synthesisPrompt,
      800,
    );

    if (!content) throw new Error('Empty GLM response');

    const raw = parseLLMJson<{
      industryContext: string;
      orgSpecificContext: string;
      aiInitiatives: string[];
      techStackSignals: string[];
      regulatoryConsiderations: string[];
      competitiveLandscape: string;
    }>(content);

    const parsed = sanitizeContext(raw);

    const hasOrgSpecificData =
      parsed.aiInitiatives.length > 0 ||
      parsed.techStackSignals.length > 0 ||
      parsed.orgSpecificContext.length > 50;

    return {
      orgName,
      websiteUrl,
      sector,
      industryContext: parsed.industryContext || 'Industry context could not be determined from available sources.',
      orgSpecificContext: parsed.orgSpecificContext || 'No organization-specific information found in web sources.',
      aiInitiatives: parsed.aiInitiatives.slice(0, 10),
      techStackSignals: parsed.techStackSignals.slice(0, 15),
      regulatoryConsiderations: parsed.regulatoryConsiderations.length > 0
        ? parsed.regulatoryConsiderations.slice(0, 8)
        : getDefaultRegulations(sector),
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
    .slice(0, 6)
    .map((r, i) => `[${i + 1}] "${r.title}" — ${cleanContent(r.content)}`)
    .join('\n');

  const content = await glmComplete(
    'You are an industry analyst. Write 3-5 plain English sentences summarising AI adoption trends in the given sector. Use only facts from the search results. No markdown, no headers, no bullet points, no URLs.',
    `Sector: ${sectorName}\n\nSearch results:\n${snippets}\n\nWrite a plain paragraph (3-5 sentences) summarising the key AI trends. Do not use markdown or copy raw text from the results.`,
    500,
  );

  if (content) return sanitizeText(content.trim());

  // Fallback: use titles only, never raw web content
  const titles = uniqueResults.slice(0, 4).map((r) => r.title).filter(Boolean);
  return titles.length > 0
    ? `Recent AI trends in the ${sectorName} sector include topics such as: ${titles.join('; ')}.`
    : `AI adoption in the ${sectorName} sector is accelerating. Key focus areas include operational efficiency, data-driven decision-making, and responsible AI governance.`;
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

  // Use article titles only — never raw web content which contains HTML/markdown artifacts
  const sectorTitles = sectorResults.slice(0, 3).map((r) => r.title).filter(Boolean);
  const orgTitles = orgResults.slice(0, 4).map((r) => r.title).filter(Boolean);

  return {
    orgName: input.orgName,
    websiteUrl: input.websiteUrl,
    sector: input.sector,
    industryContext: sectorInfo
      ? `${sectorInfo.name} organizations are actively investing in AI adoption. ${sectorTitles.length > 0 ? `Recent industry topics include: ${sectorTitles.slice(0, 2).join('; ')}.` : ''} Full AI readiness analysis will be generated from your assessment responses.`
      : 'AI adoption context for this sector is being compiled. Your assessment responses will inform sector-specific benchmarking.',
    orgSpecificContext: hasOrgData
      ? `Public information about ${input.orgName} was found across ${orgResults.length} sources. ${orgTitles.length > 0 ? `Topics found: ${orgTitles.slice(0, 2).join('; ')}.` : ''} ${input.additionalContext ? `Additional context provided: ${input.additionalContext}` : 'Complete your assessment for a full AI readiness analysis.'}`
      : `No public web information was found for ${input.orgName}. ${input.additionalContext ? `Using provided context: ${input.additionalContext}` : 'Your assessment responses will be used for analysis.'}`,
    aiInitiatives: extractAIInitiativesFromSnippets(allSnippets),
    techStackSignals: extractTechSignalsFromSnippets(allSnippets),
    regulatoryConsiderations: getDefaultRegulations(input.sector),
    competitiveLandscape: hasOrgData
      ? `${input.orgName} has a measurable digital presence. Competitive positioning relative to ${sectorInfo?.name ?? 'sector'} peers will be assessed once your AI readiness scores are computed.`
      : `Insufficient public data to assess ${input.orgName}'s competitive positioning. Sector benchmarking will apply once your assessment is complete.`,
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
