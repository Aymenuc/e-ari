'use client'

import Link from 'next/link'
import { CareerApplicationForm } from '@/components/shared/career-application-form'
import { motion } from 'framer-motion'
import {
  MapPin,
  Clock,
  Briefcase,
  ArrowRight,
  Sparkles,
  Brain,
  Code2,
  Shield,
  BarChart3,
  Users,
  Globe,
  Zap,
  Heart,
  CheckCircle2,
  Mail,
  Target,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Navigation } from '@/components/shared/navigation'
import { Footer } from '@/components/shared/footer'

/* ─── Animation helpers ────────────────────────────────────────────────── */

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
  )
}

/* ─── Job Listings Data ─────────────────────────────────────────────────── */

type JobLocation = 'Remote' | 'London, UK' | 'San Francisco, US' | 'Berlin, DE' | 'Hybrid — Paris, FR' | 'Hybrid — Lisbon, PT'
type JobType = 'Full-time' | 'Full-time' | 'Contract'
type JobDepartment = 'Engineering' | 'AI & Research' | 'Product' | 'Design' | 'Sales' | 'Governance' | 'Methodology'

interface JobListing {
  id: string
  title: string
  department: JobDepartment
  location: JobLocation
  type: JobType
  salary: string
  posted: string
  description: string
  requirements: string[]
  benefits: string[]
  icon: React.ElementType
  hot?: boolean
}

const JOB_LISTINGS: JobListing[] = [
  {
    id: 'senior-fullstack-engineer',
    title: 'Senior Full-Stack Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    salary: '$140K – $190K',
    posted: '2 weeks ago',
    description: 'Build and scale the E-ARI assessment platform — from the assessment wizard and scoring engine to the results dashboard and PDF reporting pipeline. You will own core features end-to-end, working with Next.js, TypeScript, Prisma, and our AI agent architecture. We need engineers who care about deterministic scoring, transparent UX, and production reliability over flashy demos.',
    requirements: [
      '5+ years of full-stack experience with TypeScript/React and Node.js',
      'Strong proficiency with Next.js (App Router), Prisma ORM, and PostgreSQL',
      'Experience building and maintaining LLM-integrated features (prompt engineering, structured output parsing, fallback handling)',
      'Proven track record shipping production SaaS with complex form workflows and data visualization',
      'Comfortable with automated testing, CI/CD, and monitoring in a regulated domain',
    ],
    benefits: [
      'Fully remote with flexible hours across CET/PST timezones',
      'Equity participation from day one',
      'Annual learning budget ($3,000) for conferences, courses, and certifications',
      'Top-tier hardware and home office setup allowance',
    ],
    icon: Code2,
    hot: true,
  },
  {
    id: 'governance-analyst',
    title: 'AI Governance Analyst',
    department: 'Governance',
    location: 'London, UK',
    type: 'Full-time',
    salary: '\u00A375K – \u00A3100K',
    posted: '1 week ago',
    description: 'Ensure E-ARI\'s methodology, scoring framework, and AI outputs meet the highest standards of regulatory compliance and ethical AI practice. You will review and update our assessment pillars against evolving regulations (EU AI Act, NIST AI RMF, ISO 42001), validate that AI-generated content is properly labeled and grounded, and contribute to sector-specific regulatory context that makes our insights meaningful for regulated industries.',
    requirements: [
      '3+ years in AI governance, technology policy, or regulatory compliance',
      'Deep knowledge of at least two of: EU AI Act, NIST AI Risk Management Framework, ISO/IEC 42001, GDPR/CCPA',
      'Experience translating regulatory requirements into product features and engineering constraints',
      'Strong writing skills — you will author regulatory context that feeds directly into LLM prompts',
      'Background in healthcare, finance, or government AI regulation preferred',
    ],
    benefits: [
      'Shape the governance layer of an AI product built for enterprise and public-sector compliance teams',
      'Cross-functional role working with engineering, AI, and methodology teams',
      'Sponsored certifications (ISO 42001 Lead Auditor, IAPP AI Governance)',
      'Flexible working with London office access',
    ],
    icon: Shield,
  },
]

/* ─── Department filter ─────────────────────────────────────────────────── */

