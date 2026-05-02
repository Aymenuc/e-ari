"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Navigation } from "@/components/shared/navigation";
import { Footer } from "@/components/shared/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Upload, Trash2, Sparkles } from "lucide-react";

interface EvRow {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  extractionStatus: string;
  createdAt: string;
}

export default function EvidenceVaultPage() {
  const params = useParams();
  const systemId = params.id as string;
  const [items, setItems] = useState<EvRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [extractingId, setExtractingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/compliance/systems/${systemId}/evidence`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    setItems(data);
  }, [systemId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fd = new FormData();
        fd.set("file", file);
        const res = await fetch(`/api/compliance/systems/${systemId}/evidence`, {
          method: "POST",
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Upload failed: ${file.name}`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function extract(evidenceId: string) {
    setError(null);
    setExtractingId(evidenceId);
    try {
      const res = await fetch(`/api/compliance/systems/${systemId}/evidence/${evidenceId}/extract`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Extract failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extract failed");
    } finally {
      setExtractingId(null);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/compliance/systems/${systemId}/evidence/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />
      <main className="flex-1 mx-auto max-w-4xl w-full px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <Link
          href={`/compliance/systems/${systemId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground font-sans"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          System overview
        </Link>

        <Card className="bg-navy-800/90 border-border/40 border-dashed border-2">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Upload className="h-5 w-5 text-eari-blue-light" />
              Evidence vault
            </CardTitle>
            <CardDescription className="font-sans">
              PDF, DOCX, or plain text (.txt / .md) up to your storage limit. Files are stored privately (Vercel Blob). SHA-256 recorded for custody.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex flex-col items-center justify-center gap-3 rounded-xl border border-eari-blue/25 bg-navy-900/50 px-6 py-12 cursor-pointer hover:bg-navy-900/70 transition-colors">
              <input
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.docx,.txt,.md"
                disabled={uploading}
                onChange={(e) => onFiles(e.target.files)}
              />
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-eari-blue-light" />
              ) : (
                <>
                  <Upload className="h-10 w-10 text-eari-blue-light opacity-80" />
                  <span className="text-sm font-heading text-foreground">Drop files here or click to upload</span>
                  <span className="text-xs text-muted-foreground font-sans">Requires BLOB_READ_WRITE_TOKEN in production</span>
                </>
              )}
            </label>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="py-4 text-sm text-red-300 font-sans">{error}</CardContent>
          </Card>
        )}

        <Card className="bg-navy-800/90 border-border/40">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Uploaded evidence</CardTitle>
          </CardHeader>
          <CardContent>
            {items === null ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-eari-blue-light" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground font-sans py-4 text-center">No documents yet.</p>
            ) : (
              <ul className="space-y-3">
                {items.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-border/30 bg-navy-900/40 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-heading text-sm font-semibold text-foreground truncate">{row.filename}</p>
                      <p className="text-[11px] font-mono text-muted-foreground truncate mt-1">
                        {row.mimeType} · {(row.sizeBytes / 1024).toFixed(1)} KB · {row.extractionStatus}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground/70 break-all mt-1">sha256:{row.sha256.slice(0, 16)}…</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-eari-blue/30 text-eari-blue-light"
                        disabled={!!extractingId || !!deletingId}
                        onClick={() => extract(row.id)}
                      >
                        {extractingId === row.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-1" />
                            Extract
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/30 text-red-400"
                        disabled={!!extractingId || deletingId === row.id}
                        onClick={() => remove(row.id)}
                      >
                        {deletingId === row.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </>
                        )}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
