'use client';

/** Team seats — invite colleagues into the shared workspace. */

import { useEffect, useState, useCallback } from 'react';
import { Navigation } from '@/components/shared/navigation';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { UsersRound, Loader2, Trash2, Send } from 'lucide-react';

interface Seat { id: string; email: string; role: string; status: string; name: string | null; invitedAt: string; acceptedAt: string | null }
interface WorkspaceMeta { ownerName: string; yourRole: string; isGuest: boolean; seatLimit: number | null; seatsUsed: number }

const ROLE_DESC: Record<string, string> = {
  admin: 'Read/write + manage seats',
  member: 'Read/write workspace data',
  viewer: 'Read-only',
};

export default function TeamPage() {
  const { toast } = useToast();
  const [meta, setMeta] = useState<WorkspaceMeta | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/team');
    if (res.ok) { const j = await res.json(); setMeta(j.workspace); setSeats(j.members); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const invite = async () => {
    if (!email) return;
    setBusy(true);
    const res = await fetch('/api/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, role }) });
    const j = await res.json();
    setBusy(false);
    if (res.ok) { toast({ title: j.emailed ? 'Invitation sent' : 'Invite created — email delivery unavailable' }); setEmail(''); load(); }
    else toast({ title: 'Invite failed', description: j.error, variant: 'destructive' });
  };

  const revoke = async (id: string) => {
    await fetch(`/api/team?id=${id}`, { method: 'DELETE' });
    load();
  };

  const changeRole = async (id: string, newRole: string) => {
    await fetch('/api/team', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, role: newRole }) });
    load();
  };

  const canManage = meta && (meta.yourRole === 'owner' || meta.yourRole === 'admin');

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-10 space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <UsersRound className="h-6 w-6 text-eari-blue-light" />
            <h1 className="font-heading text-2xl font-bold text-foreground">Team</h1>
            {meta && (
              <Badge variant="outline" className="font-mono text-[10px] border-eari-blue/30 text-eari-blue-light">
                {meta.seatsUsed}{meta.seatLimit ? ` / ${meta.seatLimit}` : ''} seats
              </Badge>
            )}
          </div>
          <p className="font-sans text-sm text-muted-foreground max-w-2xl">
            Everyone on the team works in one shared workspace — same registry, evidence, vendors, and controls.
            {meta?.isGuest && <> You are a <span className="text-foreground">{meta.yourRole}</span> in {meta.ownerName}&apos;s workspace.</>}
          </p>
        </div>

        {canManage && (
          <Card className="bg-navy-800 border-border/60">
            <CardHeader>
              <CardTitle className="font-heading text-base">Invite a colleague</CardTitle>
              <CardDescription className="font-sans">They sign in with their own account and land in this workspace.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 items-center">
              <Input placeholder="colleague@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="max-w-72 bg-navy-700 border-border/60 font-sans" />
              <div className="flex rounded-md border border-border/60 overflow-hidden">
                {(['admin', 'member', 'viewer'] as const).map((r) => (
                  <button key={r} title={ROLE_DESC[r]} onClick={() => setRole(r)}
                    className={`px-3 py-2 font-mono text-xs uppercase ${role === r ? 'bg-eari-blue/20 text-eari-blue-light' : 'text-muted-foreground'}`}>{r}</button>
                ))}
              </div>
              <Button disabled={busy || !email} onClick={invite} className="btn-brand font-sans">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" />Invite</>}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="bg-navy-800 border-border/60">
          <CardHeader><CardTitle className="font-heading text-base">Seats</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-6 w-6 animate-spin text-eari-blue-light" /> : (
              <div className="space-y-2">
                <div className="flex items-center gap-3 border border-border/40 rounded-md px-4 py-3">
                  <span className="font-sans text-sm text-foreground">{meta?.ownerName}</span>
                  <Badge variant="outline" className="text-[10px] font-mono uppercase border-amber-500/30 text-amber-400">owner</Badge>
                </div>
                {seats.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center gap-3 border border-border/40 rounded-md px-4 py-3">
                    <span className="font-sans text-sm text-foreground">{s.name || s.email}</span>
                    {s.name && <span className="font-sans text-xs text-muted-foreground">{s.email}</span>}
                    {canManage ? (
                      <select value={s.role} onChange={(e) => changeRole(s.id, e.target.value)}
                        className="bg-navy-700 border border-border/60 rounded px-2 py-1 font-mono text-[10px] uppercase text-eari-blue-light">
                        <option value="admin">admin</option>
                        <option value="member">member</option>
                        <option value="viewer">viewer</option>
                      </select>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-mono uppercase border-eari-blue/30 text-eari-blue-light">{s.role}</Badge>
                    )}
                    <Badge variant="outline" className={`text-[10px] font-mono ${s.status === 'active' ? 'border-emerald-500/30 text-emerald-400' : 'border-amber-500/30 text-amber-400'}`}>
                      {s.status === 'active' ? 'Active' : 'Invited'}
                    </Badge>
                    {canManage && (
                      <button onClick={() => revoke(s.id)} className="ml-auto text-muted-foreground hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>
                ))}
                {seats.length === 0 && <p className="font-sans text-sm text-muted-foreground pt-2">No other seats yet.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
