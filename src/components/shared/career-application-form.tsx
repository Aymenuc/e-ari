'use client';

/**
 * CareerApplicationForm — the real application intake on /careers.
 * Replaces mailto: links with a form that persists to the admin inbox
 * (ContactMessage) and emails the founder. Role options are passed in so
 * the careers page stays the single source of truth for open positions.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Loader2, Send } from 'lucide-react';

export function CareerApplicationForm({ roles }: { roles: string[] }) {
  const [form, setForm] = useState({ name: '', email: '', role: roles[0] ?? 'Open application', link: '', motivation: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending');
    setError('');
    try {
      const res = await fetch('/api/careers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      setState('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setState('error');
    }
  };

  if (state === 'sent') {
    return (
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-8 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
        <h3 className="mt-3 font-heading text-lg font-semibold text-foreground">Application received</h3>
        <p className="mt-2 font-sans text-sm text-muted-foreground max-w-md mx-auto">
          Thank you — your application for <span className="text-foreground">{form.role}</span> is in.
          We read every submission and reply to the ones we can move forward with.
        </p>
      </div>
    );
  }

  const field = 'bg-navy-900/60 border-white/[0.08] font-sans text-sm';

  return (
    <form onSubmit={submit} className="space-y-4 text-left">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="app-name" className="font-sans text-xs text-muted-foreground">Full name *</Label>
          <Input id="app-name" required maxLength={120} className={field}
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="app-email" className="font-sans text-xs text-muted-foreground">Email *</Label>
          <Input id="app-email" type="email" required maxLength={160} className={field}
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="app-role" className="font-sans text-xs text-muted-foreground">Position *</Label>
          <select
            id="app-role"
            className="flex h-9 w-full rounded-md border border-white/[0.08] bg-navy-900/60 px-3 py-1 font-sans text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            <option value="Open application">Open application — something else</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="app-link" className="font-sans text-xs text-muted-foreground">LinkedIn / CV / portfolio URL</Label>
          <Input id="app-link" type="url" placeholder="https://…" maxLength={300} className={field}
            value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="app-motivation" className="font-sans text-xs text-muted-foreground">
          Why you, why E-ARI *
        </Label>
        <Textarea id="app-motivation" required rows={5} maxLength={3000}
          placeholder="A few honest paragraphs beat a formal cover letter. What have you built or done that makes you right for this?"
          className={`${field} resize-y min-h-[120px]`}
          value={form.motivation} onChange={(e) => setForm({ ...form, motivation: e.target.value })} />
      </div>

      {error && <p className="font-sans text-sm text-red-400">{error}</p>}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="font-sans text-[11px] text-muted-foreground/70 max-w-sm">
          Submitting sends your application to the founder and stores it for review. See our{' '}
          <a href="/privacy" className="underline hover:text-foreground">privacy policy</a>.
        </p>
        <Button type="submit" disabled={state === 'sending'} className="btn-brand font-heading font-semibold h-10 px-6">
          {state === 'sending'
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
            : <><Send className="mr-2 h-4 w-4" /> Submit application</>}
        </Button>
      </div>
    </form>
  );
}
