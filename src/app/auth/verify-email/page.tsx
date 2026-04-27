'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Mail, Loader2, RefreshCw, ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Email client shortcuts ──────────────────────────────────────────────────

const EMAIL_CLIENTS = [
  { name: 'Gmail', url: 'https://mail.google.com', color: '#EA4335' },
  { name: 'Outlook', url: 'https://outlook.live.com', color: '#0078D4' },
  { name: 'Yahoo', url: 'https://mail.yahoo.com', color: '#6001D2' },
];

// ─── Animation helpers ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.45, ease: 'easeOut' as const } }),
};

const iconPop = {
  hidden: { scale: 0, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: 'spring' as const, stiffness: 260, damping: 18, delay: 0.1 } },
};

// ─── Shared wrapper ──────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-eari-blue/5 blur-[120px]" />
      </div>

      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <img src="/logo.svg" alt="E-ARI" className="h-9 w-9 rounded-lg transition-transform duration-200 group-hover:scale-105" />
            <span className="font-heading font-semibold text-lg text-foreground tracking-tight">E-ARI</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-navy-800/80 backdrop-blur-sm border border-border/60 rounded-2xl p-8 shadow-xl shadow-black/20">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/50 font-sans mt-6">
          © {new Date().getFullYear()} E-ARI · Enterprise AI Readiness Platform
        </p>
      </motion.div>
    </div>
  );
}

// ─── Verifying state (auto-processing token) ─────────────────────────────────

function VerifyingState() {
  return (
    <div className="text-center space-y-5">
      <motion.div variants={iconPop} initial="hidden" animate="visible" className="flex justify-center">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-eari-blue/10 border border-eari-blue/20">
          <Loader2 className="h-9 w-9 text-eari-blue-light animate-spin" />
          <div className="absolute inset-0 rounded-full border border-eari-blue/20 animate-ping opacity-30" />
        </div>
      </motion.div>
      <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible" className="space-y-2">
        <h1 className="font-heading text-2xl font-bold text-foreground">Verifying your email</h1>
        <p className="text-muted-foreground font-sans text-sm">Please wait while we confirm your email address…</p>
      </motion.div>
    </div>
  );
}

// ─── Success state ───────────────────────────────────────────────────────────

function SuccessState() {
  return (
    <div className="text-center space-y-6">
      <motion.div variants={iconPop} initial="hidden" animate="visible" className="flex justify-center">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20">
          <CheckCircle2 className="h-9 w-9 text-green-400" />
        </div>
      </motion.div>

      <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible" className="space-y-2">
        <h1 className="font-heading text-2xl font-bold text-foreground">Email verified!</h1>
        <p className="text-muted-foreground font-sans text-sm leading-relaxed">
          Your email address has been confirmed. Your account is now fully activated.
        </p>
      </motion.div>

      <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible">
        <Button asChild className="w-full bg-eari-blue hover:bg-eari-blue-dark text-white font-sans h-11">
          <Link href="/auth/login">Sign in to your account</Link>
        </Button>
      </motion.div>
    </div>
  );
}

// ─── Expired state ───────────────────────────────────────────────────────────

