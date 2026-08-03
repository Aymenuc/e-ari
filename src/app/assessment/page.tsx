'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence, useInView, useReducedMotion } from 'framer-motion';
import {
  Target,
  Database,
  Cpu,
  Users,
  Shield,
  Heart,
  Settings,
  Lock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
  ClipboardList,
  Menu,
  X,
  Save,
  Briefcase, ArrowRight } from 'lucide-react';

import { Navigation } from '@/components/shared/navigation';
import { Footer } from '@/components/shared/footer';
import { ContextEnrichment } from '@/components/shared/context-enrichment';
import { AgentPanel } from '@/components/shared/agent-panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

import { PILLARS, LIKERT_LABELS, type PillarDefinition } from '@/lib/pillars';
import { validateCompleteness, type ResponseMap } from '@/lib/assessment-engine';
import { ENTITY_TYPE_CHOICES, type EntityType } from '@/lib/entity-types';
import { ScoringTransition } from '@/components/assessment/scoring-transition';
import { ResultsView } from '@/components/results/results-view';
import { SECTORS, getSectorById, getEffectivePillarQuestions, getSectorAdjustedPillars, sectorIdFromRegistration } from '@/lib/sectors';
import type { OrgContext } from '@/lib/scraper';

// ─── Icon map for dynamic Lucide icon rendering ──────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Target,
  Database,
  Cpu,
  Users,
  Shield,
  Heart,
  Settings,
  Lock,
  Briefcase,
  ClipboardList,
};

// ─── Likert option styling ────────────────────────────────────────────────────

interface LikertOptionConfig {
  value: number;
  label: string;
  tintClass: string;
  selectedBg: string;
  selectedBorder: string;
  selectedText: string;
  glowColor: string;
}

/**
 * The five Likert options.
 *
 * These were previously tinted red / orange / grey / blue / green. That is a
 * measurement problem, not a styling one: colouring the options by valence
 * tells the respondent which answers are the "bad" ones before they answer,
 * and pushes them up the scale. On an instrument whose output is sold as a
 * defensible, reproducible score, the input must not editorialise.
 *
 * The scale is ordered, so the ladder is expressed as neutral luminance —
 * 1 sits back, 5 comes forward. Rank stays legible; approval does not.
 */
const LIKERT_OPTIONS: LikertOptionConfig[] = [
  {
    value: 1,
    label: 'Strongly Disagree',
    tintClass: 'bg-white/[0.015] hover:bg-white/[0.04] border-white/[0.07]',
    selectedBg: 'bg-white/[0.07]',
    selectedBorder: 'border-slate-500',
    selectedText: 'text-slate-300',
    glowColor: 'rgba(148, 163, 184, 0.22)',
  },
  {
    value: 2,
    label: 'Disagree',
    tintClass: 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.08]',
    selectedBg: 'bg-white/[0.08]',
    selectedBorder: 'border-slate-400',
    selectedText: 'text-slate-300',
    glowColor: 'rgba(148, 163, 184, 0.24)',
  },
  {
    value: 3,
    label: 'Neutral',
    tintClass: 'bg-white/[0.025] hover:bg-white/[0.06] border-white/[0.09]',
    selectedBg: 'bg-white/[0.09]',
    selectedBorder: 'border-slate-400',
    selectedText: 'text-slate-200',
    glowColor: 'rgba(148, 163, 184, 0.26)',
  },
  {
    value: 4,
    label: 'Agree',
    tintClass: 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.1]',
    selectedBg: 'bg-white/[0.1]',
    selectedBorder: 'border-slate-300',
    selectedText: 'text-slate-100',
    glowColor: 'rgba(203, 213, 225, 0.28)',
  },
  {
    value: 5,
    label: 'Strongly Agree',
    tintClass: 'bg-white/[0.035] hover:bg-white/[0.08] border-white/[0.11]',
    selectedBg: 'bg-white/[0.12]',
    selectedBorder: 'border-slate-200',
    selectedText: 'text-white',
    glowColor: 'rgba(226, 232, 240, 0.3)',
  },
];

// ─── Animation variants & helpers ─────────────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
  }),
};

// Typed cubic-bezier ease for framer-motion (avoids TS strict mode error on number[] vs Easing tuple)
const EASE_OUT: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]

const questionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.07,
      duration: 0.4,
      ease: EASE_OUT,
    },
  }),
};

const headerVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: EASE_OUT as [number, number, number, number] },
  },
};

const reviewCardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.05,
      duration: 0.4,
      ease: EASE_OUT,
    },
  }),
};

const errorVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring' as const, stiffness: 400, damping: 15 },
  },
};

const checkPopVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 500, damping: 15 },
  },
  exit: { scale: 0, opacity: 0, transition: { duration: 0.15 } },
};

const sectorCardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.06,
      duration: 0.45,
      ease: EASE_OUT,
    },
  }),
};

// FadeUp helper — mirrors the results page pattern
function FadeUp({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
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

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = 'eari_draft_responses';
const SECTOR_KEY = 'eari_draft_sector';

interface DraftData {
  responses: ResponseMap;
  sector: string | null;
}

function loadDraft(): DraftData | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Support both old format (plain ResponseMap) and new format (DraftData)
    if (parsed && typeof parsed === 'object' && 'responses' in parsed) {
      return parsed as DraftData;
    }
    // Legacy format: plain ResponseMap
    return { responses: parsed as ResponseMap, sector: null };
  } catch {
    return null;
  }
}

function saveDraft(responses: ResponseMap, sector: string | null) {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ responses, sector }));
  } catch {
    // Silently fail on storage errors
  }
}

function clearDraft() {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SECTOR_KEY);
  } catch {
    // Silently fail
  }
}

// ─── Helper: count answered questions for a pillar ────────────────────────────

function countAnswered(pillar: PillarDefinition, responses: ResponseMap): number {
  return pillar.questions.filter((q) => responses[q.id] !== undefined && responses[q.id] !== null).length;
}

