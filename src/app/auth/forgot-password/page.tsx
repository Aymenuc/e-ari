'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email is required'); return; }
    setLoading(true);
    setError('');
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-heading text-xl font-bold text-foreground">
            E-ARI
          </Link>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-eari-blue/10">
                {sent ? <CheckCircle2 className="h-6 w-6 text-green-400" /> : <Mail className="h-6 w-6 text-eari-blue-light" />}
              </div>
            </div>
            <CardTitle className="font-heading text-xl">
              {sent ? 'Check your email' : 'Forgot password?'}
            </CardTitle>
            <CardDescription className="font-sans">
              {sent
                ? `We sent a password reset link to ${email}. It expires in 1 hour.`
                : "Enter your email and we'll send you a reset link."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground font-sans text-center">
                  Didn&apos;t receive it? Check your spam folder or{' '}
                  <button
                    onClick={() => { setSent(false); }}
                    className="text-eari-blue-light underline underline-offset-4 hover:no-underline"
                  >
                    try again
                  </button>
                  .
                </p>
                <Button asChild variant="outline" className="w-full font-sans border-border">
                  <Link href="/auth/login">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to sign in
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <p className="text-sm text-destructive font-sans text-center">{error}</p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-sans text-muted-foreground">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="bg-navy-700/50 border-border h-11 font-sans"
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-eari-blue hover:bg-eari-blue-dark text-white font-sans h-11"
                >
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending...</> : 'Send reset link'}
                </Button>
                <Button asChild variant="ghost" className="w-full font-sans text-muted-foreground">
                  <Link href="/auth/login">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to sign in
                  </Link>
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
