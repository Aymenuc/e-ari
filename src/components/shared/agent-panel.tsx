'use client';

/**
 * E-ARI Agent Assistant Panel
 *
 * A slide-out panel providing agentic assistance during and after the
 * E-ARI assessment. Uses framer-motion for animations and matches the
 * dark navy design system.
 *
 * Modes:
 * - question_help: Help interpreting/answering assessment questions
 * - pillar_optimization: Pillar-specific improvement suggestions
 * - context_insight: Context-based insights from org data
 * - roadmap: Phased AI adoption roadmap
 * - benchmark: Sector comparison analysis
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  HelpCircle,
  TrendingUp,
  Map,
  BarChart3,
  Loader2,
  ChevronDown,
  ChevronRight,
  Send,
  MessageSquare,
  Lightbulb,
  Target,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PILLARS, getPillarById } from '@/lib/pillars';

// ─── Types ──────────────────────────────────────────────────────────────────

type AgentAction =
  | 'question_help'
  | 'pillar_optimization'
  | 'context_insight'
  | 'roadmap'
  | 'benchmark'
  | 'discovery_interview';

interface AgentResponse {
  content: string;
  action: AgentAction;
  followUpQuestions?: string[];
  relatedPillars?: string[];
  isAIGenerated: boolean;
  modelUsed?: string;
  generatedAt: string;
}

interface AgentPanelProps {
  /** Sector context from assessment */
  sector?: string | null;
  /** Current pillar being assessed */
  currentPillarId?: string;
  /** Current question being answered */
  currentQuestionId?: string;
  /** Current question text */
  currentQuestionText?: string;
  /** Pillar scores from assessment */
  pillarScores?: Array<{ pillarId: string; score: number; maturityLabel: string }>;
  /** Overall readiness score */
  overallScore?: number;
  /** Organizational context (e.g., from scraping) */
  orgContext?: string;
  /** External open state control */
  isOpen?: boolean;
  /** External open state change handler */
  onOpenChange?: (open: boolean) => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ACTION_CONFIG: Array<{
  action: AgentAction;
  label: string;
  icon: React.ElementType;
  description: string;
}> = [
  {
    action: 'question_help',
    label: 'Question Help',
    icon: HelpCircle,
    description: 'Get help with the current question',
  },
  {
    action: 'pillar_optimization',
    label: 'Optimization',
    icon: TrendingUp,
    description: 'Pillar improvement suggestions',
  },
  {
    action: 'context_insight',
    label: 'Insights',
    icon: Lightbulb,
    description: 'Context-based insights',
  },
  {
    action: 'roadmap',
    label: 'Roadmap',
    icon: Map,
    description: 'AI adoption roadmap',
  },
  {
    action: 'benchmark',
    label: 'Benchmark',
    icon: BarChart3,
    description: 'Sector comparison analysis',
  },
  {
    action: 'discovery_interview',
    label: 'Discovery',
    icon: MessageSquare,
    description: 'Stakeholder interview for qualitative insights',
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Format markdown-like text content to React elements */
function FormattedContent({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-2 font-sans text-sm leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Empty line becomes a spacer
        if (!trimmed) return <div key={i} className="h-2" />;

        // Horizontal rule
        if (trimmed === '---') return <Separator key={i} className="my-3" />;

        // Headers (### ## #)
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={i} className="font-heading text-sm font-semibold text-foreground mt-4 mb-1">
              {formatInline(trimmed.slice(4))}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={i} className="font-heading text-base font-semibold text-foreground mt-4 mb-1">
              {formatInline(trimmed.slice(3))}
            </h3>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={i} className="font-heading text-lg font-bold text-foreground mt-4 mb-2">
              {formatInline(trimmed.slice(2))}
            </h2>
          );
        }

        // Table rows
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          // Skip separator rows like |---|---|
          if (trimmed.match(/^\|[\s\-|:]+\|$/)) return null;
          const cells = trimmed.split('|').filter(Boolean).map(c => c.trim());
          return (
            <div key={i} className="grid gap-2 text-xs font-mono" style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}>
              {cells.map((cell, j) => (
                <span key={j} className="text-muted-foreground px-1 py-0.5 overflow-hidden text-ellipsis">
                  {formatInline(cell)}
                </span>
              ))}
            </div>
          );
        }

        // Bullet points
        if (trimmed.match(/^[-*]\s/)) {
          return (
            <div key={i} className="flex gap-2 pl-2">
              <span className="text-eari-blue-light mt-0.5 flex-shrink-0">&#8226;</span>
              <span className="text-muted-foreground">{formatInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Numbered lists
        if (trimmed.match(/^\d+\.\s/)) {
          const match = trimmed.match(/^(\d+)\.\s(.*)$/);
          if (match) {
            return (
              <div key={i} className="flex gap-2 pl-2">
                <span className="text-eari-blue-light font-mono text-xs mt-0.5 flex-shrink-0 w-4 text-right">
                  {match[1]}.
                </span>
                <span className="text-muted-foreground">{formatInline(match[2])}</span>
              </div>
            );
          }
        }

        // Regular paragraph
        return (
          <p key={i} className="text-muted-foreground">
            {formatInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

/** Format inline markdown (bold, italic, code) */
function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // Process bold **text**
  const boldRegex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(applyInlineFormatting(text.slice(lastIndex, match.index), keyIdx));
      keyIdx++;
    }
    parts.push(
      <strong key={`b-${keyIdx}`} className="text-foreground font-semibold">
        {match[1]}
      </strong>
    );
    keyIdx++;
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(applyInlineFormatting(text.slice(lastIndex), keyIdx));
  }

  return parts.length > 0 ? parts : text;
}

/** Handle italic and code inline formatting */
function applyInlineFormatting(text: string, baseKey: number): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // Process italic *text*
  const italicRegex = /\*(.+?)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = baseKey * 100;

  while ((match = italicRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <em key={`i-${keyIdx}`} className="italic">
        {match[1]}
      </em>
    );
    keyIdx++;
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

/** Get maturity color based on score */
function getMaturityColor(score: number): string {
  if (score <= 25) return '#ef4444';
  if (score <= 50) return '#f59e0b';
  if (score <= 75) return '#3b82f6';
  return '#22c55e';
}

/** Get maturity label based on score */
function getMaturityLabel(score: number): string {
  if (score <= 25) return 'Laggard';
  if (score <= 50) return 'Follower';
  if (score <= 75) return 'Chaser';
  return 'Pacesetter';
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

/** Loading skeleton for response content */
function ResponseSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Loader2 className="h-4 w-4 animate-spin text-eari-blue-light" />
        <span className="text-sm text-muted-foreground font-sans">Analyzing your data...</span>
      </div>
      <Skeleton className="h-4 w-3/4 bg-navy-700" />
      <Skeleton className="h-4 w-full bg-navy-700" />
      <Skeleton className="h-4 w-5/6 bg-navy-700" />
      <Skeleton className="h-4 w-2/3 bg-navy-700" />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-full bg-navy-700" />
        <Skeleton className="h-4 w-4/5 bg-navy-700" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-3/4 bg-navy-700" />
        <Skeleton className="h-4 w-full bg-navy-700" />
        <Skeleton className="h-4 w-1/2 bg-navy-700" />
      </div>
    </div>
  );
}

/** Error state with retry button */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <X className="h-6 w-6 text-destructive" />
      </div>
      <div>
        <p className="font-heading font-semibold text-foreground">Something went wrong</p>
        <p className="mt-1 text-sm text-muted-foreground font-sans">{message}</p>
      </div>
      <Button
        onClick={onRetry}
        variant="outline"
        className="border-border hover:bg-navy-700 text-foreground font-heading h-11 px-6"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    </div>
  );
}