// ─── Likert Button with micro-interactions ────────────────────────────────────

function LikertButton({
  option,
  isSelected,
  hasError,
  onSelect,
  reduceMotion,
}: {
  option: LikertOptionConfig;
  isSelected: boolean;
  hasError: boolean;
  onSelect: () => void;
  reduceMotion?: boolean;
}) {
  return (
    <motion.button
      onClick={onSelect}
      className={`relative flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 min-h-[68px] sm:min-h-[76px] cursor-pointer overflow-hidden ${
        isSelected
          ? `${option.selectedBg} ${option.selectedBorder} ring-1 ring-offset-1 ring-offset-navy-900`
          : option.tintClass
      } ${hasError && !isSelected ? 'border-destructive/50' : ''}`}
      aria-label={`${option.label} - ${option.value} out of 5`}
      aria-pressed={isSelected}
      whileHover={reduceMotion ? undefined : { scale: 1.02, y: -1 }}
      whileTap={reduceMotion ? undefined : { scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
    >
      {/* Selection emphasis — restrained ring */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{ boxShadow: `inset 0 0 0 1px ${option.glowColor}` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        />
      )}
      <motion.span
        className={`text-lg font-heading font-bold relative z-10 ${
          isSelected ? option.selectedText : 'text-muted-foreground'
        }`}
        animate={!reduceMotion && isSelected ? { scale: [1, 1.06, 1] } : {}}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        {option.value}
      </motion.span>
      <span
        className={`text-[11px] leading-tight text-center font-sans relative z-10 ${
          isSelected ? option.selectedText : 'text-muted-foreground'
        }`}
      >
        {option.label}
      </span>
    </motion.button>
  );
}

// ─── Animated Progress Bar ────────────────────────────────────────────────────

function AnimatedProgressBar({ value, className, color }: { value: number; className?: string; color?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className={`relative h-2.5 w-full overflow-hidden rounded-full bg-navy-700 ${className || ''}`}>
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ backgroundColor: color || '#7d93ad' }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE_OUT }}
      />
    </div>
  );
}

// ─── Auth Gate Component ──────────────────────────────────────────────────────

function AuthGate() {
  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />
      <main className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
        >
          <Card className="w-full max-w-md bg-navy-800 border-border">
            <CardHeader className="text-center">
              <motion.div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-eari-blue/10"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
              >
                <ClipboardList className="h-7 w-7 text-eari-blue-light" />
              </motion.div>
              <CardTitle className="font-heading text-xl text-foreground">
                Sign In Required
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                You must be signed in to start an AI Readiness Assessment. Create a free account or sign in to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Link href="/auth/login" className="w-full">
                <Button className="w-full btn-brand font-sans h-11">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/register" className="w-full">
                <Button variant="outline" className="w-full font-sans h-11 border-border">
                  Create Account
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}

// ─── Main Assessment Wizard Page ──────────────────────────────────────────────

