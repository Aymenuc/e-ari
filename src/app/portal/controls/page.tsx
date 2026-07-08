'use client';

/** Continuous Controls — Vanta-style derived control states. */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/shared/navigation';
import { Footer } from '@/components/shared/footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface Control { code: string; label: string; severity: string; status: string; systems: string[] }
interface Summary { total: number; passing: number; failing: number; pending: number; expiringAttestations: string[]; systemsTotal: number; systemsClassified: number }

const STATUS_META: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  passing: { label: 'Passing', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', Icon: CheckCircle2 },
  failing: { label: 'Failing', cls: 'bg-red-500/15 text-red-400 border-red-500/30', Icon: XCircle },
  pending: { label: 'Needs evidence', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', Icon: Clock },
};

export default function ControlsPage() {
  const [controls, setControls] = useState<Control[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/controls').then(async (r) => {
      if (r.ok) { const j = await r.json(); setControls(j.controls); setSummary(j.summary); }
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-10 space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Activity className="h-6 w-6 text-eari-blue-light" />
            <h1 className="font-heading text-2xl font-bold text-foreground">Continuous Controls</h1>
            <Badge variant="outline" className="font-mono text-[10px] border-eari-blue/30 text-eari-blue-light">EU AI Act</Badge>
          </div>
          <p className="font-sans text-sm text-muted-foreground max-w-2xl">
            Every applicable obligation across your registered AI systems, with its live state:
            passing (evidenced), failing (open critical gap), or awaiting evidence. Derived
            directly from your evidence vault and gap radar — nothing here is self-declared.
          </p>
        </div>

        {loading ? <Loader2 className="h-6 w-6 animate-spin text-eari-blue-light" /> : !summary || summary.systemsTotal === 0 ? (
          <Card className="bg-navy-800 border-border/60"><CardContent className="p-8 text-center space-y-3">
            <p className="font-sans text-sm text-muted-foreground">No AI systems registered yet — controls derive from your registry.</p>
            <Button asChild className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading"><Link href="/portal/discovery">Run Shadow AI Discovery</Link></Button>
          </CardContent></Card>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Controls', value: summary.total },
                { label: 'Passing', value: summary.passing },
                { label: 'Failing', value: summary.failing, hot: summary.failing > 0 },
                { label: 'Needs evidence', value: summary.pending, hot: summary.pending > 0 },
              ].map((s) => (
                <Card key={s.label} className={`bg-navy-800 ${s.hot ? 'border-amber-500/40' : 'border-border/60'}`}>
                  <CardContent className="p-4">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                    <p className={`font-heading text-2xl font-bold tabular-nums mt-1 ${s.hot ? 'text-amber-400' : ''}`}>{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {summary.expiringAttestations.length > 0 && (
              <Card className="bg-navy-800 border-amber-500/40"><CardContent className="p-4">
                <p className="font-sans text-sm text-amber-400">
                  <Clock className="h-4 w-4 inline mr-2" />
                  Attestations due within 30 days: {summary.expiringAttestations.join(', ')}
                </p>
              </CardContent></Card>
            )}

            <div className="space-y-2">
              {controls.map((c) => {
                const meta = STATUS_META[c.status] ?? STATUS_META.pending!;
                return (
                  <Card key={c.code} className="bg-navy-800 border-border/60">
                    <CardContent className="p-4 flex flex-wrap items-center gap-3">
                      <meta.Icon className={`h-4 w-4 shrink-0 ${c.status === 'passing' ? 'text-emerald-400' : c.status === 'failing' ? 'text-red-400' : 'text-amber-400'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-heading text-sm font-semibold text-foreground">{c.label}</p>
                        <p className="font-sans text-xs text-muted-foreground">{c.code} · severity {c.severity} · applies to {c.systems.slice(0, 3).join(', ')}{c.systems.length > 3 ? ` +${c.systems.length - 3}` : ''}</p>
                      </div>
                      <Badge className={`text-[10px] font-mono uppercase ${meta.cls}`}>{meta.label}</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <p className="font-sans text-xs text-muted-foreground">
              To flip a control to passing, upload evidence on the relevant use case — clauses are extracted and mapped to obligations automatically.
              <Link href="/portal" className="text-eari-blue-light hover:underline ml-1">Open compliance workspace →</Link>
            </p>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
