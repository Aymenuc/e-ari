'use client';

/** Shadow AI Discovery — CSV import wizard + results. */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Navigation } from '@/components/shared/navigation';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Radar, Loader2, Upload, EyeOff, PlusCircle, Undo2 } from 'lucide-react';

interface Catalog { id: string; name: string; category: string; vendor: string; trainsOnData: string; risk: string; note: string }
interface Tool { id: string; rawName: string; source: string; userCount: number | null; status: string; catalog: Catalog | null }
interface Stats { total: number; undeclared: number; registered: number; trainsOnData: number }

const SOURCES = [
  { id: 'gworkspace', label: 'Google Workspace', hint: 'Admin console → Reports → Apps: export app access / OAuth token activity as CSV.' },
  { id: 'okta', label: 'Okta', hint: 'Admin → Reports → App usage: export as CSV.' },
  { id: 'entra', label: 'Microsoft Entra ID', hint: 'Entra admin → Enterprise applications → Sign-in / usage export.' },
  { id: 'expense', label: 'Expense export', hint: 'Any expense CSV with a merchant/vendor/description column (Ramp, Brex, Expensify, bank export).' },
];

const RISK_STYLE: Record<string, string> = {
  high: 'bg-red-500/15 text-red-400 border-red-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

export default function DiscoveryPage() {
  const { toast } = useToast();
  const [tools, setTools] = useState<Tool[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('gworkspace');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/discovery');
    if (res.ok) { const j = await res.json(); setTools(j.tools); setStats(j.stats); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const upload = async (file: File) => {
    setBusy(true);
    const csvText = await file.text();
    const res = await fetch('/api/discovery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source, csvText }) });
    const j = await res.json();
    setBusy(false);
    if (res.ok) { toast({ title: `Scan complete: ${j.matched} AI tools matched`, description: j.unmatchedAi > 0 ? `${j.unmatchedAi} unmatched AI-looking entries kept for review.` : undefined }); load(); }
    else toast({ title: 'Scan failed', description: j.error, variant: 'destructive' });
  };

  const act = async (id: string, action: 'register' | 'ignore' | 'restore') => {
    setBusy(true);
    const res = await fetch('/api/discovery', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) });
    setBusy(false);
    if (res.ok) load();
    else toast({ title: 'Action failed', description: (await res.json()).error, variant: 'destructive' });
  };

  const visible = tools.filter((t) => t.status !== 'ignored');
  const ignored = tools.filter((t) => t.status === 'ignored');

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-10 space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Radar className="h-6 w-6 text-eari-blue-light" />
            <h1 className="font-heading text-2xl font-bold text-foreground">Shadow AI Discovery</h1>
          </div>
          <p className="font-sans text-sm text-muted-foreground max-w-2xl">
            Find the AI tools your teams already use — approved or not. Import an SSO or expense export;
            we match it against a curated catalog of AI tools with risk metadata. No integrations required.
          </p>
        </div>

        {stats && stats.total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'AI tools in use', value: stats.total },
              { label: 'Undeclared', value: stats.undeclared, hot: stats.undeclared > 0 },
              { label: 'Train on your data', value: stats.trainsOnData, hot: stats.trainsOnData > 0 },
              { label: 'Registered', value: stats.registered },
            ].map((s) => (
              <Card key={s.label} className={`bg-navy-800 ${s.hot ? 'border-amber-500/40' : 'border-border/60'}`}>
                <CardContent className="p-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className={`font-heading text-2xl font-bold tabular-nums mt-1 ${s.hot ? 'text-amber-400' : ''}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="bg-navy-800 border-border/60">
          <CardHeader><CardTitle className="font-heading text-base">Run a scan</CardTitle>
            <CardDescription className="font-sans">{SOURCES.find((s) => s.id === source)?.hint}</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            {SOURCES.map((s) => (
              <button key={s.id} onClick={() => setSource(s.id)}
                className={`px-3 py-1.5 rounded-md border font-sans text-xs transition-colors ${source === s.id ? 'border-eari-blue bg-eari-blue/15 text-foreground' : 'border-border/60 text-muted-foreground'}`}>
                {s.label}
              </button>
            ))}
            <input ref={fileRef} type="file" accept=".csv" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            <Button disabled={busy} onClick={() => fileRef.current?.click()} className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading ml-auto">
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}Upload CSV
            </Button>
          </CardContent>
        </Card>

        {loading ? <Loader2 className="h-6 w-6 animate-spin text-eari-blue-light" /> : visible.length === 0 ? (
          <Card className="bg-navy-800 border-border/60"><CardContent className="p-8 text-center">
            <p className="font-sans text-sm text-muted-foreground">No scans yet. Upload an export above — results appear here with risk highlights.</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {visible.map((t) => (
              <Card key={t.id} className="bg-navy-800 border-border/60">
                <CardContent className="p-4 flex flex-wrap items-center gap-3">
                  <div className="min-w-0">
                    <p className="font-heading text-sm font-semibold text-foreground">{t.catalog?.name ?? t.rawName}</p>
                    <p className="font-sans text-xs text-muted-foreground">
                      {t.catalog ? `${t.catalog.category} · ${t.catalog.vendor}` : `Unmatched (${t.rawName})`}
                      {t.userCount ? ` · ~${t.userCount} user${t.userCount === 1 ? '' : 's'}` : ''} · via {t.source}
                    </p>
                  </div>
                  {t.catalog && <Badge className={`text-[10px] font-mono uppercase ${RISK_STYLE[t.catalog.risk] ?? ''}`}>{t.catalog.risk} risk</Badge>}
                  {t.catalog && ['yes', 'default_on'].includes(t.catalog.trainsOnData) && (
                    <Badge className="text-[10px] font-mono bg-red-500/15 text-red-400 border-red-500/30">trains on data</Badge>
                  )}
                  {t.status === 'registered' ? (
                    <Badge className="text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border-emerald-500/30 ml-auto">In AI Registry</Badge>
                  ) : (
                    <div className="ml-auto flex gap-2">
                      <Button size="sm" disabled={busy} onClick={() => act(t.id, 'register')} className="bg-eari-blue hover:bg-eari-blue-dark text-white font-sans text-xs">
                        <PlusCircle className="h-3.5 w-3.5 mr-1.5" />Register
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => act(t.id, 'ignore')} className="border-border text-muted-foreground font-sans text-xs">
                        <EyeOff className="h-3.5 w-3.5 mr-1.5" />Ignore
                      </Button>
                    </div>
                  )}
                  {t.catalog?.note && <p className="w-full font-sans text-xs text-muted-foreground/80 mt-1">{t.catalog.note}</p>}
                </CardContent>
              </Card>
            ))}
            {ignored.length > 0 && (
              <details className="pt-2">
                <summary className="font-sans text-xs text-muted-foreground cursor-pointer">{ignored.length} ignored</summary>
                <div className="mt-2 space-y-2">
                  {ignored.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-2 rounded-md border border-border/40">
                      <span className="font-sans text-xs text-muted-foreground">{t.catalog?.name ?? t.rawName}</span>
                      <button onClick={() => act(t.id, 'restore')} className="ml-auto text-muted-foreground hover:text-foreground"><Undo2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
