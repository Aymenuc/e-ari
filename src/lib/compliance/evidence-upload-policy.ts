/**
 * Allowed evidence vault uploads — must stay in sync with extract-text.ts extraction support.
 */

export function isEvidenceUploadAllowed(mimeType: string, filename: string): boolean {
  const mt = mimeType.toLowerCase();
  const fn = filename.toLowerCase();

  if (mt.includes("pdf") || fn.endsWith(".pdf")) return true;
  if (mt.startsWith("text/") || fn.endsWith(".txt") || fn.endsWith(".md")) return true;
  if (
    mt.includes("wordprocessingml") ||
    mt.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
    fn.endsWith(".docx")
  ) {
    return true;
  }
  return false;
}

export const EVIDENCE_UPLOAD_TYPE_HINT =
  "Upload a PDF, DOCX, or plain text file (.txt or .markdown). Other formats are not supported for text extraction.";