const DEPARTMENTS = ['All', 'Engineering', 'AI & Research', 'Design', 'Governance', 'Sales', 'Methodology'] as const

/* ─── Perks & Benefits ──────────────────────────────────────────────────── */

const PERKS = [
  { icon: Globe, title: 'Fully Remote First', desc: 'Work from anywhere with flexible hours across CET and PST timezones. We optimize for output, not seat time.' },
  { icon: Heart, title: 'Health & Wellness', desc: 'Comprehensive health, dental, and vision coverage. Mental health support through licensed therapists and coaching.' },
  { icon: Zap, title: 'Equity from Day One', desc: 'Every team member is an owner. Equity grants vest over 4 years with a 1-year cliff.' },
  { icon: Brain, title: 'Learning Budget', desc: '$3,000 annual budget for conferences, courses, certifications, and books. We invest in your growth.' },
  { icon: Shield, title: 'Responsible AI Mission', desc: 'Work on a product that promotes AI governance, transparency, and accountability — not just AI hype.' },
  { icon: Users, title: 'Small Team, Big Impact', desc: 'Every hire shapes the product and culture. No bureaucracy, no politics, just talented people doing important work.' },
]

/* ═══════════════════════════════════════════════════════════════════════════
   CAREERS PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function CareersPage() {
  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />

      <main className="flex-1">
        {/* ─── HERO ────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <div
              className="mesh-blob absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }}
            />
            <div
              className="mesh-blob absolute top-1/2 right-0 w-[600px] h-[600px] rounded-full opacity-15"
              style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)', animationDelay: '-7s' }}
            />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center max-w-3xl mx-auto">
                <Badge variant="outline" className="mb-6 font-mono text-xs border-emerald-500/40 text-emerald-400 bg-emerald-500/5">
                  We&apos;re Hiring
                </Badge>
                <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
                  Build the Standard for{' '}
                  <span className="text-slate-400">AI Readiness</span>
                </h1>
                <p className="mt-6 text-lg sm:text-xl text-muted-foreground font-sans leading-relaxed max-w-2xl mx-auto">
                  Join a team that believes AI readiness deserves the same rigor as financial auditing. We are replacing guesswork with evidence — and we need exceptional people to make it happen.
                </p>
                <div className="mt-8 flex items-center justify-center gap-6">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-muted-foreground font-sans">{JOB_LISTINGS.length} open positions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-muted-foreground font-sans">Remote-first</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-amber-400" />
                    <span className="text-sm text-muted-foreground font-sans">Growing team</span>
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ─── PERKS & BENEFITS ────────────────────────────────────────── */}
        <section className="py-16 sm:py-20 bg-navy-800/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center mb-12">
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                  Why E-ARI?
                </h2>
                <p className="mt-3 text-muted-foreground font-sans max-w-xl mx-auto">
                  We are building something that matters — and we treat our team the way we treat our assessments: with rigor, transparency, and respect.
                </p>
              </div>
            </FadeUp>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {PERKS.map((perk, i) => {
                const Icon = perk.icon
                return (
                  <FadeUp key={perk.title} delay={i * 0.06}>
                    <Card className="bg-navy-800 border-border/50 hover:border-eari-blue/30 transition-colors duration-300 h-full">
                      <CardContent className="p-6">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-eari-blue/15 mb-4">
                          <Icon className="h-5 w-5 text-slate-400" />
                        </div>
                        <h3 className="font-heading font-semibold text-foreground text-base mb-2">{perk.title}</h3>
                        <p className="text-sm text-muted-foreground font-sans leading-relaxed">{perk.desc}</p>
                      </CardContent>
                    </Card>
                  </FadeUp>
                )
              })}
            </div>
          </div>
        </section>

        {/* ─── OPEN POSITIONS ──────────────────────────────────────────── */}
        <section className="py-16 sm:py-20 bg-navy-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center mb-12">
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                  Open Positions
                </h2>
                <p className="mt-3 text-muted-foreground font-sans max-w-xl mx-auto">
                  Find the role where you can do the best work of your career. Every position shapes our product and our mission.
                </p>
              </div>
            </FadeUp>

            <div className="space-y-6 max-w-4xl mx-auto">
              {JOB_LISTINGS.map((job, i) => {
                const JobIcon = job.icon
                return (
                  <FadeUp key={job.id} delay={i * 0.05}>
                    <Card className="bg-navy-800 border-border/50 hover:border-eari-blue/30 transition-all duration-300 hover-lift">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-eari-blue/15 flex-shrink-0">
                            <JobIcon className="h-6 w-6 text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-heading font-semibold text-foreground text-lg">{job.title}</h3>
                              {job.hot && (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] font-mono">
                                  Hot
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Briefcase className="h-3.5 w-3.5" />
                                <span className="text-xs font-sans">{job.department}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5" />
                                <span className="text-xs font-sans">{job.location}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                <span className="text-xs font-sans">{job.type}</span>
                              </div>
                              <Badge variant="outline" className="text-xs font-heading border-emerald-500/30 text-emerald-400">
                                {job.salary}
                              </Badge>
                              <span className="text-xs text-muted-foreground font-sans">{job.posted}</span>
                            </div>
                            <p className="mt-3 text-sm text-muted-foreground font-sans leading-relaxed line-clamp-3">
                              {job.description}
                            </p>
                            <div className="mt-4 flex items-center gap-3">
                              <a href="#apply">
                                <Button className="btn-brand font-heading font-semibold h-9 px-5 text-sm">
                                  Apply Now
                                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                                </Button>
                              </a>
                              <a href={`mailto:careers@e-ari.com?subject=Question about: ${job.title}`}>
                                <Button variant="ghost" className="text-muted-foreground font-sans text-xs h-9">
                                  Ask a question
                                </Button>
                              </a>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </FadeUp>
                )
              })}
            </div>
          </div>
        </section>

        {/* ─── APPLY (real form — persists + emails, no mailto) ─────────── */}
        <section id="apply" className="py-16 sm:py-20 bg-navy-800/50 scroll-mt-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center mb-10">
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                  Apply
                </h2>
                <p className="mt-4 text-lg text-muted-foreground font-sans max-w-xl mx-auto leading-relaxed">
                  Pick a role &mdash; or choose &ldquo;open application&rdquo; if you think we need you and don&apos;t know it yet. A link to your work says more than a formal CV.
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-navy-800/60 p-6 sm:p-8">
                <CareerApplicationForm roles={JOB_LISTINGS.map((j) => j.title)} />
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ─── HIRING PROCESS ──────────────────────────────────────────── */}
        <section className="py-16 sm:py-20 bg-navy-900">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center mb-12">
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                  Our Hiring Process
                </h2>
                <p className="mt-3 text-muted-foreground font-sans max-w-lg mx-auto">
                  Transparent, respectful, and designed to give you a real sense of the work — not just test your interview skills.
                </p>
              </div>
            </FadeUp>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { step: '01', title: 'Application', desc: 'Send us your resume and a brief note about why E-ARI interests you. No cover letter templates — just be genuine.', time: '5 min' },
                { step: '02', title: 'Intro Call', desc: 'A 30-minute conversation with the hiring manager about your experience, the role, and what you are looking for.', time: '30 min' },
                { step: '03', title: 'Technical Deep-Dive', desc: 'A practical exercise relevant to the role — not Leetcode, not take-home homework that takes your weekend. Real work, real timebox.', time: '60-90 min' },
                { step: '04', title: 'Team & Values', desc: 'Meet 2-3 future teammates. We assess culture add, not culture fit — we want people who make us better, not people who copy us.', time: '45 min' },
              ].map((item, i) => (
                <FadeUp key={item.step} delay={i * 0.08}>
                  <Card className="bg-navy-800 border-border/50 h-full">
                    <CardContent className="p-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-eari-blue/15 mb-4">
                        <span className="font-heading text-sm font-bold text-slate-400">{item.step}</span>
                      </div>
                      <h3 className="font-heading font-semibold text-foreground text-base mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground font-sans leading-relaxed">{item.desc}</p>
                      <Badge variant="outline" className="mt-3 text-[10px] font-mono border-border text-muted-foreground">
                        <Clock className="mr-1 h-3 w-3" />
                        {item.time}
                      </Badge>
                    </CardContent>
                  </Card>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
