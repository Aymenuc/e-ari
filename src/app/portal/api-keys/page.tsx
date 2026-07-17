'use client';

/** API key management — Growth+ read keys, Enterprise write keys. */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/shared/navigation';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Loader2, Trash2, Copy, TerminalSquare } from 'lucide-react';

interface ApiKeyRow {
  id: string; name: string; prefix: string; scope: string;
  lastUsedAt: string | null; revokedAt: string | null; createdAt: string;
}

export default function ApiKeysPage() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'read' | 'write'>('read');
  const [busy, setBusy] = useState(false);
  const [freshSecret, setFreshSecret] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/api-keys');
    if (res.ok) setKeys((await res.json()).keys);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setBusy(true);
    const res = await fetch('/api/api-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name || 'API key', scope }) });
    const j = await res.json();
    setBusy(false);
    if (res.ok) { setFreshSecret(j.secret); setName(''); load(); }
    else toast({ title: 'Could not create key', description: j.error, variant: 'destructive' });
  };

  const revoke = async (id: string) => {
    await fetch(`/api/api-keys?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-10 space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <KeyRound className="h-6 w-6 text-eari-blue-light" />
            <h1 className="font-heading text-2xl font-bold text-foreground">API Keys</h1>
          </div>
          <p className="font-sans text-sm text-muted-foreground max-w-2xl">
            Read access from Growth; write access on Enterprise. Keys are shown once at creation —
            store them in a secret manager. See the <Link href="/developers" className="text-eari-blue-light hover:underline">API reference</Link>.
          </p>
        </div>

        {freshSecret && (
          <Card className="bg-navy-800 border-emerald-500/40">
            <CardContent className="p-5 space-y-2">
              <p className="font-heading text-sm font-semibold text-emerald-400">Key created — copy it now, it will not be shown again.</p>
              <div className="flex items-center gap-2">
                <code className="font-mono text-xs bg-navy-700 rounded px-3 py-2 flex-1 overflow-x-auto">{freshSecret}</code>
                <Button size="sm" variant="outline" className="border-border" onClick={() => { navigator.clipboard.writeText(freshSecret); toast({ title: 'Copied' }); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <button onClick={() => setFreshSecret(null)} className="font-sans text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
            </CardContent>
          </Card>
        )}

        <Card className="bg-navy-800 border-border/60">
          <CardHeader><CardTitle className="font-heading text-base">Create key</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2 items-center">
            <Input placeholder="Key name (e.g. GRC integration)" value={name} onChange={(e) => setName(e.target.value)} className="max-w-64 bg-navy-700 border-border/60 font-sans" />
            <div className="flex rounded-md border border-border/60 overflow-hidden">
              {(['read', 'write'] as const).map((s) => (
                <button key={s} onClick={() => setScope(s)} className={`px-3 py-2 font-mono text-xs uppercase ${scope === s ? 'bg-eari-blue/20 text-eari-blue-light' : 'text-muted-foreground'}`}>{s}</button>
              ))}
            </div>
            <Button disabled={busy} onClick={create} className="btn-brand font-sans">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-navy-800 border-border/60">
          <CardHeader>
            <CardTitle className="font-heading text-base">Your keys</CardTitle>
            <CardDescription className="font-sans">Revoked keys stop working immediately.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-6 w-6 animate-spin text-eari-blue-light" /> : keys.length === 0 ? (
              <p className="font-sans text-sm text-muted-foreground">No keys yet.</p>
            ) : (
              <div className="space-y-2">
                {keys.map((k) => (
                  <div key={k.id} className="flex flex-wrap items-center gap-3 border border-border/40 rounded-md px-4 py-3">
                    <TerminalSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="font-sans text-sm text-foreground">{k.name}</span>
                    <code className="font-mono text-xs text-muted-foreground">{k.prefix}…</code>
                    <Badge variant="outline" className={`text-[10px] font-mono uppercase ${k.scope === 'write' ? 'border-amber-500/30 text-amber-400' : 'border-eari-blue/30 text-eari-blue-light'}`}>{k.scope}</Badge>
                    {k.revokedAt ? (
                      <Badge variant="outline" className="text-[10px] font-mono border-red-500/30 text-red-400">Revoked</Badge>
                    ) : (
                      <span className="font-sans text-xs text-muted-foreground">{k.lastUsedAt ? `Last used ${new Date(k.lastUsedAt).toISOString().slice(0, 10)}` : 'Never used'}</span>
                    )}
                    {!k.revokedAt && (
                      <button onClick={() => revoke(k.id)} className="ml-auto text-muted-foreground hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
