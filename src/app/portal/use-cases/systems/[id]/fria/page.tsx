"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Download, ScrollText, Lock } from "lucide-react";

export default function FriaPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<unknown | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const friaStatus =
    data && typeof data === "object" && data !== null && "status" in data
      ? String((data as { status: string }).status)
      : null;

  const load = useCallback(async () => {
    const res = await fetch(`/api/compliance/systems/${id}/fria`);
    const j = await res.json().catch(() => null);
    if (!res.ok) throw new Error((j && (j as { error?: string }).error) || `HTTP ${res.status}`);
    setData(j === null ? null : j);
  }, [id]);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        await load();
      } catch (e) {
        if (!c) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      c = true;
    };
  }, [load]);

  async function finalizeFria() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/compliance/systems/${id}/fria`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "finalized" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((j as { error?: string }).error || `HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Finalize failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
        <Link href={`/portal/use-cases/systems/${id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground font-sans">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Use case overview
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <ScrollText className="h-8 w-8 text-emerald-400" />
            <h1 className="font-heading text-2xl font-bold text-foreground">FRIA draft</h1>
            {friaStatus ? (
              <Badge variant="outline" className="font-mono text-[10px] capitalize border-border">
                {friaStatus}
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              type="button"
              variant="secondary"
              className="bg-navy-700/80 font-heading"
              disabled={!data || data === null || friaStatus === "finalized" || busy}
              onClick={() => void finalizeFria()}
            >
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
              Mark finalized
            </Button>
            <a href={`/api/compliance/systems/${id}/fria/export`}>
              <Button variant="outline" className="border-eari-blue/30" disabled={!data || data === null}>
                <Download className="h-4 w-4 mr-2" />
                DOCX
              </Button>
            </a>
            <a href={`/api/compliance/systems/${id}/fria/export/pdf`}>
              <Button variant="outline" className="border-eari-blue/30" disabled={!data || data === null}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </a>
          </div>
        </div>
        {error && (
          <Card className="border-amber-500/30 bg-amber-500/10">
            <CardContent className="py-4 text-sm text-amber-200">{error}</CardContent>
          </Card>
        )}
        <Card className="bg-navy-800/90 border-border/40">
          <CardHeader>
            <CardTitle className="font-heading text-lg">JSON (from API)</CardTitle>
          </CardHeader>
          <CardContent>
            {data === undefined ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-eari-blue-light" />
              </div>
            ) : data === null ? (
              <p className="text-sm text-muted-foreground font-sans">No FRIA yet — generate from the system overview.</p>
            ) : (
              <pre className="text-[11px] font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words max-h-[70vh] overflow-y-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
