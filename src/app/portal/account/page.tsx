'use client';

/**
 * Account & support.
 *
 * These four cards used to sit at the bottom of the dashboard, where they were
 * a third of the page and competed with the work. Profile, plan, billing and
 * support are things you visit deliberately once in a while — they are not an
 * answer to "what should I do next", which is the only question a dashboard
 * has to answer. Moved here so the dashboard can be about the work.
 */

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  User, Building, Users, Award, Shield, Mail, FileText, HelpCircle,
  Calendar, ChevronRight, ArrowUpRight, ArrowLeft, Building2,
} from 'lucide-react';

import { Navigation } from '@/components/shared/navigation';
import { Footer } from '@/components/shared/footer';
import { BillingCard } from '@/components/account/billing-card';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { tierBadgeClasses } from '@/lib/tier';

function tierLabel(tier: string): string {
  switch (tier) {
    case 'professional': return 'Professional';
    case 'growth': return 'Growth';
    case 'autopilot': return 'Autopilot';
    case 'enterprise': return 'Enterprise';
    default: return 'Free';
  }
}

const freeTierLimit = 3;

export default function AccountPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [quota, setQuota] = useState<{
    tier: string;
    foundingMemberNo?: number | null;
    assessment: { used: number; limit: number | null };
    pulse: { used: number; limit: number | null };
    report: { used: number; limit: number | null };
  } | null>(null);

  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileData, setProfileData] = useState({ organization: '', sector: '', orgSize: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/auth/login?callbackUrl=/portal/account');
  }, [sessionStatus, router]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    fetch('/api/quota').then(r => (r.ok ? r.json() : null)).then(d => d && setQuota(d)).catch(() => {});
    fetch('/api/portal/profile')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d) setProfileData({ organization: d.organization ?? '', sector: d.sector ?? '', orgSize: d.orgSize ?? '' });
      })
      .catch(() => {});
  }, [sessionStatus]);

  /**
   * Persist to the account, not just this browser.
   *
   * The dashboard version of this dialog only ever wrote to localStorage, so a
   * user filled in their organisation, saw it "save", and found it gone on the
   * next device — and the sector never reached the scoring engine.
   */
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await fetch('/api/portal/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
    } catch { /* keep the dialog usable; the values stay on screen */ }
    setSavingProfile(false);
    setProfileDialogOpen(false);
  };

  const userTier = (quota?.tier ?? (session?.user as { tier?: string })?.tier ?? 'free') as string;
  const userName = session?.user?.name ?? 'there';
  const userEmail = session?.user?.email ?? '';

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <Link
            href="/portal"
            className="inline-flex items-center gap-1.5 font-sans text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>

          <div className="mb-8">
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-slate-50">
              Account &amp; support
            </h1>
            <p className="mt-2 font-sans text-[15px] text-muted-foreground">
              Your organisation details, plan usage, billing, and how to reach us.
            </p>
          </div>

        <section className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
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
                      <Button onClick={handleSaveProfile} className="btn-brand font-sans">Save Changes</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-eari-blue/20 text-slate-300 font-heading font-bold text-sm">
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

              {/* Monthly usage strip — driven by /api/quota for every tier.
                  Replaces the previous hard-coded "3 lifetime" Free panel
                  and the "unlimited" claim for Professional, both of which
                  contradicted /pricing. */}
              {quota && (
                <div className="space-y-3">
                  {(['assessment', 'pulse', 'report'] as const).map((kind) => {
                    const q = quota[kind];
                    const label = kind === 'assessment' ? 'Assessments' : kind === 'pulse' ? 'Pulse checks' : 'Report downloads';
                    const limit = q.limit;
                    const used = q.used;
                    const isUnlimited = limit === null;
                    return (
                      <div key={kind}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-muted-foreground font-sans">{label} this month</span>
                          <span className="text-xs text-foreground font-sans font-medium tabular-nums">
                            {isUnlimited ? `${used} · unlimited` : `${used} / ${limit}`}
                          </span>
                        </div>
                        {!isUnlimited && (
                          <Progress
                            value={Math.min((used / Math.max(1, limit ?? 1)) * 100, 100)}
                            className="h-2"
                          />
                        )}
                      </div>
                    );
                  })}
                  <p className="text-[11px] text-muted-foreground/80 font-sans pt-1">
                    Resets at the start of each calendar month.
                  </p>
                </div>
              )}

              {userTier === 'professional' && (
                <p className="text-sm text-muted-foreground font-sans">
                  Five assessments and fifteen pulse checks per month, all six AI agents, narrative insights, and three reports included at €49/month.
                </p>
              )}

              {userTier === 'growth' && (
                <p className="text-sm text-muted-foreground font-sans">
                  Twenty assessments and fifty pulse checks per month, unlimited reports, all sectors, full admin portal, and read-only API access at €149/month.
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
                        <ChevronRight className="h-3 w-3 text-slate-300" />
                        Up to {freeTierLimit} assessments
                      </li>
                      <li className="flex items-center gap-2 text-sm text-foreground font-sans">
                        <ChevronRight className="h-3 w-3 text-slate-300" />
                        Scoring &amp; maturity band
                      </li>
                      <li className="flex items-center gap-2 text-sm text-foreground font-sans">
                        <ChevronRight className="h-3 w-3 text-slate-300" />
                        1 AI Insight summary
                      </li>
                      <li className="flex items-center gap-2 text-sm text-foreground font-sans">
                        <ChevronRight className="h-3 w-3 text-slate-300" />
                        AI Literacy assessment
                      </li>
                    </>
                  )}
                  {userTier === 'professional' && (
                    <>
                      <li className="flex items-center gap-2 text-sm text-foreground font-sans">
                        <ChevronRight className="h-3 w-3 text-slate-300" />
                        Unlimited assessments
                      </li>
                      <li className="flex items-center gap-2 text-sm text-foreground font-sans">
                        <ChevronRight className="h-3 w-3 text-slate-300" />
                        AI-powered insights
                      </li>
                      <li className="flex items-center gap-2 text-sm text-foreground font-sans">
                        <ChevronRight className="h-3 w-3 text-slate-300" />
                        Priority email support
                      </li>
                      <li className="flex items-center gap-2 text-sm text-foreground font-sans">
                        <ChevronRight className="h-3 w-3 text-slate-300" />
                        Benchmark comparisons
                      </li>
                    </>
                  )}
                  {userTier === 'enterprise' && (
                    <>
                      <li className="flex items-center gap-2 text-sm text-foreground font-sans">
                        <ChevronRight className="h-3 w-3 text-slate-300" />
                        Everything in Professional
                      </li>
                      <li className="flex items-center gap-2 text-sm text-foreground font-sans">
                        <ChevronRight className="h-3 w-3 text-slate-300" />
                        SSO &amp; custom branding
                      </li>
                      <li className="flex items-center gap-2 text-sm text-foreground font-sans">
                        <ChevronRight className="h-3 w-3 text-slate-300" />
                        Dedicated account manager
                      </li>
                      <li className="flex items-center gap-2 text-sm text-foreground font-sans">
                        <ChevronRight className="h-3 w-3 text-slate-300" />
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
                  <Button className="w-full btn-brand font-sans min-h-[44px]">
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
                    <Mail className="h-4 w-4 text-slate-300" />
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
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06]">
                    <HelpCircle className="h-4 w-4 text-slate-300" />
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
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06]">
                    <FileText className="h-4 w-4 text-slate-300" />
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
    </div>
  );
}
