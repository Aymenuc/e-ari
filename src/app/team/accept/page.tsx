'use client';

/** Invite acceptance — sign in with the invited email, then join the workspace. */

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Navigation } from '@/components/shared/navigation';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, UsersRound, CheckCircle2, AlertCircle } from 'lucide-react';

function AcceptInner() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const { data: session, status } = useSession();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const accept = async () => {
    setBusy(true);
    const res = await fetch('/api/team/accept', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const j = await res.json();
    setBusy(false);
    setResult(res.ok
      ? { ok: true, message: `You've joined ${j.workspace} as ${j.role}. The shared workspace is now live across your portal.` }
      : { ok: false, message: j.error || 'Could not accept the invitation.' });
  };

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md bg-navy-800 border-border/60">
        <CardContent className="p-8 text-center space-y-4">
          <UsersRound className="h-10 w-10 text-eari-blue-light mx-auto" />
          <h1 className="font-heading text-xl font-bold text-foreground">Workspace invitation</h1>
          {!token ? (
            <p className="font-sans text-sm text-muted-foreground">This link is missing its invitation token.</p>
          ) : result ? (
            <>
              {result.ok ? <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" /> : <AlertCircle className="h-8 w-8 text-red-400 mx-auto" />}
              <p className="font-sans text-sm text-muted-foreground">{result.message}</p>
              {result.ok && (
                <Button asChild className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading w-full">
                  <Link href="/portal">Open the workspace</Link>
                </Button>
              )}
            </>
          ) : status === 'loading' ? (
            <Loader2 className="h-6 w-6 animate-spin text-eari-blue-light mx-auto" />
          ) : !session ? (
            <>
              <p className="font-sans text-sm text-muted-foreground">
                Sign in — or create a free account — with the email this invitation was sent to, then come back to this link.
              </p>
              <div className="flex flex-col gap-2">
                <Button asChild className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading w-full">
                  <Link href={`/auth/login?callbackUrl=${encodeURIComponent(`/team/accept?token=${token}`)}`}>Sign in</Link>
                </Button>
                <Button asChild variant="outline" className="border-border font-sans w-full">
                  <Link href={`/auth/register?callbackUrl=${encodeURIComponent(`/team/accept?token=${token}`)}`}>Create free account</Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="font-sans text-sm text-muted-foreground">
                Signed in as <span className="text-foreground">{session.user?.email}</span>. Accept to join the shared workspace.
              </p>
              <Button disabled={busy} onClick={accept} className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Accept invitation
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function TeamAcceptPage() {
  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />
      <Suspense fallback={<main className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-eari-blue-light" /></main>}>
        <AcceptInner />
      </Suspense>
      <Footer />
    </div>
  );
}
