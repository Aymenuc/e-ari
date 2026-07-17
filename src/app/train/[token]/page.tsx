'use client';

/**
 * PUBLIC training page — reached via HMAC magic link, no account.
 * Lists assigned modules; each renders lessons then a quiz. Pass = recorded
 * completion with attestation hash (server-side).
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, BookOpen, AlertCircle } from 'lucide-react';

interface Mod {
  id: string; title: string; minutes: number;
  lessons: { heading: string; body: string }[];
  quiz: { q: string; options: string[] }[];
  passThreshold: number; completed: boolean; score: number | null;
}

export default function TrainPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<{ memberName: string; orgName: string; modules: Mod[] } | null>(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState<Mod | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{ passed: boolean; score: number; required: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/literacy/train/${token}`);
    const json = await res.json();
    if (!res.ok) setError(json.error || 'Something went wrong.');
    else setData(json);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!active) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/literacy/train/${token}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId: active.id, answers: active.quiz.map((_, i) => answers[i] ?? -1) }),
      });
      const json = await res.json();
      if (res.ok) { setResult(json); if (json.passed) await load(); }
      else setError(json.error || 'Submission failed.');
    } finally { setSubmitting(false); }
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-navy-900 text-foreground">
      <header className="border-b border-border/40 px-6 py-4">
        <span className="font-heading font-bold text-lg text-eari-blue-light">E-ARI</span>
        <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">AI Literacy Training · EU AI Act Article 4</span>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
    </div>
  );

  if (error) return shell(<Card className="bg-navy-800 border-red-500/30"><CardContent className="p-6 flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-400" /><p className="font-sans">{error}</p></CardContent></Card>);
  if (!data) return shell(<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-eari-blue-light" /></div>);

  if (active) {
    const allAnswered = active.quiz.every((_, i) => answers[i] !== undefined);
    return shell(
      <div className="space-y-6">
        <Button variant="outline" className="border-border font-sans" onClick={() => { setActive(null); setAnswers({}); setResult(null); }}>← All modules</Button>
        <h1 className="font-heading text-2xl font-bold">{active.title}</h1>
        {active.lessons.map((l) => (
          <Card key={l.heading} className="bg-navy-800 border-border/60">
            <CardHeader><CardTitle className="font-heading text-base">{l.heading}</CardTitle></CardHeader>
            <CardContent className="pt-0"><p className="font-sans text-sm leading-relaxed text-muted-foreground">{l.body}</p></CardContent>
          </Card>
        ))}
        <Card className="bg-navy-800 border-eari-blue/30">
          <CardHeader>
            <CardTitle className="font-heading text-base">Knowledge check</CardTitle>
            <CardDescription className="font-sans">Pass mark: {Math.round(active.passThreshold * 100)}%</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {active.quiz.map((q, qi) => (
              <div key={qi}>
                <p className="font-sans text-sm font-medium mb-2">{qi + 1}. {q.q}</p>
                <div className="space-y-1.5">
                  {q.options.map((opt, oi) => (
                    <button key={oi} onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                      className={`w-full text-left px-3 py-2 rounded-md border font-sans text-sm transition-colors ${answers[qi] === oi ? 'border-eari-blue bg-eari-blue/15 text-foreground' : 'border-border/60 text-muted-foreground hover:border-eari-blue/50'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {result && (
              <div className={`p-4 rounded-lg border ${result.passed ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-amber-500/40 bg-amber-500/10'}`}>
                <p className="font-sans text-sm">
                  {result.passed
                    ? `Passed — ${result.score}%. Your completion has been recorded.`
                    : `Score ${result.score}% — you need ${result.required}%. Review the lessons above and try again.`}
                </p>
              </div>
            )}
            <Button disabled={!allAnswered || submitting} onClick={submit} className="btn-brand font-heading">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {result && !result.passed ? 'Retry quiz' : 'Submit answers'}
            </Button>
          </CardContent>
        </Card>
      </div>,
    );
  }

  const doneCount = data.modules.filter((m) => m.completed).length;
  return shell(
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Hi {data.memberName.split(' ')[0]},</h1>
        <p className="font-sans text-muted-foreground mt-2">
          {data.orgName} has assigned you AI literacy training required under Article 4 of the EU AI Act.
          {data.modules.length > 0 && ` Progress: ${doneCount} of ${data.modules.length} modules complete.`}
        </p>
      </div>
      {data.modules.length === 0 && (
        <Card className="bg-navy-800 border-border/60"><CardContent className="p-6"><p className="font-sans text-sm text-muted-foreground">No modules are currently assigned to you.</p></CardContent></Card>
      )}
      {data.modules.map((m) => (
        <Card key={m.id} className="bg-navy-800 border-border/60 hover:border-eari-blue/40 transition-colors">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {m.completed ? <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" /> : <BookOpen className="h-5 w-5 text-eari-blue-light shrink-0" />}
              <div className="min-w-0">
                <p className="font-heading text-sm font-semibold">{m.title}</p>
                <p className="font-sans text-xs text-muted-foreground">~{m.minutes} min{m.completed && m.score != null ? ` · completed, ${Math.round(m.score)}%` : ''}</p>
              </div>
            </div>
            <Button variant={m.completed ? 'outline' : 'default'} className={m.completed ? 'border-border font-sans' : 'btn-brand font-sans'}
              onClick={() => { setActive(m); setAnswers({}); setResult(null); }}>
              {m.completed ? 'Review' : 'Start'}
            </Button>
          </CardContent>
        </Card>
      ))}
      {doneCount === data.modules.length && data.modules.length > 0 && (
        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-sans">All assigned training complete — nothing else needed from you.</Badge>
      )}
    </div>,
  );
}
