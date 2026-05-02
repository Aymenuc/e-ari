/**
 * E-ARI Web Scraping / Context Enrichment Service
 *
 * Tavily Search + Extract for evidence; LLM synthesis at temperature 0 with
 * citation markers [Sn] and a verification pass. Domain-scoped queries reduce wrong-entity drift.
 *
 * Environment:
 * - TAVILY_API_KEY
 * - LLM credentials via ./llm-config
 */

import { LLM_API_URL, LLM_MODEL, LLM_API_KEY } from "./llm-config";

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
  confidence: "high" | "medium" | "low" | "none";
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

interface TavilySearchOptions {
  maxResults?: number;
  include_domains?: string[];
  exclude_domains?: string[];
  topic?: "general" | "news";
  time_range?: "day" | "week" | "month" | "year";
  search_depth?: "basic" | "advanced";
}

const MAX_SNIPPET_CHARS = 1500;
const MAX_EXTRACT_CHARS = 3500;
const MAX_ORG_PROMPT_SNIPPETS = 10;
const MAX_SECTOR_PROMPT_SNIPPETS = 6;
const EXTRACT_URL_CAP = 3;

// ─── Sector mapping ─────────────────────────────────────────────────────────

const SECTOR_MAP: Record<string, { name: string; searchKeywords: string[] }> = {
  healthcare: {
    name: "Healthcare & Life Sciences",
    searchKeywords: ["healthcare AI", "medical AI adoption", "clinical AI", "health tech"],
  },
  finance: {
    name: "Financial Services & Banking",
    searchKeywords: ["fintech AI", "banking AI adoption", "financial services AI", "AI risk management"],
  },
  manufacturing: {
    name: "Manufacturing & Industrial",
    searchKeywords: ["Industry 4.0", "smart manufacturing AI", "industrial AI", "predictive maintenance"],
  },
  retail: {
    name: "Retail & E-Commerce",
    searchKeywords: ["retail AI", "e-commerce AI", "retail technology", "AI personalization"],
  },
  government: {
    name: "Government & Public Sector",
    searchKeywords: ["government AI", "public sector AI", "civic tech", "digital government"],
  },
  technology: {
    name: "Technology & Software",
    searchKeywords: ["tech company AI", "software AI", "SaaS AI", "AI platform"],
  },
  energy: {
    name: "Energy & Utilities",
    searchKeywords: ["energy AI", "utilities AI", "smart grid", "renewable energy AI"],
  },
  education: {
    name: "Education & EdTech",
    searchKeywords: ["education AI", "EdTech AI", "learning technology", "AI in education"],
  },
  general: {
    name: "General / Cross-Industry",
    searchKeywords: ["enterprise AI", "AI adoption", "AI transformation"],
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Strip noise but keep substantive short lines (dates, employee counts). */
function sanitizeEvidenceText(text: string, maxLen: number = MAX_SNIPPET_CHARS): string {
  let s = text.replace(/\r\n/g, "\n");
  s = s
    .replace(/https?:\/\/[^\s]+/g, " ")
    .replace(/:format\(\w+\)[).]?/g, " ")
    .replace(/^#+\s*/gm, "")
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}\n[…truncated…]`;
}

/**
 * Require org tokens in title or opening text to reduce wrong-company blending.
 */
function snippetMatchesOrg(orgName: string, title: string, content: string): boolean {
  const normalized = orgName.toLowerCase().replace(/[^\w\s]/g, " ").trim();
  const words = normalized.split(/\s+/).filter((w) => w.length > 1);
  const hay = `${title}\n${content.slice(0, 320)}`.toLowerCase();
  if (words.length === 0) return true;
  if (hay.includes(normalized)) return true;
  if (words.length === 1) return hay.includes(words[0]);
  const hits = words.filter((w) => hay.includes(w)).length;
  return hits >= Math.min(2, words.length);
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function parseLLMJson<T>(content: string): T {
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return JSON.parse(jsonStr) as T;
}

function sanitizeText(text: string): string {
  return text
    .replace(/^#+\s*/gm, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/:format\(\w+\)[).]?/g, "")
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
    .replace(/\s{2,}/g, " ")
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
    industryContext: sanitizeText(obj.industryContext || ""),
    orgSpecificContext: sanitizeText(obj.orgSpecificContext || ""),
    aiInitiatives: (obj.aiInitiatives || []).map(sanitizeText).filter((s) => s.length > 2),
    techStackSignals: (obj.techStackSignals || []).map(sanitizeText).filter((s) => s.length > 1),
    regulatoryConsiderations: (obj.regulatoryConsiderations || []).map(sanitizeText).filter((s) => s.length > 2),
    competitiveLandscape: sanitizeText(obj.competitiveLandscape || ""),
  };
}

function deriveConfidence(params: {
  orgSnippetCount: number;
  orgContextLen: number;
  initiativeCount: number;
  techCount: number;
  sectorSnippetCount: number;
}): "high" | "medium" | "low" | "none" {
  const hasOrgSignals =
    params.orgContextLen >= 80 || params.initiativeCount > 0 || params.techCount > 0;
  if (params.orgSnippetCount === 0 && !hasOrgSignals) {
    return params.sectorSnippetCount >= 3 ? "low" : "none";
  }
  const total = params.orgSnippetCount + params.sectorSnippetCount;
  if (hasOrgSignals && params.orgSnippetCount >= 4 && total >= 8) return "high";
  if (hasOrgSignals || total >= 5) return "medium";
  return "low";
}

async function tavilySearch(query: string, options: TavilySearchOptions = {}): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("[scraper] TAVILY_API_KEY not set");
    return [];
  }
  const maxResults = options.maxResults ?? 8;
  try {
    const body: Record<string, unknown> = {
      api_key: apiKey,
      query,
      max_results: maxResults,
      search_depth: options.search_depth ?? "basic",
    };
    if (options.include_domains?.length) body.include_domains = options.include_domains;
    if (options.exclude_domains?.length) body.exclude_domains = options.exclude_domains;
    if (options.topic) body.topic = options.topic;
    if (options.time_range) body.time_range = options.time_range;

    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      console.warn(`[scraper] Tavily search failed (${res.status}) for query: ${query.slice(0, 80)}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch (error) {
    console.warn(`[scraper] Tavily search error for query "${query.slice(0, 60)}":`, error);
    return [];
  }
}

async function tavilyExtract(urls: string[]): Promise<Array<{ url: string; raw_content: string }>> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || urls.length === 0) return [];
  try {
    const res = await fetch("https://api.tavily.com/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        urls: urls.slice(0, EXTRACT_URL_CAP),
        format: "text",
        extract_depth: "basic",
      }),
      signal: AbortSignal.timeout(35000),
    });
    if (!res.ok) {
      console.warn("[scraper] Tavily extract failed:", res.status);
      return [];
    }
    const data = await res.json();
    const results = Array.isArray(data.results) ? data.results : [];
    return results.map((r: { url: string; raw_content?: string }) => ({
      url: r.url,
      raw_content: r.raw_content || "",
    }));
  } catch (e) {
    console.warn("[scraper] Tavily extract error:", e);
    return [];
  }
}

