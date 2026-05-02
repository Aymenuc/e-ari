import "@/lib/compliance/__mapping-checks";

import { complianceLLMChat, complianceParseJson } from "@/lib/compliance/llm";
import { CLAUSE_TYPES, type ExtractedClause } from "@/lib/compliance/evidence-mapper";
import { redactPIIForLLM } from "@/lib/compliance/pii-redact";

const CHUNK_SIZE = 6000;
const OVERLAP = 500;
const MAX_CLAUSES_TOTAL = 40;
const MAX_EXCERPT = 500;

const LIST = CLAUSE_TYPES.join(", ");

const SYS = `You extract compliance clauses from an organizational document for EU AI Act alignment.
Use ONLY these clauseType values (exact snake_case): ${LIST}.

Rules:
- textExcerpt must be copied verbatim from the provided chunk (max ${MAX_EXCERPT} chars).
- clauseType must be one of the allowed values.
- pageNumber if unknown use null.
- confidence 0..1
Return ONLY JSON: { "clauses": [ { "clauseType", "textExcerpt", "pageNumber", "confidence" } ] }
Cap at 24 clauses per chunk; prioritize strongest obligations and controls.`;

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function excerptInChunk(excerpt: string, chunk: string): boolean {
  const ex = excerpt.trim();
  if (ex.length < 8) return false;
  return chunk.includes(ex) || chunk.includes(normalizeWs(ex));
}

function dedupeKey(c: ExtractedClause): string {
  return normalizeWs(c.textExcerpt).slice(0, 240).toLowerCase();
}

function chunkDocument(text: string): string[] {
  if (text.length <= CHUNK_SIZE) return [text];
  const chunks: string[] = [];
  for (let start = 0; start < text.length; start += CHUNK_SIZE - OVERLAP) {
    chunks.push(text.slice(start, start + CHUNK_SIZE));
    if (start + CHUNK_SIZE >= text.length) break;
  }
  return chunks;
}

async function extractChunk(chunk: string, artifactType: string): Promise<ExtractedClause[]> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const safeChunk = redactPIIForLLM(chunk);
      const raw = await complianceLLMChat(SYS, `Artifact type hint: ${artifactType}\n\nDocument chunk:\n${safeChunk}`, {
        maxTokens: 8192,
        operation: "clause_extract",
      });
      const parsed = complianceParseJson(raw) as { clauses?: unknown[] };
      const rows = Array.isArray(parsed.clauses) ? parsed.clauses : [];
      const out: ExtractedClause[] = [];
      const allowed = new Set<string>([...CLAUSE_TYPES]);

      for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        const o = row as Record<string, unknown>;
        let clauseType = String(o.clauseType || "").trim().toLowerCase().replace(/\s+/g, "_");
        if (!allowed.has(clauseType)) clauseType = "risk_assessment";
        let textExcerpt = String(o.textExcerpt || "").slice(0, MAX_EXCERPT);
        const pageNumber = typeof o.pageNumber === "number" ? Math.round(o.pageNumber) : null;
        let confidence = typeof o.confidence === "number" ? o.confidence : 0.5;
        confidence = Math.max(0, Math.min(1, confidence));
        if (!excerptInChunk(textExcerpt, chunk)) continue;
        out.push({ clauseType, textExcerpt, pageNumber, confidence });
      }
      return out;
    } catch (e) {
      lastErr = e;
    }
  }
  console.warn("[clause-extractor] chunk parse failed:", lastErr);
  return [];
}

/**
 * Chunked LLM extraction; verbatim excerpts validated against each chunk.
 */
export async function extractClauses(artifactType: string, fullText: string): Promise<ExtractedClause[]> {
  const text = fullText.trim();
  if (!text) return [];

  const chunks = chunkDocument(text);
  const merged: ExtractedClause[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const part = await extractChunk(chunk, artifactType);
    for (const c of part) {
      const k = dedupeKey(c);
      if (k.length < 8 || seen.has(k)) continue;
      seen.add(k);
      merged.push(c);
      if (merged.length >= MAX_CLAUSES_TOTAL) return merged;
    }
  }

  return merged;
}
