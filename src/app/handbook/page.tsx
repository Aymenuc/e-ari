import { promises as fs } from 'fs';
import path from 'path';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, FileText, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Navigation } from '@/components/shared/navigation';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'The E-ARI Handbook — Platform Guide',
  description:
    'A complete guide to the E-ARI platform — what it does, how it works, and why it is built the way it is. Covers the assessment engine, six AI agents, compliance autopilot, and continuous monitoring.',
  openGraph: {
    title: 'The E-ARI Handbook',
    description: 'A complete guide to the E-ARI platform.',
  },
};

// Pre-rendered at build time — handbook content is static.
export const dynamic = 'force-static';

async function loadHandbook(): Promise<string> {
  const filePath = path.join(process.cwd(), 'public', 'docs', 'e-ari-handbook.md');
  return fs.readFile(filePath, 'utf-8');
}

export default async function HandbookPage() {
  const markdown = await loadHandbook();

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />

      <main className="flex-1">
        {/* ── Hero header ────────────────────────────────────────────────── */}
        <section className="border-b border-border/40 bg-navy-900/80">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-eari-blue-light transition-colors mb-6"
            >
              <ArrowLeft className="h-3 w-3" aria-hidden />
              Back to home
            </Link>

            <div className="flex items-center gap-3 mb-3">
              <span className="h-px w-8 bg-eari-blue/60" aria-hidden />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-eari-blue-light/90">
                Documentation
              </span>
            </div>

            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
              The E-ARI Handbook
            </h1>
            <p className="mt-3 max-w-2xl font-sans text-base sm:text-lg text-muted-foreground">
              A complete guide to the platform — what it does, how it works, and why it is built
              the way it is.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-eari-blue/30 hover:border-eari-blue/60 hover:bg-eari-blue/5"
              >
                <a href="/docs/e-ari-handbook.md" download="e-ari-handbook.md">
                  <Download className="mr-2 h-3.5 w-3.5" aria-hidden />
                  Download (.md)
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-border/50"
              >
                <a href="/docs/e-ari-handbook.md" target="_blank" rel="noopener noreferrer">
                  <FileText className="mr-2 h-3.5 w-3.5" aria-hidden />
                  View raw
                </a>
              </Button>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                v1.0 · May 2026
              </span>
            </div>
          </div>
        </section>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="handbook-prose">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mt-12 mb-4 tracking-tight first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mt-12 mb-4 tracking-tight scroll-mt-24">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="font-heading text-lg sm:text-xl font-semibold text-foreground mt-8 mb-3 scroll-mt-24">
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="font-heading text-base font-semibold text-foreground mt-6 mb-2">
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <p className="font-sans text-[15px] leading-7 text-muted-foreground mb-4">
                    {children}
                  </p>
                ),
                a: ({ href, children }) => {
                  const isExternal = href?.startsWith('http');
                  if (isExternal) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-eari-blue-light underline-offset-4 hover:underline"
                      >
                        {children}
                      </a>
                    );
                  }
                  return (
                    <Link
                      href={href || '#'}
                      className="text-eari-blue-light underline-offset-4 hover:underline"
                    >
                      {children}
                    </Link>
                  );
                },
                ul: ({ children }) => (
                  <ul className="font-sans text-[15px] leading-7 text-muted-foreground mb-4 ml-5 list-disc space-y-1.5 marker:text-eari-blue/50">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="font-sans text-[15px] leading-7 text-muted-foreground mb-4 ml-5 list-decimal space-y-1.5 marker:text-eari-blue/60">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="pl-1">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-foreground/90">{children}</em>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-6 border-l-2 border-eari-blue/50 bg-eari-blue/5 px-4 py-3 font-sans text-[15px] italic text-muted-foreground rounded-r-md">
                    {children}
                  </blockquote>
                ),
                code: ({ className, children }) => {
                  const isInline = !className?.includes('language-');
                  if (isInline) {
                    return (
                      <code className="rounded bg-navy-800 px-1.5 py-0.5 font-mono text-[13px] text-eari-blue-light border border-border/40">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className="font-mono text-[13px] text-foreground/90">
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="my-6 overflow-x-auto rounded-lg border border-border/40 bg-navy-950 p-4 text-[13px] leading-relaxed">
                    {children}
                  </pre>
                ),
                table: ({ children }) => (
                  <div className="my-6 overflow-x-auto rounded-lg border border-border/40">
                    <table className="w-full font-sans text-sm">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-navy-800/80 border-b border-border/40">{children}</thead>
                ),
                tbody: ({ children }) => <tbody className="divide-y divide-border/30">{children}</tbody>,
                tr: ({ children }) => <tr className="hover:bg-navy-800/40 transition-colors">{children}</tr>,
                th: ({ children }) => (
                  <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-2.5 text-[14px] text-muted-foreground align-top">
                    {children}
                  </td>
                ),
                hr: () => <hr className="my-12 border-border/40" />,
              }}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        </article>

        {/* ── Footer CTA ─────────────────────────────────────────────────── */}
        <section className="border-t border-border/40 bg-navy-900/80">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 text-center">
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
              Questions about the platform?
            </h2>
            <p className="mt-2 font-sans text-sm text-muted-foreground">
              Reach out to the team or start your first assessment to see it in action.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button asChild className="bg-eari-blue hover:bg-eari-blue-dark">
                <Link href="/assessment">Start free assessment</Link>
              </Button>
              <Button asChild variant="outline" className="border-border/50">
                <Link href="/contact">Contact us</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