/** Question Help Mode content */
function QuestionHelpMode({
  currentPillarId,
  currentQuestionId,
  currentQuestionText,
  sector,
  pillarScores,
  response,
  isLoading,
  error,
  onRequestHelp,
  onFollowUp,
}: {
  currentPillarId?: string;
  currentQuestionId?: string;
  currentQuestionText?: string;
  sector?: string | null;
  pillarScores?: Array<{ pillarId: string; score: number; maturityLabel: string }>;
  response: AgentResponse | null;
  isLoading: boolean;
  error: string | null;
  onRequestHelp: () => void;
  onFollowUp: (question: string) => void;
}) {
  const pillar = currentPillarId ? getPillarById(currentPillarId) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Question Context */}
      <Card className="bg-navy-800 border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-eari-blue-light" />
            <CardTitle className="font-heading text-sm font-semibold text-foreground">
              Current Question
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {pillar && (
            <Badge
              variant="outline"
              className="mb-2 font-mono text-xs border-eari-blue/40 text-eari-blue-light"
            >
              {pillar.name}
            </Badge>
          )}
          <p className="text-sm text-muted-foreground font-sans leading-relaxed">
            {currentQuestionText || 'No question currently selected. Navigate to a question in the assessment to get contextual help.'}
          </p>
          {currentQuestionId && (
            <p className="mt-2 text-xs font-mono text-muted-foreground/60">
              ID: {currentQuestionId}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Likert Scale Reference */}
      <Card className="bg-navy-800 border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-eari-blue-light" />
            <CardTitle className="font-heading text-sm font-semibold text-foreground">
              Likert Scale Guide
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1.5">
            {[
              { value: 1, label: 'Strongly Disagree', desc: 'No capability exists' },
              { value: 2, label: 'Disagree', desc: 'Minimal or ad-hoc' },
              { value: 3, label: 'Neutral', desc: 'Inconsistent capability' },
              { value: 4, label: 'Agree', desc: 'Established & consistent' },
              { value: 5, label: 'Strongly Agree', desc: 'Best-in-class' },
            ].map((item) => (
              <div key={item.value} className="flex items-center gap-2 text-xs">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded text-white font-mono font-bold"
                  style={{ backgroundColor: `rgba(37, 99, 235, ${0.3 + item.value * 0.14})` }}
                >
                  {item.value}
                </span>
                <span className="text-foreground font-semibold min-w-[110px]">{item.label}</span>
                <span className="text-muted-foreground">{item.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Get Help Button */}
      {!response && !isLoading && !error && (
        <Button
          onClick={onRequestHelp}
          disabled={!currentQuestionText}
          className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading font-semibold h-11 w-full"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Get AI Help
        </Button>
      )}

      {/* Loading */}
      {isLoading && <ResponseSkeleton />}

      {/* Error */}
      {error && !isLoading && <ErrorState message={error} onRetry={onRequestHelp} />}

      {/* Response */}
      {response && !isLoading && (
        <div className="space-y-4">
          <Card className="bg-navy-800 border-eari-blue/20">
            <CardContent className="p-4">
              <FormattedContent content={response.content} />
              <Separator className="my-4" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge
                  variant="outline"
                  className={`font-mono text-[10px] ${
                    response.isAIGenerated
                      ? 'border-eari-blue/40 text-eari-blue-light'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {response.isAIGenerated ? 'AI Generated' : 'Template Based'}
                </Badge>
                {response.modelUsed && (
                  <span className="font-mono text-muted-foreground/60">
                    {response.modelUsed}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Follow-up Questions */}
          {response.followUpQuestions && response.followUpQuestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-heading font-semibold text-foreground">
                Follow-up Questions
              </p>
              <div className="flex flex-wrap gap-2">
                {response.followUpQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => onFollowUp(q)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-eari-blue/30 bg-eari-blue/10 px-3 py-1.5 text-xs text-eari-blue-light hover:bg-eari-blue/20 transition-colors min-h-[32px]"
                  >
                    <Send className="h-3 w-3" />
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Related Pillars */}
          {response.relatedPillars && response.relatedPillars.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-heading font-semibold text-foreground">
                Related Pillars
              </p>
              <div className="flex flex-wrap gap-2">
                {response.relatedPillars.map((pid) => {
                  const p = getPillarById(pid);
                  return (
                    <Badge
                      key={pid}
                      variant="outline"
                      className="font-mono text-xs border-border text-muted-foreground"
                    >
                      {p?.shortName || pid}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Optimization Mode content */
function OptimizationMode({
  pillarScores,
  sector,
  selectedPillarId,
  onSelectPillar,
  response,
  isLoading,
  error,
  onRequestOptimization,
}: {
  pillarScores?: Array<{ pillarId: string; score: number; maturityLabel: string }>;
  sector?: string | null;
  selectedPillarId: string;
  onSelectPillar: (id: string) => void;
  response: AgentResponse | null;
  isLoading: boolean;
  error: string | null;
  onRequestOptimization: () => void;
}) {
  const selectedPillar = getPillarById(selectedPillarId);
  const selectedScore = pillarScores?.find((p) => p.pillarId === selectedPillarId);

  return (
    <div className="flex flex-col gap-4">
      {/* Pillar Selector */}
      <Card className="bg-navy-800 border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-eari-blue-light" />
            <CardTitle className="font-heading text-sm font-semibold text-foreground">
              Select Pillar
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="relative">
            <select
              value={selectedPillarId}
              onChange={(e) => onSelectPillar(e.target.value)}
              className="w-full appearance-none rounded-lg border border-border bg-navy-700 px-3 py-2.5 text-sm text-foreground font-sans focus:border-eari-blue focus:outline-none focus:ring-1 focus:ring-eari-blue min-h-[44px]"
              aria-label="Select a pillar to optimize"
            >
              {PILLARS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {pillarScores?.find((s) => s.pillarId === p.id) ? `(${pillarScores.find((s) => s.pillarId === p.id)!.score}%)` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </CardContent>
      </Card>

      {/* Current Score Display */}
      {selectedPillar && (
        <Card className="bg-navy-800 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-heading font-semibold text-foreground text-sm">
                  {selectedPillar.name}
                </p>
                <p className="text-xs text-muted-foreground font-sans mt-0.5">
                  {selectedPillar.description.slice(0, 80)}...
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className="font-heading text-2xl font-bold"
                  style={{ color: selectedScore ? getMaturityColor(selectedScore.score) : '#8b949e' }}
                >
                  {selectedScore?.score ?? '--'}%
                </span>
                {selectedScore && (
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px]"
                    style={{
                      borderColor: getMaturityColor(selectedScore.score),
                      color: getMaturityColor(selectedScore.score),
                    }}
                  >
                    {selectedScore.maturityLabel}
                  </Badge>
                )}
              </div>
            </div>
            {/* Score bar */}
            {selectedScore && (
              <div className="mt-3 h-2 w-full rounded-full bg-navy-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${selectedScore.score}%`,
                    backgroundColor: getMaturityColor(selectedScore.score),
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Request Optimization Button */}
      {!response && !isLoading && !error && (
        <Button
          onClick={onRequestOptimization}
          className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading font-semibold h-11 w-full"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Get Optimization Plan
        </Button>
      )}

      {/* Loading */}
      {isLoading && <ResponseSkeleton />}

      {/* Error */}
      {error && !isLoading && <ErrorState message={error} onRetry={onRequestOptimization} />}

      {/* Response */}
      {response && !isLoading && (
        <div className="space-y-4">
          <Card className="bg-navy-800 border-eari-blue/20">
            <CardContent className="p-4">
              <FormattedContent content={response.content} />
              <Separator className="my-4" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge
                  variant="outline"
                  className={`font-mono text-[10px] ${
                    response.isAIGenerated
                      ? 'border-eari-blue/40 text-eari-blue-light'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {response.isAIGenerated ? 'AI Generated' : 'Template Based'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Related Pillars */}
          {response.relatedPillars && response.relatedPillars.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-heading font-semibold text-foreground">Related Pillars</p>
              <div className="flex flex-wrap gap-2">
                {response.relatedPillars.map((pid) => {
                  const p = getPillarById(pid);
                  const ps = pillarScores?.find((s) => s.pillarId === pid);
                  return (
                    <button
                      key={pid}
                      onClick={() => onSelectPillar(pid)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-eari-blue/30 bg-eari-blue/10 px-3 py-1.5 text-xs text-eari-blue-light hover:bg-eari-blue/20 transition-colors min-h-[32px]"
                    >
                      {p?.shortName || pid}
                      {ps && <span className="text-muted-foreground">({ps.score}%)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Insights Mode content */
function InsightsMode({
  orgContext,
  sector,
  pillarScores,
  response,
  isLoading,
  error,
  onRequestInsights,
}: {
  orgContext?: string;
  sector?: string | null;
  pillarScores?: Array<{ pillarId: string; score: number; maturityLabel: string }>;
  response: AgentResponse | null;
  isLoading: boolean;
  error: string | null;
  onRequestInsights: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Context Summary */}
      <Card className="bg-navy-800 border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-eari-blue-light" />
            <CardTitle className="font-heading text-sm font-semibold text-foreground">
              Organizational Context
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {orgContext ? (
            <p className="text-sm text-muted-foreground font-sans leading-relaxed line-clamp-4">
              {orgContext}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground font-sans italic">
              No organizational context provided. Complete an assessment with organization details to enable context-based insights.
            </p>
          )}
          {sector && (
            <Badge
              variant="outline"
              className="mt-2 font-mono text-xs border-eari-blue/40 text-eari-blue-light"
            >
              Sector: {sector}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Request Insights Button */}
      {!response && !isLoading && !error && (
        <Button
          onClick={onRequestInsights}
          disabled={!orgContext && !pillarScores?.length}
          className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading font-semibold h-11 w-full"
        >
          <Lightbulb className="h-4 w-4 mr-2" />
          Generate Insights
        </Button>
      )}

      {/* Loading */}
      {isLoading && <ResponseSkeleton />}

      {/* Error */}
      {error && !isLoading && <ErrorState message={error} onRetry={onRequestInsights} />}

      {/* Response */}
      {response && !isLoading && (
        <Card className="bg-navy-800 border-eari-blue/20">
          <CardContent className="p-4">
            <FormattedContent content={response.content} />
            <Separator className="my-4" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge
                variant="outline"
                className={`font-mono text-[10px] ${
                  response.isAIGenerated
                    ? 'border-eari-blue/40 text-eari-blue-light'
                    : 'border-border text-muted-foreground'
                }`}
              >
                {response.isAIGenerated ? 'AI Generated' : 'Template Based'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Roadmap Mode content */
function RoadmapMode({
  overallScore,
  sector,
  pillarScores,
  orgContext,
  response,
  isLoading,
  error,
  onRequestRoadmap,
}: {
  overallScore?: number;
  sector?: string | null;
  pillarScores?: Array<{ pillarId: string; score: number; maturityLabel: string }>;
  orgContext?: string;
  response: AgentResponse | null;
  isLoading: boolean;
  error: string | null;
  onRequestRoadmap: () => void;
}) {
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([0]));

  const togglePhase = (idx: number) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const maturityLabel = overallScore !== undefined ? getMaturityLabel(overallScore) : '--';

  return (
    <div className="flex flex-col gap-4">
      {/* Overall Score Summary */}
      <Card className="bg-navy-800 border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-heading text-xs text-muted-foreground uppercase tracking-wider">
                Overall Score
              </p>
              <p className="font-heading text-3xl font-bold text-foreground mt-1">
                {overallScore ?? '--'}
                <span className="text-lg text-muted-foreground">%</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {overallScore !== undefined && (
                <Badge
                  variant="outline"
                  className="font-mono text-xs"
                  style={{
                    borderColor: getMaturityColor(overallScore),
                    color: getMaturityColor(overallScore),
                  }}
                >
                  {maturityLabel}
                </Badge>
              )}
              {sector && (
                <span className="text-xs font-mono text-muted-foreground">{sector}</span>
              )}
            </div>
          </div>
          {overallScore !== undefined && (
            <div className="mt-3 h-2 w-full rounded-full bg-navy-700 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${overallScore}%`,
                  backgroundColor: getMaturityColor(overallScore),
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Roadmap Button */}
      {!response && !isLoading && !error && (
        <Button
          onClick={onRequestRoadmap}
          disabled={overallScore === undefined}
          className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading font-semibold h-11 w-full"
        >
          <Map className="h-4 w-4 mr-2" />
          Generate Roadmap
        </Button>
      )}

      {/* Loading */}
      {isLoading && <ResponseSkeleton />}

      {/* Error */}
      {error && !isLoading && <ErrorState message={error} onRetry={onRequestRoadmap} />}

      {/* Response - Timeline Visualization */}
      {response && !isLoading && (
        <div className="space-y-3">
          {/* Roadmap Content - parsed from AI response */}
          {parseRoadmapPhases(response.content).map((phase, idx) => {
            const isExpanded = expandedPhases.has(idx);
            return (
              <Card
                key={idx}
                className="bg-navy-800 border-border/50 overflow-hidden"
              >
                {/* Phase Header */}
                <button
                  onClick={() => togglePhase(idx)}
                  className="w-full p-4 text-left flex items-center gap-3 hover:bg-navy-700/50 transition-colors min-h-[44px]"
                  aria-expanded={isExpanded}
                  aria-label={`${phase.title} — ${phase.timeframe}`}
                >
                  {/* Phase number indicator */}
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-eari-blue/15 text-eari-blue-light font-heading font-bold text-sm flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-semibold text-foreground text-sm truncate">
                      {phase.title}
                    </p>
                    <p className="text-xs text-muted-foreground font-sans">
                      {phase.timeframe}
                    </p>
                  </div>
                  {phase.investmentLevel && (
                    <Badge
                      variant="outline"
                      className={`font-mono text-[10px] flex-shrink-0 ${
                        phase.investmentLevel === 'high'
                          ? 'border-destructive/40 text-destructive'
                          : phase.investmentLevel === 'medium'
                          ? 'border-yellow-500/40 text-yellow-500'
                          : 'border-green-500/40 text-green-500'
                      }`}
                    >
                      {phase.investmentLevel.charAt(0).toUpperCase() + phase.investmentLevel.slice(1)} Investment
                    </Badge>
                  )}
                  <ChevronRight
                    className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {/* Phase Detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3">
                        <Separator />
                        {/* Objectives */}
                        {phase.objectives.length > 0 && (
                          <div>
                            <p className="text-xs font-heading font-semibold text-foreground mb-1.5">
                              Objectives
                            </p>
                            <ul className="space-y-1">
                              {phase.objectives.map((obj, oi) => (
                                <li
                                  key={oi}
                                  className="flex gap-2 text-xs text-muted-foreground font-sans"
                                >
                                  <Target className="h-3 w-3 text-eari-blue-light mt-0.5 flex-shrink-0" />
                                  {obj}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {/* Actions */}
                        {phase.actions.length > 0 && (
                          <div>
                            <p className="text-xs font-heading font-semibold text-foreground mb-1.5">
                              Key Actions
                            </p>
                            <ol className="space-y-1">
                              {phase.actions.map((action, ai) => (
                                <li
                                  key={ai}
                                  className="flex gap-2 text-xs text-muted-foreground font-sans"
                                >
                                  <span className="text-eari-blue-light font-mono flex-shrink-0">
                                    {ai + 1}.
                                  </span>
                                  {action}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                        {/* Pillar Focus */}
                        {phase.pillarFocus.length > 0 && (
                          <div>
                            <p className="text-xs font-heading font-semibold text-foreground mb-1.5">
                              Pillar Focus
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {phase.pillarFocus.map((pid) => {
                                const p = getPillarById(pid);
                                return (
                                  <Badge
                                    key={pid}
                                    variant="outline"
                                    className="font-mono text-[10px] border-border text-muted-foreground"
                                  >
                                    {p?.shortName || pid}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}

          {/* Raw content fallback if no phases parsed */}
          {parseRoadmapPhases(response.content).length === 0 && (
            <Card className="bg-navy-800 border-eari-blue/20">
              <CardContent className="p-4">
                <FormattedContent content={response.content} />
              </CardContent>
            </Card>
          )}

          <Separator />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge
              variant="outline"
              className={`font-mono text-[10px] ${
                response.isAIGenerated
                  ? 'border-eari-blue/40 text-eari-blue-light'
                  : 'border-border text-muted-foreground'
              }`}
            >
              {response.isAIGenerated ? 'AI Generated' : 'Template Based'}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}

/** Discovery Interview Mode content */
function DiscoveryInterviewMode({
  sector,
  pillarScores,
  overallScore,
  orgContext,
  response,
  isLoading,
  error,
  onSendMessage,
}: {
  sector?: string | null;
  pillarScores?: Array<{ pillarId: string; score: number; maturityLabel: string }>;
  overallScore?: number;
  orgContext?: string;
  response: AgentResponse | null;
  isLoading: boolean;
  error: string | null;
  onSendMessage: (message: string, phase?: 'question' | 'synthesis') => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'agent' | 'user'; content: string }>>([]);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [showSynthesis, setShowSynthesis] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const exchangeCount = chatHistory.filter(m => m.role === 'user').length;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, response]);

  useEffect(() => {
    if (response && interviewStarted) {
      const timer = window.setTimeout(() => {
        setChatHistory(prev => [...prev, { role: 'agent', content: response.content }]);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [response, interviewStarted]);

  const handleStart = () => {
    setInterviewStarted(true);
    onSendMessage('', 'question');
  };

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    const msg = inputValue.trim();
    setInputValue('');
    setChatHistory(prev => [...prev, { role: 'user', content: msg }]);
    onSendMessage(msg, showSynthesis ? 'synthesis' : 'question');
  };

  const handleGetSynthesis = () => {
    setShowSynthesis(true);
    onSendMessage('', 'synthesis');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Not started yet
  if (!interviewStarted) {
    return (
      <div className="flex flex-col gap-4">
        <Card className="bg-navy-800 border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-eari-blue-light" />
              <CardTitle className="font-heading text-sm font-semibold text-foreground">
                Discovery Interview
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground font-sans leading-relaxed">
              A conversational AI agent that interviews stakeholders to uncover qualitative nuances about AI readiness that a multiple-choice assessment might miss.
            </p>
            <div className="mt-3 space-y-1.5">
              {[
                'Organizational culture toward AI',
                'Unreported or informal AI initiatives',
                'Grassroots AI usage & pain points',
                'Aspirations and fears about AI adoption',
                'Leadership alignment on AI strategy',
              ].map((topic, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-eari-blue-light">&#8226;</span>
                  {topic}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleStart}
          className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading font-semibold h-11 w-full"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Start Discovery Interview
        </Button>
      </div>
    );
  }

  // Chat interface
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Chat messages */}
      <ScrollArea className="flex-1 max-h-[400px]">
        <div className="space-y-3 pr-2">
          {chatHistory.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-eari-blue/15 border border-eari-blue/20'
                    : 'bg-navy-800 border border-border/50'
                }`}
              >
                {msg.role === 'agent' ? (
                  <FormattedContent content={msg.content} />
                ) : (
                  <p className="text-sm text-foreground font-sans">{msg.content}</p>
                )}
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-navy-800 border border-border/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-eari-blue-light" />
                  <span className="text-xs text-muted-foreground font-sans">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex justify-center">
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
                <p className="text-xs text-destructive font-sans">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSendMessage('', 'question')}
                  className="mt-2 h-7 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Retry
                </Button>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      {!showSynthesis && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response..."
              className="flex-1 rounded-lg border border-border bg-navy-700 px-3 py-2.5 text-sm text-foreground font-sans focus:border-eari-blue focus:outline-none focus:ring-1 focus:ring-eari-blue resize-none min-h-[44px] max-h-[120px]"
              rows={2}
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading h-11 w-11 px-0 flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Synthesis button after enough exchanges */}
          {exchangeCount >= 3 && !showSynthesis && (
            <Button
              onClick={handleGetSynthesis}
              variant="outline"
              className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10 font-heading font-semibold h-10"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Get Discovery Synthesis
            </Button>
          )}

          <div className="flex items-center justify-between">
            <Badge variant="outline" className="font-mono text-[10px] border-border text-muted-foreground">
              {exchangeCount} exchanges
            </Badge>
            {sector && (
              <Badge variant="outline" className="font-mono text-[10px] border-eari-blue/40 text-eari-blue-light">
                {sector}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Synthesis card */}
      {showSynthesis && response && !isLoading && (
        <Card className="bg-navy-800 border-amber-500/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <CardTitle className="font-heading text-sm font-semibold text-foreground">
                Discovery Insights
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <FormattedContent content={response.content} />
            <Separator className="my-3" />
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`font-mono text-[10px] ${
                  response.isAIGenerated ? 'border-eari-blue/40 text-eari-blue-light' : 'border-border text-muted-foreground'
                }`}
              >
                {response.isAIGenerated ? 'AI Generated' : 'Template Based'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Parse roadmap phases from AI response text */
function parseRoadmapPhases(
  content: string
): Array<{
  title: string;
  timeframe: string;
  objectives: string[];
  actions: string[];
  investmentLevel: 'low' | 'medium' | 'high' | '';
  pillarFocus: string[];
}> {
  const phases: Array<{
    title: string;
    timeframe: string;
    objectives: string[];
    actions: string[];
    investmentLevel: 'low' | 'medium' | 'high' | '';
    pillarFocus: string[];
  }> = [];

  // Try to find phase sections
  const phaseRegex = /\*\*Phase\s+(\d+):\s*([^*]+)\*\*/gi;
  let match: RegExpExecArray | null;

  const phasePositions: Array<{ start: number; end: number; title: string }> = [];
  while ((match = phaseRegex.exec(content)) !== null) {
    phasePositions.push({
      start: match.index,
      end: content.length,
      title: match[2].trim(),
    });
  }

  // Set end positions
  for (let i = 0; i < phasePositions.length - 1; i++) {
    phasePositions[i].end = phasePositions[i + 1].start;
  }

  for (const pos of phasePositions) {
    const section = content.slice(pos.start, pos.end);
    const phase = {
      title: pos.title,
      timeframe: '',
      objectives: [] as string[],
      actions: [] as string[],
      investmentLevel: '' as 'low' | 'medium' | 'high' | '',
      pillarFocus: [] as string[],
    };

    // Extract timeframe
    const tfMatch = section.match(/\(Months?\s+[\d-]+\)/i) ||
      section.match(/\(([\d]+\s*[-–]\s*[\d]+)\s*months?\)/i) ||
      section.match(/\((\d+\s*[-–]\s*\d+)\s*Months?\)/i);
    if (tfMatch) {
      phase.timeframe = tfMatch[0];
    }

    // Extract investment level
    const invMatch = section.match(/Investment[^:]*:\s*\*\*(low|medium|high|medium-high)\*\*/i);
    if (invMatch) {
      const level = invMatch[1].toLowerCase();
      if (level === 'medium-high') phase.investmentLevel = 'high';
      else phase.investmentLevel = level as 'low' | 'medium' | 'high';
    }

    // Extract objectives
    const objSection = section.match(/Objectives?:?\s*([\s\S]*?)(?=(?:Key\s+)?Actions?:?|Investment|Pillar|$)/i);
    if (objSection) {
      const objLines = objSection[1].split('\n').filter(l => l.trim().match(/^[-*•]\s/) || l.trim().match(/^\d+\.\s/));
      phase.objectives = objLines.map(l => l.trim().replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').replace(/\*\*/g, ''));
    }

    // Extract actions
    const actSection = section.match(/(?:Key\s+)?Actions?:?\s*([\s\S]*?)(?=Investment|Pillar|Phase|$)/i);
    if (actSection) {
      const actLines = actSection[1].split('\n').filter(l => l.trim().match(/^\d+\.\s/));
      phase.actions = actLines.map(l => l.trim().replace(/^\d+\.\s*/, '').replace(/\*\*/g, ''));
    }

    // Extract pillar focus
    const pillarSection = section.match(/Pillar\s+Focus[^:]*:\s*(.+?)(?:\n|$)/i);
    if (pillarSection) {
      const pillarNames = pillarSection[1].split(/[,;]/).map(p => p.trim().replace(/\*\*/g, ''));
      for (const name of pillarNames) {
        const found = PILLARS.find(
          p => p.name.toLowerCase().includes(name.toLowerCase()) ||
               p.shortName.toLowerCase() === name.toLowerCase() ||
               p.id.toLowerCase() === name.toLowerCase()
        );
        if (found) phase.pillarFocus.push(found.id);
      }
    }

    phases.push(phase);
  }

  return phases;
}

/** Benchmark Mode content */
function BenchmarkMode({
  sector,
  overallScore,
  pillarScores,
  response,
  isLoading,
  error,
  onRequestBenchmark,
}: {
  sector?: string | null;
  overallScore?: number;
  pillarScores?: Array<{ pillarId: string; score: number; maturityLabel: string }>;
  response: AgentResponse | null;
  isLoading: boolean;
  error: string | null;
  onRequestBenchmark: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Sector & Score Context */}
      <Card className="bg-navy-800 border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-eari-blue-light" />
            <CardTitle className="font-heading text-sm font-semibold text-foreground">
              Sector Comparison
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between mb-2">
            <Badge
              variant="outline"
              className="font-mono text-xs border-eari-blue/40 text-eari-blue-light"
            >
              {sector || 'General'}
            </Badge>
            {overallScore !== undefined && (
              <span className="font-heading text-lg font-bold text-foreground">
                {overallScore}%
              </span>
            )}
          </div>
          {overallScore !== undefined && (
            <div className="h-2 w-full rounded-full bg-navy-700 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${overallScore}%`,
                  backgroundColor: getMaturityColor(overallScore),
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pillar Scores Table */}
      {pillarScores && pillarScores.length > 0 && (
        <Card className="bg-navy-800 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-xs font-semibold text-foreground uppercase tracking-wider">
              Your Pillar Scores
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {pillarScores.map((ps) => {
                const pillar = getPillarById(ps.pillarId);
                return (
                  <div key={ps.pillarId} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-[90px] text-right truncate">
                      {pillar?.shortName || ps.pillarId}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-navy-700 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${ps.score}%`,
                          backgroundColor: getMaturityColor(ps.score),
                        }}
                      />
                    </div>
                    <span
                      className="text-xs font-mono font-semibold w-8 text-right"
                      style={{ color: getMaturityColor(ps.score) }}
                    >
                      {ps.score}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Benchmark Button */}
      {!response && !isLoading && !error && (
        <Button
          onClick={onRequestBenchmark}
          disabled={!pillarScores?.length}
          className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading font-semibold h-11 w-full"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Compare with Sector
        </Button>
      )}

      {/* Loading */}
      {isLoading && <ResponseSkeleton />}

      {/* Error */}
      {error && !isLoading && <ErrorState message={error} onRetry={onRequestBenchmark} />}

      {/* Response */}
      {response && !isLoading && (
        <div className="space-y-4">
          <Card className="bg-navy-800 border-eari-blue/20">
            <CardContent className="p-4">
              <FormattedContent content={response.content} />

              {/* Per-pillar comparison bars */}
              {pillarScores && pillarScores.length > 0 && (
                <div className="mt-6 space-y-3">
                  <p className="text-xs font-heading font-semibold text-foreground uppercase tracking-wider">
                    Percentile Indicators
                  </p>
                  {pillarScores.map((ps) => {
                    const pillar = getPillarById(ps.pillarId);
                    const percentile = Math.round((ps.score / 100) * 100);
                    return (
                      <div key={ps.pillarId} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-muted-foreground">
                            {pillar?.shortName || ps.pillarId}
                          </span>
                          <span className="text-xs font-mono text-foreground">
                            ~{percentile}th percentile
                          </span>
                        </div>
                        <div className="relative h-2 w-full rounded-full bg-navy-700 overflow-hidden">
                          <div
                            className="absolute h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentile}%`,
                              backgroundColor: getMaturityColor(ps.score),
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Separator className="my-4" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge
                  variant="outline"
                  className={`font-mono text-[10px] ${
                    response.isAIGenerated
                      ? 'border-eari-blue/40 text-eari-blue-light'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {response.isAIGenerated ? 'AI Generated' : 'Template Based'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AgentPanel({
  sector,
  currentPillarId,
  currentQuestionId,
  currentQuestionText,
  pillarScores,
  overallScore,
  orgContext,
  isOpen: externalIsOpen,
  onOpenChange,
}: AgentPanelProps) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = useCallback(
    (open: boolean) => {
      setInternalIsOpen(open);
      onOpenChange?.(open);
    },
    [onOpenChange]
  );

  const [activeAction, setActiveAction] = useState<AgentAction>('question_help');
  const [responses, setResponses] = useState<Record<AgentAction, AgentResponse | null>>({
    question_help: null,
    pillar_optimization: null,
    context_insight: null,
    roadmap: null,
    benchmark: null,
    discovery_interview: null,
  });
  const [loading, setLoading] = useState<Record<AgentAction, boolean>>({
    question_help: false,
    pillar_optimization: false,
    context_insight: false,
    roadmap: false,
    benchmark: false,
    discovery_interview: false,
  });
  const [errors, setErrors] = useState<Record<AgentAction, string | null>>({
    question_help: null,
    pillar_optimization: null,
    context_insight: null,
    roadmap: null,
    benchmark: null,
    discovery_interview: null,
  });
  const [selectedOptPillar, setSelectedOptPillar] = useState(currentPillarId || 'strategy');
  const [unreadSuggestions, setUnreadSuggestions] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Update selected pillar when current pillar changes
  useEffect(() => {
    if (currentPillarId) {
      setSelectedOptPillar(currentPillarId);
    }
  }, [currentPillarId]);

  // Count available suggestions for badge
  useEffect(() => {
    let count = 0;
    if (currentQuestionText) count++;
    if (pillarScores?.length) count += 2; // optimization + benchmark available
    if (orgContext) count++;
    if (overallScore !== undefined) count++;
    setUnreadSuggestions(count);
  }, [currentQuestionText, pillarScores, orgContext, overallScore]);

  // ── API Call ──────────────────────────────────────────────────────────────

  const callAgent = useCallback(
    async (action: AgentAction) => {
      setLoading((prev) => ({ ...prev, [action]: true }));
      setErrors((prev) => ({ ...prev, [action]: null }));

      try {
        const requestBody: Record<string, unknown> = {
          action,
          sector,
          pillarScores,
          overallScore,
          orgContext,
        };

        // Action-specific fields
        switch (action) {
          case 'question_help':
            requestBody.pillarId = currentPillarId;
            requestBody.questionId = currentQuestionId;
            requestBody.questionText = currentQuestionText;
            break;
          case 'pillar_optimization':
            requestBody.pillarId = selectedOptPillar;
            requestBody.currentScore = pillarScores?.find(
              (p) => p.pillarId === selectedOptPillar
            )?.score;
            break;
          case 'benchmark':
            requestBody.sectorId = sector;
            break;
        }

        const res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Request failed with status ${res.status}`);
        }

        const data: AgentResponse = await res.json();
        setResponses((prev) => ({ ...prev, [action]: data }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
        setErrors((prev) => ({ ...prev, [action]: message }));
      } finally {
        setLoading((prev) => ({ ...prev, [action]: false }));
      }
    },
    [
      sector,
      pillarScores,
      overallScore,
      orgContext,
      currentPillarId,
      currentQuestionId,
      currentQuestionText,
      selectedOptPillar,
    ]
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleRequestHelp = useCallback(() => callAgent('question_help'), [callAgent]);
  const handleRequestOptimization = useCallback(() => callAgent('pillar_optimization'), [callAgent]);
  const handleRequestInsights = useCallback(() => callAgent('context_insight'), [callAgent]);
  const handleRequestRoadmap = useCallback(() => callAgent('roadmap'), [callAgent]);
  const handleRequestBenchmark = useCallback(() => callAgent('benchmark'), [callAgent]);

  const handleDiscoveryMessage = useCallback(
    async (message: string, phase?: 'question' | 'synthesis') => {
      setLoading((prev) => ({ ...prev, discovery_interview: true }));
      setErrors((prev) => ({ ...prev, discovery_interview: null }));

      try {
        const res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'discovery_interview',
            sector,
            pillarScores,
            overallScore,
            orgContext,
            discoveryResponse: message,
            interviewPhase: phase || 'question',
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Request failed with status ${res.status}`);
        }

        const data: AgentResponse = await res.json();
        setResponses((prev) => ({ ...prev, discovery_interview: data }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
        setErrors((prev) => ({ ...prev, discovery_interview: msg }));
      } finally {
        setLoading((prev) => ({ ...prev, discovery_interview: false }));
      }
    },
    [sector, pillarScores, overallScore, orgContext]
  );

  const handleFollowUp = useCallback(
    (question: string) => {
      // Re-trigger with conversation context
      void question;
      callAgent('question_help');
    },
    [callAgent]
  );

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveAction(value as AgentAction);
      // Clear unread when user explores tabs
      setUnreadSuggestions(0);
    },
    []
  );

  // ── Keyboard support ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ─── Toggle Button ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-eari-blue to-eari-blue-dark text-white shadow-lg shadow-eari-blue/25 hover:shadow-eari-blue/40 transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eari-blue"
            aria-label="Open AI Assistant"
            aria-haspopup="dialog"
          >
            <Sparkles className="h-6 w-6" />
            {/* Pulse animation for unread suggestions */}
            {unreadSuggestions > 0 && (
              <span className="absolute inset-0 rounded-full animate-ping bg-eari-blue/30" />
            )}
            {/* Badge showing suggestion count */}
            {unreadSuggestions > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white text-navy-900 text-[10px] font-heading font-bold px-1">
                {unreadSuggestions}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ─── Slide-out Panel ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            {/* Panel */}
            <motion.aside
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 z-50 h-full w-full sm:w-96 bg-navy-800 border-l border-border flex flex-col shadow-2xl"
              role="dialog"
              aria-label="AI Assistant Panel"
              aria-modal="true"
            >
              {/* ── Header ──────────────────────────────────────────────── */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-navy-900 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-eari-blue/15">
                    <Sparkles className="h-4 w-4 text-eari-blue-light" />
                  </div>
                  <div>
                    <h2 className="font-heading font-semibold text-foreground text-sm">
                      AI Assistant
                    </h2>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      E-ARI Assessment Advisor
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-navy-700"
                  aria-label="Close AI Assistant"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* ── Action Tabs ─────────────────────────────────────────── */}
              <div className="border-b border-border bg-navy-900 flex-shrink-0 px-3 py-2">
                <Tabs
                  value={activeAction}
                  onValueChange={handleTabChange}
                  className="w-full"
                >
                  <TabsList className="w-full h-auto flex-wrap gap-1 bg-navy-700/50 p-1">
                    {ACTION_CONFIG.map((cfg) => {
                      const Icon = cfg.icon;
                      return (
                        <TabsTrigger
                          key={cfg.action}
                          value={cfg.action}
                          className="flex-1 min-w-0 px-1.5 py-1.5 text-[11px] min-h-[36px] data-[state=active]:bg-eari-blue/15 data-[state=active]:text-eari-blue-light"
                        >
                          <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="hidden sm:inline truncate ml-1">{cfg.label}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>
              </div>

              {/* ── Content Area ─────────────────────────────────────────── */}
              <ScrollArea className="flex-1" ref={scrollRef}>
                <div className="p-4">
                  {/* Question Help */}
                  {activeAction === 'question_help' && (
                    <QuestionHelpMode
                      currentPillarId={currentPillarId}
                      currentQuestionId={currentQuestionId}
                      currentQuestionText={currentQuestionText}
                      sector={sector}
                      pillarScores={pillarScores}
                      response={responses.question_help}
                      isLoading={loading.question_help}
                      error={errors.question_help}
                      onRequestHelp={handleRequestHelp}
                      onFollowUp={handleFollowUp}
                    />
                  )}

                  {/* Optimization */}
                  {activeAction === 'pillar_optimization' && (
                    <OptimizationMode
                      pillarScores={pillarScores}
                      sector={sector}
                      selectedPillarId={selectedOptPillar}
                      onSelectPillar={setSelectedOptPillar}
                      response={responses.pillar_optimization}
                      isLoading={loading.pillar_optimization}
                      error={errors.pillar_optimization}
                      onRequestOptimization={handleRequestOptimization}
                    />
                  )}

                  {/* Insights */}
                  {activeAction === 'context_insight' && (
                    <InsightsMode
                      orgContext={orgContext}
                      sector={sector}
                      pillarScores={pillarScores}
                      response={responses.context_insight}
                      isLoading={loading.context_insight}
                      error={errors.context_insight}
                      onRequestInsights={handleRequestInsights}
                    />
                  )}

                  {/* Roadmap */}
                  {activeAction === 'roadmap' && (
                    <RoadmapMode
                      overallScore={overallScore}
                      sector={sector}
                      pillarScores={pillarScores}
                      orgContext={orgContext}
                      response={responses.roadmap}
                      isLoading={loading.roadmap}
                      error={errors.roadmap}
                      onRequestRoadmap={handleRequestRoadmap}
                    />
                  )}

                  {/* Benchmark */}
                  {activeAction === 'benchmark' && (
                    <BenchmarkMode
                      sector={sector}
                      overallScore={overallScore}
                      pillarScores={pillarScores}
                      response={responses.benchmark}
                      isLoading={loading.benchmark}
                      error={errors.benchmark}
                      onRequestBenchmark={handleRequestBenchmark}
                    />
                  )}

                  {/* Discovery Interview */}
                  {activeAction === 'discovery_interview' && (
                    <DiscoveryInterviewMode
                      sector={sector}
                      pillarScores={pillarScores}
                      overallScore={overallScore}
                      orgContext={orgContext}
                      response={responses.discovery_interview}
                      isLoading={loading.discovery_interview}
                      error={errors.discovery_interview}
                      onSendMessage={handleDiscoveryMessage}
                    />
                  )}
                </div>
              </ScrollArea>

              {/* ── Footer ──────────────────────────────────────────────── */}
              <div className="border-t border-border bg-navy-900 px-4 py-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/60">
                  <MessageSquare className="h-3 w-3" />
                  <span>AI-generated content is clearly labeled and grounded in your scores</span>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
