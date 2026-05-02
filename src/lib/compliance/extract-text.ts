const MAX_CHARS = 120_000;

export async function extractTextFromUpload(buffer: Buffer, mimeType: string, filename: string): Promise<string | null> {
  const mt = mimeType.toLowerCase();
  const fn = filename.toLowerCase();

  if (mt.includes("pdf") || fn.endsWith(".pdf")) {
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      const text = (data.text || "").trim();
      return truncate(text);
    } catch (e) {
      console.error("[extract-text] pdf-parse failed:", e);
      return null;
    }
  }

  if (mt.startsWith("text/") || fn.endsWith(".txt") || fn.endsWith(".md")) {
    return truncate(buffer.toString("utf-8"));
  }

  return null;
}

function truncate(s: string): string {
  if (s.length <= MAX_CHARS) return s;
  return `${s.slice(0, MAX_CHARS)}\n\n[…truncated…]`;
}
