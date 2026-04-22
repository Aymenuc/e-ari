'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw, LayoutDashboard } from 'lucide-react';
import { Navigation } from '@/components/shared/navigation';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[E-ARI Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <div className="rounded-xl border border-border/50 bg-navy-800 p-8 text-center shadow-lg">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4, ease: 'easeOut' }}
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/20"
            >
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </motion.div>

            {/* Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="font-heading text-2xl font-bold text-foreground mb-3"
            >
              Something Went Wrong
            </motion.h1>

            {/* Error message */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="text-sm text-muted-foreground font-sans mb-8 leading-relaxed"
            >
              {error.message || 'An unexpected error occurred. Please try again or return to the dashboard.'}
            </motion.p>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <Button
                onClick={reset}
                className="bg-eari-blue hover:bg-eari-blue-dark text-white font-sans shadow-md shadow-eari-blue/20 transition-all duration-200"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Try Again
              </Button>

              <Button variant="outline" asChild className="border-border/50 bg-navy-700/50 hover:bg-navy-700 text-foreground font-sans">
                <Link href="/portal">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </motion.div>

            {/* Digest reference */}
            {error.digest && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55, duration: 0.4 }}
                className="mt-6 text-xs text-muted-foreground/60 font-mono"
              >
                Error ID: {error.digest}
              </motion.p>
            )}
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
