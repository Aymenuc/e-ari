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

import {
  LLM_API_URL,
  LLM_MODEL,
  LLM_API_KEY,
  LLM_API_URL_PRO,
  LLM_MODEL_PRO,
  DEEPSEEK_API_URL,
  DEEPSEEK_MODEL,
  DEEPSEEK_API_KEY,
} from "./llm-config";
import { getDefaultRegulations, getVocab, type EntityType } from "./entity-types";

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
  /** Entity type (commercial / public_sector / nonprofit / academic /
   *  international_body / unknown) — drives narrative voice, regulatory
   *  defaults, and which UI modules render. See src/lib/entity-types.ts. */
  entityType?: EntityType;
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

/**
 * Robust LLM-JSON parser. gemini-2.5-flash regularly emits one of:
 *   • markdown-fenced JSON
 *   • trailing commentary after the closing brace
 *   • unescaped double-quotes inside string values
 *   • truncation when max_tokens is hit
 *
 * We strip the fences, slice from the first '{' to the last '}', then
 * escape stray quotes that appear inside string values. If that still
 * fails we make one last attempt by closing any open braces. Anything
 * that still won't parse throws — the caller catches and falls back.
 */
function parseLLMJson<T>(content: string): T {
  let s = content.trim();
  // Strip ```json … ``` fences
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  // Slice from first { to last } (drops any prologue/epilogue text)
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) s = s.slice(first, last + 1);

  try {
    return JSON.parse(s) as T;
  } catch {
    // Repair pass: walk the string, track whether we're inside a string
    // value, and escape any unescaped " that isn't a structural quote.
    let out = "";
    let inStr = false;
    let prev = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '"' && prev !== "\\") {
        if (!inStr) {
          inStr = true;
          out += ch;
        } else {
          // We're inside a string. Decide if this quote is the terminator
          // (next non-space is , } ] : ) or a stray content quote.
          let j = i + 1;
          while (j < s.length && /\s/.test(s[j]!)) j++;
          const next = s[j] ?? "";
          if (next === "," || next === "}" || next === "]" || next === ":") {
            inStr = false;
            out += ch;
          } else {
            out += '\\"'; // escape stray quote
          }
        }
      } else {
        out += ch;
      }
      prev = ch;
    }
    try {
      return JSON.parse(out) as T;
    } catch {
      // Last-ditch: close any open braces/brackets the model truncated.
      const open = (out.match(/\{/g) || []).length;
      const close = (out.match(/\}/g) || []).length;
      const obrack = (out.match(/\[/g) || []).length;
      const cbrack = (out.match(/\]/g) || []).length;
      let patched = out;
      // If we ended mid-string, terminate it
      if (inStr) patched += '"';
      patched += "]".repeat(Math.max(0, obrack - cbrack));
      patched += "}".repeat(Math.max(0, open - close));
      return JSON.parse(patched) as T;
    }
  }
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
    // Tavily migrated to Bearer-token auth. The legacy `api_key` body field
    // returns 401/403 on newer keys, which previously fell through silently
    // here and bubbled up as an empty fallback context — making the client
    // see "context fetched" with no actual content. Send the key both ways
    // for backwards compatibility.
    const body: Record<string, unknown> = {
      query,
      max_results: maxResults,
      search_depth: options.search_depth ?? "basic",
      api_key: apiKey,
    };
    if (options.include_domains?.length) body.include_domains = options.include_domains;
    if (options.exclude_domains?.length) body.exclude_domains = options.exclude_domains;
    if (options.topic) body.topic = options.topic;
    if (options.time_range) body.time_range = options.time_range;

    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.warn(`[scraper] Tavily search failed (${res.status}) for query "${query.slice(0, 80)}": ${errBody.slice(0, 200)}`);
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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        urls: urls.slice(0, EXTRACT_URL_CAP),
        format: "text",
        extract_depth: "basic",
        api_key: apiKey, // legacy compat
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
  jsonMode: boolean = true,
  backend: 'flash' | 'pro' | 'deepseek' = 'flash',
): Promise<string | null> {
  // Pick endpoint + key per backend.
  // - flash: Gemini 2.5 Flash — cheap utility calls (classifier, verifier)
  // - pro:   Gemini 2.5 Pro   — fallback only; burns thinking tokens
  // - deepseek: DeepSeek V4   — synthesis backbone; no thinking-token gotcha,
  //   cleaner JSON adherence, ~10× cheaper than Pro for our prompt sizes
  let apiUrl: string;
  let model: string;
  let apiKey: string;
  if (backend === 'deepseek') {
    apiUrl = DEEPSEEK_API_URL;
    model = DEEPSEEK_MODEL;
    apiKey = DEEPSEEK_API_KEY;
  } else if (backend === 'pro') {
    apiUrl = LLM_API_URL_PRO;
    model = LLM_MODEL_PRO;
    apiKey = LLM_API_KEY;
  } else {
    apiUrl = LLM_API_URL;
    model = LLM_MODEL;
    apiKey = LLM_API_KEY;
  }
  if (!apiKey) {
    console.warn(`[scraper] LLM API key not set for backend=${backend}`);
    return null;
  }
  // Only Gemini Pro needs the thinking-budget headroom.
  const effectiveMaxTokens = backend === 'pro'
    ? Math.max(maxTokens + 8000, 10000)
    : maxTokens;
  try {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: effectiveMaxTokens,
      temperature,
    };
    if (jsonMode) {
      body.response_format = { type: "json_object" };
    }
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn("[scraper] LLM API error:", res.status, errText.slice(0, 200));
      return null;
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? null;
    if (!content) {
      // Empty completion almost always means thinking tokens consumed the
      // whole max_tokens budget. Log the diagnostics so future regressions
      // are obvious without re-instrumenting the route.
      console.warn(
        `[scraper] Empty LLM completion: model=${model} finish_reason=${data.choices?.[0]?.finish_reason} ` +
          `completion_tokens=${data.usage?.completion_tokens} total=${data.usage?.total_tokens}`,
      );
    }
    return content;
  } catch (error) {
    console.warn("[scraper] LLM completion error:", error instanceof Error ? error.message : error);
    return null;
  }
}

