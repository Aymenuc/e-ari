'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView, useReducedMotion } from 'framer-motion';
import {
  Search,
  Sparkles,
  Globe,
  Building2,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Shield,
  Cpu,
  Lightbulb,
  ExternalLink,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

import type { OrgContext } from '@/lib/scraper';

// ─── Props ──────────────────────────────────────────────────────────────────

interface ContextEnrichmentProps {
  sector: string | null;
  onContextReady: (context: OrgContext) => void;
  onSkip: () => void;
  initialOrgName?: string;
}

// ─── State type ─────────────────────────────────────────────────────────────

type EnrichmentState = 'idle' | 'loading' | 'success' | 'error';

// ─── Animation variants ─────────────────────────────────────────────────────

const EASE_OUT: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_OUT },
  },
};

const successVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 20, delay: 0.1 },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: EASE_OUT },
  }),
};

const collapsibleContentVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: 'auto',
    transition: { duration: 0.3, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.2, ease: EASE_OUT },
  },
};

// ─── FadeUp helper ──────────────────────────────────────────────────────────

function FadeUp({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Confidence badge helper ────────────────────────────────────────────────

function ConfidenceIndicator({ confidence }: { confidence: 'high' | 'medium' | 'low' | 'none' }) {
  const config = {
    high: {
      label: 'High confidence',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/25',
      dotColor: 'bg-green-500',
    },
    medium: {
      label: 'Medium confidence',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/25',
      dotColor: 'bg-yellow-500',
    },
    low: {
      label: 'Low confidence',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/25',
      dotColor: 'bg-red-500',
    },
    none: {
      label: 'Insufficient web evidence',
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/10',
      borderColor: 'border-slate-500/25',
      dotColor: 'bg-slate-500',
    },
  };

  const c = config[confidence];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium font-sans ${c.color} ${c.bgColor} border ${c.borderColor}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dotColor}`} aria-hidden="true" />
      {c.label}
    </span>
  );
}

// ─── Collapsible Section ────────────────────────────────────────────────────

function ContextSection({
  title,
  icon: Icon,
  children,
  index,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  index: number;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={prefersReducedMotion ? undefined : sectionVariants}
      initial="hidden"
      animate="visible"
      custom={index}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            className="flex items-center gap-2 w-full py-2 text-left min-h-[44px] group"
            aria-expanded={isOpen}
            aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${title}`}
          >
            <Icon className="h-4 w-4 text-eari-blue-light shrink-0" aria-hidden="true" />
            <span className="font-heading text-sm font-semibold text-foreground flex-1">
              {title}
            </span>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </motion.div>
          </button>
        </CollapsibleTrigger>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              variants={collapsibleContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="overflow-hidden"
            >
              <CollapsibleContent className="pb-3 pl-6">
                {children}
              </CollapsibleContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Collapsible>
    </motion.div>
  );
}