function ExpiredState({ email }: { email: string }) {
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

  return (
    <div className="text-center space-y-6">
      <motion.div variants={iconPop} initial="hidden" animate="visible" className="flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
          <Clock className="h-9 w-9 text-amber-400" />
        </div>
      </motion.div>

      <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible" className="space-y-2">
        <h1 className="font-heading text-2xl font-bold text-foreground">Link expired</h1>
        <p className="text-muted-foreground font-sans text-sm leading-relaxed">
          This verification link has expired. Verification links are valid for 24 hours.
          {email && <> Request a new one for <span className="text-foreground font-medium">{email}</span>.</>}
        </p>
      </motion.div>

      <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible" className="space-y-3">
        <AnimatePresence mode="wait">
          {resent ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-sans"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              New verification email sent — check your inbox.
            </motion.div>
          ) : (
            <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Button
                onClick={handleResend}
                disabled={resending || !email}
                className="w-full bg-eari-blue hover:bg-eari-blue-dark text-white font-sans h-11 gap-2"
              >
                {resending ? <><Loader2 className="h-4 w-4 animate-spin" />Sending new link…</> : <><RefreshCw className="h-4 w-4" />Resend verification email</>}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <Link href="/auth/login" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-sans transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
      </motion.div>
    </div>
  );
}

// ─── Invalid state ───────────────────────────────────────────────────────────

function InvalidState() {
  return (
    <div className="text-center space-y-6">
      <motion.div variants={iconPop} initial="hidden" animate="visible" className="flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
          <XCircle className="h-9 w-9 text-red-400" />
        </div>
      </motion.div>

      <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible" className="space-y-2">
        <h1 className="font-heading text-2xl font-bold text-foreground">Invalid link</h1>
        <p className="text-muted-foreground font-sans text-sm leading-relaxed">
          This verification link is invalid or has already been used. If you need a new link, sign in and request one from your account settings.
        </p>
      </motion.div>

      <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible">
        <Button asChild className="w-full bg-eari-blue hover:bg-eari-blue-dark text-white font-sans h-11">
          <Link href="/auth/login">Back to sign in</Link>
        </Button>
      </motion.div>
    </div>
  );
}

// ─── Check-your-email state ──────────────────────────────────────────────────

function CheckEmailState({ email }: { email: string }) {
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
      setTimeout(() => setResent(false), 5000);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Icon */}
      <motion.div variants={iconPop} initial="hidden" animate="visible" className="flex justify-center">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-eari-blue/10 border border-eari-blue/20">
          <Mail className="h-9 w-9 text-eari-blue-light" />
          <motion.div
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-eari-blue text-white text-[10px] font-bold"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.4, stiffness: 300, damping: 15 }}
          >
            1
          </motion.div>
        </div>
      </motion.div>

      {/* Heading */}
      <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible" className="text-center space-y-2">
        <h1 className="font-heading text-2xl font-bold text-foreground">Check your inbox</h1>
        <p className="text-muted-foreground font-sans text-sm leading-relaxed">
          We sent a verification link to{' '}
          {email
            ? <span className="text-foreground font-medium">{email}</span>
            : 'your email address'
          }.
          <br />Click it to activate your account.
        </p>
      </motion.div>

      {/* Email client shortcuts */}
      <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible">
        <p className="text-xs text-muted-foreground/60 font-sans text-center mb-3">Open your email app</p>
        <div className="grid grid-cols-3 gap-2">
          {EMAIL_CLIENTS.map((client) => (
            <a
              key={client.name}
              href={client.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-border/60 bg-navy-700/40 hover:bg-navy-700 hover:border-border text-xs text-muted-foreground hover:text-foreground font-sans transition-all duration-200 group"
            >
              {client.name}
              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      </motion.div>

      {/* Divider */}
      <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible" className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/40" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-navy-800/80 px-3 text-muted-foreground/50 font-sans">didn't receive it?</span>
        </div>
      </motion.div>

      {/* Resend */}
      <motion.div variants={fadeUp} custom={4} initial="hidden" animate="visible" className="space-y-3">
        <AnimatePresence mode="wait">
          {resent ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-sans"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Email resent — check your spam folder too.
            </motion.div>
          ) : (
            <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Button
                variant="outline"
                onClick={handleResend}
                disabled={resending || !email}
                className="w-full font-sans h-10 border-border/60 gap-2 text-sm"
              >
                {resending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Resending…</> : <><RefreshCw className="h-3.5 w-3.5" />Resend verification email</>}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between text-xs text-muted-foreground/60 font-sans pt-1">
          <span>Link expires in 24 hours</span>
          <Link href="/auth/login" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" /> Back to sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main content — handles token auto-verification ──────────────────────────

function VerifyEmailContent() {
  const params = useSearchParams();
  const router = useRouter();

  const success = params.get('success') === 'true';
  const error = params.get('error');
  const email = params.get('email') || '';
  const token = params.get('token');

  const [verifying, setVerifying] = useState(!!token && !success && !error);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // If a token lands on this page directly, call the API to process it
  useEffect(() => {
    if (!token || success || error) return;

    const verify = async () => {
      try {
        const res = await fetch(
          `/api/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`,
          { redirect: 'manual' }
        );
        // The API always redirects; we follow the redirect destination
        const location = res.headers.get('location') || res.url;
        if (location) {
          // Extract just the path+query from the Location header
          try {
            const dest = new URL(location, window.location.origin);
            router.replace(dest.pathname + dest.search);
          } catch {
            router.replace('/auth/verify-email?error=server');
          }
        } else {
          router.replace('/auth/verify-email?error=server');
        }
      } catch {
        setVerifyError('server');
        setVerifying(false);
      }
    };

    verify();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (verifying) return <VerifyingState />;
  if (verifyError === 'server' || error === 'server') return <InvalidState />;
  if (success) return <SuccessState />;
  if (error === 'expired') return <ExpiredState email={email} />;
  if (error === 'invalid') return <InvalidState />;

  return <CheckEmailState email={email} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VerifyEmailPage() {
  return (
    <Shell>
      <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
        <VerifyEmailContent />
      </Suspense>
    </Shell>
  );
}