// ─── Sector auto-classification ─────────────────────────────────────────────
// Avoids the `general` cross-industry trap that pulled unrelated headlines
// into the synthesis prompt for famous orgs like Microsoft.

const SECTOR_KEYS = Object.keys(SECTOR_MAP).filter((k) => k !== "general");

async function classifySector(
  orgName: string,
  websiteUrl: string | undefined,
): Promise<string | null> {
  const domain = websiteUrl ? extractDomain(websiteUrl) : null;
  const keysList = SECTOR_KEYS.join(", ");

  // Quick public lookup snippet for grounding. We do this for every org —
  // not just when a domain was provided — because without a snippet the
  // classifier only sees the literal org name string and guesses wrong on
  // ambiguous cases (e.g. "UNU egov" → "education" instead of "government"
  // because the model latches onto the word "university").
  let snippet = "";
  try {
    const r = await tavilySearch(`${orgName} overview`, {
      maxResults: 2,
      ...(domain ? { include_domains: [domain] } : {}),
      search_depth: "basic",
    });
    snippet = r
      .slice(0, 2)
      .map((x) => `${x.title}: ${(x.content || "").slice(0, 320)}`)
      .join("\n");
  } catch {
    /* ignore — classifier degrades gracefully without grounding */
  }

  // The classifier was systematically picking the wrong sector for orgs
  // whose name includes "university" or "school" but whose actual MANDATE
  // is in another domain (UNU-EGOV → e-government, not education;
  // research arm of a hospital → healthcare, not education). The new
  // prompt makes that distinction explicit and gives one worked example.
  //
  // We also classify ENTITY TYPE in the same call (commercial vs. public-
  // sector vs. NGO vs. academic vs. international body) so the rest of
  // the platform can adapt voice, regulations, and module visibility
  // without a second round-trip.
  const sys = `Classify two things about the organization in ONE response:
(1) SECTOR — what work / domain the org actually does (its mandate). NOT its legal entity type.
(2) ENTITY_TYPE — what kind of organisation it is.

Critical disambiguation for SECTOR:
- A "university", "research institute", or "school" in the name is NOT automatically "education". It is "education" only if the mandate is teaching/learning/EdTech.
- If the mandate is digital governance, e-government, public-sector policy, or regulation, pick "government".
- A research unit's sector = the sector it researches, not "education".
- Worked example: "United Nations University Operating Unit on Policy-Driven Electronic Governance" → SECTOR: government, ENTITY_TYPE: international_body.

ENTITY_TYPE keys:
- commercial: for-profit company, startup, SaaS, corporation
- public_sector: government agency, ministry, regulator, public body
- nonprofit: NGO, foundation, charity, association
- academic: university, research institute, school
- international_body: UN body, OECD, World Bank, multilateral
- unknown: cannot tell

Output format — exactly two lines, no prose:
SECTOR: <key or unknown>
ENTITY_TYPE: <key or unknown>`;
  const user = `Organization: ${orgName}${domain ? `\nDomain: ${domain}` : ""}${snippet ? `\n\nPublic snippet:\n${snippet}` : "\n\n(No public snippet available — classify from the org name only.)"}

Allowed SECTOR keys: ${keysList}, unknown
Allowed ENTITY_TYPE keys: commercial, public_sector, nonprofit, academic, international_body, unknown`;

  try {
    // Use DeepSeek — follows the two-line output contract more reliably
    // than Flash, and one classification call is essentially free.
    const out = await glmComplete(sys, user, 80, 0, false, 'deepseek');
    if (!out) return null;
    // Parse the two-line response — tolerant of extra whitespace / casing.
    const lines = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let sectorKey = '';
    let entityKey = '';
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.startsWith('sector:')) {
        sectorKey = lower.replace('sector:', '').trim().replace(/[^a-z_]/g, '');
      } else if (lower.startsWith('entity_type:')) {
        entityKey = lower.replace('entity_type:', '').trim().replace(/[^a-z_]/g, '');
      }
    }
    // Cache the entity-type pick on the orgName key so the synthesis path
    // can read it without re-running the classifier.
    if (entityKey) {
      lastClassifiedEntityType.set(orgName.toLowerCase(), entityKey);
    }
    // Log the classifier's picks so production failures are diagnosable
    // without re-instrumenting. Search "[scraper] classified" in Vercel
    // logs to confirm the right sector + entity_type were detected.
    console.log(
      `[scraper] classified org="${orgName.slice(0, 60)}" → sector=${sectorKey || 'unknown'} entity_type=${entityKey || 'unknown'} (raw: ${out.slice(0, 200).replace(/\n/g, ' | ')})`,
    );
    if (SECTOR_KEYS.includes(sectorKey)) return sectorKey;
    return null;
  } catch {
    return null;
  }
}

