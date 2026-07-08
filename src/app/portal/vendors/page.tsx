'use client';

/** Third-party AI Vendor Risk — registry, questionnaires, risk tiers. */

import { useEffect, useState, useCallback } from 'react';
import { Navigation } from '@/components/shared/navigation';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert, Loader2, Send, Trash2, Building2, FileUp } from 'lucide-react';
import { useRef } from 'react';

interface Vendor {
  id: string; name: string; websiteUrl: string | null; category: string | null;
  contactEmail: string | null; dpaStatus: string; riskScore: number | null;
  riskTier: string | null; riskSummary: string | null; questionnaireStatus: string;
}

const TIER_STYLE: Record<string, string> = {
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  medium: 'bg-eari-blue/15 text-eari-blue-light border-eari-blue/30',
  high: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  critical: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export default function VendorsPage() {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [systems, setSystems] = useState<{ id: string; name: string; vendorId: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const uploadTarget = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadEvidence = async (file: File) => {
    const vendorId = uploadTarget.current;
    if (!vendorId) return;
    setBusy(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/vendors/${vendorId}/evidence`, { method: 'POST', body: fd });
    setBusy(false);
    if (res.ok) toast({ title: 'Evidence uploaded', description: 'Clause extraction runs in the background — mapped clauses become reusable across obligations.' });
    else toast({ title: 'Upload failed', description: (await res.json()).error, variant: 'destructive' });
  };

  const load = useCallback(async () => {
    const res = await fetch('/api/vendors');
    if (res.ok) { const j = await res.json(); setVendors(j.vendors); setSystems(j.systems); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!name) return;
    setBusy(true);
    const res = await fetch('/api/vendors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, contactEmail: contactEmail || undefined }) });
    const j = await res.json();
    setBusy(false);
    if (res.ok) { setName(''); setContactEmail(''); load(); }
    else toast({ title: 'Could not add vendor', description: j.error, variant: 'destructive' });
  };

  const sendQuestionnaire = async (v: Vendor) => {
    let email = v.contactEmail;
    if (!email) {
      email = window.prompt(`Contact email for ${v.name}?`) || '';
      if (!email) return;
    }
    setBusy(true);
    const res = await fetch('/api/vendors', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: v.id, action: 'send_questionnaire', contactEmail: email }) });
    const j = await res.json();
    setBusy(false);
    if (res.ok) { toast({ title: j.sent ? 'Questionnaire sent' : 'Saved — email delivery unavailable' }); load(); }
    else toast({ title: 'Send failed', description: j.error, variant: 'destructive' });
  };

  const remove = async (id: string) => {
    await fetch(`/api/vendors?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-10 space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="h-6 w-6 text-eari-blue-light" />
            <h1 className="font-heading text-2xl font-bold text-foreground">AI Vendor Risk</h1>
            <Badge variant="outline" className="font-mono text-[10px] border-eari-blue/30 text-eari-blue-light">Third-party AI TPRM</Badge>
          </div>
          <p className="font-sans text-sm text-muted-foreground max-w-2xl">
            Every third-party AI tool your organisation uses is someone else&apos;s model and someone else&apos;s data terms.
            Send vendors a 10-minute AI risk questionnaire — scored deterministically, no account needed on their side.
          </p>
        </div>

        <Card className="bg-navy-800 border-border/60">
          <CardHeader><CardTitle className="font-heading text-base">Add a vendor</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Input placeholder="Vendor name (e.g. OpenAI)" value={name} onChange={(e) => setName(e.target.value)} className="max-w-60 bg-navy-700 border-border/60 font-sans" />
            <Input placeholder="Contact email (optional)" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="max-w-64 bg-navy-700 border-border/60 font-sans" />
            <Button disabled={busy} onClick={add} className="bg-eari-blue hover:bg-eari-blue-dark text-white font-sans">Add vendor</Button>
          </CardContent>
        </Card>

        {loading ? <Loader2 className="h-6 w-6 animate-spin text-eari-blue-light" /> : vendors.length === 0 ? (
          <Card className="bg-navy-800 border-border/60"><CardContent className="p-8 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-sans text-sm text-muted-foreground">No vendors yet. Tools registered from Shadow AI Discovery auto-create their vendors here.</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-4">
            {vendors.map((v) => {
              const linked = systems.filter((s) => s.vendorId === v.id);
              return (
                <Card key={v.id} className="bg-navy-800 border-border/60">
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-heading text-sm font-semibold text-foreground">{v.name}</span>
                      {v.category && <span className="font-sans text-xs text-muted-foreground">{v.category}</span>}
                      {v.riskTier ? (
                        <Badge className={`text-[10px] font-mono uppercase ${TIER_STYLE[v.riskTier] ?? ''}`}>{v.riskTier} · {v.riskScore != null ? `${Math.round(v.riskScore)}/100` : ''}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-mono border-border text-muted-foreground">
                          {v.questionnaireStatus === 'sent' ? 'Questionnaire sent — awaiting response' : 'Not assessed'}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] font-mono border-border text-muted-foreground">DPA: {v.dpaStatus}</Badge>
                      {linked.length > 0 && <span className="font-sans text-xs text-muted-foreground">{linked.length} linked AI system{linked.length === 1 ? '' : 's'}</span>}
                      <div className="ml-auto flex items-center gap-2">
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => sendQuestionnaire(v)} className="border-eari-blue/30 text-eari-blue-light hover:bg-eari-blue/10 font-sans text-xs">
                          <Send className="h-3.5 w-3.5 mr-1.5" />{v.questionnaireStatus === 'completed' ? 'Re-send questionnaire' : 'Send questionnaire'}
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => { uploadTarget.current = v.id; fileRef.current?.click(); }} className="border-border text-muted-foreground hover:text-foreground font-sans text-xs">
                          <FileUp className="h-3.5 w-3.5 mr-1.5" />Upload DPA / evidence
                        </Button>
                        <button onClick={() => remove(v.id)} className="text-muted-foreground hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    {v.riskSummary && <p className="font-sans text-xs text-muted-foreground mt-3 leading-relaxed">{v.riskSummary}</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" hidden onChange={(e) => e.target.files?.[0] && uploadEvidence(e.target.files[0])} />
      <Footer />
    </div>
  );
}
