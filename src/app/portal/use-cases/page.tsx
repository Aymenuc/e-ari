"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/shared/navigation";
import { Footer } from "@/components/shared/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Scale, FileStack, ArrowUpRight } from "lucide-react";

interface SystemRow {
  id: string;
  name: string;
  sector: string;
  deployerRole: string;
  riskTier: string | null;
  updatedAt: string;
  _count: { evidence: number; obligationGaps: number };
}

export default function UseCasesDashboardPage() {
  const [systems, setSystems] = useState<SystemRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/compliance/systems");
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!cancelled) setSystems(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Scale className="h-8 w-8 text-eari-blue-light" />
              <h1 className="font-heading text-3xl font-bold text-foreground tracking-tight">Compliance</h1>
            </div>
            <p className="text-muted-foreground font-sans max-w-xl">
              AI Act evidence vault — register AI systems, upload policies and artifacts, and anchor obligations to your readiness baseline (PR #1).
            </p>
          </div>
          <Link href="/portal/use-cases/systems/new">
            <Button className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading shadow-md shadow-eari-blue/15">
              <Plus className="h-4 w-4 mr-2" />
              New use case
            </Button>
          </Link>
        </div>

        {error && (
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="py-4 text-sm text-red-300 font-sans">{error}</CardContent>
          </Card>
        )}

        <Card className="bg-navy-800/90 border-border/40">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <FileStack className="h-5 w-5 text-eari-blue-light" />
              Your use cases
            </CardTitle>
            <CardDescription className="font-sans">
              Each row is one deployment or application you evidence against the AI Act.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {systems === null ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-eari-blue-light" />
              </div>
            ) : systems.length === 0 ? (
              <p className="text-sm text-muted-foreground font-sans py-6 text-center">
                No use cases yet. Create one to open the evidence vault.
              </p>
            ) : (
              <ul className="divide-y divide-border/40">
                {systems.map((s) => (
                  <li key={s.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 first:pt-0">
                    <div>
                      <p className="font-heading font-semibold text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground font-sans mt-0.5">
                        {s.sector} · {s.deployerRole}
                        {s.riskTier ? (
                          <Badge variant="outline" className="ml-2 text-[10px] border-amber-500/30 text-amber-400">
                            {s.riskTier}
                          </Badge>
                        ) : null}
                      </p>
                      <p className="text-[11px] text-muted-foreground/80 font-mono mt-1">
                        {s._count.evidence} evidence file{s._count.evidence === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/portal/use-cases/systems/${s.id}`}>
                        <Button variant="outline" size="sm" className="border-eari-blue/30 text-eari-blue-light">
                          Overview
                          <ArrowUpRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                      <Link href={`/portal/use-cases/systems/${s.id}/evidence`}>
                        <Button size="sm" className="bg-eari-blue/90 hover:bg-eari-blue text-white font-heading">
                          Evidence vault
                        </Button>
                      </Link>
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
