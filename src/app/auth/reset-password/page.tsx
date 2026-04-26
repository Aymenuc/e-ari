'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') || '';
  const email = params.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (!token || !email) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-destructive font-sans">Invalid reset link. Please request a new one.</p>
        <Button asChild className="w-full bg-eari-blue hover:bg-eari-blue-dark text-white font-sans">
          <Link href="/auth/forgot-password">Request new link</Link>
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to reset password'); return; }
      setDone(true);
      setTimeout(() => router.push('/auth/login'), 2500);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 className="h-6 w-6 text-green-400" />
          </div>
        </div>
        <p className="text-foreground font-sans font-medium">Password updated!</p>
        <p className="text-sm text-muted-foreground font-sans">Redirecting you to sign in...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-destructive font-sans text-center">{error}</p>}

      <div className="space-y-2">
        <Label htmlFor="password" className="font-sans text-muted-foreground">New password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Min 8 chars, 1 uppercase, 1 number"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="bg-navy-700/50 border-border h-11 font-sans pr-10"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm" className="font-sans text-muted-foreground">Confirm new password</Label>
        <Input
          id="confirm"
          type={showPassword ? 'text' : 'password'}
          placeholder="Repeat your password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className="bg-navy-700/50 border-border h-11 font-sans"
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-eari-blue hover:bg-eari-blue-dark text-white font-sans h-11"
      >
        {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Updating...</> : 'Reset password'}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
                <KeyRound className="h-6 w-6 text-eari-blue-light" />
              </div>
            </div>
            <CardTitle className="font-heading text-xl">Set new password</CardTitle>
            <CardDescription className="font-sans">
              Choose a strong password for your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="text-center text-muted-foreground font-sans text-sm">Loading...</div>}>
              <ResetPasswordForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
