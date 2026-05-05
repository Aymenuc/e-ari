'use client'

import Link from 'next/link'
import { useRef, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion, useTransform, useScroll, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Target,
  Database,
  Cpu,
  Users,
  Shield,
  Heart,
  Settings,
  Lock,
  ArrowRight,
  Check,
  Zap,
  Brain,
  Eye,
  LockKeyhole,
  FileCheck,
  Sparkles,
  Scale,
  ArrowUp,
  Bot,
  Radar,
  GraduationCap,
  FileOutput,
  Activity,
  Workflow,
  MessageSquare,
  Search,
  Award,
  Landmark,
  BarChart3,
  TrendingUp,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Navigation } from '@/components/shared/navigation'
import { Footer } from '@/components/shared/footer'
import { ProductSpotlightCarousel } from '@/components/marketing/product-spotlight-carousel'
import { HowScoringWorks } from '@/components/marketing/how-scoring-works'
import { AgentPanel } from '@/components/shared/agent-panel'
import { PILLARS } from '@/lib/pillars'

/* ─── Animation helpers ────────────────────────────────────────────────── */

function FadeUp({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        duration: reduceMotion ? 0.01 : 0.45,
        ease: 'easeOut',
        delay: reduceMotion ? 0 : delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ─── Parallax wrapper for sections ─────────────────────────────────────── */

function ParallaxSection({ children, className, speed = 0.1, id }: { children: React.ReactNode; className?: string; speed?: number; id?: string }) {
  const ref = useRef(null)
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [0, speed * -100])

  return (
    <motion.section ref={ref} style={{ y }} className={className} id={id}>
      {children}
    </motion.section>
  )
}

/* ─── Animated Checkmark ───────────────────────────────────────────────── */

function AnimatedCheck({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none">
      <motion.path
        d="M3 8L6.5 11.5L13 4.5"
        stroke="#0369a1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      />
    </svg>
  )
}

/* ─── Back to Top Button ──────────────────────────────────────────────── */

function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-eari-blue text-white border border-white/10 shadow-lg shadow-black/40 hover:bg-eari-blue-dark transition-colors"
          aria-label="Back to top"
        >
          <ArrowUp className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

/* ─── Icon map ─────────────────────────────────────────────────────────── */

const ICON_MAP: Record<string, React.ElementType> = {
  Target,
  Database,
  Cpu,
  Users,
  Shield,
  Heart,
  Settings,
  Lock,
}

/* ─── Sample pillar scores for the hero preview ────────────────────────── */

const SAMPLE_SCORES = [
  { name: 'Strategy', score: 72, color: '#2563eb' },
  { name: 'Data', score: 58, color: '#475569' },
  { name: 'Technology', score: 65, color: '#0369a1' },
  { name: 'Talent', score: 44, color: '#64748b' },
  { name: 'Governance', score: 78, color: '#0ea5e9' },
  { name: 'Culture', score: 55, color: '#334155' },
  { name: 'Process', score: 61, color: '#0284c7' },
  { name: 'Security', score: 83, color: '#94a3b8' },
]

/* ─── Agentic Properties ────────────────────────────────────────────────── */

const AGENT_PROPERTIES = [
  {
    id: 'discovery',
    icon: Search,
    name: 'Discovery Agent',
    tagline: 'Autonomous Stakeholder Interviews',
    description: 'Conducts structured, adaptive interviews with stakeholders to map organizational readiness, surface blind spots, and capture qualitative context that questionnaires alone cannot reach.',
    capability: '5 question types · Adaptive follow-ups · Sector-aware prompts',
    color: '#2563eb',
    status: 'active',
    href: '/discovery',
  },
  {
    id: 'insight',
    icon: Brain,
    name: 'Insight Agent',
    tagline: 'Strategic Narrative Generation',
    description: 'Generates board-ready strategic narratives grounded in your actual assessment scores. Identifies cross-pillar correlations, risk patterns, and prioritized action paths.',
    capability: 'Score-grounded analysis · Cross-pillar correlation · Risk flags',
    color: '#0369a1',
    status: 'active',
    href: '/assessment',
  },
  {
    id: 'literacy',
    icon: GraduationCap,
    name: 'Literacy Agent',
    tagline: 'Adaptive Learning Paths',
    description: 'Creates personalized AI literacy curricula based on role, seniority, and assessment gaps. Serves tailored micro-lessons that build organizational competence over time.',
    capability: 'Role-based paths · Gap-driven content · Progress tracking',
    color: '#0ea5e9',
    status: 'active',
    href: '/literacy',
  },
  {
    id: 'scoring',
    icon: Activity,
    name: 'Scoring Agent',
    tagline: 'Deterministic Calculation Engine',
    description: 'Executes the six-step scoring pipeline with full reproducibility. Versioned methodology, auditable weights, and no randomness — every score is verifiable.',
    capability: 'Versioned scoring · Full audit trail · Zero randomness',
    color: '#475569',
    status: 'active',
    href: '/assessment',
  },
  {
    id: 'report',
    icon: FileOutput,
    name: 'Report Agent',
    tagline: 'Automated Board-Ready Output',
    description: 'Generates publication-quality PDF reports with executive summaries, radar visualizations, and maturity classifications. Formatted for board presentations and compliance records.',
    capability: 'PDF generation · Executive summary · Visual dashboards',
    color: '#64748b',
    status: 'active',
    href: '/assessment',
  },
  {
    id: 'assistant',
    icon: MessageSquare,
    name: 'Assistant Agent',
    tagline: 'Context-Aware AI Companion',
    description: 'An always-available AI assistant that understands your assessment context, answers questions about methodology, and provides real-time guidance throughout your readiness journey.',
    capability: 'Context memory · Methodology expert · Real-time guidance',
    color: '#334155',
    status: 'active',
    href: '/assessment',
  },
]

/* ─── Agent orchestration flow steps ────────────────────────────────────── */

const ORCHESTRATION_FLOW = [
  { label: 'Scoring', desc: 'Deterministic calculation' },
  { label: 'Discovery', desc: 'Stakeholder interviews' },
  { label: 'Insight', desc: 'Narrative generation' },
  { label: 'Literacy', desc: 'Adaptive learning' },
  { label: 'Report', desc: 'Executive document' },
  { label: 'Assistant', desc: 'Interactive guidance' },
]

/** Single coordinate system for orbit lines + HTML nodes (SVG viewBox units). */
const ORBIT_VB = 380
const ORBIT_CX = 190
const ORBIT_CY = 190
/** Distance from hub center to each agent icon center — matches connector endpoints. */
const ORBIT_R = 140

/**
 * Clockwise from top (−90°): same sequence as ORCHESTRATION_FLOW / pipeline strip.
 * Each spoke lands on a vertex of a regular hexagon centered on the hub.
 */
const AGENT_ORBIT_IDS = ['scoring', 'discovery', 'insight', 'literacy', 'report', 'assistant'] as const

function orbitAngleRad(index: number, total: number) {
  return -Math.PI / 2 + (index * 2 * Math.PI) / total
}

function orbitPositionPct(angleRad: number) {
  const x = ORBIT_CX + ORBIT_R * Math.cos(angleRad)
  const y = ORBIT_CY + ORBIT_R * Math.sin(angleRad)
  return { leftPct: (x / ORBIT_VB) * 100, topPct: (y / ORBIT_VB) * 100 }
}

const AGENTS_ORBIT_ORDERED = AGENT_ORBIT_IDS.map((id) => {
  const agent = AGENT_PROPERTIES.find((a) => a.id === id)
  if (!agent) throw new Error(`Agent orbit: missing "${id}" in AGENT_PROPERTIES`)
  return agent
})

/* ─── Pricing tiers ────────────────────────────────────────────────────── */

const PRICING_TIERS = [
  {
    name: 'Starter',
    price: '$0',
    yearlyPrice: '$0',
    period: 'forever',
    yearlyPeriod: 'forever',
    description: 'Explore AI readiness with your first assessment and core scoring.',
    icon: Zap,
    color: '#64748b',
    features: [
      { text: '1 assessment per month', included: true },
      { text: 'Score breakdown by pillar', included: true },
      { text: 'Maturity band classification', included: true },
      { text: '3 pulse checks per month', included: true },
      { text: '1 team member', included: true },
      { text: 'Community support', included: true },
      { text: 'AI narrative insights', included: false },
      { text: '.docx report download', included: false },
      { text: 'Sector benchmarks', included: false },
      { text: 'Admin portal', included: false },
    ],
    cta: 'Start Free',
    href: '/auth/register',
    yearlyHref: '/auth/register',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '€49',
    yearlyPrice: '€40.83',
    period: '/month',
    yearlyPeriod: '/mo, billed yearly',
    description: 'For practitioners running regular assessments with AI-powered insights.',
    icon: Sparkles,
    color: '#2563eb',
    features: [
      { text: '5 assessments per month', included: true },
      { text: 'Full AI narrative insights', included: true },
      { text: '15 pulse checks per month', included: true },
      { text: '5 team members', included: true },
      { text: '3 .docx report downloads/mo', included: true },
      { text: 'Core sector benchmarks', included: true },
      { text: 'Basic admin portal', included: true },
      { text: 'Email support', included: true },
      { text: 'Unlimited reports', included: false },
      { text: 'API access', included: false },
    ],
    cta: 'Get Professional',
    href: '/checkout?tier=professional&billing=monthly',
    yearlyHref: '/checkout?tier=professional&billing=annual',
    highlighted: true,
  },
  {
    name: 'Growth',
    price: '€149',
    yearlyPrice: '€124.17',
    period: '/month',
    yearlyPeriod: '/mo, billed yearly',
    description: 'For scaling organizations that need broader coverage and team collaboration.',
    icon: TrendingUp,
    color: '#7c3aed',
    features: [
      { text: '20 assessments per month', included: true },
      { text: '50 pulse checks per month', included: true },
      { text: '25 team members', included: true },
      { text: 'Unlimited .docx reports', included: true },
      { text: 'All sector benchmarks', included: true },
      { text: 'Full admin portal', included: true },
      { text: 'Read-only API access', included: true },
      { text: 'Quarterly business review', included: true },
      { text: 'Priority support', included: true },
      { text: 'SSO / SAML', included: false },
    ],
    cta: 'Get Growth',
    href: '/checkout?tier=growth&billing=monthly',
    yearlyHref: '/checkout?tier=growth&billing=annual',
    highlighted: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    yearlyPrice: 'Custom',
    period: '',
    yearlyPeriod: '',
    description: 'Organization-wide AI readiness at scale with dedicated support and SLAs.',
    icon: Shield,
    color: '#d4a853',
    features: [
      { text: 'Everything in Growth', included: true },
      { text: 'Unlimited assessments & pulse checks', included: true },
      { text: 'Unlimited team members', included: true },
      { text: 'Full API access', included: true },
      { text: 'SSO / SAML integration', included: true },
      { text: 'Custom branding & white-label', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'SLA guarantees', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'On-prem / private cloud option', included: true },
    ],
    cta: 'Contact Sales',
    href: '/contact',
    yearlyHref: '/contact',
    highlighted: false,
  },
]

/* ─── Client logos (businesses that have used E-ARI) ────────────────────── */

const ORG_ARCHETYPES = [
  'Regulated enterprise',
  'Professional services',
  'B2B SaaS',
  'Public sector',
  'Healthcare systems',
  'Research & academia',
]

const LANDING_FAQ = [
  {
    q: 'Does AI change my E-ARI scores?',
    a: 'No. Scoring is deterministic and versioned. AI only adds narrative context on top of your calculated results — it never inflates, alters, or overrides the numbers.',
  },
  {
    q: 'How long does an assessment take?',
    a: 'Most organizations complete their first pass in under 20 minutes. You can save progress and return; deeper evidence work happens in the portal over time.',
  },
  {
    q: 'What makes this “agentic” instead of a chatbot?',
    a: 'Six specialised agents each do a discrete job — discovery interviews, deterministic scoring, narrative insight, literacy paths, reporting, and in-context guidance — and pass structured context forward. It is orchestration, not a single generic assistant.',
  },
  {
    q: 'Can we use E-ARI for EU AI Act or other compliance workflows?',
    a: 'Yes. The platform supports evidence trails, technical documentation workflows, and submission-oriented packs alongside your readiness scores. Use the compliance workspace in the portal for mapped use cases and evidence.',
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function Home() {
  // Session-aware so we can hide the AgentPanel on the public landing —
  // an Assistant launcher serves no purpose for unauthenticated visitors.
  const { status: sessionStatus } = useSession()
  const isAuthenticated = sessionStatus === 'authenticated'

  const [isAnnual, setIsAnnual] = useState(false)
  const [enterprisePriceLabel, setEnterprisePriceLabel] = useState('Custom')

  useEffect(() => {
    fetch('/api/pricing-config')
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.enterprisePriceLabel === 'string' && data.enterprisePriceLabel.trim()) {
          setEnterprisePriceLabel(data.enterprisePriceLabel.trim())
        }
      })
      .catch(() => {
        // Keep default label
      })
  }, [])

  const pricingTiers = PRICING_TIERS.map((tier) =>
    tier.name === 'Enterprise'
      ? { ...tier, price: enterprisePriceLabel, yearlyPrice: enterprisePriceLabel }
      : tier
  )

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />

      <main className="flex-1">
        {/* ─── 1. HERO SECTION ──────────────────────────────────────────── */}
        <section id="hero-section" className="relative overflow-hidden pt-20 pb-24 sm:pt-28 sm:pb-32">
          {/* Quiet navy base — one calm radial accent, no animation, no particles */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,#070d18_0%,#0d1117_55%,#0d1117_100%)]" />
            <div
              className="absolute -top-32 right-[-5%] w-[min(640px,75vw)] h-[min(640px,75vw)] rounded-full opacity-[0.08]"
              style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 65%)' }}
            />
            {/* Single ultra-faint hairline at the bottom — quiet section divider */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left — copy */}
              <div className="text-center lg:text-left">
                <FadeUp>
                  {/* Hairline rule + label — calmer than a pill badge */}
                  <div className="mb-7 flex items-center gap-3 justify-center lg:justify-start">
                    <span aria-hidden className="h-px w-10 bg-eari-blue/60" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-eari-blue-light/90">
                      Agentic AI Readiness Platform
                    </span>
                  </div>

                  <h1 className="font-heading text-[2.25rem] sm:text-[3rem] lg:text-[3.4rem] font-semibold tracking-[-0.035em] text-slate-50 leading-[1.05]">
                    Six AI Agents.
                    <br />
                    <span className="font-medium text-eari-blue-light">One Mission.</span>
                  </h1>

                  <p className="mt-7 max-w-xl mx-auto lg:mx-0 font-heading text-lg sm:text-xl font-medium tracking-tight text-slate-300 leading-[1.45]">
                    Enterprise AI readiness assessment — orchestrated by an agentic platform built for governance-heavy teams.
                  </p>

                  <p className="mt-5 max-w-xl mx-auto lg:mx-0 text-[15px] sm:text-base text-slate-400 font-sans leading-relaxed">
                    Six specialised agents — Discovery, Insight, Literacy, Scoring, Report, and Assistant — work in concert to deliver outputs no single tool can match.
                  </p>

                  <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                    <Link href="/auth/register">
                      <Button
                        size="lg"
                        className="group h-12 px-7 bg-eari-blue hover:bg-eari-blue-dark text-white font-heading font-semibold text-[15px] tracking-[-0.005em] w-full sm:w-auto shadow-[0_8px_24px_-6px_rgba(37,99,235,0.45)] transition-all duration-200 hover:translate-y-[-1px] hover:shadow-[0_12px_28px_-6px_rgba(37,99,235,0.55)]"
                      >
                        <span className="flex items-center">
                          Start Free Assessment
                          <ArrowRight className="ml-2 h-[18px] w-[18px] transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.2} />
                        </span>
                      </Button>
                    </Link>
                    <Link href="#agentic">
                      <Button
                        variant="outline"
                        size="lg"
                        className="h-12 px-7 border-white/10 bg-transparent hover:bg-white/[0.04] text-slate-200 font-heading font-medium text-[15px] tracking-[-0.005em] w-full sm:w-auto transition-colors"
                      >
                        Meet the Agents
                      </Button>
                    </Link>
                  </div>
                </FadeUp>
              </div>

              {/* Right — dashboard preview (calm, no decorative floating badges) */}
              <FadeUp delay={0.12} className="flex justify-center lg:justify-end">
                <div className="relative w-full max-w-lg">
                  {/* Main preview card — flat surface, no glassmorphism, single deep shadow */}
                  <div className="rounded-xl overflow-hidden relative border border-white/[0.07] bg-[#0e131c] shadow-[0_30px_70px_-24px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.02)_inset]">
                    {/* Window chrome — refined: status dot + module label + monospace path */}
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0a0f17] border-b border-white/[0.05]">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/60 animate-ping" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      </span>
                      <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">
                        Assessment / results
                      </span>
                      <span className="ml-auto text-[10px] font-mono text-slate-600">v5.3</span>
                    </div>

                    <div className="p-6 relative z-10">
                      {/* Top row: Large score ring + info */}
                      <div className="flex items-center gap-6">
                        {/* Large animated score ring with gradient glow */}
                        <div className="relative flex-shrink-0">
                          <svg width="120" height="120" viewBox="0 0 120 120" aria-label="Overall readiness score: 67%">
                            <defs>
                              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#1d4ed8" />
                                <stop offset="100%" stopColor="#0369a1" />
                              </linearGradient>
                            </defs>
                            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(48,57,74,0.3)" strokeWidth="7" />
                            <motion.circle
                              cx="60"
                              cy="60"
                              r="52"
                              fill="none"
                              stroke="url(#scoreGradient)"
                              strokeWidth="7"
                              strokeLinecap="round"
                              strokeDasharray={327}
                              initial={{ strokeDashoffset: 327 }}
                              animate={{ strokeDashoffset: 327 - 327 * 0.67 }}
                              transition={{ duration: 2, ease: 'easeOut', delay: 0.5 }}
                              transform="rotate(-90 60 60)"
                            />
                            <motion.text
                              x="60" y="54" textAnchor="middle" fill="#e6edf3" fontSize="30" fontWeight="700" fontFamily="var(--font-plus-jakarta)"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.5, delay: 1.2 }}
                            >
                              67
                            </motion.text>
                            <text x="60" y="72" textAnchor="middle" fill="#8b949e" fontSize="11" fontFamily="var(--font-inter)">
                              / 100
                            </text>
                          </svg>
                        </div>

                        <div>
                          <p className="font-heading font-bold text-slate-50 text-[19px] tracking-tight">E-ARI Score</p>
                          <p className="text-[13px] text-slate-400 font-sans mt-1">Chaser &middot; 51&ndash;75 band</p>
                          <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-eari-blue/25 bg-eari-blue/10 px-2 py-1">
                            <span className="h-1 w-1 rounded-full bg-eari-blue-light" />
                            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-eari-blue-light/95">
                              Deterministic v5.3
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Mini radar chart — calm constellation style */}
                      <div className="mt-6 flex justify-center">
                        <div className="relative">
                          <svg width="200" height="200" viewBox="0 0 200 200" aria-label="Pillar radar chart">
                            <defs>
                              <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="rgba(37,99,235,0.1)" />
                                <stop offset="100%" stopColor="rgba(15,23,42,0.12)" />
                              </linearGradient>
                            </defs>
                            {/* Octagonal grid rings — solid, faint */}
                            {[0.25, 0.5, 0.75, 1].map((scale) => (
                              <polygon
                                key={scale}
                                points={SAMPLE_SCORES.map((_, i) => {
                                  const angle = (Math.PI * 2 * i) / SAMPLE_SCORES.length - Math.PI / 2
                                  const r = 80 * scale
                                  return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`
                                }).join(' ')}
                                fill="none"
                                stroke="rgba(48,57,74,0.15)"
                                strokeWidth="0.4"
                              />
                            ))}
                            {/* Axis lines — minimal */}
                            {SAMPLE_SCORES.map((_, i) => {
                              const angle = (Math.PI * 2 * i) / SAMPLE_SCORES.length - Math.PI / 2
                              return (
                                <line
                                  key={i}
                                  x1="100" y1="100"
                                  x2={100 + 80 * Math.cos(angle)}
                                  y2={100 + 80 * Math.sin(angle)}
                                  stroke="rgba(48,57,74,0.10)"
                                  strokeWidth="0.4"
                                />
                              )
                            })}
                            {/* Data polygon — gentle fade-in */}
                            <motion.polygon
                              points={SAMPLE_SCORES.map((pillar, i) => {
                                const angle = (Math.PI * 2 * i) / SAMPLE_SCORES.length - Math.PI / 2
                                const r = (pillar.score / 100) * 80
                                return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`
                              }).join(' ')}
                              fill="url(#radarFill)"
                              stroke="url(#scoreGradient)"
                              strokeWidth="1"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 1.5, delay: 0.6, ease: 'easeOut' }}
                            />
                            {SAMPLE_SCORES.map((pillar, i) => {
                              const angle = (Math.PI * 2 * i) / SAMPLE_SCORES.length - Math.PI / 2
                              const r = (pillar.score / 100) * 80
                              const cx = 100 + r * Math.cos(angle)
                              const cy = 100 + r * Math.sin(angle)
                              return (
                                <motion.circle
                                  key={i}
                                  cx={cx}
                                  cy={cy}
                                  r="2"
                                  fill={pillar.color}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.35, delay: 0.75 + i * 0.04, ease: 'easeOut' }}
                                />
                              )
                            })}
                            {/* Pillar labels — static */}
                            {SAMPLE_SCORES.map((pillar, i) => {
                              const angle = (Math.PI * 2 * i) / SAMPLE_SCORES.length - Math.PI / 2
                              const labelR = 95
                              return (
                                <text
                                  key={i}
                                  x={100 + labelR * Math.cos(angle)}
                                  y={100 + labelR * Math.sin(angle)}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  fill="#8b949e"
                                  fontSize="8"
                                  fontFamily="var(--font-jetbrains)"
                                >
                                  {pillar.name.slice(0, 3).toUpperCase()}
                                </text>
                              )
                            })}
                          </svg>
                        </div>
                      </div>

                      {/* Pillar quick stats — paired columns, hairline rows */}
                      <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2.5 border-t border-white/[0.05] pt-4">
                        {SAMPLE_SCORES.map((pillar, i) => (
                          <motion.div
                            key={pillar.name}
                            className="flex items-center gap-3"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.7 + i * 0.04 }}
                          >
                            <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: pillar.color }} />
                            <span className="text-[11px] text-slate-400 font-sans flex-1 truncate">{pillar.name}</span>
                            <div className="h-[3px] w-12 rounded-full bg-white/[0.04] overflow-hidden">
                              <div className="h-full rounded-full" style={{ backgroundColor: pillar.color, width: `${pillar.score}%` }} />
                            </div>
                            <span className="text-[11px] font-mono text-slate-200 tabular-nums w-6 text-right">{pillar.score}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </FadeUp>
            </div>
          </div>
        </section>

        {/* ─── 2. METHODOLOGY SECTION ───────────────────────────────────── */}
        <ParallaxSection speed={0.05} className="py-20 sm:py-28 bg-navy-900" id="methodology">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center max-w-2xl mx-auto">
                <div className="mb-5 flex items-center justify-center gap-3">
                  <span aria-hidden className="h-px w-8 bg-eari-blue/60" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-eari-blue-light/90">
                    Methodology
                  </span>
                  <span aria-hidden className="h-px w-8 bg-eari-blue/60" />
                </div>
                <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-slate-50">
                  The 8-Pillar Framework
                </h2>
                <p className="mt-4 text-[17px] text-slate-400 font-sans leading-relaxed">
                  Eight critical dimensions, weighted by strategic importance, validated against industry benchmarks &mdash; one composite score.
                </p>
              </div>
            </FadeUp>

            {/* ── Split layout: Radar left + Pillar list right ── */}
            <div className="mt-14 lg:mt-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

              {/* LEFT — Living Constellation Radar */}
              <FadeUp delay={0.1}>
                <div className="relative mx-auto w-full max-w-md aspect-square">
                  <div className="absolute inset-[8%] rounded-full opacity-[0.12]" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 72%)' }} />

                  <svg viewBox="0 0 220 220" className="w-full h-full" aria-label="8-pillar radar visualization">
                    <defs>
                      {/* Calm radial fill — softer center glow */}
                      <radialGradient id="methodRadarFill" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(37,99,235,0.14)" />
                        <stop offset="70%" stopColor="rgba(15,23,42,0.06)" />
                        <stop offset="100%" stopColor="rgba(15,23,42,0.02)" />
                      </radialGradient>
                      <linearGradient id="methodStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1d4ed8" />
                        <stop offset="100%" stopColor="#0369a1" />
                      </linearGradient>
                    </defs>

                    {/* Watch-face grid rings — solid, faint, elegant */}
                    {[20, 40, 60, 80].map((r, idx) => (
                      <circle key={r} cx="110" cy="110" r={r} fill="none"
                        stroke={idx === 3 ? 'rgba(37,99,235,0.10)' : 'rgba(48,57,74,0.14)'}
                        strokeWidth={idx === 3 ? 0.6 : 0.4}
                      />
                    ))}

                    {/* Axis lines — minimal, refined */}
                    {PILLARS.map((_, i) => {
                      const angle = (Math.PI * 2 * i) / 8 - Math.PI / 2
                      return (
                        <line key={i} x1="110" y1="110"
                          x2={110 + 80 * Math.cos(angle)} y2={110 + 80 * Math.sin(angle)}
                          stroke="rgba(48,57,74,0.12)" strokeWidth="0.4" />
                      )
                    })}

                    {/* Data polygon — gentle fade-in, no aggressive scale */}
                    <motion.polygon
                      points={SAMPLE_SCORES.map((p, i) => {
                        const angle = (Math.PI * 2 * i) / 8 - Math.PI / 2
                        const r = (p.score / 100) * 80
                        return `${110 + r * Math.cos(angle)},${110 + r * Math.sin(angle)}`
                      }).join(' ')}
                      fill="url(#methodRadarFill)"
                      stroke="url(#methodStrokeGrad)"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1.8, delay: 0.3, ease: 'easeOut' }}
                    />

                    {SAMPLE_SCORES.map((p, i) => {
                      const angle = (Math.PI * 2 * i) / 8 - Math.PI / 2
                      const r = (p.score / 100) * 80
                      const cx = 110 + r * Math.cos(angle)
                      const cy = 110 + r * Math.sin(angle)
                      return (
                        <motion.circle
                          key={i}
                          cx={cx} cy={cy}
                          r="2.5" fill={p.color}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.35, delay: 0.45 + i * 0.05, ease: 'easeOut' }}
                        />
                      )
                    })}

                    {/* Pillar labels — static, clean typography */}
                    {PILLARS.map((pillar, i) => {
                      const angle = (Math.PI * 2 * i) / 8 - Math.PI / 2
                      const labelR = 98
                      const cx = 110 + labelR * Math.cos(angle)
                      const cy = 110 + labelR * Math.sin(angle)
                      return (
                        <g key={i}>
                          <text
                            x={cx} y={cy - 3}
                            textAnchor="middle" dominantBaseline="middle"
                            fill="#8b949e" fontSize="7" fontFamily="var(--font-jetbrains)" fontWeight="500"
                          >
                            {pillar.shortName}
                          </text>
                          <text
                            x={cx} y={cy + 7}
                            textAnchor="middle" dominantBaseline="middle"
                            fill={SAMPLE_SCORES[i].color} fontSize="8" fontFamily="var(--font-jetbrains)" fontWeight="700"
                          >
                            {SAMPLE_SCORES[i].score}
                          </text>
                        </g>
                      )
                    })}

                  </svg>

                  {/* Center score overlay — fade in once, calm */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <motion.span
                        className="block text-4xl font-heading font-semibold tracking-tight text-slate-100"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 1 }}
                      >
                        63.8
                      </motion.span>
                      <motion.span
                        className="block text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase mt-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 1.3 }}
                      >
                        E-ARI Score
                      </motion.span>
                    </div>
                  </div>
                </div>
              </FadeUp>

              {/* RIGHT — Vertical pillar list */}
              <div className="space-y-0">
                {PILLARS.map((pillar, i) => {
                  const Icon = ICON_MAP[pillar.icon] || Target
                  const weightPct = Math.round(pillar.weight * 100)
                  return (
                    <FadeUp key={pillar.id} delay={i * 0.02}>
                      <motion.div
                        className="group relative py-4 border-b border-white/[0.04] last:border-b-0 cursor-default"
                        initial={false}
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* Restraint pass: single muted icon, single accent
                            for the score bar, single white type for the
                            number. Color is no longer used to differentiate
                            pillars (was rainbow); it is reserved for the
                            score-bar fill so the eye scans relative
                            performance, not which pillar is "blue" vs "pink". */}
                        <div className="flex items-center gap-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md flex-shrink-0 border border-white/[0.06] bg-white/[0.03]">
                            <Icon className="h-4 w-4 text-muted-foreground/70 group-hover:text-eari-blue-light transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="font-heading text-sm font-semibold text-foreground group-hover:text-white transition-colors">
                                {pillar.name}
                              </span>
                              <span className="font-mono text-[10px] text-muted-foreground/60 flex-shrink-0">
                                {weightPct}% weight
                              </span>
                            </div>
                            <div className="mt-1.5 h-1 rounded-full bg-white/[0.04] overflow-hidden">
                              <motion.div
                                className="h-full rounded-full bg-eari-blue/80"
                                initial={{ width: 0 }}
                                animate={{ width: `${SAMPLE_SCORES[i].score}%` }}
                                transition={{ duration: 0.65, delay: 0.35 + i * 0.04, ease: 'easeOut' }}
                              />
                            </div>
                          </div>
                          <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                            {SAMPLE_SCORES[i].score}
                          </span>
                        </div>
                      </motion.div>
                    </FadeUp>
                  )
                })}
              </div>
            </div>

            <FadeUp delay={0.15}>
              <p className="mt-12 text-center text-xs text-muted-foreground/50 font-mono tracking-wide">
                Scoring is deterministic and versioned (v5.3) — reproducible, no hidden variables.
              </p>
            </FadeUp>
          </div>
        </ParallaxSection>

        {/* ─── 2B. CAPABILITY STRIP (no card chrome — matches calm landing rhythm) ─── */}
        <div className="section-gradient-separator" aria-hidden="true">
          <div className="h-px bg-gradient-to-r from-transparent via-eari-blue/20 to-transparent" />
        </div>
        <section className="border-y border-white/[0.05] bg-navy-900/80 py-10 sm:py-11" aria-labelledby="capabilities-strip-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="mb-8 flex flex-col gap-2 text-center lg:mb-9 lg:text-left">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-eari-blue-light/85">
                  Platform capabilities
                </span>
                <h2 id="capabilities-strip-heading" className="font-heading text-lg font-semibold tracking-tight text-slate-100 sm:text-xl">
                  Governance-grade signals, without the clutter
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-9 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-0">
                {[
                  {
                    icon: Award,
                    title: 'Certification tiers',
                    desc: 'Bronze through Platinum readiness badging tied to your composite score.',
                  },
                  {
                    icon: Landmark,
                    title: 'Regulatory mapping',
                    desc: 'Structured gap views across EU AI Act, NIST AI RMF, and ISO/IEC 42001.',
                  },
                  {
                    icon: Activity,
                    title: 'Ongoing monitoring',
                    desc: 'Pulse checks and drift-oriented alerts when posture shifts.',
                  },
                  {
                    icon: BarChart3,
                    title: 'Sector benchmarks',
                    desc: 'Percentile-style comparisons where benchmark data is available.',
                  },
                ].map((feat, i) => {
                  const Icon = feat.icon
                  return (
                    <motion.div
                      key={feat.title}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: i * 0.05 }}
                      className={`relative flex gap-4 lg:flex-col lg:gap-3 ${i > 0 ? 'lg:border-l lg:border-white/[0.06] lg:pl-8' : ''}`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.02]">
                        <Icon className="h-[18px] w-[18px] text-slate-400" strokeWidth={1.75} aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1 lg:flex-none">
                        <h3 className="font-heading text-[15px] font-semibold tracking-tight text-slate-100">{feat.title}</h3>
                        <p className="mt-1.5 font-sans text-[13px] leading-relaxed text-muted-foreground/88">{feat.desc}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ─── 2C. COMPLIANCE SPOTLIGHT ───────────────────────────────────── */}
        <div className="section-gradient-separator" aria-hidden="true">
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        </div>
        <section className="py-16 sm:py-20 bg-navy-900 relative overflow-hidden" aria-labelledby="compliance-spotlight-heading">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div
              className="absolute top-1/2 right-0 translate-y-[-50%] w-[380px] h-[380px] rounded-full opacity-[0.05]"
              style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.35) 0%, transparent 68%)' }}
            />
          </div>
          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-emerald-500/[0.18] bg-[#0e131c] p-8 sm:p-10 lg:p-12 flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.7)]">
              <div className="flex-1">
                <Badge variant="outline" className="font-mono text-xs border-emerald-500/35 text-emerald-300 bg-emerald-500/5 mb-4">
                  Compliance &amp; evidence
                </Badge>
                <h2 id="compliance-spotlight-heading" className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">
                  From assessment to{' '}
                  <span className="text-eari-blue-light font-medium">audit-ready artifacts</span>
                </h2>
                <p className="mt-4 text-muted-foreground font-sans leading-relaxed max-w-xl">
                  Collect AI Act evidence, maintain FRIA and technical files, bundle regulator-facing submission packs, and rely on immutable admin logs—so governance teams ship filings without chasing screenshots.
                </p>
                <ul className="mt-6 grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground font-sans">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden />
                    AI Act evidence trails
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden />
                    FRIA &amp; technical documentation
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden />
                    Submission-ready packs
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden />
                    Admin audit logs
                  </li>
                </ul>
                <div className="mt-8">
                  <Link href="/portal/use-cases">
                    <Button size="lg" className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading font-semibold">
                      Explore compliance workspace
                      <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex-shrink-0 w-full lg:w-auto lg:max-w-sm">
                <div className="rounded-xl border border-white/[0.06] bg-navy-900/60 p-6 font-mono text-xs text-muted-foreground/80 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400/90">
                    <FileCheck className="h-4 w-4" aria-hidden />
                    <span>Evidence vault · versioned</span>
                  </div>
                  <div className="h-px bg-border/30" />
                  <p className="leading-relaxed">
                    Technical file and FRIA drafts tied to systems; export packs for submissions; activity preserved in admin logs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 2D. PRODUCT MODULES CAROUSEL (Pulse, Literacy, Discovery, Assistant) ─── */}
        <ProductSpotlightCarousel />

        <div className="section-gradient-separator" aria-hidden="true">
          <div className="h-px bg-gradient-to-r from-transparent via-eari-blue/20 to-transparent" />
        </div>

        {/* ─── 3. SCORING PIPELINE SECTION ──────────────────────────────── */}
        <ParallaxSection speed={0.04} className="py-20 sm:py-28 bg-navy-800/50" id="how-scoring-works">
          <HowScoringWorks />
        </ParallaxSection>

        {/* ─── 3B. AGENTIC PROPERTIES SECTION ─────────────────────────────── */}
        <ParallaxSection speed={0.04} className="py-20 sm:py-28 bg-navy-900 relative overflow-hidden" id="agentic">
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.035]"
            aria-hidden="true"
            style={{
              backgroundImage:
                'linear-gradient(rgba(148,163,184,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.35) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
            }}
          />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Section header */}
            <FadeUp>
              <div className="text-center max-w-2xl mx-auto">
                <div className="mb-5 flex items-center justify-center gap-3">
                  <span aria-hidden className="h-px w-8 bg-eari-blue/60" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-eari-blue-light/90">
                    Agentic architecture
                  </span>
                  <span aria-hidden className="h-px w-8 bg-eari-blue/60" />
                </div>
                <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-slate-50">
                  The Innovation: Agentic AI Assessment
                </h2>
                <p className="mt-4 text-[17px] text-slate-400 font-sans leading-relaxed">
                  Six specialised AI agents work in a coordinated pipeline &mdash; each feeding context to the next, compounding insight depth at every stage. Not a chatbot. An AI workforce for readiness.
                </p>
              </div>
            </FadeUp>

            {/* ── Orbital diagram left + Agent spotlight right ── */}
            <div className="mt-14 lg:mt-20 grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14 items-center">

              {/* LEFT — Orbital hub: hexagonal spokes from shared geometry + pipeline order */}
              <FadeUp delay={0.08} className="lg:col-span-3">
                <div className="relative flex flex-col items-center justify-center py-6 sm:py-8">
                  <p id="orbit-diagram-desc" className="sr-only">
                    Six agents arranged clockwise from the top following the orchestration pipeline: Assess with Scoring Agent,
                    then Discover, Analyze, Educate, Report, and Guide with Assistant Agent. Lines connect each agent to the central orchestrator hub.
                  </p>
                  <div
                    className="relative mx-auto aspect-square w-full max-w-[min(380px,92vw)]"
                    role="img"
                    aria-labelledby="orbit-diagram-desc"
                  >
                    {/* Geometry layer — circles + spokes share ORBIT_CX, ORBIT_CY, ORBIT_R */}
                    <svg
                      className="absolute inset-0 z-0 h-full w-full text-white/[0.06]"
                      viewBox={`0 0 ${ORBIT_VB} ${ORBIT_VB}`}
                      preserveAspectRatio="xMidYMid meet"
                      aria-hidden
                    >
                      <circle cx={ORBIT_CX} cy={ORBIT_CY} r={ORBIT_R} fill="none" stroke="currentColor" strokeWidth="0.75" />
                      <circle cx={ORBIT_CX} cy={ORBIT_CY} r={52} fill="none" stroke="currentColor" strokeWidth="0.5" opacity={0.65} />
                      {AGENTS_ORBIT_ORDERED.map((agent, i) => {
                        const angle = orbitAngleRad(i, AGENTS_ORBIT_ORDERED.length)
                        const x2 = ORBIT_CX + ORBIT_R * Math.cos(angle)
                        const y2 = ORBIT_CY + ORBIT_R * Math.sin(angle)
                        return (
                          <motion.line
                            key={`spoke-${agent.id}`}
                            x1={ORBIT_CX}
                            y1={ORBIT_CY}
                            x2={x2}
                            y2={y2}
                            stroke={agent.color}
                            strokeWidth="0.65"
                            strokeOpacity={0.14}
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.28 + i * 0.045, duration: 0.42, ease: 'easeOut' }}
                          />
                        )
                      })}
                    </svg>

                    {/* Hub */}
                    <div className="absolute inset-0 z-[1] flex items-center justify-center pointer-events-none">
                      <motion.div
                        className="flex flex-col items-center gap-1.5 sm:gap-2"
                        initial={{ opacity: 0, scale: 0.96 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
                      >
                        <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-navy-800/95 border border-white/[0.1] shadow-md shadow-black/40">
                          <Workflow className="h-6 w-6 sm:h-7 sm:w-7 text-eari-blue-light" />
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-mono text-muted-foreground/55 uppercase tracking-widest text-center px-1">
                          Orchestrator
                        </span>
                      </motion.div>
                    </div>

                    {/* Agent nodes — percentage position = same math as spokes */}
                    {AGENTS_ORBIT_ORDERED.map((agent, i) => {
                      const Icon = agent.icon
                      const angle = orbitAngleRad(i, AGENTS_ORBIT_ORDERED.length)
                      const { leftPct, topPct } = orbitPositionPct(angle)
                      const shortLabel = agent.name.replace(/\s+Agent$/, '')
                      return (
                        <motion.div
                          key={agent.id}
                          className="absolute z-[2] -translate-x-1/2 -translate-y-1/2"
                          style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                          initial={{ opacity: 0, scale: 0.94 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.14 + i * 0.05, duration: 0.42, ease: 'easeOut' }}
                        >
                          <div className="relative flex flex-col items-center gap-1 group">
                            <motion.div
                              className="relative cursor-default"
                              whileHover={{ scale: 1.04 }}
                              transition={{ duration: 0.18 }}
                            >
                              <div
                                className="relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl border border-white/[0.1] shadow-sm shadow-black/40"
                                style={{ backgroundColor: `${agent.color}18` }}
                              >
                                <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" style={{ color: agent.color }} />
                              </div>
                              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-navy-900" />
                            </motion.div>
                            {/* Phones / tablets: label always visible (no hover orbit) */}
                            <span className="max-w-[5.25rem] text-center font-mono text-[8px] sm:text-[9px] leading-snug text-muted-foreground/90 lg:hidden pointer-events-none">
                              {shortLabel}
                            </span>
                            {/* Large screens: full name on hover */}
                            <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden -translate-x-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 lg:block">
                              <span className="whitespace-nowrap rounded border border-white/[0.06] bg-navy-900/95 px-2 py-0.5 font-mono text-[10px] text-muted-foreground/90 shadow-lg">
                                {agent.name}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>

                  <p className="mt-4 max-w-sm text-center font-sans text-[11px] leading-relaxed text-muted-foreground/80 sm:text-xs lg:mt-5">
                    <span className="font-mono text-eari-blue-light/90">Clockwise from top</span> matches the pipeline:{' '}
                    {ORCHESTRATION_FLOW.map((s) => s.label).join(' → ')}.
                  </p>

                  {/* Pipeline flow — compact horizontal below orbital */}
                  <div className="mt-10 flex items-center justify-center gap-0 flex-wrap">
                    {ORCHESTRATION_FLOW.map((step, i) => (
                      <div key={step.label} className="flex items-center">
                        <motion.div
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-navy-800/50 border border-white/[0.04]"
                          initial={{ opacity: 0, scale: 0.9 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.2 + i * 0.05, duration: 0.35, ease: 'easeOut' }}
                        >
                          <span className="text-[9px] font-mono font-bold text-eari-blue-light">{String(i + 1).padStart(2, '0')}</span>
                          <span className="text-[11px] font-heading font-semibold text-foreground">{step.label}</span>
                        </motion.div>
                        {i < ORCHESTRATION_FLOW.length - 1 && (
                          <ArrowRight className="h-3 w-3 text-muted-foreground/20 mx-1 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </FadeUp>

              {/* RIGHT — Featured agent spotlight (same order as orbit / pipeline) */}
              <div className="lg:col-span-2 space-y-0">
                {AGENTS_ORBIT_ORDERED.map((agent, i) => {
                  const Icon = agent.icon
                  const isFeatured = i === 0 || i === 1
                  return (
                    <FadeUp key={agent.id} delay={i * 0.03}>
                      <motion.div
                        className="group relative cursor-default"
                        whileHover={{ x: 3 }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* Featured agent — expanded card */}
                        {isFeatured ? (
                          <div className="rounded-xl border border-white/[0.06] bg-navy-800/40 p-5 mb-3">
                            <div className="flex items-center gap-3 mb-3">
                              <div
                                className="flex h-10 w-10 items-center justify-center rounded-lg"
                                style={{ backgroundColor: `${agent.color}15` }}
                              >
                                <Icon className="h-5 w-5" style={{ color: agent.color }} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-heading text-sm font-semibold text-foreground">{agent.name}</span>
                                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-navy-900" />
                                </div>
                                <span className="text-[10px] font-mono text-muted-foreground/50">{agent.tagline}</span>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground/70 leading-relaxed mb-3">{agent.description}</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {agent.capability.split(' · ').map(cap => (
                                <span
                                  key={cap}
                                  className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] text-muted-foreground/60"
                                >
                                  {cap}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          /* Compact agent rows */
                          <div className="flex items-center gap-3 py-3 border-b border-white/[0.04] last:border-b-0">
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0"
                              style={{ backgroundColor: `${agent.color}10` }}
                            >
                              <Icon className="h-3.5 w-3.5" style={{ color: agent.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-heading text-xs font-semibold text-foreground group-hover:text-white transition-colors">{agent.name}</span>
                                <span className="text-[9px] font-mono text-muted-foreground/30 hidden sm:inline">{agent.tagline}</span>
                              </div>
                            </div>
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-navy-900 flex-shrink-0" />
                          </div>
                        )}
                      </motion.div>
                    </FadeUp>
                  )
                })}
              </div>
            </div>
          </div>
        </ParallaxSection>

        {/* ─── 4. AI INSIGHTS SECTION ───────────────────────────────────── */}
        <ParallaxSection speed={0.04} className="py-20 sm:py-28 bg-navy-800/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center max-w-3xl mx-auto">
                <div className="mb-5 flex items-center justify-center gap-3">
                  <span aria-hidden className="h-px w-8 bg-eari-blue/60" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-eari-blue-light/90">
                    AI-powered insights
                  </span>
                  <span aria-hidden className="h-px w-8 bg-eari-blue/60" />
                </div>
                <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-slate-50">
                  Strategic Insights Powered by AI
                </h2>
                <p className="mt-4 text-[17px] text-slate-400 font-sans leading-relaxed">
                  AI generates narrative context for your scores. It does not alter, inflate, or modify the calculated results &mdash; ever.
                </p>
              </div>
            </FadeUp>

            <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Sample insight card with streaming text */}
              <FadeUp>
                <div className="rounded-xl border border-white/[0.06] bg-[#0e131c] p-7 h-full shadow-[0_20px_50px_-25px_rgba(0,0,0,0.6)]">
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      Sample insight
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 font-mono text-[10px] text-slate-400 tracking-[0.12em] uppercase">
                      Generated
                    </span>
                  </div>
                  <div className="border-l-2 border-eari-blue/45 pl-5">
                    <p className="text-slate-100 font-sans leading-[1.65] text-[15px]">
                      Your organization demonstrates strong governance foundations
                      <span className="font-mono tabular-nums text-eari-blue-light"> (78/100)</span> but faces a critical talent gap
                      <span className="font-mono tabular-nums text-amber-300/90"> (44/100)</span> that could constrain AI execution capacity. The gap between governance maturity and talent readiness suggests that while policies and frameworks are in place, the human capital to operationalize them is insufficient.
                    </p>
                    <p className="mt-4 text-slate-100 font-sans leading-[1.65] text-[15px]">
                      <span className="font-heading font-semibold text-slate-50">Recommended priority &mdash;</span>{' '}
                      Invest in upskilling programs and AI career frameworks before scaling AI deployments. Without adequate talent, governance structures risk becoming aspirational rather than operational.
                    </p>
                  </div>
                  <p className="mt-5 pt-4 border-t border-white/[0.05] text-[11px] font-mono text-slate-500 tracking-[0.04em]">
                    Generated by AI &middot; grounded in your scores &middot; never alters calculated results
                  </p>
                </div>
              </FadeUp>

              {/* Key points with floating icons */}
              <FadeUp delay={0.1}>
                <div className="space-y-5">
                  {[
                    {
                      icon: Eye,
                      title: 'Grounded in Your Scores',
                      desc: 'AI narratives are derived from your actual assessment data — no hallucinated metrics or invented benchmarks.',
                      color: '#3b82f6',
                    },
                    {
                      icon: LockKeyhole,
                      title: 'Privacy-First Architecture',
                      desc: 'Your assessment data is processed securely and never used for model training. Enterprise-grade data isolation.',
                      color: '#10b981',
                    },
                    {
                      icon: FileCheck,
                      title: 'Fallback Templates',
                      desc: 'If AI is unavailable, template-based insights are generated deterministically from your scores. You always get value.',
                      color: '#f59e0b',
                    },
                    {
                      icon: Zap,
                      title: 'Clearly Labeled',
                      desc: 'Every AI-generated insight is explicitly marked. No ambiguity about what comes from algorithms versus AI narrative.',
                      color: '#06b6d4',
                    },
                  ].map((point, i) => {
                    const Icon = point.icon
                    return (
                      <motion.div
                        key={point.title}
                        initial={{ opacity: 0, x: 12 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.42, delay: i * 0.05, ease: 'easeOut' }}
                        className="flex gap-4 items-start group"
                      >
                        <motion.div
                          className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 mt-0.5 border border-white/[0.06]"
                          style={{ backgroundColor: `${point.color}14` }}
                          whileHover={{ scale: 1.03 }}
                          transition={{ duration: 0.18 }}
                        >
                          <Icon className="h-5 w-5" style={{ color: point.color }} />
                        </motion.div>
                        <div>
                          <h4 className="font-heading font-semibold text-foreground">{point.title}</h4>
                          <p className="mt-1 text-sm text-muted-foreground font-sans leading-relaxed">{point.desc}</p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </FadeUp>
            </div>
          </div>
        </ParallaxSection>

        {/* ─── 4B. CLIENTS SECTION ─────────────────────────────────────────── */}
        <section className="py-14 sm:py-16 bg-navy-900 border-t border-b border-border/20" aria-labelledby="social-proof-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center max-w-2xl mx-auto mb-10">
                <h2 id="social-proof-heading" className="font-heading text-lg sm:text-xl font-semibold tracking-tight text-slate-100">
                  Built for serious AI programs
                </h2>
                <p className="mt-2 text-sm text-muted-foreground font-sans leading-relaxed">
                  Teams that need auditability and repeatable methodology — not slide-deck guesses.
                </p>
              </div>
            </FadeUp>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {ORG_ARCHETYPES.map((label, i) => (
                <motion.span
                  key={label}
                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs sm:text-sm font-medium text-slate-300 font-sans tracking-tight hover:border-eari-blue/25 hover:bg-eari-blue/[0.06] transition-colors duration-300"
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04, duration: 0.38, ease: 'easeOut' }}
                >
                  {label}
                </motion.span>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 4E. COMPETITIVE COMPARISON SECTION ──────────────────────────── */}
        <div className="section-gradient-separator" aria-hidden="true">
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        </div>
        <section className="py-20 sm:py-28 bg-navy-900 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[560px] h-[380px] rounded-full opacity-[0.045]" style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 72%)' }} />
          </div>

          <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center mb-14">
                <Badge variant="outline" className="font-mono text-xs border-[#d4a853]/30 text-[#d4a853] bg-[#d4a853]/5 mb-4">
                  Competitive Edge
                </Badge>
                <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-[#d4b878]">
                  E-ARI vs. Traditional Tools
                </h2>
                <p className="mt-4 text-lg text-muted-foreground font-sans max-w-2xl mx-auto">
                  Five dimensions where agentic intelligence replaces static workflows — and the gap widens with every release.
                </p>
              </div>
            </FadeUp>

            <div className="space-y-4">
              {[
                {
                  icon: Bot,
                  label: 'AI Agents',
                  traditional: 'Static questionnaires with fixed logic',
                  eari: '6 specialized agents that reason, adapt & collaborate',
                },
                {
                  icon: Award,
                  label: 'Certification',
                  traditional: 'No formal readiness certification',
                  eari: 'Bronze through Platinum tier badging system',
                },
                {
                  icon: Scale,
                  label: 'Compliance',
                  traditional: 'Manual research across regulatory frameworks',
                  eari: 'Auto-mapped to EU AI Act, NIST RMF & ISO 42001',
                },
                {
                  icon: Radar,
                  label: 'Monitoring',
                  traditional: 'One-time point-in-time snapshots',
                  eari: 'Continuous drift detection with real-time alerts',
                },
                {
                  icon: BarChart3,
                  label: 'Benchmarking',
                  traditional: 'Self-reported, unverifiable claims',
                  eari: 'Real sector data with percentile rankings',
                },
              ].map((row, i) => (
                <FadeUp key={row.label} delay={0.03 * i}>
                  <div className="group rounded-xl border border-white/[0.07] bg-[#0e131c] transition-colors duration-200 hover:border-white/[0.12] hover:bg-[#10161f]">
                    <div className="flex flex-col sm:flex-row items-stretch">
                      {/* Feature label column */}
                      <div className="flex items-center gap-3 sm:w-44 shrink-0 px-5 py-4 sm:py-0 bg-navy-950/40 rounded-t-xl sm:rounded-t-none sm:rounded-l-xl border-b sm:border-b-0 sm:border-r border-white/[0.06]">
                        <row.icon className="h-5 w-5 text-slate-400 shrink-0" aria-hidden />
                        <span className="font-heading font-semibold text-foreground text-sm">{row.label}</span>
                      </div>

                      {/* Traditional column */}
                      <div className="flex-1 flex items-center gap-3 px-5 py-4 border-b sm:border-b-0 sm:border-r border-border/10">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500/10 shrink-0">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M3 3L9 9M9 3L3 9" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                        </div>
                        <span className="text-sm text-muted-foreground/60 font-sans">{row.traditional}</span>
                      </div>

                      {/* E-ARI column */}
                      <div className="flex-1 flex items-center gap-3 px-5 py-4 bg-white/[0.02] rounded-b-xl sm:rounded-b-none sm:rounded-r-xl group-hover:bg-white/[0.035] transition-colors duration-200">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-eari-blue/15 shrink-0">
                          <AnimatedCheck className="shrink-0" delay={0.1 + i * 0.08} />
                        </div>
                        <span className="text-sm text-slate-200 font-medium font-sans">{row.eari}</span>
                      </div>
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>

            {/* Column headers legend */}
            <FadeUp delay={0.18}>
              <div className="flex justify-center gap-8 mt-8">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/10">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M3 3L9 9M9 3L3 9" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="text-xs text-muted-foreground/60 font-sans">Traditional</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-eari-blue/15">
                    <Check className="h-3 w-3 text-eari-blue-light" />
                  </div>
                  <span className="text-xs text-slate-300 font-sans">E-ARI</span>
                </div>
              </div>
            </FadeUp>
          </div>
        </section>

        <div className="section-gradient-separator" aria-hidden="true">
          <div className="h-px bg-gradient-to-r from-transparent via-eari-blue/20 to-transparent" />
        </div>

        {/* ─── 5. PRICING SECTION ───────────────────────────────────────── */}
        <ParallaxSection speed={0.03} className="py-20 sm:py-28 bg-navy-900 relative overflow-hidden" id="pricing">
          {/* Subtle grid background */}
          <div className="absolute inset-0 pricing-grid-bg pointer-events-none" aria-hidden="true" />
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <div
              className="absolute top-[22%] left-[8%] w-[280px] h-[280px] rounded-full opacity-[0.035]"
              style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 72%)' }}
            />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center max-w-3xl mx-auto">
                <div className="mb-5 flex items-center justify-center gap-3">
                  <span aria-hidden className="h-px w-8 bg-eari-blue/60" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-eari-blue-light/90">
                    Pricing
                  </span>
                  <span aria-hidden className="h-px w-8 bg-eari-blue/60" />
                </div>
                <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-slate-50">
                  Simple, Transparent Pricing
                </h2>
                <p className="mt-4 text-[17px] text-slate-400 font-sans leading-relaxed">
                  From individual assessments to enterprise-wide deployment. No hidden fees.
                </p>
                <button
                  onClick={() => setIsAnnual(v => !v)}
                  className="mt-6 inline-flex items-center gap-3 rounded-full bg-navy-800 border border-border/50 px-4 py-2 cursor-pointer hover:border-border transition-colors"
                >
                  <span className={`text-sm font-sans font-medium transition-colors ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
                  <div className={`w-8 h-[18px] rounded-full relative transition-colors duration-200 ${isAnnual ? 'bg-eari-blue' : 'bg-muted-foreground/30'}`}>
                    <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all duration-200 ${isAnnual ? 'right-[2px]' : 'left-[2px]'}`} />
                  </div>
                  <span className={`text-sm font-sans transition-colors ${isAnnual ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    Annual <span className="text-emerald-400 text-xs font-sans">Save 20%</span>
                  </span>
                </button>
              </div>
            </FadeUp>

            <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
              {pricingTiers.map((tier, i) => {
                const TierIcon = tier.icon
                const isPro = tier.highlighted
                const isEnterprise = tier.name === 'Enterprise'
                return (
                  <FadeUp key={tier.name} delay={i * 0.05}>
                    <motion.div
                      whileHover={isPro ? { y: -3 } : { y: -2 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="h-full"
                    >
                      <Card
                        className={`h-full relative overflow-hidden transition-colors duration-200 ${
                          isPro
                            ? 'bg-navy-800/95 border-eari-blue/35 shadow-lg shadow-black/35 ring-1 ring-white/[0.04]'
                            : isEnterprise
                            ? 'bg-navy-800/85 border-[#d4a853]/25 shadow-md shadow-black/30'
                            : 'bg-navy-800/75 border-white/[0.08] shadow-md shadow-black/25'
                        }`}
                      >
                        {isPro && (
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                            <Badge className="bg-eari-blue text-white font-heading text-[10px] uppercase tracking-wide px-3 py-1 border border-white/10 shadow-sm shadow-black/30">
                              Most popular
                            </Badge>
                          </div>
                        )}

                        <CardHeader className="pb-2 pt-6">
                          <div className="flex items-center gap-3 mb-2">
                            <div
                              className="flex h-9 w-9 items-center justify-center rounded-lg"
                              style={{ backgroundColor: `${tier.color}18` }}
                            >
                              <TierIcon className="h-5 w-5" style={{ color: tier.color }} />
                            </div>
                            <CardTitle className="font-heading text-lg text-foreground" style={{ color: isPro ? tier.color : undefined }}>
                              {tier.name}
                            </CardTitle>
                          </div>
                          <CardDescription className="font-sans text-sm">{tier.description}</CardDescription>
                        </CardHeader>

                        <CardContent>
                          <div className="mt-2 mb-6">
                            {isPro ? (
                              <span className="font-heading text-5xl font-semibold tracking-tight text-slate-100">{isAnnual ? tier.yearlyPrice : tier.price}</span>
                            ) : isEnterprise ? (
                              <span className="font-heading text-5xl font-semibold tracking-tight text-[#d4b878]">{isAnnual ? tier.yearlyPrice : tier.price}</span>
                            ) : (
                              <span className="font-heading text-5xl font-semibold tracking-tight text-foreground">{isAnnual ? tier.yearlyPrice : tier.price}</span>
                            )}
                            {(isAnnual ? tier.yearlyPeriod : tier.period) && (
                              <span className="text-muted-foreground font-sans text-sm ml-1">{isAnnual ? tier.yearlyPeriod : tier.period}</span>
                            )}
                          </div>

                          {/* Divider */}
                          <div className="h-px w-full mb-5" style={{ backgroundColor: `${tier.color}20` }} />

                          <ul className="space-y-3">
                            {tier.features.map((feature, fi) => (
                              <li key={feature.text} className="flex items-start gap-3">
                                {feature.included ? (
                                  <svg className="mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <motion.path
                                      d="M3 8L6.5 11.5L13 4.5"
                                      stroke={tier.color}
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      initial={{ pathLength: 0 }}
                                      whileInView={{ pathLength: 1 }}
                                      viewport={{ once: true }}
                                      transition={{ duration: 0.4, delay: 0.5 + fi * 0.06, ease: 'easeOut' }}
                                    />
                                  </svg>
                                ) : (
                                  <svg className="mt-0.5 flex-shrink-0 opacity-30" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <line x1="4" y1="4" x2="12" y2="12" stroke="#8b949e" strokeWidth="1.5" strokeLinecap="round" />
                                    <line x1="12" y1="4" x2="4" y2="12" stroke="#8b949e" strokeWidth="1.5" strokeLinecap="round" />
                                  </svg>
                                )}
                                <span className={`text-sm font-sans ${feature.included ? 'text-muted-foreground' : 'text-muted-foreground/40 line-through'}`}>
                                  {feature.text}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>

                        <CardFooter className="pt-2">
                          <Link href={isAnnual ? (tier.yearlyHref || tier.href) : tier.href} className="w-full">
                            <Button
                              className={`w-full font-heading font-semibold h-11 ${
                                isPro
                                  ? 'bg-eari-blue hover:bg-eari-blue-dark text-white border border-white/[0.08]'
                                  : isEnterprise
                                  ? 'bg-[#b8923f]/90 hover:bg-[#c9a44d] text-navy-950 border border-[#d4a853]/40'
                                  : 'bg-transparent border border-white/[0.12] text-foreground hover:bg-navy-700/90 hover:border-white/[0.16]'
                              }`}
                            >
                              {tier.cta}
                              {isPro && <ArrowRight className="ml-2 h-4 w-4" />}
                            </Button>
                          </Link>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  </FadeUp>
                )
              })}
            </div>

          </div>
        </ParallaxSection>

        {/* ─── FAQ ───────────────────────────────────────────────── */}
        <ParallaxSection speed={0.03} className="py-20 sm:py-28 bg-navy-800/35 border-t border-border/25 scroll-mt-24" id="faq">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center mb-10">
                <div className="mb-5 flex items-center justify-center gap-3">
                  <span aria-hidden className="h-px w-8 bg-eari-blue/60" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-eari-blue-light/90">
                    FAQ
                  </span>
                  <span aria-hidden className="h-px w-8 bg-eari-blue/60" />
                </div>
                <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-slate-50">
                  Questions, answered
                </h2>
                <p className="mt-3 text-muted-foreground font-sans text-[15px] leading-relaxed">
                  Straight answers on scoring, agents, and compliance — before you sign up.
                </p>
              </div>
            </FadeUp>
            <FadeUp delay={0.06}>
              <Card className="bg-[#0e131c]/90 border-white/[0.08] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)] overflow-hidden">
                <CardContent className="p-0">
                  <Accordion type="single" collapsible className="px-4 sm:px-6">
                    {LANDING_FAQ.map((item, index) => (
                      <AccordionItem key={item.q} value={`landing-faq-${index}`} className="border-white/[0.06]">
                        <AccordionTrigger className="py-5 font-heading font-semibold text-foreground text-left hover:no-underline hover:bg-white/[0.02] rounded-md px-2 -mx-2 transition-colors min-h-[48px] text-[15px] sm:text-base">
                          <span className="flex items-start gap-3 text-left">
                            <HelpCircle className="h-5 w-5 text-eari-blue-light shrink-0 mt-0.5" aria-hidden />
                            {item.q}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground font-sans leading-relaxed text-[15px] pl-9 pr-2 pb-5">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  <div className="border-t border-white/[0.06] px-6 py-4 bg-navy-900/40">
                    <p className="text-center text-sm text-muted-foreground font-sans">
                      Pricing and billing questions?{' '}
                      <Link href="/pricing#faq" className="text-eari-blue-light hover:text-eari-blue-light/90 font-medium underline-offset-4 hover:underline">
                        See the pricing FAQ
                      </Link>
                      .
                    </p>
                  </div>
                </CardContent>
              </Card>
            </FadeUp>
          </div>
        </ParallaxSection>

        {/* ─── CTA Banner ───────────────────────────────────────────────── */}
        <ParallaxSection speed={0.03} className="py-20 sm:py-28 bg-navy-900" id="cta">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <FadeUp>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
                Ready to Measure Your AI Readiness?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground font-sans max-w-2xl mx-auto">
                Start with a free assessment. Get your E-ARI score across 8 pillars in under 20 minutes. No credit card required.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/register">
                  <Button
                    size="lg"
                    className="group bg-eari-blue hover:bg-eari-blue-dark text-white font-heading font-semibold h-12 px-8 text-base w-full sm:w-auto shadow-md shadow-black/25 border border-white/[0.06] transition-colors duration-200"
                  >
                    <span className="flex items-center">
                      Start Free Assessment
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                  </Button>
                </Link>
                <Link href="#methodology">
                  <Button variant="outline" size="lg" className="border-border hover:bg-navy-700 text-foreground font-heading font-semibold h-12 px-8 text-base w-full sm:w-auto">
                    Learn More
                  </Button>
                </Link>
              </div>
            </FadeUp>
          </div>
        </ParallaxSection>
      </main>

      <Footer />

      {/* AI Agent Assistant Panel — only for authenticated visitors.
          The unauthenticated landing has no assessment context for an
          assistant to anchor against, so the floating launcher reads as
          decorative chrome rather than a real surface. */}
      {isAuthenticated && (
        <AgentPanel
          sector="technology"
          pillarScores={SAMPLE_SCORES.map((s, i) => {
            const pillar = PILLARS[i];
            return {
              pillarId: pillar.id,
              score: s.score,
              maturityLabel: s.score <= 25 ? 'Laggard' : s.score <= 50 ? 'Follower' : s.score <= 75 ? 'Chaser' : 'Pacesetter',
            };
          })}
          overallScore={67}
          orgContext="A technology company with growing AI initiatives and established data practices, focusing on digital transformation across business units."
        />
      )}

      {/* Back to top button */}
      <BackToTop />
    </div>
  )
}
