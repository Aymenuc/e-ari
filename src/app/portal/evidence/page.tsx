'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/shared/navigation';
import { Footer } from '@/components/shared/footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Upload, Trash2 } from 'lucide-react';

interface EvRow {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  extractionStatus: string;
  createdAt: string;
}

export default function OrgEvidenceVaultPage() {
  const [items, setItems] = useState<EvRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/portal/evidence');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    setItems(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
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
        fd.set('file', file);
        const res = await fetch('/api/portal/evidence', { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Upload failed: ${file.name}`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/portal/evidence/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-navy-900">
      <Navigation />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/portal"
          className="mb-6 inline-flex items-center font-sans text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Portal
        </Link>

        <Card className="border-dashed border-2 border-border/40 bg-navy-800/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg">
              <Upload className="h-5 w-5 text-eari-blue-light" />
              Organization evidence vault
            </CardTitle>
            <CardDescription className="font-sans">
              Uploads here apply across all use cases (shared policies, group‑level DPAs, etc.).
              Map clauses per use case from the evidence vault on each use case when extracting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-border/40 bg-navy-900/40 px-4 py-10">
              <input
                type="file"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={(e) => void onFiles(e.target.files)}
              />
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-eari-blue-light" />
              ) : (
                <span className="text-center text-sm text-muted-foreground font-sans">
                  Drop files or click to upload (same limits as use‑case vault)
                </span>
              )}
            </label>

            {error ? (
              <p className="text-sm text-red-300 font-sans">{error}</p>
            ) : null}

            {items === null ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-eari-blue-light" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground font-sans py-4">
                No organization‑level files yet.
              </p>
            ) : (
              <ul className="divide-y divide-border/30 rounded-lg border border-border/25">
                {items.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center gap-3 px-3 py-3 text-xs font-sans">
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">{row.filename}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{row.extractionStatus}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      disabled={deletingId === row.id}
                      onClick={() => void remove(row.id)}
                    >
                      {deletingId === row.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
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
