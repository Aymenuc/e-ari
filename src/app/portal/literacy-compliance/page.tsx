'use client';

/** Article 4 Literacy Compliance — roster, assignments, completions, report. */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Navigation } from '@/components/shared/navigation';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Upload, FileDown, Loader2, Send, Trash2, CheckCircle2 } from 'lucide-react';
import { TRAINING_MODULES } from '@/lib/training-modules';

interface Member {
  id: string; name: string; email: string; role: string | null; department: string | null;
  completions: { moduleId: string; completedAt: string; quizScore: number | null }[];
}
interface Assignment { memberId: string; moduleId: string; sentAt: string | null }

export default function LiteracyCompliancePage() {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set(TRAINING_MODULES.map((m) => m.id)));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/literacy/members');
    if (res.ok) { const j = await res.json(); setMembers(j.members); setAssignments(j.assignments); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const addMember = async () => {
    if (!name || !email) return;
    setBusy(true);
    const res = await fetch('/api/literacy/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email }) });
    const j = await res.json();
    setBusy(false);
    if (res.ok) { setName(''); setEmail(''); load(); }
    else toast({ title: 'Could not add member', description: j.error, variant: 'destructive' });
  };

  const importCsv = async (file: File) => {
    setBusy(true);
    const csvText = await file.text();
    const res = await fetch('/api/literacy/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csvText }) });
    const j = await res.json();
    setBusy(false);
    if (res.ok) { toast({ title: `Imported ${j.imported} members` }); load(); }
    else toast({ title: 'Import failed', description: j.error, variant: 'destructive' });
  };

  const assign = async () => {
    if (selected.size === 0 || selectedModules.size === 0) return;
    setBusy(true);
    const res = await fetch('/api/literacy/assignments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds: [...selected], moduleIds: [...selectedModules] }),
    });
    const j = await res.json();
    setBusy(false);
    if (res.ok) { toast({ title: `Assigned + emailed ${j.emailed} of ${j.members} members` }); setSelected(new Set()); load(); }
    else toast({ title: 'Assignment failed', description: j.error, variant: 'destructive' });
  };

  const remove = async (id: string) => {
    await fetch(`/api/literacy/members?id=${id}`, { method: 'DELETE' });
    load();
  };

  const totalAssigned = assignments.length;
  const totalDone = members.reduce((n, m) => n + m.completions.filter((c) => assignments.some((a) => a.memberId === m.id && a.moduleId === c.moduleId)).length, 0);

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-10 space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="h-6 w-6 text-eari-blue-light" />
            <h1 className="font-heading text-2xl font-bold text-foreground">AI Literacy Compliance</h1>
            <Badge variant="outline" className="font-mono text-[10px] border-eari-blue/30 text-eari-blue-light">EU AI Act · Article 4</Badge>
          </div>
          <p className="font-sans text-sm text-muted-foreground max-w-2xl">
            Article 4 has applied since 2 February 2025: staff must have sufficient AI literacy for their role.
            Assign training, track completions, and export tamper-evident evidence for regulators.
          </p>
        </div>

        {/* Stats + report */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Team members', value: members.length },
            { label: 'Assignments', value: totalAssigned },
            { label: 'Completed', value: totalDone },
            { label: 'Coverage', value: totalAssigned > 0 ? `${Math.round((totalDone / totalAssigned) * 100)}%` : '—' },
          ].map((s) => (
            <Card key={s.label} className="bg-navy-800 border-border/60">
              <CardContent className="p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="font-heading text-2xl font-bold tabular-nums mt-1">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Button asChild variant="outline" className="border-eari-blue/30 text-eari-blue-light hover:bg-eari-blue/10 font-heading">
          <a href="/api/literacy/article4-report"><FileDown className="h-4 w-4 mr-2" />Export Article 4 Evidence Report (.docx)</a>
        </Button>

        {/* Add / import */}
        <Card className="bg-navy-800 border-border/60">
          <CardHeader><CardTitle className="font-heading text-base">Roster</CardTitle>
            <CardDescription className="font-sans">Add members individually or import a CSV with name + email columns.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-52 bg-navy-700 border-border/60 font-sans" />
              <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="max-w-64 bg-navy-700 border-border/60 font-sans" />
              <Button disabled={busy} onClick={addMember} className="bg-eari-blue hover:bg-eari-blue-dark text-white font-sans">Add</Button>
              <input ref={fileRef} type="file" accept=".csv" hidden onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
              <Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()} className="border-border font-sans"><Upload className="h-4 w-4 mr-2" />Import CSV</Button>
            </div>

            {loading ? <Loader2 className="h-6 w-6 animate-spin text-eari-blue-light" /> : members.length === 0 ? (
              <p className="font-sans text-sm text-muted-foreground">No team members yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-sans">
                  <thead><tr className="text-left text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
                    <th className="py-2 pr-2"><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? new Set(members.map((m) => m.id)) : new Set())} /></th>
                    <th className="py-2 pr-4">Member</th><th className="py-2 pr-4">Modules complete</th><th className="py-2 pr-4">Status</th><th></th>
                  </tr></thead>
                  <tbody>
                    {members.map((m) => {
                      const assigned = assignments.filter((a) => a.memberId === m.id);
                      const done = m.completions.filter((c) => assigned.some((a) => a.moduleId === c.moduleId)).length;
                      const complete = assigned.length > 0 && done === assigned.length;
                      return (
                        <tr key={m.id} className="border-t border-border/40">
                          <td className="py-2.5 pr-2"><input type="checkbox" checked={selected.has(m.id)} onChange={(e) => { const s = new Set(selected); if (e.target.checked) s.add(m.id); else s.delete(m.id); setSelected(s); }} /></td>
                          <td className="py-2.5 pr-4"><span className="text-foreground">{m.name}</span><span className="text-muted-foreground ml-2 text-xs">{m.email}</span></td>
                          <td className="py-2.5 pr-4 tabular-nums">{assigned.length > 0 ? `${done}/${assigned.length}` : '—'}</td>
                          <td className="py-2.5 pr-4">
                            {assigned.length === 0 ? <Badge variant="outline" className="text-[10px] font-mono border-border text-muted-foreground">Not assigned</Badge>
                              : complete ? <Badge className="text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Complete</Badge>
                              : <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-400">In progress</Badge>}
                          </td>
                          <td className="py-2.5 text-right"><button onClick={() => remove(m.id)} className="text-muted-foreground hover:text-red-400"><Trash2 className="h-4 w-4" /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assign */}
        <Card className="bg-navy-800 border-border/60">
          <CardHeader><CardTitle className="font-heading text-base">Assign training</CardTitle>
            <CardDescription className="font-sans">Select members above, choose modules, send. Each member gets one personal magic link — no account needed.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {TRAINING_MODULES.map((m) => (
                <button key={m.id} onClick={() => { const s = new Set(selectedModules); if (s.has(m.id)) s.delete(m.id); else s.add(m.id); setSelectedModules(s); }}
                  className={`px-3 py-1.5 rounded-md border font-sans text-xs transition-colors ${selectedModules.has(m.id) ? 'border-eari-blue bg-eari-blue/15 text-foreground' : 'border-border/60 text-muted-foreground'}`}>
                  {m.title} · {m.minutes}m
                </button>
              ))}
            </div>
            <Button disabled={busy || selected.size === 0 || selectedModules.size === 0} onClick={assign} className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading">
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Assign & email {selected.size > 0 ? `${selected.size} member${selected.size === 1 ? '' : 's'}` : ''}
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
