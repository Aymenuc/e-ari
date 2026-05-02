import { get } from "@vercel/blob";

export async function downloadEvidenceBuffer(storageKey: string): Promise<Buffer> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token?.trim()) throw new Error("BLOB_READ_WRITE_TOKEN is not configured");

  const result = await get(storageKey, { access: "private", token });
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error("Failed to download blob");
  }
  const ab = await new Response(result.stream).arrayBuffer();
  return Buffer.from(ab);
}
