'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, Clock, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function VerifyEmailContent() {
  const params = useSearchParams();
  const success = params.get('success') === 'true';
  const error = params.get('error');
  const email = params.get('email') || '';
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResent(true);
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Email Verified</h1>
        <p className="text-muted-foreground font-sans">Your email has been verified. You can now sign in to your account.</p>
        <Button asChild className="bg-eari-blue hover:bg-eari-blue-dark text-white font-sans w-full">
          <Link href="/auth/login">Sign In</Link>
        </Button>
      </div>
    );
  }

  if (error === 'expired') {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
            <Clock className="h-8 w-8 text-amber-400" />
          </div>
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Link Expired</h1>
        <p className="text-muted-foreground font-sans">This verification link has expired. Request a new one below.</p>
        {resent ? (
          <p className="text-green-400 text-sm font-sans">New verification email sent. Check your inbox.</p>
        ) : (
          <Button onClick={handleResend} disabled={resending || !email} className="bg-eari-blue hover:bg-eari-blue-dark text-white font-sans w-full">
            {resending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending...</> : 'Resend Verification Email'}
          </Button>
        )}
        <Link href="/auth/login" className="block text-sm text-muted-foreground hover:text-foreground font-sans underline underline-offset-4">
          Back to sign in
        </Link>
      </div>
    );
  }

  if (error === 'invalid' || error === 'server') {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Invalid Link</h1>
        <p className="text-muted-foreground font-sans">This verification link is invalid or has already been used.</p>
        <Button asChild className="bg-eari-blue hover:bg-eari-blue-dark text-white font-sans w-full">
          <Link href="/auth/login">Back to Sign In</Link>
        </Button>
      </div>
    );
  }

  // Default: check your email state
  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-eari-blue/10">
          <Mail className="h-8 w-8 text-eari-blue-light" />
        </div>
      </div>
      <h1 className="font-heading text-2xl font-bold text-foreground">Check your email</h1>
      <p className="text-muted-foreground font-sans">
        We sent a verification link to{' '}
        {email ? <span className="text-foreground font-medium">{email}</span> : 'your email address'}.
        Click the link to activate your account.
      </p>
      <p className="text-muted-foreground/60 text-sm font-sans">The link expires in 24 hours.</p>
      {resent ? (
        <p className="text-green-400 text-sm font-sans">Email resent. Check your inbox.</p>
      ) : (
        <Button variant="outline" onClick={handleResend} disabled={resending || !email} className="w-full font-sans border-border">
          {resending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending...</> : 'Resend email'}
        </Button>
      )}
      <Link href="/auth/login" className="block text-sm text-muted-foreground hover:text-foreground font-sans underline underline-offset-4">
        Back to sign in
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-heading text-xl font-bold text-foreground">
            E-ARI
          </Link>
        </div>
        <div className="bg-card border border-border rounded-xl p-8">
          <Suspense fallback={<div className="text-center text-muted-foreground font-sans">Loading...</div>}>
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
