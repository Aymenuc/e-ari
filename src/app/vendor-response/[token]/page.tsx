'use client';

/** PUBLIC vendor questionnaire — HMAC magic link, no account. */

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Q { id: string; section: string; text: string; options: string[] }

const SECTION_LABELS: Record<string, string> = {
  data: 'Data handling', security: 'Security', ai: 'AI-specific', legal: 'Legal & contractual',
};

export default function VendorResponsePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<{ vendorName: string; requesterOrg: string; alreadyCompleted: boolean; questions: Q[] } | null>(null);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/vendors/respond/${token}`);
    const json = await res.json();
    if (!res.ok) setError(json.error || 'Something went wrong.');
    else setData(json);
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/vendors/respond/${token}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      if (res.ok) setDone(true);
      else setError((await res.json()).error || 'Submission failed.');
    } finally { setSubmitting(false); }
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-navy-900 text-foreground">
      <header className="border-b border-border/40 px-6 py-4">
        <span className="font-heading font-bold text-lg text-eari-blue-light">E-ARI</span>
        <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">AI Vendor Risk Questionnaire</span>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
    </div>
  );

  if (error) return shell(<Card className="bg-navy-800 border-red-500/30"><CardContent className="p-6 flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-400" /><p className="font-sans">{error}</p></CardContent></Card>);
  if (!data) return shell(<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-eari-blue-light" /></div>);
  if (done || data.alreadyCompleted) return shell(
    <Card className="bg-navy-800 border-emerald-500/30"><CardContent className="p-8 text-center space-y-3">
      <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
      <p className="font-heading text-lg font-semibold">Questionnaire submitted</p>
      <p className="font-sans text-sm text-muted-foreground">Thank you — {data.requesterOrg} has been notified. You can close this page.</p>
    </CardContent></Card>,
  );

  const sections = [...new Set(data.questions.map((q) => q.section))];
  const answeredCount = Object.keys(answers).length;

  return shell(
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">AI risk questionnaire for {data.vendorName}</h1>
        <p className="font-sans text-muted-foreground mt-2">
          {data.requesterOrg} is assessing its AI vendors as part of its EU AI Act compliance programme.
          ~10 minutes · {answeredCount}/{data.questions.length} answered. Unanswered questions are treated as worst-case.
        </p>
      </div>
      {sections.map((s) => (
        <Card key={s} className="bg-navy-800 border-border/60">
          <CardHeader>
            <CardTitle className="font-heading text-base">{SECTION_LABELS[s] ?? s}</CardTitle>
            <CardDescription className="font-sans">{data.questions.filter((q) => q.section === s).length} questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {data.questions.filter((q) => q.section === s).map((q) => (
              <div key={q.id}>
                <p className="font-sans text-sm font-medium mb-2">{q.text}</p>
                <div className="space-y-1.5">
                  {q.options.map((opt, oi) => (
                    <button key={oi} onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                      className={`w-full text-left px-3 py-2 rounded-md border font-sans text-sm transition-colors ${answers[q.id] === oi ? 'border-eari-blue bg-eari-blue/15 text-foreground' : 'border-border/60 text-muted-foreground hover:border-eari-blue/50'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      <Button disabled={submitting || answeredCount === 0} onClick={submit} className="btn-brand font-heading w-full h-11">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Submit questionnaire
      </Button>
    </div>,
  );
}
