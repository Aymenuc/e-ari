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
import {
  ComplianceInboxCard,
  type PortalInboxItem,
} from '@/components/shared/compliance-inbox';
import { CoverageGaugeCard } from '@/components/shared/coverage-gauge';
import { RecentActivityCard } from '@/components/shared/recent-activity';
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
  responses: { id: string }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tierLabel(tier: string): string {
  switch (tier) {
    case 'professional':
      return 'Professional';
    case 'enterprise':
      return 'Enterprise';
    default:
      return 'Free';
  }
}

function tierBadgeClasses(tier: string): string {
  switch (tier) {
    case 'professional':
      return 'bg-eari-blue/20 text-eari-blue-light border-eari-blue/30';
    case 'enterprise':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
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

function maturityBandColor(band: string | null): string {
  switch (band) {
    case 'pacesetter':
      return 'text-emerald-400';
    case 'chaser':
      return 'text-blue-400';
    case 'follower':
      return 'text-amber-400';
    case 'laggard':
      return 'text-red-400';
    default:
      return 'text-muted-foreground';
  }
}

function truncateId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}...` : id;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PortalPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [assessments, setAssessments] = useState<Assessment[]>([]);
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
          {/* ── Dashboard Header ──────────────────────────────────────────── */}
          <section className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                  Welcome back, {userName}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <Badge className={tierBadgeClasses(userTier)}>
                    <Award className="h-3 w-3 mr-1" />
                    {tierLabel(userTier)} Tier
                  </Badge>
                  <span className="text-sm text-muted-foreground font-mono">{userEmail}</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-3">
                <Link href="/assessment">
                  <Button className="bg-eari-blue hover:bg-eari-blue-dark text-white font-sans min-h-[44px]">
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    Start New Assessment
                  </Button>
                </Link>
                <Link href="/#methodology">
                  <Button variant="outline" className="font-sans min-h-[44px]">
                    <BookOpen className="h-4 w-4 mr-2" />
                    View Methodology
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          <section id="inbox" className="mb-8 space-y-6 scroll-mt-24">
            {progressionState ? (
              <ProgressionBanner state={progressionState} />
            ) : null}
            <div className="grid gap-4 lg:grid-cols-3">
              <ComplianceInboxCard items={inboxItems} loading={inboxLoading} />
              {progressionState ? (
                <CoverageGaugeCard
                  obligationsApplicable={progressionState.verifying.obligationsApplicable}
                  obligationsEvidenced={progressionState.verifying.obligationsEvidenced}
                />
              ) : (
                <CoverageGaugeCard obligationsApplicable={0} obligationsEvidenced={0} />
              )}
              <RecentActivityCard assessments={assessments} />
            </div>
          </section>

          {/* ── Quick Stats Row ───────────────────────────────────────────── */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-navy-800 border-border/60">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-eari-blue/20">
                    <ClipboardCheck className="h-5 w-5 text-eari-blue-light" />
                  </div>
                  <div>
                    {loading ? (
                      <Skeleton className="h-7 w-12 mb-1" />
                    ) : (
                      <p className="font-heading text-2xl font-bold text-foreground">{totalAssessments}</p>
                    )}
                    <p className="text-xs text-muted-foreground font-sans">Total Assessments</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-navy-800 border-border/60">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                    <Shield className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    {loading ? (
                      <Skeleton className="h-7 w-12 mb-1" />
                    ) : (
                      <p className="font-heading text-2xl font-bold text-foreground">{completedAssessments}</p>
                    )}
                    <p className="text-xs text-muted-foreground font-sans">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-navy-800 border-border/60">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
                    <BarChart3 className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    {loading ? (
                      <Skeleton className="h-7 w-12 mb-1" />
                    ) : (
                      <p className="font-heading text-2xl font-bold text-foreground">
                        {averageScore > 0 ? `${averageScore}%` : '—'}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground font-sans">Average Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-navy-800 border-border/60">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                    <Award className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    {loading ? (
                      <Skeleton className="h-7 w-20 mb-1" />
                    ) : (
                      <p className="font-heading text-2xl font-bold text-foreground">{tierLabel(userTier)}</p>
                    )}
                    <p className="text-xs text-muted-foreground font-sans">Current Tier</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* ── Quick Access ────────────────────────────────────────────────────── */}
          <section className="mb-8">
            <h2 className="font-heading text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-eari-blue-light" />
              Quick Access
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Link href="/pulse">
                <Card className="bg-navy-800 border-border/60 hover:border-eari-blue/30 transition-colors cursor-pointer group h-full">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-eari-blue/15 group-hover:bg-eari-blue/25 transition-colors">
                      <Activity className="h-5 w-5 text-eari-blue-light" />
                    </div>
                    <span className="font-heading text-sm font-semibold text-foreground">AI Pulse</span>
                    <span className="text-[10px] text-muted-foreground font-sans">Monthly monitoring</span>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/literacy">
                <Card className="bg-navy-800 border-border/60 hover:border-purple-500/30 transition-colors cursor-pointer group h-full">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 group-hover:bg-purple-500/25 transition-colors">
                      <GraduationCap className="h-5 w-5 text-purple-400" />
                    </div>
                    <span className="font-heading text-sm font-semibold text-foreground">AI Literacy</span>
                    <span className="text-[10px] text-muted-foreground font-sans">Training & quizzes</span>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/discovery">
                <Card className="bg-navy-800 border-border/60 hover:border-emerald-500/30 transition-colors cursor-pointer group h-full">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 group-hover:bg-emerald-500/25 transition-colors">
                      <Search className="h-5 w-5 text-emerald-400" />
                    </div>
                    <span className="font-heading text-sm font-semibold text-foreground">Discovery</span>
                    <span className="text-[10px] text-muted-foreground font-sans">AI profile builder</span>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/integrations">
                <Card className="bg-navy-800 border-border/60 hover:border-cyan-500/30 transition-colors cursor-pointer group h-full">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 group-hover:bg-cyan-500/25 transition-colors">
                      <Plug className="h-5 w-5 text-cyan-400" />
                    </div>
                    <span className="font-heading text-sm font-semibold text-foreground">Integrations</span>
                    <span className="text-[10px] text-muted-foreground font-sans">Connect & extend</span>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </section>

          {/* ── Assessment History ─────────────────────────────────────────── */}
          <section className="mb-8">
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
                      <Button className="mt-4 bg-eari-blue hover:bg-eari-blue-dark text-white font-sans min-h-[44px]">
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
                          <TableHead className="text-muted-foreground font-sans">Assessment ID</TableHead>
                          <TableHead className="text-muted-foreground font-sans">Date</TableHead>
                          <TableHead className="text-muted-foreground font-sans">Status</TableHead>
                          <TableHead className="text-muted-foreground font-sans">Score</TableHead>
                          <TableHead className="text-muted-foreground font-sans">Maturity Band</TableHead>
                          <TableHead className="text-muted-foreground font-sans text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assessments.map((assessment) => (
                          <TableRow key={assessment.id} className="border-border/30">
                            <TableCell>
                              <span className="font-mono text-xs text-muted-foreground" title={assessment.id}>
                                {truncateId(assessment.id)}
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
                                    <Button variant="ghost" size="sm" className="font-sans text-eari-blue-light hover:text-eari-blue h-8 min-h-[44px] px-2">
                                      <Eye className="h-4 w-4 mr-1" />
                                      <span className="hidden sm:inline">View Results</span>
                                    </Button>
                                  </Link>
                                )}
                                {assessment.status === 'draft' && (
                                  <Link href="/assessment">
                                    <Button variant="ghost" size="sm" className="font-sans text-eari-blue-light hover:text-eari-blue h-8 min-h-[44px] px-2">
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
          </section>

          {/* ── Bottom Grid: Profile / Subscription / Billing / Support ────── */}
          <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Profile Section */}
            <Card className="bg-navy-800 border-border/60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-lg text-foreground flex items-center gap-2">
                    <User className="h-5 w-5 text-muted-foreground" />
                    Profile
                  </CardTitle>
                  <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="font-sans text-muted-foreground min-h-[44px]">
                        Edit Profile
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-navy-800 border-border/60 text-foreground sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="font-heading text-lg text-foreground">Edit Profile</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground font-sans">Organization</Label>
                          <Input value={profileData.organization} onChange={(e) => setProfileData(p => ({ ...p, organization: e.target.value }))} placeholder="Your company name" className="bg-navy-700 border-border/60 text-foreground font-sans" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground font-sans">Sector</Label>
                          <Select value={profileData.sector} onValueChange={(v) => setProfileData(p => ({ ...p, sector: v }))}>
                            <SelectTrigger className="bg-navy-700 border-border/60 text-foreground font-sans">
                              <SelectValue placeholder="Select sector" />
                            </SelectTrigger>
                            <SelectContent className="bg-navy-800 border-border/60">
                              <SelectItem value="technology" className="font-sans">Technology</SelectItem>
                              <SelectItem value="finance" className="font-sans">Financial Services</SelectItem>
                              <SelectItem value="healthcare" className="font-sans">Healthcare</SelectItem>
                              <SelectItem value="manufacturing" className="font-sans">Manufacturing</SelectItem>
                              <SelectItem value="retail" className="font-sans">Retail & E-commerce</SelectItem>
                              <SelectItem value="government" className="font-sans">Government & Public Sector</SelectItem>
                              <SelectItem value="education" className="font-sans">Education</SelectItem>
                              <SelectItem value="energy" className="font-sans">Energy & Utilities</SelectItem>
                              <SelectItem value="media" className="font-sans">Media & Entertainment</SelectItem>
                              <SelectItem value="other" className="font-sans">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground font-sans">Organization Size</Label>
                          <Select value={profileData.orgSize} onValueChange={(v) => setProfileData(p => ({ ...p, orgSize: v }))}>
                            <SelectTrigger className="bg-navy-700 border-border/60 text-foreground font-sans">
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                            <SelectContent className="bg-navy-800 border-border/60">
                              <SelectItem value="1-10" className="font-sans">1–10 employees</SelectItem>
                              <SelectItem value="11-50" className="font-sans">11–50 employees</SelectItem>
                              <SelectItem value="51-200" className="font-sans">51–200 employees</SelectItem>
                              <SelectItem value="201-1000" className="font-sans">201–1,000 employees</SelectItem>
                              <SelectItem value="1001-5000" className="font-sans">1,001–5,000 employees</SelectItem>
                              <SelectItem value="5000+" className="font-sans">5,000+ employees</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline" className="font-sans">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleSaveProfile} className="bg-eari-blue hover:bg-eari-blue-dark text-white font-sans">Save Changes</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-eari-blue/20 text-eari-blue-light font-heading font-bold text-sm">
                    {userName[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-foreground">{userName}</p>
                    <p className="text-sm text-muted-foreground font-mono">{userEmail}</p>
                  </div>
                </div>

                <Separator className="bg-border/40" />

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground font-sans">Organization</p>
                      <p className="text-sm text-foreground font-sans">{profileData.organization || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground font-sans">Sector</p>
                      <p className="text-sm text-foreground font-sans">{profileData.sector || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground font-sans">Organization Size</p>
                      <p className="text-sm text-foreground font-sans">{profileData.orgSize || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground font-sans">Member Since</p>
                      <p className="text-sm text-foreground font-sans">
                        {(() => {
                          const created = (session?.user as Record<string, unknown>)?.createdAt as string | undefined
                          return created
                            ? format(new Date(created), 'MMM d, yyyy')
                            : session ? 'Recently joined' : '—'
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Section */}
            <Card className="bg-navy-800 border-border/60">
              <CardHeader>
                <CardTitle className="font-heading text-lg text-foreground flex items-center gap-2">
                  <Award className="h-5 w-5 text-muted-foreground" />
                  Subscription
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Badge className={tierBadgeClasses(userTier)}>
                    {tierLabel(userTier)} Tier
                  </Badge>
                </div>

                {userTier === 'free' && (
                  <>
                    <p className="text-sm text-muted-foreground font-sans">
                      Get started with up to {freeTierLimit} assessments. Upgrade for unlimited access and advanced features.
                    </p>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground font-sans">Assessments Used</span>
                        <span className="text-xs text-foreground font-sans font-medium">
                          {totalAssessments} / {freeTierLimit}
                        </span>
                      </div>
                      <Progress
                        value={Math.min((totalAssessments / freeTierLimit) * 100, 100)}
                        className="h-2"
                      />
                    </div>
                  </>
                )}

                {userTier === 'professional' && (
                  <p className="text-sm text-muted-foreground font-sans">
                    Unlimited assessments with all 6 AI agents, full narrative insights, and PDF reports at $29/month.
                  </p>
                )}

                {userTier === 'enterprise' && (
                  <p className="text-sm text-muted-foreground font-sans">
                    Full platform access with custom branding, SSO, dedicated support, and SLA guarantees.
                  </p>
                )}

                <Separator className="bg-border/40" />

                <div>
                  <p className="text-xs text-muted-foreground font-sans mb-2">Included features:</p>
                  <ul className="space-y-1.5">
                    {userTier === 'free' && (
                      <>
                        <li className="flex items-center gap-2 text-sm text-foreground font-sans">
                          <ChevronRight className="h-3 w-3 text-eari-blue-light" />
                          Up to {freeTierLimit} assessments
                        </li>
                        <li className="flex items-center gap-2 text-sm text-foreground font-sans">
                          <ChevronRight className="h-3 w-3 text-eari-blue-light" />
                          Scoring &amp; maturity band
                        </li>
                        <li className="flex items-center gap-2 text-sm text-foreground font-sans">
                          <ChevronRight className="h-3 w-3 text-eari-blue-light" />
                          1 AI Insight summary
                        </li>
                        <li className="flex items-center gap-2 text-sm text-foreground font-sans">
                          <ChevronRight className="h-3 w-3 text-eari-blue-light" />
                          AI Literacy assessment
                        </li>
                      </>
                    )}
                    {userTier === 'professional' && (
                      <>
                        <li className="flex items-center gap-2 text-sm text-foreground font-sans">
                          <ChevronRight className="h-3 w-3 text-eari-blue-light" />
                          Unlimited assessments
                        </li>
                        <li className="flex items-center gap-2 text-sm text-foreground font-sans">
                          <ChevronRight className="h-3 w-3 text-eari-blue-light" />
                          AI-powered insights
                        </li>
                        <li className="flex items-center gap-2 text-sm text-foreground font-sans">
                          <ChevronRight className="h-3 w-3 text-eari-blue-light" />
                          Priority email support
                        </li>
                        <li className="flex items-center gap-2 text-sm text-foreground font-sans">
                          <ChevronRight className="h-3 w-3 text-eari-blue-light" />
                          Benchmark comparisons
                        </li>
                      </>
                    )}
                    {userTier === 'enterprise' && (
                      <>
                        <li className="flex items-center gap-2 text-sm text-foreground font-sans">
                          <ChevronRight className="h-3 w-3 text-eari-blue-light" />
                          Everything in Professional
                        </li>
                        <li className="flex items-center gap-2 text-sm text-foreground font-sans">
                          <ChevronRight className="h-3 w-3 text-eari-blue-light" />
                          SSO &amp; custom branding
                        </li>
                        <li className="flex items-center gap-2 text-sm text-foreground font-sans">
                          <ChevronRight className="h-3 w-3 text-eari-blue-light" />
                          Dedicated account manager
                        </li>
                        <li className="flex items-center gap-2 text-sm text-foreground font-sans">
                          <ChevronRight className="h-3 w-3 text-eari-blue-light" />
                          SLA guarantees
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              </CardContent>

              {userTier === 'free' && (
                <CardFooter>
                  <Link href="/checkout?plan=professional" className="w-full">
                    <Button className="w-full bg-eari-blue hover:bg-eari-blue-dark text-white font-sans min-h-[44px]">
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      Upgrade Plan
                    </Button>
                  </Link>
                </CardFooter>
              )}
            </Card>

            {/* Billing Management Section */}
            <BillingCard tier={userTier} />

            {/* Support Section */}
            <Card className="bg-navy-800 border-border/60">
              <CardHeader>
                <CardTitle className="font-heading text-lg text-foreground flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-muted-foreground" />
                  Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground font-sans">
                  Need help? Reach out to our support team or explore our resources.
                </p>

                <Separator className="bg-border/40" />

                <div className="space-y-3">
                  <a
                    href="mailto:support@e-ari.com"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-navy-700 transition-colors min-h-[44px]"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-eari-blue/20">
                      <Mail className="h-4 w-4 text-eari-blue-light" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground font-sans">Email Support</p>
                      <p className="text-xs text-muted-foreground font-mono">support@e-ari.com</p>
                    </div>
                  </a>

                  <a
                    href="/#faq"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-navy-700 transition-colors min-h-[44px]"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20">
                      <HelpCircle className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground font-sans">FAQ</p>
                      <p className="text-xs text-muted-foreground font-sans">Frequently asked questions</p>
                    </div>
                  </a>

                  <a
                    href="mailto:support@e-ari.com?subject=Documentation%20Request"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-navy-700 transition-colors min-h-[44px]"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20">
                      <FileText className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground font-sans">Documentation</p>
                      <p className="text-xs text-muted-foreground font-sans">Guides &amp; API reference</p>
                    </div>
                  </a>
                </div>
              </CardContent>
            </Card>
          </section>


        </div>
      </main>

      <Footer />
      <AIAssistant userTier={userTier as 'free' | 'professional' | 'enterprise'} />
    </div>
  )
}
