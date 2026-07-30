'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ClipboardCheck,
  BookOpen,
  Mail,
  HelpCircle,
  FileText,
  ChevronRight,
  Shield,
  ArrowUpRight,
  User,
  Building2,
  Users,
  Calendar,
  Archive,
  Eye,
  PlayCircle,
  BarChart3,
  Award,
  Loader2,
  Activity,
  GraduationCap,
  Search,
  Plug,
  Zap,
} from 'lucide-react';

import { Navigation } from '@/components/shared/navigation';
import { Footer } from '@/components/shared/footer';
import { ProgressionBanner } from '@/components/shared/progression-banner';
import { JourneyGuide } from '@/components/shared/journey-guide';
import {
  ComplianceInboxCard,
  type PortalInboxItem,
} from '@/components/shared/compliance-inbox';
import { CoverageGaugeCard } from '@/components/shared/coverage-gauge';
import type { ProgressionState } from '@/lib/progression';
import { AIAssistant } from '@/components/shared/ai-assistant';
import { BillingCard } from '@/components/account/billing-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { scoreRamp } from '@/lib/score-ramp';
import { tierBadgeClasses } from '@/lib/tier';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Assessment {
  id: string;
  status: string;
  overallScore: number | null;
  maturityBand: string | null;
  completedAt: string | null;
  createdAt: string;
  isPulse?: boolean;
  responses: { id: string }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tierLabel(tier: string): string {
  switch (tier) {
    case 'professional':
      return 'Professional';
    case 'growth':
      return 'Growth';
    case 'autopilot':
      return 'Autopilot';
    case 'enterprise':
      return 'Enterprise';
    default:
      return 'Free';
  }
}

function statusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">Completed</Badge>;
    case 'archived':
      return <Badge variant="secondary" className="text-muted-foreground">Archived</Badge>;
    default:
      return <Badge variant="outline" className="text-muted-foreground">Draft</Badge>;
  }
}

function maturityBandLabel(band: string | null): string {
  if (!band) return '—';
  const map: Record<string, string> = {
    laggard: 'Laggard',
    follower: 'Follower',
    chaser: 'Chaser',
    pacesetter: 'Pacesetter',
  };
  return map[band] ?? band;
}

/* The band is just a coarser view of the score, so it uses the same cool
   ordinal ramp the results page draws scores with. A red/amber/green traffic
   light here contradicted that ramp two cards apart on the same screen. */
function maturityBandColor(band: string | null): string {
  switch (band) {
    case 'pacesetter':
      return 'text-sky-300';
    case 'chaser':
      return 'text-sky-400/80';
    case 'follower':
      return 'text-slate-400';
    case 'laggard':
      return 'text-slate-500';
    default:
      return 'text-muted-foreground';
  }
}

