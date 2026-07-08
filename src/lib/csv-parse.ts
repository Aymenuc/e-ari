/**
 * Flexible CSV parser for roster imports (Phase 1) and discovery imports
 * (Phase 3). Handles quoted fields, BOM, \r\n, and fuzzy header matching —
 * "Email Address" / "email" / "E-mail" all map to the `email` field.
 *
 * Deliberately dependency-free: exports from Okta / Google Workspace / Entra /
 * expense tools are small (<10k rows), so a simple char-walk parser is enough.
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, ''); // strip BOM
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

/**
 * Map header names to canonical field keys using alias lists.
 * Returns { fieldKey: columnIndex } for every field found.
 */
export function mapHeaders(
  headerRow: string[],
  aliases: Record<string, string[]>,
): Record<string, number> {
  const normalized = headerRow.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const map: Record<string, number> = {};
  for (const [field, names] of Object.entries(aliases)) {
    for (const name of names) {
      const idx = normalized.indexOf(name.toLowerCase().replace(/[^a-z0-9]/g, ''));
      if (idx >= 0) { map[field] = idx; break; }
    }
  }
  return map;
}

/** Parse rows into objects given a header alias map. Skips rows missing required fields. */
export function parseCsvObjects(
  text: string,
  aliases: Record<string, string[]>,
  required: string[],
): Array<Record<string, string>> {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const map = mapHeaders(rows[0]!, aliases);
  if (required.some((r) => map[r] === undefined)) return [];
  const out: Array<Record<string, string>> = [];
  for (const row of rows.slice(1)) {
    const obj: Record<string, string> = {};
    for (const [field, idx] of Object.entries(map)) {
      obj[field] = (row[idx] ?? '').trim();
    }
    if (required.every((r) => obj[r])) out.push(obj);
  }
  return out;
}