export default function AssessmentPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();

  // ── State ──────────────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0); // 0 = sector, 1-8 = pillars, 9 = review
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  // Pre-select the sector the account was registered with. Asking again is the
  // first thing the core product does, and re-asking what you already know
  // reads as not having listened. Still fully changeable — the step renders as
  // normal with the choice already made.
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  const [showEnrichment, setShowEnrichment] = useState(false);
  // Scoring hand-off: the overlay opens on submit and closes by navigating.
  const [scoringOpen, setScoringOpen] = useState(false);
  const [scoringScore, setScoringScore] = useState<number | null>(null);
  const [scoringId, setScoringId] = useState<string | null>(null);
  /** Set once scoring lands — switches the hub from wizard to results. */
  const [completedId, setCompletedId] = useState<string | null>(null);
  const [entityType, setEntityType] = useState<EntityType | null>(null);
  const sectorPrefilled = useRef(false);
  // Picking a sector opens the only control that continues the assessment, and
  // on a laptop it lands ~800px below the fold with the sector grid still
  // filling the screen — so the click looks like it did nothing. Bringing it
  // into view is the difference between "next step" and "broken".
  const enrichmentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selectedSector || currentStep !== 0) return;
    const t = setTimeout(() => {
      enrichmentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 420); // after the height animation settles, or it scrolls to a 0px box
    return () => clearTimeout(t);
  }, [selectedSector, currentStep]);
  useEffect(() => {
    if (sectorPrefilled.current || selectedSector) return;
    const fromAccount = sectorIdFromRegistration(session?.user?.sector);
    if (fromAccount) {
      sectorPrefilled.current = true;
      setSelectedSector(fromAccount);
    }
  }, [session?.user?.sector, selectedSector]);
  const [responses, setResponses] = useState<ResponseMap>({});
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [lastAnswered, setLastAnswered] = useState<string | null>(null);
  const [orgContext, setOrgContext] = useState<OrgContext | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);

  const TOTAL_STEPS = 10; // sector + 8 pillars + 1 review

  // ── Scroll to top on step change ───────────────────────────────────────────
  // Each pillar step is taller than the viewport, so without this a "Next"
  // click lands the user at the BOTTOM of the new step (where the button
  // was) with question 1 off-screen above them — they had to scroll up to
  // start every pillar.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }, [currentStep, prefersReducedMotion]);

  // ── Load draft on mount ────────────────────────────────────────────────────
  useEffect(() => {
    const draft = loadDraft();
    if (draft && Object.keys(draft.responses).length > 0) {
      setShowDraftDialog(true);
    }
  }, []);

  // ── Auto-save on every change ──────────────────────────────────────────────
  useEffect(() => {
    if (Object.keys(responses).length > 0) {
      saveDraft(responses, selectedSector);
    }
  }, [responses, selectedSector]);

  /** The sector the detail panel describes: hovered wins, else selected. */
  const activeSector = useMemo(
    () => SECTORS.find(x => x.id === (hoveredSector ?? selectedSector)) ?? null,
    [hoveredSector, selectedSector],
  );

  // ── Sector info ────────────────────────────────────────────────────────────
  const activeSectorDef = useMemo(() => {
    return selectedSector ? getSectorById(selectedSector) : null;
  }, [selectedSector]);

  // ── Effective pillars with sector-specific questions ───────────────────────
  const effectivePillars = useMemo(() => {
    return getSectorAdjustedPillars(selectedSector);
  }, [selectedSector]);

  // ── Computed values ────────────────────────────────────────────────────────
  // currentStep 0 = sector selection, 1-8 = pillar steps, 9 = review
  const currentPillar = currentStep >= 1 && currentStep <= 8 ? effectivePillars[currentStep - 1] : null;

  const pillarCompletionMap = useMemo(() => {
    const map: Record<string, number> = {};
    effectivePillars.forEach((p) => {
      map[p.id] = countAnswered(p, responses);
    });
    return map;
  }, [responses, effectivePillars]);

  const overallProgress = useMemo(() => {
    const totalQuestions = effectivePillars.reduce((sum, p) => sum + p.questions.length, 0);
    const answered = effectivePillars.reduce(
      (sum, p) => sum + p.questions.filter((q) => responses[q.id] !== undefined).length,
      0
    );
    return totalQuestions > 0 ? Math.round((answered / totalQuestions) * 100) : 0;
  }, [responses, effectivePillars]);

  const allPillarsComplete = useMemo(() => {
    return effectivePillars.every((p) => countAnswered(p, responses) === p.questions.length);
  }, [responses, effectivePillars]);

  // ── Draft dialog handlers ──────────────────────────────────────────────────
  const handleResumeDraft = () => {
    const draft = loadDraft();
    if (draft) {
      setResponses(draft.responses);
      if (draft.sector) {
        setSelectedSector(draft.sector);
      }
      // Find the first incomplete pillar (steps 1-8)
      const firstIncompleteIdx = effectivePillars.findIndex(
        (p) => countAnswered(p, draft.responses) < p.questions.length
      );
      if (firstIncompleteIdx >= 0) {
        setCurrentStep(firstIncompleteIdx + 1); // +1 because step 0 is sector
      } else {
        setCurrentStep(draft.sector ? 9 : 0); // If all complete, go to review or sector selection
      }
    }
    setShowDraftDialog(false);
  };

  const handleStartFresh = () => {
    clearDraft();
    setResponses({});
    setSelectedSector(null);
    setCurrentStep(0);
    setShowDraftDialog(false);
  };

  // ── Answer handler ─────────────────────────────────────────────────────────
  const handleAnswer = useCallback((questionId: string, value: number) => {
    setResponses((prev) => {
      const next = { ...prev, [questionId]: value };
      return next;
    });
    // Clear validation error for this question
    setValidationErrors((prev) => {
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
    setLastAnswered(questionId);
    // Reset lastAnswered after animation completes
    setTimeout(() => setLastAnswered(null), 600);
  }, []);

  // ── Sector selection handler ───────────────────────────────────────────────
  const handleSelectSector = useCallback((sectorId: string) => {
    setSelectedSector(sectorId);
    saveDraft(responses, sectorId);
    // Don't immediately go to step 1 — show ContextEnrichment first
    // The user can enrich or skip, which then moves to step 1
  }, [responses]);

  // ── Context enrichment handlers ────────────────────────────────────────────
  const handleContextReady = useCallback((context: OrgContext) => {
    setOrgContext(context);
    setDirection(1);
    setCurrentStep(1);
  }, []);

  const handleSkipEnrichment = useCallback(() => {
    setDirection(1);
    setCurrentStep(1);
  }, []);

  /**
   * Leave the overlay for the results.
   *
   * startViewTransition lets the browser morph the score element into the
   * results hero instead of cutting; both carry view-transition-name
   * "eari-score". Feature-detected, because it is a progressive enhancement —
   * without it this is an ordinary push and nothing is lost.
   */
  const handleScoreRevealed = useCallback(() => {
    if (!scoringId) return;
    // The hub stays put. Results render in place rather than as a separate
    // destination, so finishing an assessment is a change of phase and not a
    // change of address. /results/[id] still exists and renders the same
    // component — a compliance report has to stay linkable.
    const show = () => { setCompletedId(scoringId); setScoringOpen(false); };
    const d = document as Document & { startViewTransition?: (cb: () => void) => void };
    if (typeof d.startViewTransition === 'function') d.startViewTransition(show);
    else show();
  }, [scoringId]);

  // ── Step navigation ────────────────────────────────────────────────────────
  const goToStep = useCallback(
    (step: number) => {
      // If leaving a pillar step (1-8), validate it first
      if (currentStep >= 1 && currentStep <= 8 && step > currentStep) {
        const pillar = effectivePillars[currentStep - 1];
        const unanswered = pillar.questions
          .filter((q) => responses[q.id] === undefined || responses[q.id] === null)
          .map((q) => q.id);
        if (unanswered.length > 0) {
          setValidationErrors(new Set(unanswered));
          toast({
            title: 'Incomplete pillar',
            description: `Please answer all ${pillar.questions.length} questions before proceeding.`,
            variant: 'destructive',
          });
          return;
        }
      }
      setValidationErrors(new Set());
      setDirection(step > currentStep ? 1 : -1);
      setCurrentStep(step);
      setSidebarOpen(false);
    },
    [currentStep, responses, toast, effectivePillars]
  );

  const handlePrevious = () => {
    if (currentStep > 0) {
      setValidationErrors(new Set());
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < 9) {
      goToStep(currentStep + 1);
    }
  };

  // ── Submit assessment ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const missing = validateCompleteness(responses);
    if (missing.length > 0) {
      toast({
        title: 'Assessment incomplete',
        description: `Please answer all questions before submitting. ${missing.length} question(s) remaining.`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Create assessment
      const createRes = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses, sector: selectedSector, orgContext: orgContext || undefined, entityType: entityType || undefined }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create assessment');
      }

      const assessment = await createRes.json();
      const assessmentId = assessment.id;

      // Step 2: Submit assessment
      setScoringOpen(true);
      const submitRes = await fetch(`/api/assessment/${assessmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses, action: 'submit', sector: selectedSector, orgContext: orgContext || undefined, entityType: entityType || undefined }),
      });

      if (!submitRes.ok) {
        const errData = await submitRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to submit assessment');
      }

      // Success. The overlay is already up; hand it the score and let it
      // navigate once the number has been read. No toast — the number is the
      // confirmation, and a toast over a full-screen reveal is noise.
      clearDraft();
      // The submit route responds { status, scoringResult, pipelineTriggered },
      // so the number is on scoringResult. Reading it from the top level meant
      // `scored` was always null and the reveal never ran — the overlay opened
      // and the no-score fallback navigated straight past it.
      const submitted = await submitRes.json().catch(() => ({}));
      const scored = typeof submitted?.scoringResult?.overallScore === 'number'
        ? submitted.scoringResult.overallScore
        : typeof submitted?.overallScore === 'number'
          ? submitted.overallScore
          : null;
      setScoringId(assessmentId);
      if (scored === null) {
        // Scored fine but the response carried no number: drop into the report
        // without revealing a figure we do not have.
        setCompletedId(assessmentId);
        setScoringOpen(false);
      } else {
        setScoringScore(scored);
      }
    } catch (error) {
      setScoringOpen(false);
      setScoringScore(null);
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        title: 'Submission failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex flex-col bg-navy-900">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-eari-blue-light" />
        </main>
        <Footer />
      </div>
    );
  }

  // ── Auth check ─────────────────────────────────────────────────────────────
  if (!session) {
    return <AuthGate />;
  }

  // ── Render: Sector Selection Step (Step 0) ─────────────────────────────────
  const renderSectorStep = () => (
    <motion.div
      key="sector-step"
      custom={direction}
      variants={prefersReducedMotion ? undefined : slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.35, ease: EASE_OUT }}
    >
      {/* Sector header */}
      <motion.div
        className="mb-8"
        variants={headerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-3 mb-3">
          <motion.div
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-eari-blue/10"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
          >
            <Briefcase className="h-5 w-5 text-eari-blue-light" />
          </motion.div>
          <div>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Choose Your Industry Sector
            </h2>
            <p className="text-sm text-muted-foreground font-sans">
              Step 1 of {TOTAL_STEPS}
            </p>
          </div>
        </div>
        <motion.p
          className="text-sm text-muted-foreground font-sans leading-relaxed max-w-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          Select the sector that best describes your organization. This tailors the assessment questions to your industry context for more relevant insights. You can always choose the general assessment if you prefer industry-agnostic questions.
        </motion.p>
      </motion.div>

      {/* Sector tiles.

          Every one of the nine cards used to carry an icon, a name, a
          three-line description and up to four tag chips — fifty-odd competing
          pieces of text for a decision that is "which of these am I". The tile
          now carries only what identifies it, and the one sector you are
          pointing at explains itself in the panel below. Same information,
          read one at a time instead of all at once. */}
      <div
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
        onMouseLeave={() => setHoveredSector(null)}
      >
        {SECTORS.map((sector, idx) => {
          const IconComponent = ICON_MAP[sector.icon];
          const isSelected = selectedSector === sector.id;
          const isActive = (hoveredSector ?? selectedSector) === sector.id;
          return (
            <motion.button
              key={sector.id}
              onClick={() => handleSelectSector(sector.id)}
              onMouseEnter={() => setHoveredSector(sector.id)}
              onFocus={() => setHoveredSector(sector.id)}
              className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border p-3.5 text-left transition-colors ${
                isSelected
                  ? 'border-eari-blue/60 bg-eari-blue/[0.07]'
                  : isActive
                    ? 'border-white/[0.14] bg-navy-700/50'
                    : 'border-border bg-navy-800 hover:bg-navy-700/40'
              }`}
              variants={sectorCardVariants}
              initial="hidden"
              animate="visible"
              custom={idx}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              aria-label={`Select ${sector.name} sector`}
              aria-pressed={isSelected}
            >
              {/* The accent sweeps in from the left on the active tile — the
                  same gesture the landing page uses under its eyebrows. */}
              <motion.span
                aria-hidden
                className="absolute inset-x-0 top-0 h-[2px] origin-left bg-gradient-to-r from-slate-500 to-slate-200"
                initial={false}
                animate={{ scaleX: isSelected ? 1 : isActive ? 0.55 : 0, opacity: isSelected ? 1 : 0.7 }}
                transition={{ duration: 0.28, ease: EASE_OUT }}
              />
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                  isSelected
                    ? 'border-eari-blue/50 bg-eari-blue/15 text-eari-blue-light'
                    : 'border-white/[0.07] bg-white/[0.03] text-slate-400 group-hover:text-slate-200'
                }`}
              >
                {IconComponent && <IconComponent className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1 font-heading text-[13px] font-semibold leading-tight text-foreground">
                {sector.name}
              </span>
              <AnimatePresence>
                {isSelected && (
                  <motion.span
                    key="tick"
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-eari-blue"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* One panel, describing whichever sector is under the cursor. */}
      <div className="mt-4 min-h-[104px]">
        <AnimatePresence mode="wait">
          {activeSector ? (
            <motion.div
              key={activeSector.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
              className="rounded-xl border border-white/[0.08] bg-navy-800/60 p-4"
            >
              <p className="font-sans text-sm leading-relaxed text-slate-300">
                {activeSector.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {activeSector.highlights.map((h) => (
                  <span
                    key={h}
                    className="inline-flex items-center rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 font-sans text-[10px] font-medium text-muted-foreground"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.p
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-1 font-sans text-sm text-muted-foreground"
            >
              Point at a sector to see what it changes.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Entity type — asked, not inferred. See ENTITY_TYPE_CHOICES. */}
      <AnimatePresence>
        {selectedSector && (
          <motion.div
            key="entity-type"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="mt-8"
          >
            <h3 className="font-heading text-sm font-semibold text-foreground">
              And what kind of organisation is it?
            </h3>
            <p className="mt-1 font-sans text-sm text-muted-foreground">
              This sets the language of your report — who it addresses, who it
              compares you to, and whether it talks about ROI.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ENTITY_TYPE_CHOICES.map((c) => {
                const on = entityType === c.id;
                return (
                  <motion.button
                    key={c.id}
                    onClick={() => setEntityType(c.id)}
                    title={c.hint}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                    aria-pressed={on}
                    className={`rounded-lg border px-3.5 py-2 font-sans text-[13px] transition-colors ${
                      on
                        ? 'border-eari-blue/60 bg-eari-blue/[0.10] text-slate-100'
                        : 'border-border bg-navy-800 text-slate-300 hover:border-white/[0.16] hover:bg-navy-700/50'
                    }`}
                  >
                    {c.label}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue, and enrichment as an option rather than a toll gate.

          Enrichment ran a Tavily search, a Tavily extract and an LLM synthesis
          call — up to 60s and three paid requests — and the only thing it
          durably produced was the entity type, which is now one click above,
          plus context for the narrative layer. It stays available for anyone
          who wants the richer narrative; it no longer stands between a user
          and the questions. */}
      <AnimatePresence>
        {selectedSector && currentStep === 0 && (
          <motion.div
            key="sector-continue"
            ref={enrichmentRef}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="mt-8"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <motion.button
                onClick={handleSkipEnrichment}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.985 }}
                transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                className="btn-brand inline-flex h-11 items-center justify-center gap-2 rounded-lg px-6 font-heading text-sm font-semibold"
              >
                Start the assessment
                <ArrowRight className="h-4 w-4" aria-hidden />
              </motion.button>
              <button
                onClick={() => setShowEnrichment(v => !v)}
                className="self-center font-sans text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                aria-expanded={showEnrichment}
              >
                {showEnrichment ? 'Hide' : 'Add public context first (optional, ~30s)'}
              </button>
            </div>

            <AnimatePresence>
              {showEnrichment && (
                <motion.div
                  key="enrichment-panel"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: EASE_OUT }}
                  className="mt-5 overflow-hidden"
                >
                  <ContextEnrichment
                    key={selectedSector}
                    sector={selectedSector}
                    initialOrgName={session?.user?.organization ?? ''}
                    onContextReady={handleContextReady}
                    onSkip={handleSkipEnrichment}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  // ── Render: Sidebar ────────────────────────────────────────────────────────
  const renderSidebar = () => (
    <aside
      className={`${
        isMobile
          ? `fixed inset-y-0 left-0 z-50 w-72 bg-navy-900 border-r border-border transform transition-transform duration-300 ease-in-out ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`
          : 'w-64 lg:w-72 shrink-0'
      }`}
    >
      {/* Mobile close button */}
      {isMobile && (
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="font-heading font-semibold text-foreground text-sm">Pillar Progress</span>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="h-9 w-9">
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      <div className={`${isMobile ? 'p-4' : 'pt-6 pb-4'} space-y-1.5 overflow-y-auto max-h-[calc(100vh-12rem)]`}>
        {/* Sector step indicator */}
        <motion.button
          onClick={() => goToStep(0)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors duration-200 min-h-[44px] ${
            currentStep === 0
              ? 'bg-eari-blue/10 border border-eari-blue/30 text-foreground'
              : selectedSector
              ? 'hover:bg-navy-700/50 text-muted-foreground hover:text-foreground border border-transparent'
              : 'hover:bg-navy-700/50 text-muted-foreground hover:text-foreground border border-transparent'
          }`}
          aria-label="Go to sector selection step"
          whileHover={{ x: 3 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-eari-blue/10">
            <Briefcase className="h-4 w-4 text-eari-blue-light" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-heading text-sm font-medium truncate">Sector</span>
              <AnimatePresence>
                {selectedSector && (
                  <motion.div
                    variants={checkPopVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {activeSectorDef ? activeSectorDef.shortName : 'Not selected'}
            </div>
          </div>
        </motion.button>

        {effectivePillars.map((pillar, idx) => {
          const answered = pillarCompletionMap[pillar.id];
          const isComplete = answered === pillar.questions.length;
          const isCurrent = idx + 1 === currentStep; // pillar steps are 1-8
          const IconComponent = ICON_MAP[pillar.icon];

          return (
            <motion.button
              key={pillar.id}
              onClick={() => goToStep(idx + 1)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors duration-200 min-h-[44px] ${
                isCurrent
                  ? 'bg-eari-blue/10 border border-eari-blue/30 text-foreground'
                  : 'hover:bg-navy-700/50 text-muted-foreground hover:text-foreground border border-transparent'
              }`}
              aria-label={`Go to ${pillar.name} step`}
              initial={false}
              animate={isCurrent ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 0.3 }}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                style={{ backgroundColor: `${pillar.color}15` }}
              >
                {IconComponent && <IconComponent className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-heading text-sm font-medium truncate">{pillar.shortName}</span>
                  <AnimatePresence>
                    {isComplete && (
                      <motion.div
                        variants={checkPopVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 h-1 rounded-full bg-navy-700 overflow-hidden">
                    <motion.div
                      className="h-1 rounded-full"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(answered / pillar.questions.length) * 100}%`,
                      }}
                      transition={{ duration: 0.5, ease: EASE_OUT }}
                      style={{
                        backgroundColor: isComplete ? '#cbd5e1' : pillar.color,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground font-mono tabular-nums">
                    {answered}/{pillar.questions.length}
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}

        {/* Review step */}
        <motion.button
          onClick={() => goToStep(9)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors duration-200 min-h-[44px] ${
            currentStep === 9
              ? 'bg-eari-blue/10 border border-eari-blue/30 text-foreground'
              : 'hover:bg-navy-700/50 text-muted-foreground hover:text-foreground border border-transparent'
          }`}
          aria-label="Go to review step"
          whileHover={{ x: 3 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-eari-blue/10">
            <ClipboardList className="h-4 w-4 text-eari-blue-light" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-heading text-sm font-medium">Review & Submit</span>
            <div className="text-xs text-muted-foreground mt-0.5">
              {allPillarsComplete ? 'Ready to submit' : 'Incomplete'}
            </div>
          </div>
        </motion.button>
      </div>
    </aside>
  );

  // ── Render: Pillar Step ────────────────────────────────────────────────────
  const renderPillarStep = (pillar: PillarDefinition) => {
    const IconComponent = ICON_MAP[pillar.icon];
    // Use sector-specific questions
    const effectiveQuestions = getEffectivePillarQuestions(selectedSector, pillar.id);

    return (
      <motion.div
        key={`pillar-${currentStep}`}
        custom={direction}
        variants={prefersReducedMotion ? undefined : slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.35, ease: EASE_OUT }}
      >
        {/* Pillar header */}
        <motion.div
          className="mb-8"
          variants={headerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-3 mb-3">
            <motion.div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${pillar.color}15` }}
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
            >
              {IconComponent && <IconComponent className="h-5 w-5" />}
            </motion.div>
            <div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                {pillar.name}
              </h2>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground font-sans">
                  Step {currentStep + 1} of {TOTAL_STEPS}
                </p>
                {activeSectorDef && selectedSector !== 'general' && (
                  <Badge
                    className="text-[10px] px-1.5 py-0 font-sans"
                    style={{
                      backgroundColor: 'rgba(37, 99, 235, 0.08)',
                      color: '#a8bdd4',
                      border: '1px solid rgba(37, 99, 235, 0.28)',
                    }}
                  >
                    Tailored for {activeSectorDef.shortName}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <motion.p
            className="text-sm text-muted-foreground font-sans leading-relaxed max-w-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            {pillar.description}
          </motion.p>
        </motion.div>

        {/* Questions */}
        <div className="space-y-8">
          {effectiveQuestions.map((question, qIdx) => {
            const hasError = validationErrors.has(question.id);
            const currentAnswer = responses[question.id];
            const justAnswered = lastAnswered === question.id;

            return (
              <motion.div
                key={question.id}
                className="space-y-3"
                variants={questionVariants}
                initial="hidden"
                animate="visible"
                custom={qIdx}
              >
                {/* Question number & text */}
                <div className="flex items-start gap-3">
                  <motion.span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-heading font-semibold mt-0.5"
                    style={{
                      backgroundColor: `${pillar.color}15`,
                      color: pillar.color,
                    }}
                    animate={
                      prefersReducedMotion || !justAnswered
                        ? {}
                        : {
                            scale: [1, 1.08, 1],
                            backgroundColor: [`${pillar.color}15`, `${pillar.color}28`, `${pillar.color}15`],
                          }
                    }
                    transition={{ duration: 0.35 }}
                  >
                    {qIdx + 1}
                  </motion.span>
                  <div className="flex-1">
                    <p className="font-heading font-semibold text-foreground leading-snug">
                      {question.text}
                    </p>
                    <p className="text-sm text-muted-foreground font-sans mt-1.5 leading-relaxed">
                      {question.description}
                    </p>
                  </div>
                </div>

                {/* Likert options */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pl-10">
                  {LIKERT_OPTIONS.map((option) => {
                    const isSelected = currentAnswer === option.value;

                    return (
                      <LikertButton
                        key={option.value}
                        option={option}
                        isSelected={isSelected}
                        hasError={hasError}
                        reduceMotion={!!prefersReducedMotion}
                        onSelect={() => handleAnswer(question.id, option.value)}
                      />
                    );
                  })}
                </div>

                {/* Validation error */}
                <AnimatePresence>
                  {hasError && (
                    <motion.p
                      className="text-xs text-destructive pl-10 flex items-center gap-1.5"
                      variants={errorVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, x: -8 }}
                    >
                      <span className="inline-flex">
                        <AlertTriangle className="h-3.5 w-3.5" />
                      </span>
                      Please select an answer
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  };

  // ── Render: Review Step ────────────────────────────────────────────────────
  const renderReviewStep = () => (
    <motion.div
      key="review-step"
      custom={direction}
      variants={prefersReducedMotion ? undefined : slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.35, ease: EASE_OUT }}
    >
      <motion.div
        className="mb-8"
        variants={headerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-3 mb-3">
          <motion.div
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-eari-blue/10"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
          >
            <ClipboardList className="h-5 w-5 text-eari-blue-light" />
          </motion.div>
          <div>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Review & Submit
            </h2>
            <p className="text-sm text-muted-foreground font-sans">
              Step {TOTAL_STEPS} of {TOTAL_STEPS}
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground font-sans leading-relaxed max-w-2xl">
          Review your progress across all 8 readiness pillars. All questions must be answered before you can submit your assessment.
        </p>
      </motion.div>

      {/* Overall progress */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <Card className="bg-navy-800 border-border mb-6">
          <CardContent className="pt-0">
            <div className="flex items-center justify-between mb-3">
              <span className="font-heading font-medium text-foreground">Overall Progress</span>
              <div className="flex items-center gap-2">
                {activeSectorDef && (
                  <Badge
                    className="text-[10px] px-1.5 py-0 font-sans"
                    style={{
                      backgroundColor: 'rgba(37, 99, 235, 0.08)',
                      color: '#a8bdd4',
                      border: '1px solid rgba(37, 99, 235, 0.28)',
                    }}
                  >
                    {activeSectorDef.shortName}
                  </Badge>
                )}
                <span className="font-mono text-sm text-eari-blue-light">{overallProgress}%</span>
              </div>
            </div>
            <AnimatedProgressBar value={overallProgress} className="h-2.5" />
          </CardContent>
        </Card>
      </motion.div>

      {/* Pillar cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {effectivePillars.map((pillar, idx) => {
          const answered = pillarCompletionMap[pillar.id];
          const isComplete = answered === pillar.questions.length;
          const IconComponent = ICON_MAP[pillar.icon];

          return (
            <motion.button
              key={pillar.id}
              onClick={() => goToStep(idx + 1)}
              className="flex items-center gap-3 p-4 rounded-lg border border-border bg-navy-800 hover:bg-navy-700/50 transition-colors text-left min-h-[44px]"
              aria-label={`Review ${pillar.name}`}
              variants={reviewCardVariants}
              initial="hidden"
              animate="visible"
              custom={idx}
              whileHover={prefersReducedMotion ? undefined : { scale: 1.01, y: -1 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                style={{ backgroundColor: `${pillar.color}15` }}
              >
                {IconComponent && <IconComponent className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-heading text-sm font-medium text-foreground truncate">
                    {pillar.shortName}
                  </span>
                  <AnimatePresence>
                    {isComplete ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                      >
                        <Badge className="bg-white/[0.06] text-slate-300 border-white/[0.12] text-[10px] px-1.5 py-0">
                          Complete
                        </Badge>
                      </motion.div>
                    ) : (
                      <Badge variant="outline" className="text-slate-400 border-white/[0.12] text-[10px] px-1.5 py-0">
                        Incomplete
                      </Badge>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 rounded-full bg-navy-700 overflow-hidden">
                    <motion.div
                      className="h-1.5 rounded-full"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(answered / pillar.questions.length) * 100}%`,
                      }}
                      transition={{ duration: 0.6, ease: EASE_OUT, delay: idx * 0.05 }}
                      style={{
                        backgroundColor: isComplete ? '#cbd5e1' : pillar.color,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground font-mono tabular-nums">
                    {answered}/{pillar.questions.length}
                  </span>
                </div>
              </div>
              <AnimatePresence mode="wait">
                {isComplete ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="chevron"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* Incomplete warning */}
      <AnimatePresence>
        {!allPillarsComplete && (
          <motion.div
            initial={{ opacity: 0, y: 12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-orange-500/5 border-orange-500/20 mb-6">
              <CardContent className="pt-0">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-400 shrink-0 mt-0.5" aria-hidden />
                  <div>
                    <p className="font-heading font-medium text-orange-400 text-sm">
                      Assessment incomplete
                    </p>
                    <p className="text-sm text-muted-foreground font-sans mt-1">
                      You must answer all 40 questions across 8 pillars before submitting. Click on incomplete pillars above to finish them.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit button */}
      <motion.div
        className="flex items-center gap-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <Button
          onClick={handleSubmit}
          disabled={!allPillarsComplete || isSubmitting}
          className="btn-brand font-sans h-11 px-8"
          size="lg"
        >
          {isSubmitting ? (
            <motion.div
              className="flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </motion.div>
          ) : (
            <motion.div
              className="flex items-center gap-2"
              whileHover={prefersReducedMotion ? undefined : { x: 2 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            >
              Submit Assessment
              <ChevronRight className="h-4 w-4" aria-hidden />
            </motion.div>
          )}
        </Button>
        {!allPillarsComplete && (
          <span className="text-sm text-muted-foreground font-sans">
            All pillars must be complete to submit
          </span>
        )}
      </motion.div>
    </motion.div>
  );

  // ── Completed: the hub becomes the report ──────────────────────────────────
  // Same component /results/[id] renders, mounted here without its own chrome.
  if (completedId) {
    return (
      <div className="min-h-screen flex flex-col bg-navy-900">
        <Navigation />
        <main className="flex-1">
          <div className="mx-auto max-w-6xl px-4 pb-8 pt-6 sm:px-6 sm:pb-12 lg:px-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span aria-hidden className="h-px w-8 eyebrow-rule" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                  Assessment complete
                </span>
              </div>
              {/* The shareable artefact, one click away. The hub keeps its own
                  URL; this is the one you send to a board. */}
              <Link
                href={`/results/${completedId}`}
                className="font-sans text-sm text-slate-400 underline underline-offset-4 transition-colors hover:text-slate-100"
              >
                Open the shareable report &rarr;
              </Link>
            </div>
          </div>
          <ResultsView assessmentId={completedId} chrome={false} />
        </main>
        <Footer />
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          {/* Page header with progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(true)}
                    className="h-9 w-9 shrink-0"
                    aria-label="Open pillar navigation"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                )}
                <div>
                  <h1 className="font-heading text-2xl font-bold text-foreground">
                    AI Readiness Assessment
                  </h1>
                  <p className="text-sm text-muted-foreground font-sans mt-0.5">
                    Evaluate your organization across 8 critical readiness pillars
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <span className="text-sm text-muted-foreground font-sans">
                  {session.user?.name || session.user?.email || 'User'}
                </span>
                <Badge variant="outline" className="font-mono text-xs">
                  {overallProgress}% complete
                </Badge>
                {activeSectorDef && (
                  <Badge
                    className="text-[10px] px-1.5 py-0 font-sans"
                    style={{
                      backgroundColor: 'rgba(37, 99, 235, 0.08)',
                      color: '#a8bdd4',
                      border: '1px solid rgba(37, 99, 235, 0.28)',
                    }}
                  >
                    {activeSectorDef.shortName}
                  </Badge>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <AnimatedProgressBar
                  value={((currentStep + 1) / TOTAL_STEPS) * 100}
                  className="h-1.5"
                />
              </div>
              <span className="text-xs text-muted-foreground font-mono tabular-nums whitespace-nowrap">
                {currentStep + 1}/{TOTAL_STEPS}
              </span>
            </div>

            {/* Step indicator dots */}
            <div className="flex items-center gap-1.5 mt-3 justify-center">
              {/* Sector dot */}
              <motion.button
                onClick={() => goToStep(0)}
                className="relative"
                aria-label="Go to sector selection"
                whileHover={{ scale: 1.3 }}
                whileTap={{ scale: 0.9 }}
              >
                <motion.div
                  className="rounded-full"
                  animate={{
                    width: currentStep === 0 ? 24 : 8,
                    backgroundColor: currentStep === 0
                      ? '#e2e8f0'
                      : selectedSector
                      ? '#7d93ad'
                      : 'rgba(48, 57, 74, 0.6)',
                  }}
                  transition={{ duration: 0.3, ease: EASE_OUT }}
                  style={{ height: 8 }}
                />
              </motion.button>

              {effectivePillars.map((pillar, idx) => {
                const isComplete = pillarCompletionMap[pillar.id] === pillar.questions.length;
                const isCurrent = idx + 1 === currentStep;

                return (
                  <motion.button
                    key={pillar.id}
                    onClick={() => goToStep(idx + 1)}
                    className="relative"
                    aria-label={`Go to ${pillar.shortName}`}
                    whileHover={{ scale: 1.3 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <motion.div
                      className="rounded-full"
                      style={{
                        width: isCurrent ? 24 : 8,
                        height: 8,
                        backgroundColor: isCurrent
                          ? pillar.color
                          : isComplete
                          ? '#7d93ad'
                          : 'rgba(48, 57, 74, 0.6)',
                      }}
                      animate={{
                        width: isCurrent ? 24 : 8,
                        backgroundColor: isCurrent
                          ? pillar.color
                          : isComplete
                          ? '#7d93ad'
                          : 'rgba(48, 57, 74, 0.6)',
                      }}
                      transition={{ duration: 0.3, ease: EASE_OUT }}
                    />
                  </motion.button>
                );
              })}
              {/* Review dot */}
              <motion.button
                onClick={() => goToStep(9)}
                className="relative"
                aria-label="Go to Review step"
                whileHover={{ scale: 1.3 }}
                whileTap={{ scale: 0.9 }}
              >
                <motion.div
                  className="rounded-full"
                  animate={{
                    width: currentStep === 9 ? 24 : 8,
                    backgroundColor: currentStep === 9
                      ? '#e2e8f0'
                      : allPillarsComplete
                      ? '#7d93ad'
                      : 'rgba(48, 57, 74, 0.6)',
                  }}
                  transition={{ duration: 0.3 }}
                  style={{ height: 8 }}
                />
              </motion.button>
            </div>
          </div>

          {/* Content area */}
          <div className="flex gap-6">
            {/* Sidebar — desktop (only show after sector is selected) */}
            {!isMobile && selectedSector && renderSidebar()}

            {/* Mobile sidebar overlay */}
            {isMobile && sidebarOpen && selectedSector && (
              <>
                <motion.div
                  className="fixed inset-0 bg-black/50 z-40"
                  onClick={() => setSidebarOpen(false)}
                  aria-hidden="true"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
                {renderSidebar()}
              </>
            )}

            {/* Main step content */}
            <div className="flex-1 min-w-0">
              <Card className="bg-navy-800 border-border">
                <CardContent className="p-4 sm:p-6 lg:p-8">
                  <AnimatePresence mode="wait" custom={direction}>
                    {currentStep === 0
                      ? renderSectorStep()
                      : currentStep >= 1 && currentStep <= 8 && currentPillar
                      ? renderPillarStep(currentPillar)
                      : renderReviewStep()}
                  </AnimatePresence>

                  {/* Navigation buttons */}
                  <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
                    <motion.div whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        onClick={handlePrevious}
                        disabled={currentStep === 0}
                        className="font-sans h-11 px-6 border-border"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                    </motion.div>

                    {currentStep >= 1 && currentStep <= 8 ? (
                      <motion.div whileTap={{ scale: 0.95 }}>
                        <Button
                          onClick={handleNext}
                          className="btn-brand font-sans h-11 px-6"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ) : (
                      <div />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Scoring hand-off — covers the submit round-trip and carries the
          number across to the results page. */}
      <ScoringTransition
        open={scoringOpen}
        score={scoringScore}
        onRevealed={handleScoreRevealed}
      />

      {/* Draft resume dialog */}
      <Dialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <DialogContent className="bg-navy-800 border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-foreground">
              Resume Draft Assessment?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-sans">
              We found a previously saved assessment draft. Would you like to resume where you left off, or start a new assessment?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={handleResumeDraft}
              className="w-full btn-brand font-sans h-11"
            >
              Resume Draft
            </Button>
            <Button
              variant="outline"
              onClick={handleStartFresh}
              className="w-full font-sans h-11 border-border"
            >
              Start New Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Agent Assistant Panel */}
      <AgentPanel
        sector={selectedSector}
        currentPillarId={currentPillar?.id}
        currentQuestionId={currentStep >= 1 && currentStep <= 8 && currentPillar ? currentPillar.questions[0]?.id : undefined}
        currentQuestionText={currentStep >= 1 && currentStep <= 8 && currentPillar ? currentPillar.questions[0]?.text : undefined}
        pillarScores={effectivePillars.map((p) => {
          const answered = pillarCompletionMap[p.id];
          const total = p.questions.length;
          const sum = p.questions.reduce((acc, q) => acc + (responses[q.id] ?? 0), 0);
          const avg = answered > 0 ? (sum / answered) * 20 : 0;
          return {
            pillarId: p.id,
            score: Math.round(avg),
            maturityLabel: avg <= 25 ? 'Laggard' : avg <= 50 ? 'Follower' : avg <= 75 ? 'Chaser' : 'Pacesetter',
          };
        })}
        overallScore={overallProgress}
        orgContext={orgContext ? JSON.stringify(orgContext) : undefined}
        isOpen={agentOpen}
        onOpenChange={setAgentOpen}
      />
    </div>
  );
}