/**
 * In-memory side-channel for the entity-type classification. classifySector
 * needs to return a single string (sector) for backwards compatibility, so
 * the entityType output is stashed here and read by scrapeOrganizationContext
 * after the classifier returns. Keyed by lowercased org name.
 */
const lastClassifiedEntityType = new Map<string, string>();

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
      tavilySearch(`${orgName} technology leadership`, {
        maxResults: 4,
        include_domains: [domain],
      }),
    );
  }

  tasks.push(
    // "company profile funding" excludes UN bodies, NGOs, universities, gov agencies.
    tavilySearch(`${orgName} profile mission`, {
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
  // If sector cannot be resolved, skip sector queries entirely. Running
  // "General / Cross-Industry" queries pulls unrelated headlines that
  // poison the synthesis prompt (the bug surfaced for sector='general').
  if (!sectorInfo) return [];

  const y = new Date().getFullYear();
  const name = sectorInfo.name;
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
  const { orgName, websiteUrl, additionalContext } = input;

  // Auto-resolve `general` and missing sector via a quick LLM classification.
  // The classifier also detects entity type (commercial / public_sector /
  // nonprofit / academic / international_body / unknown) in the same call
  // and stashes it in lastClassifiedEntityType.
  let resolvedSectorKey = input.sector;
  if (!resolvedSectorKey || resolvedSectorKey === "general") {
    resolvedSectorKey = (await classifySector(orgName, websiteUrl)) ?? undefined;
  }
  const sectorInfo = resolvedSectorKey ? SECTOR_MAP[resolvedSectorKey] : null;
  const sectorName = sectorInfo?.name ?? resolvedSectorKey ?? "";
  const sector = resolvedSectorKey;
  const orgDomain = websiteUrl ? extractDomain(websiteUrl) : null;
  // Pull the entity-type pick from the classifier's side-channel.
  const entityKey = lastClassifiedEntityType.get(orgName.toLowerCase()) ?? 'unknown';
  const entityType: EntityType = (
    ['commercial','public_sector','nonprofit','academic','international_body','unknown']
      .includes(entityKey) ? entityKey : 'unknown'
  ) as EntityType;

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

  // Pull the entity-aware vocabulary so the synthesis prompt addresses the
  // model with concrete nouns (peerNoun, scalingNoun, valueNoun) that fit
  // the actual reader, instead of leaving the LLM to guess between
  // "competitors / business units / ROI" and "peer agencies / programmes
  // / mandate impact".
  const vocab = getVocab(entityType);

  try {
    const synthesisPrompt = `ORG: ${orgName}${sector ? ` | SECTOR: ${sectorName}` : ""} | ENTITY_TYPE: ${entityType}${additionalContext ? ` | CONTEXT: ${additionalContext}` : ""}

${numberedBlock}

Return ONLY valid JSON — raw JSON, no markdown fences.
{
  "industryContext": "2–4 plain sentences on AI trends in this sector. Each sentence MUST end with a citation like [S7] pointing at a SECTOR-SOURCE.",
  "orgSpecificContext": "2–4 plain sentences about THIS specific ${vocab.noun} only if grounded in ORG-SOURCES. EVERY sentence MUST contain at least one citation [Sn] referencing ORG-SOURCES only. Use vocabulary appropriate to a ${vocab.noun} (e.g. ${vocab.scalingNoun}, ${vocab.valueNoun}) — do NOT impose commercial-company framing on a non-commercial org.",
  "aiInitiatives": ["short label [Sn]"],
  "techStackSignals": ["technology [Sn]"],
  "regulatoryConsiderations": ["plain regulation note [Sn]"],
  "competitiveLandscape": "2–3 sentences on positioning vs. ${vocab.peerNoun} — cite ORG-SOURCES with [Sn]. Use the framing '${vocab.peerNoun}' / 'mandate scope' / 'sector landscape', not 'competitors' unless the entity_type is commercial. If insufficient org evidence, say so honestly."
}

RULES:
- The entity type is ${entityType}. Treat the org as a ${vocab.noun}; the reader is a ${vocab.topRole}. Do NOT inject commercial-company language (CEO, ROI, market share, business units) unless entity_type=commercial.
- Temperature-equivalent discipline: do NOT invent facts. If ORG-SOURCES do not clearly identify the organization, say evidence is thin and cite what exists.
- Each factual clause needs [Sn] from the numbered list above.
- Do NOT merge facts from unrelated entities sharing the same name.
- Strings plain English — no markdown headers, no bare URLs.`;

    const content = await glmComplete(
      "You are an AI readiness analyst. Ground every claim in numbered sources. JSON only.",
      synthesisPrompt,
      1400,
      0,
      true,         // jsonMode
      'deepseek',   // synthesis backbone — no thinking-token gotcha, ~10× cheaper than Gemini Pro
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
      entityType,
      industryContext:
        raw.industryContext ||
        "Sector AI context was thin in retrieved sources; proceed with assessment responses for benchmarking.",
      orgSpecificContext,
      aiInitiatives: raw.aiInitiatives.slice(0, 10),
      techStackSignals: raw.techStackSignals.slice(0, 15),
      regulatoryConsiderations:
        raw.regulatoryConsiderations.length > 0
          ? raw.regulatoryConsiderations.slice(0, 8)
          : getDefaultRegulations(sector, entityType),
      competitiveLandscape:
        raw.competitiveLandscape ||
        `Insufficient grounded evidence to summarise positioning vs. ${vocab.peerNoun} from web sources alone.`,
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
    false, // plain prose, not JSON
  );

  if (content) return sanitizeText(content.trim());

  const titles = uniqueResults.slice(0, 4).map((r) => r.title).filter(Boolean);
  return titles.length > 0
    ? `Recent topics in ${sectorName} include: ${titles.join("; ")}. Add assessment detail for a fuller picture.`
    : `AI adoption in ${sectorName} is evolving; specific headlines were not retrieved.`;
}

export async function quickScrapeWebsite(url: string): Promise<QuickScrapeResult> {
  const domain = extractDomain(url);
  // Was "{domain} company about technology" — failed for non-company sites.
  const searchResults = await tavilySearch(`${domain} about`, {
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
  // Without a successful classifier pass we don't know the entity type;
  // 'unknown' triggers the neutral vocab + universal regulatory floor.
  const fallbackEntityType: EntityType = 'unknown';
  const vocab = getVocab(fallbackEntityType);
  const noneMsg = `We couldn't enrich "${input.orgName}" from public web sources (${reason}). Your assessment will rely on self-reported answers; use Compliance uploads for evidence-backed analysis where needed.`;

  return {
    orgName: input.orgName,
    websiteUrl: input.websiteUrl,
    sector: input.sector,
    entityType: fallbackEntityType,
    industryContext: sectorInfo
      ? `Sector framing (${sectorInfo.name}): use assessment responses and any uploaded documents — automated sector headlines were not retrieved.`
      : "Industry AI context was not retrieved automatically.",
    orgSpecificContext: noneMsg,
    aiInitiatives: [],
    techStackSignals: [],
    regulatoryConsiderations: getDefaultRegulations(input.sector, fallbackEntityType),
    competitiveLandscape: `Positioning vs. ${vocab.peerNoun} was not inferred — insufficient automated web evidence.`,
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
  const signals = await llmExtractSignalsFromSnippets(input.orgName, numberedSnippets.slice(0, 24000));

  const thinOrg = orgResults.length === 0;

  // No raw headlines in user-facing copy. When synthesis failed, the model
  // could not produce grounded prose — saying so honestly is more useful than
  // dumping unverified titles into the UI (which previously surfaced
  // unrelated articles like "Shanghai Electric…" for a Microsoft assessment).
  const orgSpecificContext = thinOrg
    ? `We could not reliably identify "${input.orgName}" in filtered public sources. Your assessment will rely on your self-reported answers and any documents uploaded under the Compliance module.`
    : `Public information about ${input.orgName} was retrieved but could not be synthesised into a defensible summary. Treat any inferences from this enrichment as preliminary; rely on your assessment responses and Compliance evidence for scoring.`;

  const industryContext = sectorInfo
    ? `Automated industry context could not be reliably synthesised for ${sectorInfo.name}. Your assessment will use sector benchmarks from our internal database, not live web data.`
    : `Sector context was not retrieved automatically. Your assessment will rely on your self-reported answers.`;

  const competitiveLandscape =
    "Competitive positioning was not assessed automatically. Use the Compliance module to upload organisation documents for evidence-backed analysis.";

  // Cap fallback confidence at 'low' or 'none'. Reaching 'medium' here was a
  // bug — it implied trust in raw query results that the verifier had just
  // rejected. Real 'medium'/'high' tiers are reserved for the success path.
  const confidence: "low" | "none" =
    orgResults.length === 0 && sectorResults.length === 0 ? "none" : "low";

  // We may have already detected an entity type during classification.
  const cachedEntity = lastClassifiedEntityType.get(input.orgName.toLowerCase());
  const fallbackEntityType: EntityType = (
    cachedEntity && ['commercial','public_sector','nonprofit','academic','international_body','unknown'].includes(cachedEntity)
      ? cachedEntity
      : 'unknown'
  ) as EntityType;

  return {
    orgName: input.orgName,
    websiteUrl: input.websiteUrl,
    sector: input.sector,
    entityType: fallbackEntityType,
    industryContext,
    orgSpecificContext,
    aiInitiatives: signals.aiInitiatives,
    techStackSignals: signals.techStackSignals,
    regulatoryConsiderations: getDefaultRegulations(input.sector, fallbackEntityType),
    competitiveLandscape,
    scrapingSources: [...orgResults.map((r) => r.url), ...sectorResults.map((r) => r.url)],
    scrapedAt: timestamp,
    confidence,
  };
}

// getDefaultRegulations + getVocab are imported at the top of the file
// from ./entity-types. The local commercial-only version was removed
// because it produced FERPA/COPPA for international research bodies.
