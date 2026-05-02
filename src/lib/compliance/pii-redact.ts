/**
 * Regex PII redaction before compliance text is sent to an LLM.
 * Preserves structure; does not strip content from DB — use on copies only.
 */

const RULES: Array<{ type: string; re: RegExp; replace: string }> = [
  { type: "email", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replace: "[REDACTED:email]" },
  {
    type: "phone",
    re: /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?){2,4}\d{2,4}\b/g,
    replace: "[REDACTED:phone]",
  },
  {
    type: "iban",
    re: /\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b/gi,
    replace: "[REDACTED:iban]",
  },
  {
    type: "national_id_us_ssn",
    re: /\b\d{3}-\d{2}-\d{4}\b/g,
    replace: "[REDACTED:national_id]",
  },
  {
    type: "credit_card",
    re: /\b(?:\d[ -]*?){13,19}\d\b/g,
    replace: "[REDACTED:payment_card]",
  },
];

export function redactPIIForLLM(text: string): string {
  let out = text;
  for (const { re, replace } of RULES) {
    out = out.replace(re, replace);
  }
  return out;
}