async function glmComplete(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 1000,
  temperature: number = 0,
): Promise<string | null> {
  const apiKey = LLM_API_KEY;
  if (!apiKey) {
    console.warn("[scraper] LLM API key not set");
    return null;
  }
  try {
    const res = await fetch(LLM_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn("[scraper] LLM API error:", res.status, errText.slice(0, 200));
      return null;
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (error) {
    console.warn("[scraper] LLM completion error:", error instanceof Error ? error.message : error);
    return null;
  }
}

async function collectOrgResults(
  orgName: string,
  websiteUrl: string | undefined,
  additionalContext: string | undefined,
): Promise<TavilyResult[]> {
  const domain = websiteUrl ? extractDomain(websiteUrl) : null;
  const tasks: Promise<TavilyResult[]>[] = [];

  if (domain) {
    tasks.push(
      tavilySearch(
        `${orgName} artificial intelligence strategy initiatives digital transformation`,
        { maxResults: 5, include_domains: [domain], search_depth: "basic" },
      ),
    );
    tasks.push(
      tavilySearch(`${orgName} technology leadership company`, {
        maxResults: 4,
        include_domains: [domain],
      }),
    );
  }

  tasks.push(
    tavilySearch(`${orgName} company profile funding`, {
      maxResults: 5,
      include_domains: ["linkedin.com", "crunchbase.com"],
    }),
  );

  const y = new Date().getFullYear();
  tasks.push(
    tavilySearch(`${orgName} AI technology announcement ${y}`, {
      maxResults: 6,
      topic: "news",
      time_range: "year",
    }),
  );

  if (additionalContext?.trim()) {
    tasks.push(tavilySearch(`${orgName} ${additionalContext.trim()}`, { maxResults: 4 }));
  }

  const flat = (await Promise.all(tasks)).flat();
  const seen = new Set<string>();
  const unique: TavilyResult[] = [];

  for (const r of flat) {
    if (!r?.url || seen.has(r.url)) continue;
    const host = hostnameOf(r.url);
    const fromOrgDomain =
      domain && (host === domain || host.endsWith(`.${domain}`));
    const fromCanonical =
      host === "linkedin.com" ||
      host.endsWith(".linkedin.com") ||
      host === "crunchbase.com" ||
      host.endsWith(".crunchbase.com");

    if (fromOrgDomain || fromCanonical || snippetMatchesOrg(orgName, r.title, r.content)) {
      seen.add(r.url);
      unique.push({
        ...r,
        content: sanitizeEvidenceText(r.content || "", MAX_SNIPPET_CHARS),
      });
    }
  }

  return unique;
}

async function collectSectorResults(
  sectorInfo: { name: string; searchKeywords: string[] } | null,
): Promise<TavilyResult[]> {
  const y = new Date().getFullYear();
  const name = sectorInfo?.name ?? "enterprise organizations";
  const tasks = [
    tavilySearch(`${name} AI deployments case studies ${y}`, {
      maxResults: 4,
      topic: "news",
      time_range: "year",
    }),
    tavilySearch(`${name} AI regulation compliance ${y}`, {
      maxResults: 4,
      topic: "news",
      time_range: "year",
    }),
    tavilySearch(`${name} AI risks incidents ${y}`, {
      maxResults: 4,
      topic: "news",
      time_range: "year",
    }),
  ];
  if (!sectorInfo) {
    tasks.push(tavilySearch("enterprise AI adoption benchmarks trends", { maxResults: 3 }));
  }

  const flat = (await Promise.all(tasks)).flat();
  const seen = new Set<string>();
  const out: TavilyResult[] = [];
  for (const r of flat) {
    if (!r?.url || seen.has(r.url)) continue;
    seen.add(r.url);
    out.push({
      ...r,
      content: sanitizeEvidenceText(r.content || "", MAX_SNIPPET_CHARS),
    });
  }
  return out;
}

async function enrichWithExtract(orgResults: TavilyResult[], orgDomain: string | null): Promise<void> {
  const ranked = [...orgResults].sort((a, b) => {
    const ad = orgDomain && a.url.includes(orgDomain) ? 2 : 0;
    const bd = orgDomain && b.url.includes(orgDomain) ? 2 : 0;
    if (bd !== ad) return bd - ad;
    const al = /linkedin\.com|crunchbase\.com/.test(a.url) ? 1 : 0;
    const bl = /linkedin\.com|crunchbase\.com/.test(b.url) ? 1 : 0;
    if (bl !== al) return bl - al;
    return (b.score ?? 0) - (a.score ?? 0);
  });

  const urls: string[] = [];
  for (const r of ranked) {
    if (urls.length >= EXTRACT_URL_CAP) break;
    if (!urls.includes(r.url)) urls.push(r.url);
  }

  const extracted = await tavilyExtract(urls);
  for (const ex of extracted) {
    const row = orgResults.find((r) => r.url === ex.url);
    if (!row || !ex.raw_content?.trim()) continue;
    const merged = sanitizeEvidenceText(ex.raw_content, MAX_EXTRACT_CHARS);
    if (merged.length > (row.content?.length ?? 0)) {
      row.content = merged;
    }
  }
}

function buildNumberedSnippets(org: TavilyResult[], sector: TavilyResult[]): {
  block: string;
  urls: string[];
} {
  const lines: string[] = [];
  const urls: string[] = [];
  let i = 1;
  const orgSlice = org.slice(0, MAX_ORG_PROMPT_SNIPPETS);
  const sectorSlice = sector.slice(0, MAX_SECTOR_PROMPT_SNIPPETS);

  lines.push("ORG-SOURCES (prefer these for organization-specific claims):");
  for (const r of orgSlice) {
    lines.push(`[S${i}] TITLE: ${r.title}\nURL: ${r.url}\nTEXT: ${sanitizeEvidenceText(r.content, MAX_SNIPPET_CHARS)}`);
    urls.push(r.url);
    i++;
  }
  lines.push("\nSECTOR-SOURCES (sector trends only — do not attribute to the named organization unless explicit):");
  for (const r of sectorSlice) {
    lines.push(`[S${i}] TITLE: ${r.title}\nURL: ${r.url}\nTEXT: ${sanitizeEvidenceText(r.content, MAX_SNIPPET_CHARS)}`);
    urls.push(r.url);
    i++;
  }
  return { block: lines.join("\n\n"), urls };
}

type ParsedBlock = {
  industryContext: string;
  orgSpecificContext: string;
  aiInitiatives: string[];
  techStackSignals: string[];
  regulatoryConsiderations: string[];
  competitiveLandscape: string;
};

async function verifyGroundedJson(params: {
  orgName: string;
  numberedSnippets: string;
  parsed: ParsedBlock;
}): Promise<ParsedBlock> {
  const payload = JSON.stringify(params.parsed);
  const prompt = `Organization: ${params.orgName}

NUMBERED SOURCES (only factual claims supported here count as grounded):
${params.numberedSnippets}

MODEL OUTPUT (JSON):
${payload}

TASK: Return ONLY valid JSON with the SAME keys. Remove or shorten any sentence that is not directly supported by the cited source markers like [S3] appearing IN THAT SAME sentence for orgSpecificContext and competitiveLandscape. For industryContext, only cite sector sources ([S…] from SECTOR-SOURCES section). Remove initiatives or tech stack items unless a source explicitly ties them to ${params.orgName}. If nothing remains for a string field, use "" or [].

Raw JSON only — no markdown.`;

  const content = await glmComplete(
    "You are a strict fact-checker. Drop unsupported claims. JSON only.",
    prompt,
    1200,
    0,
  );
  if (!content) return params.parsed;
  try {
    return sanitizeContext(parseLLMJson<ParsedBlock>(content)) as ParsedBlock;
  } catch {
    return params.parsed;
  }
}

async function llmExtractSignalsFromSnippets(
  orgName: string,
  numberedSnippets: string,
): Promise<{ aiInitiatives: string[]; techStackSignals: string[] }> {
  const prompt = `Organization: ${orgName}

SOURCES:
${numberedSnippets}

Return ONLY JSON: {"aiInitiatives":[],"techStackSignals":[]}
Rules:
- aiInitiatives: initiatives explicitly attributed to ${orgName} in the sources — not generic vendor blog lines like "AI strategy partner".
- techStackSignals: technologies ${orgName} is stated to use — not mere mentions of a vendor pitching to unnamed customers.
- If unsure, return empty arrays.`;

  const content = await glmComplete(
    "Extract structured signals from sources only. JSON only.",
    prompt,
    600,
    0,
  );
  if (!content) return { aiInitiatives: [], techStackSignals: [] };
  try {
    const j = parseLLMJson<{ aiInitiatives?: string[]; techStackSignals?: string[] }>(content);
    return {
      aiInitiatives: (j.aiInitiatives || []).map(sanitizeText).filter((s) => s.length > 3).slice(0, 10),
      techStackSignals: (j.techStackSignals || []).map(sanitizeText).filter((s) => s.length > 1).slice(0, 15),
    };
  } catch {
    return { aiInitiatives: [], techStackSignals: [] };
  }
}

// ─── Main exports ────────────────────────────────────────────────────────────

export async function scrapeOrganizationContext(input: ScrapingInput): Promise<OrgContext> {
  const timestamp = new Date().toISOString();
  const { orgName, websiteUrl, sector, additionalContext } = input;
  const sectorInfo = sector ? SECTOR_MAP[sector] : null;
  const sectorName = sectorInfo?.name ?? sector ?? "";
  const orgDomain = websiteUrl ? extractDomain(websiteUrl) : null;

  const [uniqueOrgResults, uniqueSectorResults] = await Promise.all([
    collectOrgResults(orgName, websiteUrl, additionalContext),
    collectSectorResults(sectorInfo),
  ]);

  await enrichWithExtract(uniqueOrgResults, orgDomain);

  if (uniqueOrgResults.length === 0 && uniqueSectorResults.length === 0) {
    return buildFallbackContext(input, timestamp, "No web search results returned");
  }

  const { block: numberedBlock, urls: numberedUrls } = buildNumberedSnippets(
    uniqueOrgResults,
    uniqueSectorResults,
  );

  try {
    const synthesisPrompt = `ORG: ${orgName}${sector ? ` | SECTOR: ${sectorName}` : ""}${additionalContext ? ` | CONTEXT: ${additionalContext}` : ""}

${numberedBlock}

Return ONLY valid JSON — raw JSON, no markdown fences.
{
  "industryContext": "2–4 plain sentences on AI trends in this sector ONLY. Each sentence MUST end with a citation like [S7] pointing at a SECTOR-SOURCE.",
  "orgSpecificContext": "2–4 plain sentences about THIS organization ONLY if grounded in ORG-SOURCES. EVERY sentence MUST contain at least one citation [Sn] referencing ORG-SOURCES only.",
  "aiInitiatives": ["short label [Sn]"],
  "techStackSignals": ["technology [Sn]"],
  "regulatoryConsiderations": ["plain regulation note [Sn]"],
  "competitiveLandscape": "2–3 sentences; cite ORG-SOURCES with [Sn]; if insufficient org evidence, say so honestly and cite what exists."
}

RULES:
- Temperature-equivalent discipline: do NOT invent facts. If ORG-SOURCES do not identify the organization clearly, say evidence is thin.
- Each factual clause needs [Sn] from the numbered list above.
- Do NOT merge facts from unrelated companies.
- Strings plain English — no markdown headers, no bare URLs.`;

    const content = await glmComplete(
      "You are an AI readiness analyst. Ground every claim in numbered sources. JSON only.",
      synthesisPrompt,
      1400,
      0,
    );

    if (!content) throw new Error("Empty LLM response");

    let raw = parseLLMJson<ParsedBlock>(content);
    raw = await verifyGroundedJson({
      orgName,
      numberedSnippets: numberedBlock.slice(0, 28000),
      parsed: sanitizeContext(raw) as ParsedBlock,
    });

    const orgSnippetCount = uniqueOrgResults.length;
    const initiativeCount = raw.aiInitiatives.length;
    const techCount = raw.techStackSignals.length;

    const noneMsg = `We could not reliably match "${orgName}" in public web sources used here. Your assessment will rely primarily on self-reported answers; upload documents under Compliance if you need evidence-backed scoring.`;

    let orgSpecificContext =
      raw.orgSpecificContext ||
      (orgSnippetCount === 0 ? noneMsg : "No organization-specific sentences survived verification.");

    if (orgSnippetCount === 0 && initiativeCount === 0 && techCount === 0) {
      orgSpecificContext = noneMsg;
    }

    const confidence = deriveConfidence({
      orgSnippetCount,
      orgContextLen: orgSpecificContext.length,
      initiativeCount,
      techCount,
      sectorSnippetCount: uniqueSectorResults.length,
    });

    return {
      orgName,
      websiteUrl,
      sector,
      industryContext:
        raw.industryContext ||
        "Sector AI context was thin in retrieved sources; proceed with assessment responses for benchmarking.",
      orgSpecificContext,
      aiInitiatives: raw.aiInitiatives.slice(0, 10),
      techStackSignals: raw.techStackSignals.slice(0, 15),
      regulatoryConsiderations:
        raw.regulatoryConsiderations.length > 0
          ? raw.regulatoryConsiderations.slice(0, 8)
          : getDefaultRegulations(sector),
      competitiveLandscape:
        raw.competitiveLandscape ||
        "Insufficient grounded evidence to summarize competitive positioning from web sources alone.",
      scrapingSources: numberedUrls,
      scrapedAt: timestamp,
      confidence,
    };
  } catch (error) {
    console.error("[scraper] synthesis failed, LLM-assisted fallback:", error);
    return buildHonestFallbackFromResults(
      input,
      uniqueOrgResults,
      uniqueSectorResults,
      numberedBlock,
      timestamp,
    );
  }
}

export async function getSectorAITrends(sectorId: string): Promise<string> {
  const sectorInfo = SECTOR_MAP[sectorId];
  const sectorName = sectorInfo?.name ?? sectorId;
  const y = new Date().getFullYear();

  const queries = sectorInfo
    ? [
        `${sectorInfo.name} AI adoption deployments ${y}`,
        `${sectorInfo.name} AI regulation compliance ${y}`,
        `${sectorInfo.searchKeywords.slice(0, 2).join(" ")} outlook`,
      ]
    : [`${sectorName} AI trends adoption ${y}`, `${sectorName} artificial intelligence outlook`];

  const allResults = (await Promise.all(queries.map((q) => tavilySearch(q, { maxResults: 5 })))).flat();

  if (allResults.length === 0) {
    return `No recent AI trend information found for the ${sectorName} sector. Consider industry reports from reputable analysts for the latest insights.`;
  }

  const seenUrls = new Set<string>();
  const uniqueResults = allResults.filter((r) => {
    if (seenUrls.has(r.url)) return false;
    seenUrls.add(r.url);
    return true;
  });

  const snippets = uniqueResults
    .slice(0, 8)
    .map((r, i) => `[S${i + 1}] "${r.title}" — ${sanitizeEvidenceText(r.content, MAX_SNIPPET_CHARS)}`)
    .join("\n");

  const content = await glmComplete(
    "You are an industry analyst. Write 3–5 plain English sentences. Each sentence must end with a citation [Sn] matching the numbered snippets. Use temperature-equivalent discipline: no uncited claims.",
    `Sector: ${sectorName}\n\nSnippets:\n${snippets}\n\nParagraph only — no bullets or markdown.`,
    600,
    0,
  );

  if (content) return sanitizeText(content.trim());

  const titles = uniqueResults.slice(0, 4).map((r) => r.title).filter(Boolean);
  return titles.length > 0
    ? `Recent topics in ${sectorName} include: ${titles.join("; ")}. Add assessment detail for a fuller picture.`
    : `AI adoption in ${sectorName} is evolving; specific headlines were not retrieved.`;
}

export async function quickScrapeWebsite(url: string): Promise<QuickScrapeResult> {
  const domain = extractDomain(url);
  const searchResults = await tavilySearch(`${domain} company about technology`, {
    maxResults: 5,
    include_domains: domain ? [domain] : undefined,
  });

  if (searchResults.length === 0) {
    return { title: domain, description: "No information found for this website.", techSignals: [] };
  }

  const snippetsText = searchResults
    .slice(0, 5)
    .map((r, i) => `[${i + 1}] "${r.title}" — ${sanitizeEvidenceText(r.content, MAX_SNIPPET_CHARS)}`)
    .join("\n");

  const content = await glmComplete(
    'Extract organization name, brief description, technologies from snippets only. JSON: {"title":"","description":"","techSignals":[]}',
    snippetsText,
    400,
    0,
  );

  if (content) {
    try {
      const parsed = parseLLMJson<{ title: string; description: string; techSignals: string[] }>(content);
      return {
        title: parsed.title || searchResults[0]?.title || domain,
        description:
          parsed.description ||
          sanitizeEvidenceText(searchResults.slice(0, 3).map((r) => r.content).join(" "), 400),
        techSignals: Array.isArray(parsed.techSignals) ? parsed.techSignals.slice(0, 10) : [],
      };
    } catch {
      /* fall through */
    }
  }

  const descriptions = searchResults.slice(0, 3).map((r) => r.content).filter(Boolean);
  return {
    title: searchResults[0]?.title || domain,
    description: sanitizeEvidenceText(descriptions.join(" "), 400) || "No description available.",
    techSignals: [],
  };
}

// ─── Fallback builders ────────────────────────────────────────────────────────

function buildFallbackContext(input: ScrapingInput, timestamp: string, reason: string): OrgContext {
  const sectorInfo = input.sector ? SECTOR_MAP[input.sector] : null;
  const noneMsg = `We couldn't enrich "${input.orgName}" from public web sources (${reason}). Your assessment will rely on self-reported answers; use Compliance uploads for evidence-backed analysis where needed.`;

  return {
    orgName: input.orgName,
    websiteUrl: input.websiteUrl,
    sector: input.sector,
    industryContext: sectorInfo
      ? `Sector framing (${sectorInfo.name}): use assessment responses and any uploaded documents — automated sector headlines were not retrieved.`
      : "Industry AI context was not retrieved automatically.",
    orgSpecificContext: noneMsg,
    aiInitiatives: [],
    techStackSignals: [],
    regulatoryConsiderations: getDefaultRegulations(input.sector),
    competitiveLandscape:
      "Competitive positioning was not inferred — insufficient automated web evidence.",
    scrapingSources: [],
    scrapedAt: timestamp,
    confidence: "none",
  };
}

async function buildHonestFallbackFromResults(
  input: ScrapingInput,
  orgResults: TavilyResult[],
  sectorResults: TavilyResult[],
  numberedSnippets: string,
  timestamp: string,
): Promise<OrgContext> {
  const sectorInfo = input.sector ? SECTOR_MAP[input.sector] : null;
  const orgTitles = orgResults.slice(0, 6).map((r) => r.title).filter(Boolean);
  const sectorTitles = sectorResults.slice(0, 5).map((r) => r.title).filter(Boolean);
  const signals = await llmExtractSignalsFromSnippets(input.orgName, numberedSnippets.slice(0, 24000));

  const thinOrg = orgResults.length === 0;
  const orgSpecificContext = thinOrg
    ? `We could not reliably identify "${input.orgName}" in filtered public sources after synthesis failed. Self-reported answers and Compliance uploads carry the assessment.`
    : `Automated synthesis failed; partial headings retrieved about ${input.orgName}: ${orgTitles.slice(0, 3).join("; ") || "no titles"}. Verify before relying on this text.`;

  const industryContext =
    sectorTitles.length > 0
      ? `${sectorInfo?.name ?? "This sector"} — headlines only (unverified synthesis): ${sectorTitles.slice(0, 4).join("; ")}.`
      : sectorInfo
        ? `AI adoption varies widely in ${sectorInfo.name}; detailed scoring should come from your questionnaire responses.`
        : "Sector AI headlines were not retrieved.";

  const confidence =
    thinOrg && sectorResults.length === 0 ? "none" : thinOrg ? "low" : sectorResults.length >= 3 ? "medium" : "low";

  return {
    orgName: input.orgName,
    websiteUrl: input.websiteUrl,
    sector: input.sector,
    industryContext,
    orgSpecificContext,
    aiInitiatives: signals.aiInitiatives,
    techStackSignals: signals.techStackSignals,
    regulatoryConsiderations: getDefaultRegulations(input.sector),
    competitiveLandscape:
      thinOrg || orgTitles.length === 0
        ? "Competitive positioning was not inferred automatically."
        : `Headline-only signals (${orgTitles.slice(0, 2).join("; ")}) — treat as unverified.`,
    scrapingSources: [...orgResults.map((r) => r.url), ...sectorResults.map((r) => r.url)],
    scrapedAt: timestamp,
    confidence,
  };
}

function getDefaultRegulations(sector?: string): string[] {
  const regulationMap: Record<string, string[]> = {
    healthcare: [
      "HIPAA (Health Insurance Portability and Accountability Act)",
      "FDA AI/ML-based Software as a Medical Device (SaMD) guidance",
      "HITECH Act",
      "EU MDR (Medical Device Regulation) for AI-based medical devices",
    ],
    finance: [
      "SR 11-7 (Federal Reserve Model Risk Management guidance)",
      "Basel III/IV capital and risk management requirements",
      "SOX (Sarbanes-Oxley Act) compliance",
      "GDPR (General Data Protection Regulation) for EU operations",
      "EU AI Act high-risk classification for credit scoring",
    ],
    manufacturing: [
      "ISO 27001 information security management",
      "NIST Cybersecurity Framework for OT/IT convergence",
      "EU Machinery Regulation for AI-enabled equipment",
      "Industry-specific safety standards (ISO 13849, IEC 62443)",
    ],
    retail: [
      "GDPR and CCPA consumer data privacy regulations",
      "PCI DSS (Payment Card Industry Data Security Standard)",
      "EU AI Act for AI in consumer-facing applications",
      "FTC guidelines on AI-driven consumer decisions",
    ],
    government: [
      "FedRAMP for cloud service authorization",
      "NIST AI Risk Management Framework (AI RMF)",
      "OMB Memo M-24-10 on AI governance in federal agencies",
      "CISA cybersecurity requirements",
    ],
    technology: [
      "GDPR data protection and algorithmic transparency",
      "EU AI Act obligations for AI system providers",
      "CCPA/CPRA consumer privacy regulations",
      "SOC 2 Type II compliance for SaaS platforms",
    ],
    energy: [
      "NERC CIP (Critical Infrastructure Protection) standards",
      "IEC 62351 cybersecurity for power systems",
      "EU AI Act for critical infrastructure AI systems",
      "NRC regulations for nuclear facility AI applications",
    ],
    education: [
      "FERPA (Family Educational Rights and Privacy Act)",
      "COPPA (Children's Online Privacy Protection Act)",
      "GDPR for EU student data",
      "ADA/Section 508 accessibility requirements for AI tools",
    ],
  };

  return (
    regulationMap[sector ?? ""] || [
      "GDPR (General Data Protection Regulation) where applicable",
      "EU AI Act risk classification requirements",
      "Industry-specific data protection regulations",
    ]
  );
}