// ─── Loading Skeleton ───────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4 py-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-32 rounded bg-navy-600 animate-pulse" />
          <div className="h-3 w-full rounded bg-navy-700 animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
          <div className="h-3 w-3/4 rounded bg-navy-700 animate-pulse" style={{ animationDelay: `${i * 0.15 + 0.1}s` }} />
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-6 w-20 rounded-full bg-navy-700 animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ContextEnrichment({
  sector,
  onContextReady,
  onSkip,
  initialOrgName = '',
}: ContextEnrichmentProps) {
  const prefersReducedMotion = useReducedMotion();

  // Form state
  const [orgName, setOrgName] = useState(initialOrgName);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');

  // Enrichment state
  const [status, setStatus] = useState<EnrichmentState>('idle');
  const [orgContext, setOrgContext] = useState<OrgContext | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Form validation
  const [orgNameError, setOrgNameError] = useState('');

  // ── Validate form ─────────────────────────────────────────────────────────
  const validate = (): boolean => {
    let valid = true;
    if (!orgName.trim()) {
      setOrgNameError('Organization name is required');
      valid = false;
    } else {
      setOrgNameError('');
    }
    return valid;
  };

  // ── Handle enrich ─────────────────────────────────────────────────────────
  const handleEnrich = async () => {
    if (!validate()) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enrich',
          orgName: orgName.trim(),
          websiteUrl: websiteUrl.trim() || undefined,
          sector: sector || undefined,
          additionalContext: additionalContext.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to enrich assessment context');
      }

      const context: OrgContext = await res.json();
      // The server returns HTTP 200 with confidence='none' when the
      // public-source lookup yielded nothing useful. Surface that as an
      // error state so users see why the form didn't help, instead of a
      // misleading "Success" with empty content.
      if (context.confidence === 'none') {
        setOrgContext(context);
        setErrorMsg(
          context.orgSpecificContext ||
          `We couldn't enrich "${orgName}" from public web sources. Try adding the website URL or extra context, or skip and proceed with self-reported answers.`
        );
        setStatus('error');
        return;
      }
      setOrgContext(context);
      setStatus('success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred during enrichment';
      setErrorMsg(message);
      setStatus('error');
    }
  };

  // ── Handle re-enrich ──────────────────────────────────────────────────────
  const handleReEnrich = () => {
    setStatus('idle');
    setOrgContext(null);
    setErrorMsg('');
  };

  // ── Handle continue ───────────────────────────────────────────────────────
  const handleContinue = () => {
    if (orgContext) {
      onContextReady(orgContext);
    }
  };

  // ── Render: Input Form (idle / error) ─────────────────────────────────────
  const renderInputForm = () => (
    <motion.div
      variants={prefersReducedMotion ? undefined : cardVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-navy-800 border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <motion.div
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-eari-blue/10"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
            >
              <Search className="h-5 w-5 text-eari-blue-light" aria-hidden="true" />
            </motion.div>
            <div>
              <CardTitle className="font-heading text-lg text-foreground">
                Enrich Your Assessment
              </CardTitle>
              <CardDescription className="text-muted-foreground font-sans">
                Provide your organization details to receive tailored questions and more relevant insights based on your industry context.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Error alert */}
          <AnimatePresence>
            {status === 'error' && errorMsg && (
              <motion.div
                className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/25"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                role="alert"
              >
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-red-400 font-sans">Enrichment failed</p>
                  <p className="text-xs text-red-400/80 font-sans mt-0.5">{errorMsg}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="org-name" className="font-sans text-muted-foreground">
              Organization Name <span className="text-red-400" aria-label="required">*</span>
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="org-name"
                type="text"
                placeholder="e.g., Acme Corporation"
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value);
                  if (orgNameError) setOrgNameError('');
                }}
                className="pl-10 bg-navy-700/50 border-border h-11 font-sans"
                aria-invalid={!!orgNameError}
                aria-describedby={orgNameError ? 'org-name-error' : undefined}
              />
            </div>
            <AnimatePresence>
              {orgNameError && (
                <motion.p
                  id="org-name-error"
                  className="text-xs text-red-400 font-sans"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  role="alert"
                >
                  {orgNameError}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Website URL */}
          <div className="space-y-2">
            <Label htmlFor="website-url" className="font-sans text-muted-foreground">
              Website URL <span className="text-muted-foreground/50">(optional)</span>
            </Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="website-url"
                type="url"
                placeholder="https://example.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="pl-10 bg-navy-700/50 border-border h-11 font-sans"
              />
            </div>
          </div>

          {/* Additional Context */}
          <div className="space-y-2">
            <Label htmlFor="additional-context" className="font-sans text-muted-foreground">
              Additional Context <span className="text-muted-foreground/50">(optional)</span>
            </Label>
            <Textarea
              id="additional-context"
              placeholder="Any additional context about your organization's AI initiatives, technology stack, or strategic priorities..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              className="bg-navy-700/50 border-border min-h-[88px] font-sans resize-none"
            />
          </div>

          {/* Enrich button */}
          <motion.div
            whileHover={prefersReducedMotion ? undefined : { scale: 1.01 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
          >
            <Button
              onClick={handleEnrich}
              disabled={status === 'loading'}
              className="w-full bg-eari-blue hover:bg-eari-blue-dark text-white font-sans h-11 gap-2"
              aria-label="Enrich assessment with organization context"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Searching public sources...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Enrich Assessment
                </>
              )}
            </Button>
          </motion.div>

          {/* Privacy notice */}
          <p className="text-xs text-muted-foreground font-sans text-center leading-relaxed">
            We search public web sources to gather context about your organization. No sensitive data is collected.
          </p>

          {/* Skip link */}
          <div className="text-center pt-1">
            <button
              onClick={onSkip}
              className="text-sm text-muted-foreground hover:text-foreground font-sans underline underline-offset-4 hover:no-underline transition-colors min-h-[44px] inline-flex items-center"
              aria-label="Skip enrichment and proceed to assessment"
            >
              Skip enrichment
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  // ── Render: Loading State ─────────────────────────────────────────────────
  const renderLoading = () => (
    <motion.div
      variants={prefersReducedMotion ? undefined : cardVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-navy-800 border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <motion.div
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-eari-blue/10"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="h-5 w-5 text-eari-blue-light animate-spin" aria-hidden="true" />
            </motion.div>
            <div>
              <CardTitle className="font-heading text-lg text-foreground">
                Gathering Context
              </CardTitle>
              <CardDescription className="text-muted-foreground font-sans">
                Searching public sources for information about {orgName}...
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <LoadingSkeleton />
          <p className="text-xs text-muted-foreground font-sans text-center mt-4">
            This may take up to 30 seconds. We search multiple sources for the most relevant context.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );

  // ── Render: Results Display ───────────────────────────────────────────────
  const renderResults = () => {
    if (!orgContext) return null;

    return (
      <motion.div
        variants={prefersReducedMotion ? undefined : cardVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="bg-navy-800 border-border">
          <CardHeader>
            <div className="flex items-start gap-3">
              <motion.div
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 shrink-0"
                variants={successVariants}
                initial="hidden"
                animate="visible"
              >
                <CheckCircle2 className="h-5 w-5 text-green-400" aria-hidden="true" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <CardTitle className="font-heading text-lg text-foreground">
                  Context Enriched
                </CardTitle>
                <CardDescription className="text-muted-foreground font-sans">
                  Assessment tailored for <span className="text-foreground font-medium">{orgContext.orgName}</span>
                </CardDescription>
              </div>
              <ConfidenceIndicator confidence={orgContext.confidence} />
            </div>
          </CardHeader>

          <CardContent className="space-y-1">
            {/* Organization info bar */}
            <FadeUp delay={0.05}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-sans">
                  <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="text-foreground font-medium">{orgContext.orgName}</span>
                </div>
                {orgContext.websiteUrl && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-sans">
                    <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                    <a
                      href={orgContext.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-eari-blue-light transition-colors underline underline-offset-2"
                    >
                      {orgContext.websiteUrl.replace(/^https?:\/\//, '')}
                      <ExternalLink className="h-3 w-3 inline ml-0.5" aria-hidden="true" />
                    </a>
                  </div>
                )}
                {orgContext.sector && (
                  <Badge
                    variant="outline"
                    className="text-xs font-sans border-border text-muted-foreground"
                  >
                    {orgContext.sector}
                  </Badge>
                )}
              </div>
            </FadeUp>

            <Separator className="my-3" />

            {/* Collapsible sections */}
            <div className="space-y-1">
              {/* Industry Context */}
              <ContextSection title="Industry Context" icon={Lightbulb} index={0}>
                <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                  {orgContext.industryContext}
                </p>
              </ContextSection>

              <Separator />

              {/* AI Initiatives */}
              <ContextSection title="AI Initiatives" icon={Sparkles} index={1} defaultOpen={orgContext.aiInitiatives.length > 0}>
                {orgContext.aiInitiatives.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {orgContext.aiInitiatives.map((initiative, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Badge className="bg-eari-blue/10 text-eari-blue-light border-eari-blue/25 font-sans text-xs">
                          {initiative}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground/70 font-sans italic">
                    No specific AI initiatives found in public sources.
                  </p>
                )}
              </ContextSection>

              <Separator />

              {/* Technology Signals */}
              <ContextSection title="Technology Signals" icon={Cpu} index={2} defaultOpen={orgContext.techStackSignals.length > 0}>
                {orgContext.techStackSignals.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {orgContext.techStackSignals.map((signal, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <Badge
                          variant="outline"
                          className="text-[11px] font-sans border-border text-muted-foreground px-1.5 py-0"
                        >
                          {signal}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground/70 font-sans italic">
                    No technology signals detected from public sources.
                  </p>
                )}
              </ContextSection>

              <Separator />

              {/* Regulatory Considerations */}
              <ContextSection title="Regulatory Considerations" icon={Shield} index={3} defaultOpen={orgContext.regulatoryConsiderations.length > 0}>
                {orgContext.regulatoryConsiderations.length > 0 ? (
                  <ul className="space-y-1.5" role="list">
                    {orgContext.regulatoryConsiderations.map((reg, i) => (
                      <motion.li
                        key={i}
                        className="flex items-start gap-2 text-sm text-muted-foreground font-sans"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Shield className="h-3.5 w-3.5 text-eari-blue-light shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{reg}</span>
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground/70 font-sans italic">
                    No specific regulatory considerations identified.
                  </p>
                )}
              </ContextSection>

              <Separator />

              {/* Competitive Landscape */}
              <ContextSection title="Competitive Landscape" icon={Search} index={4}>
                <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                  {orgContext.competitiveLandscape}
                </p>
              </ContextSection>
            </div>

            <Separator className="my-3" />

            {/* Sources count */}
            <FadeUp delay={0.3}>
              <p className="text-xs text-muted-foreground font-sans">
                Based on{' '}
                <span className="text-foreground font-medium">{orgContext.scrapingSources.length}</span>{' '}
                {orgContext.scrapingSources.length === 1 ? 'source' : 'sources'}
              </p>
            </FadeUp>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <motion.div
                className="flex-1"
                whileHover={prefersReducedMotion ? undefined : { scale: 1.01 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
              >
                <Button
                  variant="outline"
                  onClick={handleReEnrich}
                  className="w-full font-sans h-11 border-border gap-2"
                  aria-label="Re-run enrichment"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Re-enrich
                </Button>
              </motion.div>
              <motion.div
                className="flex-1"
                whileHover={prefersReducedMotion ? undefined : { scale: 1.01 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
              >
                <Button
                  onClick={handleContinue}
                  className="w-full bg-eari-blue hover:bg-eari-blue-dark text-white font-sans h-11 gap-2"
                  aria-label="Continue to assessment with enriched context"
                >
                  Continue
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <AnimatePresence mode="wait">
      {status === 'loading' ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderLoading()}
        </motion.div>
      ) : status === 'success' ? (
        <motion.div
          key="success"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderResults()}
        </motion.div>
      ) : (
        <motion.div
          key="input"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderInputForm()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