/** rAF count-up for the dashboard stat tiles. */
function CountUpNumber({ value, duration = 1100 }: { value: number; duration?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setV(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{v}</>;
}

/** Compact readiness ring beside the welcome heading — latest completed score. */
function MiniScoreRing({ score }: { score: number; band?: string | null }) {
  /* Same ramp the results page uses, driven by the score itself rather than
     by the band — the ring and the number it wraps can no longer disagree. */
  const color = scoreRamp(score);
  const C = 2 * Math.PI * 26;
  return (
    <div className="relative hidden sm:flex h-16 w-16 items-center justify-center flex-shrink-0" aria-label={`Latest readiness score ${Math.round(score)}`}>
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="4" />
        <circle
          cx="32" cy="32" r="26" fill="none"
          stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C - (C * score) / 100}
          transform="rotate(-90 32 32)"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <span className="absolute font-heading text-sm font-semibold tabular-nums text-foreground">
        <CountUpNumber value={Math.round(score)} />
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PortalPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [quota, setQuota] = useState<{
    tier: string;
    foundingMemberNo?: number | null;
    assessment: { used: number; limit: number | null };
    pulse: { used: number; limit: number | null };
    report: { used: number; limit: number | null };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile dialog state
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileData, setProfileData] = useState({ organization: '', sector: '', orgSize: '' });

  const [progressionState, setProgressionState] = useState<ProgressionState | null>(null);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxItems, setInboxItems] = useState<PortalInboxItem[]>([]);

  // Auth gate — redirect if unauthenticated
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [sessionStatus, router]);

  /* Record that this account is active, and roughly where from. Throttled to
     one write an hour server-side, so this costs nothing on navigation. */
  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    fetch('/api/session/touch', { method: 'POST' }).catch(() => {});
  }, [sessionStatus]);

  // Load saved profile from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('eari-user-profile');
      if (saved) setProfileData(JSON.parse(saved));
    } catch {}
  }, []);

  const handleSaveProfile = () => {
    try { localStorage.setItem('eari-user-profile', JSON.stringify(profileData)); } catch {}
    setProfileDialogOpen(false);
  };

  // Fetch assessments
  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;

    async function fetchAssessments() {
      try {
        setLoading(true);
        const res = await fetch('/api/assessment');
        if (!res.ok) throw new Error('Failed to fetch assessments');
        const data = await res.json();
        setAssessments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Assessment fetch error:', err);
        setError('Could not load assessments. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchAssessments();
  }, [sessionStatus]);

  // Monthly tier quota — drives the usage strip in the tier card.
  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/quota');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setQuota(data);
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionStatus]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    let cancelled = false;
    (async () => {
      setInboxLoading(true);
      try {
        const [progRes, inboxRes] = await Promise.all([
          fetch('/api/compliance/progression'),
          fetch('/api/portal/inbox'),
        ]);
        if (!cancelled && progRes.ok) {
          const raw = await progRes.json();
          const assessed = raw?.assessed ?? {};
          setProgressionState({
            ...raw,
            assessed: {
              ...assessed,
              completedAt: assessed.completedAt ? new Date(String(assessed.completedAt)) : null,
            },
          } as ProgressionState);
        }
        if (!cancelled && inboxRes.ok) {
          const inboxJson = await inboxRes.json();
          setInboxItems(Array.isArray(inboxJson.items) ? inboxJson.items : []);
        }
      } catch {
        /* optional */
      } finally {
        if (!cancelled) setInboxLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionStatus]);

  // Derive stats
  const totalAssessments = assessments.length;
  const completedAssessments = assessments.filter((a) => a.status === 'completed').length;
  const scoredAssessments = assessments.filter((a) => a.status === 'completed' && a.overallScore !== null);
  const latestCompleted = assessments.find((a) => a.status === 'completed' && !a.isPulse) ?? null;
  const averageScore =
    scoredAssessments.length > 0
      ? Math.round(scoredAssessments.reduce((sum, a) => sum + (a.overallScore ?? 0), 0) / scoredAssessments.length)
      : 0;

  // User defaults (session has limited data; derive what we can)
  const userName = session?.user?.name || 'User';
  const userEmail = session?.user?.email || '';
  // Read tier from session (propagated via JWT from auth.ts callbacks)
  const sessionTier = (session?.user as Record<string, unknown> | undefined)?.tier as string | undefined;
  const userTier: string = sessionTier || 'free';

  // Free tier limits
  const freeTierLimit = 3;

  // -----------------------------------------------------------------------
  // Loading / auth states
  // -----------------------------------------------------------------------

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex flex-col bg-navy-900">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-eari-blue" />
        </main>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect via useEffect
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* ── Identity strip ────────────────────────────────────────────────
              Was a full aurora-panel hero: two decorative blobs, a grid, a big
              greeting, three badges, an email and two buttons — a screenful of
              chrome before the user learned anything. None of it answers "what
              now", so it is now one quiet line and the journey below leads. */}
          <section className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {latestCompleted && typeof latestCompleted.overallScore === 'number' ? (
                <MiniScoreRing score={latestCompleted.overallScore} band={latestCompleted.maturityBand} />
              ) : null}
              <div>
                <h1 className="font-heading text-xl sm:text-2xl font-semibold tracking-[-0.02em] text-slate-50">
                  {userName}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge className={tierBadgeClasses(userTier)}>{tierLabel(userTier)}</Badge>
                  {quota?.foundingMemberNo ? (
                    <Badge className="bg-slate-100 text-navy-900 border-transparent font-mono text-[10.5px]">
                      Founding member #{quota.foundingMemberNo}
                    </Badge>
                  ) : null}
                  <span className="font-mono text-[12px] text-muted-foreground">{userEmail}</span>
                </div>
              </div>
            </div>
            <Link href="/#methodology" className="font-sans text-sm text-muted-foreground hover:text-foreground transition-colors">
              How scoring works
            </Link>
          </section>

          <section id="inbox" className="mb-8 space-y-6 scroll-mt-24">
            <JourneyGuide />
          </section>

          {/* ── Work zone: the table you act on + a live context rail ──────── */}
          <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
            <div className="lg:col-span-2 space-y-6">
            <Card className="bg-navy-800 border-border/60">
              <CardHeader>
                <CardTitle className="font-heading text-lg text-foreground">Assessment History</CardTitle>
                <CardDescription className="font-sans">
                  View and manage your AI readiness assessments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-24" />
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground font-sans">{error}</p>
                    <Button
                      variant="outline"
                      className="mt-4 font-sans min-h-[44px]"
                      onClick={() => window.location.reload()}
                    >
                      Retry
                    </Button>
                  </div>
                ) : assessments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-700 mx-auto mb-4">
                      <ClipboardCheck className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-sans text-sm">
                      No assessments yet. Start your first assessment to measure your AI readiness.
                    </p>
                    <Link href="/assessment">
                      <Button className="mt-4 btn-brand font-sans min-h-[44px]">
                        <ClipboardCheck className="h-4 w-4 mr-2" />
                        Start Assessment
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/40 hover:bg-transparent">
                          <TableHead className="text-muted-foreground font-sans">Assessment</TableHead>
                          <TableHead className="text-muted-foreground font-sans">Date</TableHead>
                          <TableHead className="text-muted-foreground font-sans">Status</TableHead>
                          <TableHead className="text-muted-foreground font-sans">Score</TableHead>
                          <TableHead className="text-muted-foreground font-sans">Maturity Band</TableHead>
                          <TableHead className="text-muted-foreground font-sans text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assessments.map((assessment, i) => (
                          <TableRow key={assessment.id} className="border-border/30">
                            <TableCell>
                              <span className="font-sans text-sm text-foreground" title={assessment.id}>
                                {assessment.isPulse ? 'Pulse check' : 'Assessment'} #{assessments.length - i}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="font-sans text-sm text-foreground">
                                {format(new Date(assessment.createdAt), 'MMM d, yyyy')}
                              </span>
                            </TableCell>
                            <TableCell>{statusBadge(assessment.status)}</TableCell>
                            <TableCell>
                              <span className="font-sans text-sm font-medium text-foreground">
                                {assessment.status === 'completed' && assessment.overallScore !== null
                                  ? `${Math.round(assessment.overallScore)}%`
                                  : '—'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`font-sans text-sm font-medium ${maturityBandColor(assessment.maturityBand)}`}>
                                {maturityBandLabel(assessment.maturityBand)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {assessment.status === 'completed' && (
                                  <Link href={`/results/${assessment.id}`}>
                                    <Button variant="ghost" size="sm" className="font-sans text-slate-300 hover:text-eari-blue h-8 min-h-[44px] px-2">
                                      <Eye className="h-4 w-4 mr-1" />
                                      <span className="hidden sm:inline">View Results</span>
                                    </Button>
                                  </Link>
                                )}
                                {assessment.status === 'draft' && (
                                  <Link href="/assessment">
                                    <Button variant="ghost" size="sm" className="font-sans text-slate-300 hover:text-eari-blue h-8 min-h-[44px] px-2">
                                      <PlayCircle className="h-4 w-4 mr-1" />
                                      <span className="hidden sm:inline">Continue</span>
                                    </Button>
                                  </Link>
                                )}
                                {assessment.status !== 'archived' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="font-sans text-muted-foreground hover:text-foreground h-8 min-h-[44px] px-2"
                                    onClick={async () => {
                                      try {
                                        const res = await fetch(`/api/assessment/${assessment.id}`, {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ status: 'archived' }),
                                        });
                                        if (res.ok) {
                                          setAssessments((prev) =>
                                            prev.map((a) =>
                                              a.id === assessment.id ? { ...a, status: 'archived' } : a
                                            )
                                          );
                                        }
                                      } catch (err) {
                                        console.error('Archive error:', err);
                                      }
                                    }}
                                  >
                                    <Archive className="h-4 w-4 mr-1" />
                                    <span className="hidden sm:inline">Archive</span>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>

            <aside className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
            <Card className="bg-navy-800/70 border-border/50 transition-colors hover:border-border">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-baseline justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Total assessments
                  </p>
                  <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden />
                </div>
                {loading ? (
                  <Skeleton className="mt-3 h-8 w-16" />
                ) : (
                  <p className="mt-2 font-heading text-3xl font-semibold tabular-nums text-foreground">
                    <CountUpNumber value={totalAssessments} />
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-navy-800/70 border-border/50 transition-colors hover:border-border">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-baseline justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Completed
                  </p>
                  <Shield className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden />
                </div>
                {loading ? (
                  <Skeleton className="mt-3 h-8 w-16" />
                ) : (
                  <p className="mt-2 font-heading text-3xl font-semibold tabular-nums text-foreground">
                    <CountUpNumber value={completedAssessments} />
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-navy-800/70 border-border/50 transition-colors hover:border-border">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-baseline justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Average score
                  </p>
                  <BarChart3 className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden />
                </div>
                {loading ? (
                  <Skeleton className="mt-3 h-8 w-16" />
                ) : (
                  <p className="mt-2 font-heading text-3xl font-semibold tabular-nums text-foreground">
                    {averageScore > 0 ? (
                      <>
                        <CountUpNumber value={averageScore} />
                        <span className="ml-0.5 text-base font-medium text-muted-foreground">%</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-navy-800/70 border-border/50 transition-colors hover:border-border">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-baseline justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Current tier
                  </p>
                  <Award className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden />
                </div>
                {loading ? (
                  <Skeleton className="mt-3 h-8 w-24" />
                ) : (
                  <p className="mt-2 font-heading text-3xl font-semibold text-foreground">
                    {tierLabel(userTier)}
                  </p>
                )}
              </CardContent>
            </Card>
              </div>
              <ComplianceInboxCard items={inboxItems} loading={inboxLoading} />
              {progressionState ? (
                <CoverageGaugeCard
                  obligationsApplicable={progressionState.verifying.obligationsApplicable}
                  obligationsEvidenced={progressionState.verifying.obligationsEvidenced}
                />
              ) : (
                <CoverageGaugeCard obligationsApplicable={0} obligationsEvidenced={0} />
              )}
            </aside>
          </section>


          {/* Quick Access grid removed 2026-05-09 — superseded by the
              JourneyGuide spine above (one primary action + tools row),
              which stages module discovery instead of presenting eight
              equal tiles to a first-time user. */}


          {/* ── Account chrome — demoted below the work zone ──────────────── */}
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">Account &amp; support</p>
          {/* Account, plan and support now live on their own page. They were a
              third of this file and answered no question a dashboard has to
              answer. */}
          <section className="mb-4">
            <Link
              href="/portal/account"
              className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-navy-800/40 px-5 py-4 transition-colors hover:border-white/[0.12] hover:bg-navy-800/70"
            >
              <span className="flex items-center gap-3">
                <User className="h-4 w-4 text-slate-400" />
                <span>
                  <span className="block font-heading text-sm font-semibold text-slate-100">
                    Account &amp; support
                  </span>
                  <span className="block font-sans text-[12.5px] text-muted-foreground">
                    Organisation details, plan usage, billing, and help
                  </span>
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </section>


        </div>
      </main>

      <Footer />
      <AIAssistant userTier={userTier as 'free' | 'professional' | 'enterprise'} />
    </div>
  )
}
