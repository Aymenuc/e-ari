"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Navigation } from "@/components/shared/navigation";
import { Footer } from "@/components/shared/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Radar, RefreshCw } from "lucide-react";

interface GapRow {
  id: string;
  obligationCode: string;
  obligationLabel: string;
  severity: string;
  recommendedArtifactType: string;
  draftDocumentText: string | null;
  ownerRoleHint: string | null;
  status: string;
}

export default function GapRadarPage() {
  const params = useParams();
  const id = params.id as string;
  const [gaps, setGaps] = useState<GapRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/compliance/systems/${id}/gaps`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    setGaps(data);
  }, [id]);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        await load();
      } catch (e) {
        if (!c) setError(e instanceof Error ? e.message : "Failed to load gaps");
      }
    })();
    return () => {
      c = true;
    };
  }, [load]);

  async function regenerate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/compliance/systems/${id}/gaps`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Regenerate failed");
      setGaps(data.gaps || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regenerate failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />
      <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-10 space-y-6">
        <Link href={`/compliance/systems/${id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground font-sans">
          <ArrowLeft className="h-4 w-4 mr-1" />
          System overview
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Radar className="h-8 w-8 text-amber-400" />
            <h1 className="font-heading text-2xl font-bold text-foreground">Obligation gap radar</h1>
          </div>
          <Button variant="outline" disabled={busy} onClick={() => regenerate()} className="border-eari-blue/30">
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Regenerate
          </Button>
        </div>
        {error && (
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="py-4 text-sm text-red-300">{error}</CardContent>
          </Card>
        )}
        <Card className="bg-navy-800/90 border-border/40">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Gaps vs evidence</CardTitle>
          </CardHeader>
          <CardContent>
            {gaps === null ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-eari-blue-light" />
              </div>
            ) : gaps.length === 0 ? (
              <p className="text-sm text-muted-foreground font-sans">No gaps recorded. Upload and extract evidence, then regenerate.</p>
            ) : (
              <ul className="space-y-4">
                {gaps.map((g) => (
                  <li key={g.id} className="rounded-lg border border-border/30 bg-navy-900/40 p-4 space-y-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {g.obligationCode}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          g.severity === "critical"
                            ? "border-red-500/40 text-red-400"
                            : g.severity === "major"
                              ? "border-amber-500/40 text-amber-400"
                              : "border-border text-muted-foreground"
                        }
                      >
                        {g.severity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">→ {g.recommendedArtifactType}</span>
                    </div>
                    <p className="font-heading text-sm font-semibold text-foreground">{g.obligationLabel}</p>
                    {g.draftDocumentText ? (
                      <p className="text-xs font-sans text-muted-foreground whitespace-pre-wrap leading-relaxed">{g.draftDocumentText}</p>
                    ) : null}
                    {g.ownerRoleHint ? (
                      <p className="text-[10px] font-mono text-eari-blue-light/80">Owner hint: {g.ownerRoleHint}</p>
                    ) : null}
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
