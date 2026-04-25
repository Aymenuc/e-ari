'use client'

import Link from 'next/link'
import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { motion, useInView, useTransform, useScroll, AnimatePresence } from 'framer-motion'
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
  FileText,
  Zap,
  Brain,
  Eye,
  LockKeyhole,
  FileCheck,
  ArrowDownRight,
  Sparkles,
  ClipboardList,
  Scale,
  Weight,
  SlidersHorizontal,
  Calculator,
  Tag,
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
  TrendingDown,
  RefreshCw,
  Calendar,
  Plug,
  Webhook,
  Cloud,
  KeyRound,
  Globe,
  Code2,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Navigation } from '@/components/shared/navigation'
import { Footer } from '@/components/shared/footer'
import { AgentPanel } from '@/components/shared/agent-panel'
import { PILLARS, MATURITY_BANDS } from '@/lib/pillars'

/* ─── Animation helpers ────────────────────────────────────────────────── */

function FadeUp({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ─── Parallax wrapper for sections ─────────────────────────────────────── */

function ParallaxSection({ children, className, speed = 0.1, id }: { children: React.ReactNode; className?: string; speed?: number; id?: string }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [0, speed * -100])

  return (
    <motion.section ref={ref} style={{ y }} className={className} id={id}>
      {children}
    </motion.section>
  )
}

/* ─── Typewriter effect ─────────────────────────────────────────────────── */

function TypewriterText({ text, delay = 0, className }: { text: string; delay?: number; className?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const [displayed, setDisplayed] = useState('')
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    if (!inView) return
    let i = 0
    let intervalId: ReturnType<typeof setInterval> | null = null
    let cursorTimeoutId: ReturnType<typeof setTimeout> | null = null

    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        if (i < text.length) {
          setDisplayed(text.slice(0, i + 1))
          i++
        } else {
          if (intervalId) clearInterval(intervalId)
          cursorTimeoutId = setTimeout(() => setShowCursor(false), 1500)
        }
      }, 80)
    }, delay * 1000)

    return () => {
      clearTimeout(timeoutId)
      if (intervalId) clearInterval(intervalId)
      if (cursorTimeoutId) clearTimeout(cursorTimeoutId)
    }
  }, [inView, text, delay])

  return (
    <span ref={ref} className={className}>
      {displayed}
      {showCursor && inView && (
        <span className="typewriter-cursor" />
      )}
    </span>
  )
}

/* ─── Particle Grid Background ─────────────────────────────────────────── */

// Deterministic pseudo-random using a seed, so server and client produce the same values
function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49297
  return x - Math.floor(x)
}

function ParticleGrid() {
  // Use deterministic seeded random values so SSR and client render match exactly
  const particles = useMemo(
    () => Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: seededRandom(i * 5 + 1) * 100,
      y: seededRandom(i * 5 + 2) * 100,
      size: seededRandom(i * 5 + 3) * 3 + 1,
      duration: seededRandom(i * 5 + 4) * 8 + 6,
      delay: seededRandom(i * 5 + 5) * 4,
    })),
    []
  )

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle-dot particle-float absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

/* ─── Mouse Follow Spotlight ───────────────────────────────────────────── */

function MouseSpotlight() {
  const ref = useRef<HTMLDivElement>(null)

  const handleMove = useCallback((e: MouseEvent) => {
    if (!ref.current) return
    const el = document.getElementById('hero-section')
    if (!el) return
    const rect = el.getBoundingClientRect()
    ref.current.style.setProperty('--mouse-x', `${((e.clientX - rect.left) / rect.width) * 100}%`)
    ref.current.style.setProperty('--mouse-y', `${((e.clientY - rect.top) / rect.height) * 100}%`)
  }, [])

  useEffect(() => {
    const el = document.getElementById('hero-section')
    if (!el) return
    el.addEventListener('mousemove', handleMove)
    return () => el.removeEventListener('mousemove', handleMove)
  }, [handleMove])

  return (
    <div
      ref={ref}
      className="hero-spotlight absolute inset-0 pointer-events-none transition-all duration-300 ease-out"
      style={{ '--mouse-x': '50%', '--mouse-y': '50%' } as React.CSSProperties}
    />
  )
}

/* ─── Animated Checkmark ───────────────────────────────────────────────── */

function AnimatedCheck({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none">
      <motion.path
        d="M3 8L6.5 11.5L13 4.5"
        stroke="#3b82f6"
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

/* ─── Typing/Streaming Effect for AI Insight ───────────────────────────── */

function StreamingText({ text, delay = 0, speed = 18 }: { text: string; delay?: number; speed?: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!inView) return
    let i = 0
    let intervalId: ReturnType<typeof setInterval> | null = null

    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        if (i < text.length) {
          setDisplayed(text.slice(0, i + 1))
          i++
        } else {
          if (intervalId) clearInterval(intervalId)
          setDone(true)
        }
      }, speed)
    }, delay * 1000)

    return () => {
      clearTimeout(timeoutId)
      if (intervalId) clearInterval(intervalId)
    }
  }, [inView, text, delay, speed])

  return (
    <span ref={ref}>
      {displayed}
      {!done && inView && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
          className="text-eari-blue-light"
        >
          ▊
        </motion.span>
      )}
    </span>
  )
}

/* ─── Sparkle Badge ────────────────────────────────────────────────────── */

function SparkleBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={`relative inline-flex ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 rounded-md overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
          }}
          animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      {children}
    </motion.div>
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
          className="fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-eari-blue text-white shadow-lg shadow-eari-blue/30 hover:bg-eari-blue-dark transition-colors"
          aria-label="Back to top"
        >
          <ArrowUp className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

/* ─── ROI Calculator ─────────────────────────────────────────────────── */

function ROICalculator() {
  const [orgSize, setOrgSize] = useState(500)
  const [maturity, setMaturity] = useState(35)

  // Deterministic calculations based on industry benchmarks
  const savingsValue = Math.round(orgSize * (0.15 + (100 - maturity) * 0.008))
  const formattedSavings = savingsValue >= 1000
    ? `$${(savingsValue / 1000).toFixed(1)}M`
    : `$${savingsValue}k`
  const riskReduction = Math.min(95, Math.round(40 + (100 - maturity) * 0.5 + orgSize / 500))
  const timeToValue = Math.max(2, Math.round(18 - maturity * 0.15 - orgSize / 2000))

  return (
    <div className="glass-card rounded-xl p-6 sm:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-eari-blue/10">
          <Eye className="h-4 w-4 text-eari-blue-light" />
        </div>
        <h3 className="font-heading text-lg font-semibold text-foreground">ROI Estimator</h3>
      </div>

      {/* Sliders */}
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-sans text-muted-foreground">Organization Size</label>
            <span className="font-mono text-sm text-foreground bg-navy-700/50 px-2.5 py-0.5 rounded-md">{orgSize.toLocaleString()} employees</span>
          </div>
          <div className="relative">
            <input
              type="range"
              min={50}
              max={10000}
              step={50}
              value={orgSize}
              onChange={(e) => setOrgSize(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-navy-700 accent-eari-blue slider-premium"
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] font-mono text-muted-foreground/50">50</span>
            <span className="text-[10px] font-mono text-muted-foreground/50">10,000</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-sans text-muted-foreground">Current AI Maturity</label>
            <span className="font-mono text-sm text-foreground bg-navy-700/50 px-2.5 py-0.5 rounded-md">{maturity}%</span>
          </div>
          <div className="relative">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={maturity}
              onChange={(e) => setMaturity(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-navy-700 accent-eari-blue slider-premium"
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] font-mono text-muted-foreground/50">0%</span>
            <span className="text-[10px] font-mono text-muted-foreground/50">100%</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full my-6 bg-gradient-to-r from-transparent via-eari-blue/20 to-transparent" />

      {/* Results */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="text-center p-4 rounded-xl bg-navy-800/60 border border-border/30 hover:border-emerald-500/20 transition-colors">
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1.5">Est. Annual Savings</p>
          <p className="font-heading text-2xl font-bold text-emerald-400">{formattedSavings}</p>
        </div>
        <div className="text-center p-4 rounded-xl bg-navy-800/60 border border-border/30 hover:border-eari-blue/20 transition-colors">
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1.5">Risk Reduction</p>
          <p className="font-heading text-2xl font-bold text-eari-blue-light">{riskReduction}%</p>
        </div>
        <div className="text-center p-4 rounded-xl bg-navy-800/60 border border-border/30 hover:border-amber-500/20 transition-colors">
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1.5">Time-to-Value</p>
          <p className="font-heading text-2xl font-bold text-[#d4a853]">{timeToValue} mo</p>
        </div>
      </div>

      <p className="mt-4 text-[10px] text-muted-foreground/50 font-mono text-center tracking-wide">
        Estimates based on industry benchmarks. Actual results may vary.
      </p>
    </div>
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
  { name: 'Strategy', score: 72, color: '#3b82f6' },
  { name: 'Data', score: 58, color: '#8b5cf6' },
  { name: 'Technology', score: 65, color: '#06b6d4' },
  { name: 'Talent', score: 44, color: '#f59e0b' },
  { name: 'Governance', score: 78, color: '#ef4444' },
  { name: 'Culture', score: 55, color: '#ec4899' },
  { name: 'Process', score: 61, color: '#14b8a6' },
  { name: 'Security', score: 83, color: '#64748b' },
]

/* ─── Pipeline steps ───────────────────────────────────────────────────── */

const PIPELINE_STEPS = [
  { icon: ClipboardList, label: 'Questionnaire', desc: '40 Likert-scale questions across 8 pillars' },
  { icon: Scale, label: 'Normalize', desc: 'Raw scores normalized to 0-100 scale per pillar' },
  { icon: Weight, label: 'Weight', desc: 'Apply calibrated pillar weights (sum = 1.0)' },
  { icon: SlidersHorizontal, label: 'Adjust', desc: 'Cross-pillar correlation and boundary adjustments' },
  { icon: Calculator, label: 'Score', desc: 'Weighted aggregate E-ARI composite score' },
  { icon: Tag, label: 'Classify', desc: 'Assign maturity band: Laggard → Pacesetter' },
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
    color: '#3b82f6',
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
    color: '#8b5cf6',
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
    color: '#06b6d4',
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
    color: '#10b981',
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
    color: '#f59e0b',
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
    color: '#ec4899',
    status: 'active',
    href: '/assessment',
  },
]

/* ─── Agent orchestration flow steps ────────────────────────────────────── */

const ORCHESTRATION_FLOW = [
  { label: 'Assess', desc: 'Scoring Agent calculates' },
  { label: 'Discover', desc: 'Discovery Agent interviews' },
  { label: 'Analyze', desc: 'Insight Agent narrates' },
  { label: 'Educate', desc: 'Literacy Agent curates' },
  { label: 'Report', desc: 'Report Agent generates' },
  { label: 'Guide', desc: 'Assistant Agent advises' },
]

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
    price: '$49',
    yearlyPrice: '$39',
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
    highlighted: false,
  },
  {
    name: 'Growth',
    price: '$149',
    yearlyPrice: '$119',
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
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: '$399',
    yearlyPrice: '$319',
    period: '/month',
    yearlyPeriod: '/mo, billed yearly',
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

const CLIENT_LOGOS = [
  'StratumIQ', 'HelixPartners', 'AxiomCore', 'TesseraCo', 'MeridianEdge', 'Quantiva',
]

/* ─── Testimonials (from clients who used E-ARI for their business) ─────── */

const TESTIMONIALS = [
  {
    quote: 'We used E-ARI to evaluate where our business stood before committing to a major AI investment. The structured breakdown gave us confidence in our decisions and clarity on where to focus first.',
    name: 'James K.',
    title: 'Client',
    org: 'StratumIQ',
  },
  {
    quote: 'The assessment surfaced gaps we had overlooked, especially around data governance. It directly influenced how we prioritized our AI roadmap for the following quarter.',
    name: 'Amira R.',
    title: 'Client',
    org: 'HelixPartners',
  },
  {
    quote: 'We ran E-ARI across multiple teams to baseline our AI readiness. The sector-tailored questions made the results feel relevant to our industry, not like a generic checklist.',
    name: 'Daniel M.',
    title: 'Client',
    org: 'TesseraCo',
  },
]



/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function Home() {
  const [isAnnual, setIsAnnual] = useState(false)
  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />

      <main className="flex-1">
        {/* ─── 1. HERO SECTION ──────────────────────────────────────────── */}
        <section id="hero-section" className="relative overflow-hidden pt-20 pb-24 sm:pt-28 sm:pb-32">
          {/* Corporate gradient mesh background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d1117 40%, #162a4a 70%, #1e3a5f 100%)' }}
            />
            <div
              className="mesh-blob absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }}
            />
            <div
              className="mesh-blob absolute top-1/2 right-0 w-[600px] h-[600px] rounded-full opacity-15"
              style={{ background: 'radial-gradient(circle, #d4a853 0%, transparent 70%)', animationDelay: '-7s' }}
            />
            <div
              className="mesh-blob absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)', animationDelay: '-13s' }}
            />
            <div
              className="mesh-blob absolute top-1/4 left-1/2 w-[350px] h-[350px] rounded-full opacity-8"
              style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', animationDelay: '-4s' }}
            />
          </div>

          {/* Floating geometric shapes */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <motion.div
              className="absolute top-[15%] left-[8%] w-16 h-16 border border-eari-blue/10 rotate-45"
              animate={{ y: [0, -20, 0], rotate: [45, 90, 45] }}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute top-[60%] right-[12%] w-20 h-20 border border-[#d4a853]/10 rounded-full"
              animate={{ y: [0, 15, 0], x: [0, -10, 0] }}
              transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute bottom-[20%] left-[15%] w-12 h-12 border border-[#10b981]/10"
              style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }}
              animate={{ y: [0, -12, 0], rotate: [0, 180, 360] }}
              transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute top-[30%] right-[25%] w-10 h-10 border border-eari-blue/8 rotate-12"
              style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}
              animate={{ y: [0, -8, 5, 0], scale: [1, 1.1, 0.95, 1] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute top-[45%] left-[5%] w-6 h-6 bg-[#d4a853]/5 rotate-45"
              animate={{ y: [0, 10, 0], rotate: [45, 135, 45] }}
              transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          {/* Particle grid overlay */}
          <ParticleGrid />

          {/* Mouse follow spotlight */}
          <MouseSpotlight />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left — copy */}
              <div className="text-center lg:text-left">
                <FadeUp>
                  <div className="mb-6 flex items-center gap-2 flex-wrap justify-center lg:justify-start">
                    <Badge variant="outline" className="font-mono text-xs border-border/60 text-muted-foreground/80 bg-navy-800/50">
                      Agentic AI Readiness Platform
                    </Badge>
                  </div>
                </FadeUp>

                <FadeUp delay={0.1}>
                  <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-[1.1]">
                    Six AI Agents.{' '}
                    <span className="gradient-text-blue">
                      <TypewriterText text="One Mission." delay={0.8} />
                    </span>
                  </h1>
                </FadeUp>

                <FadeUp delay={0.15}>
                  <h2 className="mt-4 font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1]">
                    <span className="gradient-text-blue">Enterprise AI Readiness</span>
                    <span className="text-foreground"> — </span>
                    <span className="gradient-text-gold">Agentic Assessment Platform</span>
                  </h2>
                </FadeUp>

                <FadeUp delay={0.2}>
                  <p className="mt-4 text-lg sm:text-xl text-muted-foreground font-sans leading-relaxed max-w-xl mx-auto lg:mx-0">
                    Six specialized AI agents work in concert to assess, discover, analyze, educate, report, and guide your organization&apos;s AI readiness — delivering outputs no single tool can match.
                  </p>
                </FadeUp>

                <FadeUp delay={0.3}>
                  <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <Link href="/auth/register">
                      <Button size="lg" className="group relative overflow-hidden bg-gradient-to-r from-eari-blue via-blue-600 to-cyan-600 hover:from-eari-blue-dark hover:via-blue-700 hover:to-cyan-700 text-white font-heading font-semibold h-12 px-8 text-base w-full sm:w-auto shadow-lg shadow-eari-blue/25 hover:shadow-eari-blue/40 transition-all duration-300">
                        <span className="relative z-10 flex items-center">
                          Start Free Assessment
                          <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      </Button>
                    </Link>
                    <Link href="#agentic">
                      <Button variant="outline" size="lg" className="border-border hover:bg-navy-700 text-foreground font-heading font-semibold h-12 px-8 text-base w-full sm:w-auto">
                        Meet the Agents
                        <Bot className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </div>
                </FadeUp>
              </div>

              {/* Right — immersive dashboard preview */}
              <FadeUp delay={0.35} className="flex justify-center lg:justify-end">
                <div className="relative w-full max-w-lg">
                  {/* Ambient orbital particles behind the card */}
                  <div className="absolute inset-0 pointer-events-none overflow-visible" aria-hidden="true">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="orbital-particle absolute top-1/2 left-1/2"
                        style={{
                          width: seededRandom(i * 7 + 100) * 4 + 2,
                          height: seededRandom(i * 7 + 100) * 4 + 2,
                          background: i % 3 === 0 ? 'rgba(37,99,235,0.6)' : i % 3 === 1 ? 'rgba(6,182,212,0.5)' : 'rgba(139,92,246,0.5)',
                          borderRadius: '50%',
                          boxShadow: `0 0 6px ${i % 3 === 0 ? 'rgba(37,99,235,0.4)' : i % 3 === 1 ? 'rgba(6,182,212,0.3)' : 'rgba(139,92,246,0.3)'}`,
                          '--orbit-radius': `${150 + seededRandom(i * 7 + 200) * 60}px`,
                          '--orbit-duration': `${10 + seededRandom(i * 7 + 300) * 8}s`,
                          animationDelay: `${-seededRandom(i * 7 + 400) * 10}s`,
                        } as React.CSSProperties}
                      />
                    ))}
                  </div>

                  {/* Floating metric badges around the card */}
                  <div className="absolute -top-4 -left-4 z-20 float-badge" aria-hidden="true">
                    <div className="glass-card rounded-lg px-3 py-1.5 text-xs font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-amber-300">Talent Gap</span>
                      <span className="text-foreground font-bold">-24</span>
                    </div>
                  </div>
                  <div className="absolute top-8 -right-6 z-20 float-badge float-badge-delay-1" aria-hidden="true">
                    <div className="glass-card rounded-lg px-3 py-1.5 text-xs font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-emerald-300">Top Pillar</span>
                      <span className="text-foreground font-bold">Security 83</span>
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -left-2 z-20 float-badge float-badge-delay-2" aria-hidden="true">
                    <div className="glass-card rounded-lg px-3 py-1.5 text-xs font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-400" />
                      <span className="text-orange-300">Risk</span>
                      <span className="text-foreground font-bold">Medium</span>
                    </div>
                  </div>

                  {/* Data stream lines from edges */}
                  <div className="absolute -left-12 top-1/4 w-10 h-[2px] data-stream rounded-full" aria-hidden="true" />
                  <div className="absolute -right-10 top-2/3 w-8 h-[2px] data-stream data-stream-delay-1 rounded-full" aria-hidden="true" />
                  <div className="absolute left-1/4 -bottom-8 h-10 w-[2px] data-stream data-stream-delay-2 rounded-full" aria-hidden="true" style={{ backgroundSize: '100% 200%' }} />

                  {/* Aurora border glow behind the card */}
                  <div className="aurora-border-glow" aria-hidden="true" />

                  {/* Main preview card */}
                  <div className="aurora-card rounded-2xl overflow-hidden relative">
                    {/* Subtle window chrome */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-navy-900/40 border-b border-white/5">
                      <span className="traffic-light traffic-light-red opacity-50" style={{ width: 8, height: 8 }} />
                      <span className="traffic-light traffic-light-yellow opacity-50" style={{ width: 8, height: 8 }} />
                      <span className="traffic-light traffic-light-green opacity-50" style={{ width: 8, height: 8 }} />
                      <span className="ml-3 text-[10px] font-mono text-muted-foreground/60">e-ari-results.preview</span>
                    </div>

                    <div className="p-6 relative z-10">
                      {/* Top row: Large score ring + info */}
                      <div className="flex items-center gap-6">
                        {/* Large animated score ring with gradient glow */}
                        <div className="relative flex-shrink-0 score-ring-glow">
                          <svg width="120" height="120" viewBox="0 0 120 120" aria-label="Overall readiness score: 67%">
                            <defs>
                              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#2563eb" />
                                <stop offset="100%" stopColor="#06b6d4" />
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
                          <p className="font-heading font-bold text-foreground text-xl">E-ARI Score</p>
                          <p className="text-sm text-muted-foreground font-sans mt-0.5">Chaser — 51-75 band</p>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge className="bg-eari-blue/15 text-eari-blue-light border-eari-blue/30 text-xs font-mono">
                              v5.3
                            </Badge>
                            <Badge className="bg-cyan-500/10 text-cyan-300 border-cyan-500/20 text-xs font-mono">
                              LIVE
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Mini radar chart — calm constellation style */}
                      <div className="mt-6 flex justify-center">
                        <div className="relative">
                          <svg width="200" height="200" viewBox="0 0 200 200" aria-label="Pillar radar chart">
                            <defs>
                              <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="rgba(37,99,235,0.12)" />
                                <stop offset="100%" stopColor="rgba(6,182,212,0.05)" />
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
                            {/* Constellation data points — gentle staggered breathe */}
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
                                  animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.1, 1] }}
                                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
                                  style={{ transformOrigin: `${cx}px ${cy}px` }}
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

                      {/* Pillar quick stats - condensed horizontal chips */}
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {SAMPLE_SCORES.map((pillar, i) => (
                          <motion.div
                            key={pillar.name}
                            className="flex items-center gap-1.5 rounded-md px-2 py-1 bg-navy-700/60 border border-white/5"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 1.5 + i * 0.05 }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: pillar.color }} />
                            <span className="text-[10px] font-mono text-muted-foreground">{pillar.name.slice(0, 3)}</span>
                            <div className="w-8 h-1 rounded-full bg-navy-900/60 overflow-hidden">
                              <div className="h-full rounded-full" style={{ backgroundColor: pillar.color, width: `${pillar.score}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-foreground">{pillar.score}</span>
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
                <span className="inline-block font-mono text-xs tracking-widest uppercase text-eari-blue/70 mb-3">Methodology</span>
                <h2 className="font-heading text-3xl sm:text-4xl font-bold gradient-text-blue">
                  The 8-Pillar Framework
                </h2>
                <p className="mt-4 text-base text-muted-foreground font-sans leading-relaxed">
                  Eight critical dimensions, weighted by strategic importance, validated against industry benchmarks — one composite score.
                </p>
              </div>
            </FadeUp>

            {/* ── Split layout: Radar left + Pillar list right ── */}
            <div className="mt-14 lg:mt-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

              {/* LEFT — Living Constellation Radar */}
              <FadeUp delay={0.1}>
                <div className="relative mx-auto w-full max-w-md aspect-square">
                  {/* Soft ambient glow behind radar — calm, single source */}
                  <div className="absolute inset-[8%] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, rgba(6,182,212,0.06) 50%, transparent 80%)' }} />

                  <svg viewBox="0 0 220 220" className="w-full h-full" aria-label="8-pillar radar visualization">
                    <defs>
                      {/* Calm radial fill — softer center glow */}
                      <radialGradient id="methodRadarFill" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(6,182,212,0.18)" />
                        <stop offset="50%" stopColor="rgba(59,130,246,0.08)" />
                        <stop offset="100%" stopColor="rgba(37,99,235,0.02)" />
                      </radialGradient>
                      <linearGradient id="methodStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="50%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
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

                    {/* Subtle stroke opacity breathe on data polygon */}
                    <motion.polygon
                      points={SAMPLE_SCORES.map((p, i) => {
                        const angle = (Math.PI * 2 * i) / 8 - Math.PI / 2
                        const r = (p.score / 100) * 80
                        return `${110 + r * Math.cos(angle)},${110 + r * Math.sin(angle)}`
                      }).join(' ')}
                      fill="none"
                      stroke="url(#methodStrokeGrad)"
                      strokeWidth="0.5"
                      animate={{ strokeOpacity: [0.2, 0.45, 0.2] }}
                      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                    />

                    {/* Constellation data points — gentle staggered breathe */}
                    {SAMPLE_SCORES.map((p, i) => {
                      const angle = (Math.PI * 2 * i) / 8 - Math.PI / 2
                      const r = (p.score / 100) * 80
                      const cx = 110 + r * Math.cos(angle)
                      const cy = 110 + r * Math.sin(angle)
                      return (
                        <g key={i}>
                          {/* Soft outer halo */}
                          <motion.circle
                            cx={cx} cy={cy}
                            r="6" fill={p.color}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.04, 0.10, 0.04], scale: [1, 1.06, 1] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
                            style={{ transformOrigin: `${cx}px ${cy}px` }}
                          />
                          {/* Core dot — breathe gently */}
                          <motion.circle
                            cx={cx} cy={cy}
                            r="2.5" fill={p.color}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.08, 1] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
                            style={{ transformOrigin: `${cx}px ${cy}px` }}
                          />
                        </g>
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

                    {/* Single slow ambient orbit particle — once every 20s */}
                  </svg>

                  {/* Slow orbit particle outside SVG for smooth CSS animation */}
                  <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                    <div
                      className="radar-orbit-particle"
                      style={{
                        width: 3,
                        height: 3,
                        background: 'rgba(6,182,212,0.6)',
                        borderRadius: '50%',
                        boxShadow: '0 0 6px rgba(6,182,212,0.3)',
                        '--orbit-radius': '42%',
                        '--orbit-duration': '20s',
                      } as React.CSSProperties}
                    />
                  </div>

                  {/* Center score overlay — fade in once, calm */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <motion.span
                        className="block text-4xl font-heading font-bold gradient-text-blue"
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
                    <FadeUp key={pillar.id} delay={i * 0.05}>
                      <motion.div
                        className="group relative py-4 border-b border-white/[0.04] last:border-b-0 cursor-default"
                        initial={false}
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-md flex-shrink-0 transition-colors duration-200"
                            style={{ backgroundColor: `${pillar.color}15` }}
                          >
                            <Icon className="h-4 w-4" style={{ color: pillar.color }} />
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
                                className="h-full rounded-full"
                                style={{ backgroundColor: pillar.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${SAMPLE_SCORES[i].score}%` }}
                                transition={{ duration: 0.8, delay: 0.6 + i * 0.07, ease: 'easeOut' }}
                              />
                            </div>
                          </div>
                          <span className="font-mono text-lg font-semibold tabular-nums" style={{ color: pillar.color }}>
                            {SAMPLE_SCORES[i].score}
                          </span>
                        </div>
                      </motion.div>
                    </FadeUp>
                  )
                })}
              </div>
            </div>

            <FadeUp delay={0.3}>
              <p className="mt-12 text-center text-xs text-muted-foreground/50 font-mono tracking-wide">
                Scoring is deterministic and versioned (v5.3) — reproducible, no hidden variables.
              </p>
            </FadeUp>
          </div>
        </ParallaxSection>

        {/* ─── 2B. FEATURE HIGHLIGHTS STRIP ──────────────────────────────── */}
        <div className="section-gradient-separator" aria-hidden="true">
          <div className="h-px bg-gradient-to-r from-transparent via-eari-blue/20 to-transparent" />
        </div>
        <section className="py-12 bg-navy-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: Award, title: 'Certified', desc: 'E-ARI Certification from Bronze to Platinum badging', color: '#d4a853' },
                  { icon: Landmark, title: 'Compliant', desc: 'EU AI Act, NIST, and ISO 42001 gap analysis', color: '#3b82f6' },
                  { icon: Activity, title: 'Monitored', desc: 'Continuous drift detection with smart alerts', color: '#10b981' },
                  { icon: BarChart3, title: 'Benchmarked', desc: 'Sector peer comparison with real industry data', color: '#06b6d4' },
                ].map((feat, i) => {
                  const Icon = feat.icon
                  return (
                    <motion.div
                      key={feat.title}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.08 }}
                      whileHover={{ y: -3 }}
                      className="group h-full"
                    >
                      <div className="glass-card rounded-lg p-5 text-center h-full flex flex-col items-center">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-xl mb-3"
                          style={{ backgroundColor: `${feat.color}15` }}
                        >
                          <Icon className="h-5 w-5" style={{ color: feat.color }} />
                        </div>
                        <h4 className="font-heading text-sm font-semibold text-foreground">{feat.title}</h4>
                        <p className="mt-1.5 text-xs text-muted-foreground font-sans leading-relaxed">{feat.desc}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </FadeUp>
          </div>
        </section>

        <div className="section-gradient-separator" aria-hidden="true">
          <div className="h-px bg-gradient-to-r from-transparent via-eari-blue/20 to-transparent" />
        </div>

        {/* ─── 3. SCORING PIPELINE SECTION ──────────────────────────────── */}
        <ParallaxSection speed={0.04} className="py-20 sm:py-28 bg-navy-800/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center max-w-2xl mx-auto">
                <span className="inline-block font-mono text-xs tracking-widest uppercase text-eari-blue/70 mb-3">Pipeline</span>
                <h2 className="font-heading text-3xl sm:text-4xl font-bold gradient-text-blue">
                  How Scoring Works
                </h2>
                <p className="mt-4 text-base text-muted-foreground font-sans leading-relaxed">
                  Six deterministic steps from raw responses to maturity classification. Every stage is auditable, versioned, and reproducible.
                </p>
              </div>
            </FadeUp>

            <div className="mt-14 lg:mt-20 relative">
              {/* Animated connecting line */}
              <div className="absolute top-[27px] left-0 right-0 hidden lg:block pointer-events-none" aria-hidden="true">
                <motion.div
                  className="h-px bg-gradient-to-r from-eari-blue/0 via-eari-blue/30 to-eari-blue/0"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 1.8, delay: 0.4, ease: 'easeInOut' }}
                  style={{ transformOrigin: 'left' }}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-y-10 gap-x-6 lg:gap-x-4">
                {PIPELINE_STEPS.map((step, i) => {
                  const Icon = step.icon
                  return (
                    <FadeUp key={step.label} delay={i * 0.07}>
                      <div className="flex flex-col items-center text-center group">
                        <motion.div
                          className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.06] bg-navy-800 mb-4 group-hover:border-eari-blue/40 transition-colors duration-300"
                          whileHover={{ scale: 1.1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Icon className="h-5 w-5 text-eari-blue-light" />
                          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-eari-blue text-[9px] font-mono font-bold text-white">
                            {i + 1}
                          </span>
                        </motion.div>
                        <h3 className="font-heading text-sm font-semibold text-foreground">{step.label}</h3>
                        <p className="mt-1 text-[11px] text-muted-foreground/70 leading-relaxed max-w-[140px]">{step.desc}</p>
                      </div>
                    </FadeUp>
                  )
                })}
              </div>

              <FadeUp delay={0.6}>
                <div className="mt-12 flex justify-center">
                  <div className="inline-flex items-center gap-3 rounded-full bg-navy-800/80 border border-white/[0.06] px-5 py-2.5">
                    <span className="text-xs text-muted-foreground font-mono">Result</span>
                    <span className="h-3 w-px bg-border/40" />
                    <span className="text-sm font-heading font-semibold text-foreground">Weighted E-ARI Composite</span>
                    <span className="h-3 w-px bg-border/40" />
                    <span className="text-xs font-mono text-eari-blue-light">Maturity Band Assigned</span>
                  </div>
                </div>
              </FadeUp>
            </div>
          </div>
        </ParallaxSection>

        {/* ─── 3B. AGENTIC PROPERTIES SECTION ─────────────────────────────── */}
        <ParallaxSection speed={0.04} className="py-20 sm:py-28 bg-navy-900 relative overflow-hidden" id="agentic">
          {/* Subtle grid background */}
          <div className="absolute inset-0 hex-grid-bg pointer-events-none" aria-hidden="true" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Section header */}
            <FadeUp>
              <div className="text-center max-w-2xl mx-auto">
                <span className="inline-block font-mono text-xs tracking-widest uppercase text-eari-blue/70 mb-3">Agentic Architecture</span>
                <h2 className="font-heading text-3xl sm:text-4xl font-bold gradient-text-blue">
                  The Innovation: Agentic AI Assessment
                </h2>
                <p className="mt-4 text-base text-muted-foreground font-sans leading-relaxed">
                  Six specialized AI agents work in a coordinated pipeline — each feeding context to the next, compounding insight depth at every stage. Not a chatbot. An AI workforce for readiness.
                </p>
              </div>
            </FadeUp>

            {/* ── Orbital diagram left + Agent spotlight right ── */}
            <div className="mt-14 lg:mt-20 grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14 items-center">

              {/* LEFT — Orbital agent constellation (3 cols) */}
              <FadeUp delay={0.1} className="lg:col-span-3">
                <div className="relative flex flex-col items-center justify-center py-8">
                  {/* Central hub */}
                  <div className="relative w-[320px] h-[320px] sm:w-[380px] sm:h-[380px]">
                    {/* Outer ring pulse */}
                    <motion.div
                      className="absolute inset-0 rounded-full border border-eari-blue/[0.08]"
                      animate={{ scale: [1, 1.04, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                      className="absolute inset-4 rounded-full border border-eari-blue/[0.05]"
                      animate={{ scale: [1, 1.03, 1], opacity: [0.2, 0.5, 0.2] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                    />

                    {/* Agent orbital nodes */}
                    {AGENT_PROPERTIES.map((agent, i) => {
                      const Icon = agent.icon
                      const angle = (Math.PI * 2 * i) / AGENT_PROPERTIES.length - Math.PI / 2
                      const radius = 140
                      const x = 50 + (radius / 190) * 50 * Math.cos(angle)
                      const y = 50 + (radius / 190) * 50 * Math.sin(angle)
                      return (
                        <motion.div
                          key={agent.id}
                          className="absolute z-10"
                          style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                          initial={{ opacity: 0, scale: 0 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.3 + i * 0.1, type: 'spring', stiffness: 200 }}
                        >
                          <motion.div
                            className="group relative cursor-default"
                            whileHover={{ scale: 1.15 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div
                              className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08]"
                              style={{
                                backgroundColor: `${agent.color}15`,
                                boxShadow: `0 0 20px ${agent.color}15`,
                              }}
                            >
                              <Icon className="h-5 w-5" style={{ color: agent.color }} />
                            </div>
                            {/* Agent name tooltip */}
                            <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              <span className="text-[10px] font-mono text-muted-foreground/80 bg-navy-900/90 px-2 py-0.5 rounded border border-white/[0.06]">
                                {agent.name}
                              </span>
                            </div>
                            {/* Status dot */}
                            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 rounded-full bg-emerald-400 agent-status border-2 border-navy-900" />
                          </motion.div>
                        </motion.div>
                      )
                    })}

                    {/* Center core */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        className="flex flex-col items-center gap-2"
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2, type: 'spring' }}
                      >
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-eari-blue/20 to-cyan-500/10 border border-eari-blue/20 flex items-center justify-center shadow-lg shadow-eari-blue/10">
                          <Workflow className="h-7 w-7 text-eari-blue-light" />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">Orchestrator</span>
                      </motion.div>
                    </div>

                    {/* Connecting lines from center to each agent */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 380 380" aria-hidden="true">
                      {AGENT_PROPERTIES.map((agent, i) => {
                        const angle = (Math.PI * 2 * i) / AGENT_PROPERTIES.length - Math.PI / 2
                        const radius = 140
                        const x = 190 + radius * Math.cos(angle)
                        const y = 190 + radius * Math.sin(angle)
                        return (
                          <motion.line
                            key={`line-${agent.id}`}
                            x1="190" y1="190" x2={x} y2={y}
                            stroke={agent.color}
                            strokeWidth="0.5"
                            strokeOpacity="0.12"
                            initial={{ pathLength: 0, opacity: 0 }}
                            whileInView={{ pathLength: 1, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.5 + i * 0.08, duration: 0.6 }}
                          />
                        )
                      })}
                    </svg>
                  </div>

                  {/* Pipeline flow — compact horizontal below orbital */}
                  <div className="mt-10 flex items-center justify-center gap-0 flex-wrap">
                    {ORCHESTRATION_FLOW.map((step, i) => (
                      <div key={step.label} className="flex items-center">
                        <motion.div
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-navy-800/50 border border-white/[0.04]"
                          initial={{ opacity: 0, scale: 0.9 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.3 + i * 0.08 }}
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

              {/* RIGHT — Featured agent spotlight (2 cols) */}
              <div className="lg:col-span-2 space-y-0">
                {AGENT_PROPERTIES.map((agent, i) => {
                  const Icon = agent.icon
                  const isFeatured = i === 0
                  return (
                    <FadeUp key={agent.id} delay={i * 0.06}>
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
                                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 agent-status" />
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
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 agent-status flex-shrink-0" />
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

        {/* ─── 4. RESULTS PREVIEW SECTION ───────────────────────────────── */}
        <ParallaxSection speed={0.04} className="py-20 sm:py-28 bg-navy-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center max-w-2xl mx-auto">
                <span className="inline-block font-mono text-xs tracking-widest uppercase text-eari-blue/70 mb-3">Output</span>
                <h2 className="font-heading text-3xl sm:text-4xl font-bold gradient-text-blue">
                  What Your Results Look Like
                </h2>
                <p className="mt-4 text-base text-muted-foreground font-sans leading-relaxed">
                  A comprehensive readiness profile — composite score, maturity classification, pillar breakdown, and strategic recommendations.
                </p>
              </div>
            </FadeUp>

            {/* ── Immersive dashboard mockup ── */}
            <div className="mt-14 lg:mt-20">
              <FadeUp delay={0.1}>
                <div className="rounded-2xl border border-white/[0.06] bg-[#0a0f1a] overflow-hidden shadow-2xl shadow-eari-blue/5">
                  {/* Window chrome */}
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.04] bg-[#0d1220]">
                    <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                    <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                    <span className="w-3 h-3 rounded-full bg-[#28c840]" />
                    <span className="ml-4 text-[11px] font-mono text-muted-foreground/50">e-ari-dashboard.results</span>
                    <div className="ml-auto flex items-center gap-3">
                      <Badge className="bg-eari-blue/15 text-eari-blue-light border-eari-blue/30 text-[10px] font-mono">v5.3</Badge>
                      <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20 text-[10px] font-mono">LIVE</Badge>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8">
                    {/* Top row: Score ring + Maturity + Certification */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                      {/* Score ring */}
                      <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <div className="relative score-ring-glow">
                          <svg width="100" height="100" viewBox="0 0 100 100" aria-label="E-ARI Score: 63.8">
                            <defs>
                              <linearGradient id="resultScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#2563eb" />
                                <stop offset="100%" stopColor="#06b6d4" />
                              </linearGradient>
                            </defs>
                            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(48,57,74,0.3)" strokeWidth="5" />
                            <motion.circle
                              cx="50" cy="50" r="42"
                              fill="none"
                              stroke="url(#resultScoreGrad)"
                              strokeWidth="5"
                              strokeLinecap="round"
                              strokeDasharray={264}
                              initial={{ strokeDashoffset: 264 }}
                              whileInView={{ strokeDashoffset: 264 - 264 * 0.638 }}
                              viewport={{ once: true }}
                              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                              transform="rotate(-90 50 50)"
                            />
                            <motion.text
                              x="50" y="46" textAnchor="middle" fill="#e6edf3" fontSize="22" fontWeight="700" fontFamily="var(--font-plus-jakarta)"
                              initial={{ opacity: 0 }}
                              whileInView={{ opacity: 1 }}
                              viewport={{ once: true }}
                              transition={{ delay: 0.8 }}
                            >
                              63.8
                            </motion.text>
                            <text x="50" y="62" textAnchor="middle" fill="#8b949e" fontSize="9" fontFamily="var(--font-inter)">
                              / 100
                            </text>
                          </svg>
                        </div>
                        <p className="mt-2 text-xs font-mono text-muted-foreground/50">Composite E-ARI Score</p>
                      </div>

                      {/* Maturity classification */}
                      <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <div className="flex items-center gap-2 rounded-full bg-emerald-400/10 border border-emerald-400/20 px-4 py-2 mb-3">
                          <span className="flex h-2 w-2 rounded-full bg-emerald-400 agent-status" />
                          <span className="text-sm font-heading font-bold text-emerald-400">Developing</span>
                        </div>
                        <p className="text-xs font-mono text-muted-foreground/40 mb-3">Maturity Band: 51–75</p>
                        {/* Compact maturity scale */}
                        <div className="w-full space-y-1">
                          {Object.values(MATURITY_BANDS).map((band) => {
                            const isActive = band.label === 'Chaser'
                            return (
                              <div key={band.label} className="flex items-center gap-2">
                                <div
                                  className="h-1.5 rounded-full"
                                  style={{
                                    backgroundColor: isActive ? band.color : `${band.color}30`,
                                    width: isActive ? '100%' : `${(band.max / 100) * 100}%`,
                                  }}
                                />
                                <span className={`text-[9px] font-mono flex-shrink-0 ${isActive ? 'text-foreground' : 'text-muted-foreground/30'}`}>
                                  {band.label}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Certification badge */}
                      <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#d4a853]/20 to-[#d4a853]/5 border border-[#d4a853]/20 flex items-center justify-center mb-3">
                          <Award className="h-7 w-7 text-[#d4a853]" />
                        </div>
                        <span className="text-sm font-heading font-bold text-[#d4a853]">E-ARI Silver</span>
                        <p className="text-[10px] font-mono text-muted-foreground/40 mt-1">Certification Eligible</p>
                      </div>
                    </div>

                    {/* Bottom row: Radar + Key findings */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                      {/* Radar chart (3 cols) */}
                      <div className="lg:col-span-3 flex items-center justify-center p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <svg viewBox="0 0 300 300" className="w-full max-w-xs" aria-label="Pillar radar chart">
                          {/* Background rings */}
                          {[0.25, 0.5, 0.75, 1].map((scale, i) => (
                            <polygon
                              key={i}
                              points={SAMPLE_SCORES.map((_, j) => {
                                const angle = (Math.PI * 2 * j) / SAMPLE_SCORES.length - Math.PI / 2
                                const r = 110 * scale
                                return `${150 + r * Math.cos(angle)},${150 + r * Math.sin(angle)}`
                              }).join(' ')}
                              fill="none"
                              stroke="rgba(48,57,74,0.3)"
                              strokeWidth="0.5"
                            />
                          ))}
                          {/* Axis lines */}
                          {SAMPLE_SCORES.map((_, j) => {
                            const angle = (Math.PI * 2 * j) / SAMPLE_SCORES.length - Math.PI / 2
                            return (
                              <line
                                key={j}
                                x1="150" y1="150"
                                x2={150 + 110 * Math.cos(angle)}
                                y2={150 + 110 * Math.sin(angle)}
                                stroke="rgba(48,57,74,0.2)"
                                strokeWidth="0.5"
                              />
                            )
                          })}
                          {/* Data polygon */}
                          <motion.polygon
                            points={SAMPLE_SCORES.map((s, j) => {
                              const angle = (Math.PI * 2 * j) / SAMPLE_SCORES.length - Math.PI / 2
                              const r = (s.score / 100) * 110
                              return `${150 + r * Math.cos(angle)},${150 + r * Math.sin(angle)}`
                            }).join(' ')}
                            fill="rgba(37,99,235,0.12)"
                            stroke="#3b82f6"
                            strokeWidth="1.5"
                            initial={{ opacity: 0, scale: 0.5 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                            style={{ transformOrigin: '150px 150px' }}
                          />
                          {/* Data points */}
                          {SAMPLE_SCORES.map((s, j) => {
                            const angle = (Math.PI * 2 * j) / SAMPLE_SCORES.length - Math.PI / 2
                            const r = (s.score / 100) * 110
                            return (
                              <motion.circle
                                key={j}
                                cx={150 + r * Math.cos(angle)}
                                cy={150 + r * Math.sin(angle)}
                                r="3"
                                fill={s.color}
                                stroke="#0a0f1a"
                                strokeWidth="1.5"
                                initial={{ scale: 0, opacity: 0 }}
                                whileInView={{ scale: 1, opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.3, delay: 0.8 + j * 0.06 }}
                              />
                            )
                          })}
                          {/* Labels */}
                          {SAMPLE_SCORES.map((s, j) => {
                            const angle = (Math.PI * 2 * j) / SAMPLE_SCORES.length - Math.PI / 2
                            const r = 130
                            const x = 150 + r * Math.cos(angle)
                            const y = 150 + r * Math.sin(angle)
                            return (
                              <text
                                key={j}
                                x={x} y={y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="#8b949e"
                                fontSize="9"
                                fontFamily="var(--font-inter)"
                              >
                                {s.name} {s.score}
                              </text>
                            )
                          })}
                        </svg>
                      </div>

                      {/* Key findings panel (2 cols) */}
                      <div className="lg:col-span-2 space-y-3">
                        <h3 className="font-heading text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-eari-blue-light" />
                          Key Findings
                        </h3>

                        {/* Top strength */}
                        <div className="rounded-lg p-3 bg-emerald-500/[0.06] border border-emerald-500/[0.12]">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="h-3 w-3 text-emerald-400" />
                            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Top Strength</span>
                          </div>
                          <p className="text-xs text-foreground font-heading font-semibold">Security &amp; Compliance — 83/100</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Strongest pillar. Robust controls and audit practices in place.</p>
                        </div>

                        {/* Critical gap */}
                        <div className="rounded-lg p-3 bg-amber-500/[0.06] border border-amber-500/[0.12]">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingDown className="h-3 w-3 text-amber-400" />
                            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">Critical Gap</span>
                          </div>
                          <p className="text-xs text-foreground font-heading font-semibold">Talent &amp; Skills — 44/100</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">AI workforce readiness is the primary constraint on execution.</p>
                        </div>

                        {/* AI Insight */}
                        <div className="rounded-lg p-3 bg-eari-blue/[0.06] border border-eari-blue/[0.12]">
                          <div className="flex items-center gap-2 mb-1">
                            <Brain className="h-3 w-3 text-eari-blue-light" />
                            <span className="text-[10px] font-mono text-eari-blue-light uppercase tracking-wider">AI Insight</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                            Strong governance foundations (78/100) offset by a critical talent gap (44/100) that could constrain AI execution capacity. Prioritize upskilling programs before scaling deployments.
                          </p>
                        </div>

                        {/* Quick stats row */}
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <div className="text-center p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            <p className="font-heading text-lg font-bold text-eari-blue-light">8</p>
                            <p className="text-[8px] font-mono text-muted-foreground/40">Pillars</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            <p className="font-heading text-lg font-bold text-[#d4a853]">40</p>
                            <p className="text-[8px] font-mono text-muted-foreground/40">Questions</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            <p className="font-heading text-lg font-bold text-emerald-400">v5.3</p>
                            <p className="text-[8px] font-mono text-muted-foreground/40">Method</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeUp>
            </div>
          </div>
        </ParallaxSection>

        {/* ─── 5. AI INSIGHTS SECTION ───────────────────────────────────── */}
        <ParallaxSection speed={0.04} className="py-20 sm:py-28 bg-navy-800/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center max-w-3xl mx-auto">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Brain className="h-6 w-6 text-eari-blue-light" />
                  </motion.div>
                  <SparkleBadge>
                    <Badge variant="outline" className="font-mono text-xs border-eari-blue/40 text-eari-blue-light relative z-10">
                      AI-Powered
                    </Badge>
                  </SparkleBadge>
                </div>
                <h2 className="font-heading text-3xl sm:text-4xl font-bold gradient-text-blue">
                  Strategic Insights Powered by AI
                </h2>
                <p className="mt-4 text-lg text-muted-foreground font-sans">
                  AI generates narrative context for your scores. It does not alter, inflate, or modify the calculated results — ever.
                </p>
              </div>
            </FadeUp>

            <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Sample insight card with streaming text */}
              <FadeUp>
                <div className="glass-card rounded-xl p-6 h-full">
                  <div className="flex items-center gap-2 mb-4">
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                    >
                      <Sparkles className="h-4 w-4 text-eari-blue-light" />
                    </motion.div>
                    <span className="font-heading text-sm font-semibold text-eari-blue-light">Sample AI Insight</span>
                  </div>
                  <div className="border-l-2 border-eari-blue/40 pl-4">
                    <p className="text-foreground font-sans leading-relaxed">
                      <StreamingText
                        text="Your organization demonstrates strong governance foundations (78/100) but faces a critical talent gap (44/100) that could constrain AI execution capacity. The gap between governance maturity and talent readiness suggests that while policies and frameworks are in place, the human capital to operationalize them is insufficient."
                        delay={0.5}
                        speed={12}
                      />
                    </p>
                    <p className="mt-3 text-foreground font-sans leading-relaxed">
                      <strong>Recommended priority:</strong>{' '}
                      <StreamingText
                        text="Invest in upskilling programs and AI career frameworks before scaling AI deployments. Without adequate talent, governance structures risk becoming aspirational rather than operational."
                        delay={4}
                        speed={12}
                      />
                    </p>
                  </div>
                  <p className="mt-4 text-xs font-mono text-muted-foreground">
                    Generated by AI — clearly labeled, grounded in scores, not altering results
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
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        className="flex gap-4 items-start group"
                      >
                        <motion.div
                          className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 mt-0.5 icon-float"
                          style={{ backgroundColor: `${point.color}20`, animationDelay: `${i * 0.5}s` }}
                          whileHover={{ scale: 1.1 }}
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

        {/* ─── 5B. CLIENTS SECTION ─────────────────────────────────────────── */}
        <section className="py-12 bg-navy-900 border-t border-b border-border/20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <p className="text-center text-xs text-muted-foreground font-sans uppercase tracking-wider mb-8">
                Trusted by teams at growing organizations
              </p>
            </FadeUp>
            <div className="flex items-center justify-center gap-8 sm:gap-12 lg:gap-16 flex-wrap">
              {CLIENT_LOGOS.map((name, i) => (
                <motion.div
                  key={name}
                  className="text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors duration-300"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                >
                  <span className="font-heading text-lg sm:text-xl font-bold tracking-tight">{name}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 5C. TESTIMONIALS SECTION ─────────────────────────────────────── */}
        <ParallaxSection speed={0.03} className="py-20 sm:py-28 bg-navy-800/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center max-w-3xl mx-auto mb-12">
                <h2 className="font-heading text-3xl sm:text-4xl font-bold gradient-text-blue">
                  What Clients Say
                </h2>
                <p className="mt-4 text-lg text-muted-foreground font-sans">
                  Businesses that have used E-ARI to understand and improve their AI readiness.
                </p>
              </div>
            </FadeUp>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {TESTIMONIALS.map((t, i) => (
                <FadeUp key={t.name} delay={i * 0.1}>
                  <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                    <Card className="bg-navy-800 border-border/50 h-full">
                      <CardContent className="p-6">
                        <div className="mb-4">
                          {Array.from({ length: 5 }).map((_, si) => (
                            <span key={si} className="text-[#d4a853] text-sm">&#9733;</span>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground font-sans leading-relaxed mb-6 italic">
                          &ldquo;{t.quote}&rdquo;
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-eari-blue/10 text-eari-blue-light font-heading font-bold text-sm">
                            {t.name[0]}
                          </div>
                          <div>
                            <p className="font-heading text-sm font-semibold text-foreground">{t.name}</p>
                            <p className="text-xs text-muted-foreground font-sans">{t.title}, {t.org}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </FadeUp>
              ))}
            </div>
          </div>
        </ParallaxSection>

        {/* ─── 5D. ROI CALCULATOR SECTION ─────────────────────────────────── */}
        <div className="section-gradient-separator" aria-hidden="true">
          <div className="h-px bg-gradient-to-r from-transparent via-eari-blue/20 to-transparent" />
        </div>
        <ParallaxSection speed={0.03} className="py-20 sm:py-28 bg-navy-800/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center max-w-3xl mx-auto mb-12">
                <h2 className="font-heading text-3xl sm:text-4xl font-bold gradient-text-blue">
                  What&apos;s the ROI of AI Readiness?
                </h2>
                <p className="mt-4 text-lg text-muted-foreground font-sans">
                  Estimate the business value of improving your organization&apos;s AI readiness score.
                </p>
              </div>
            </FadeUp>
            <FadeUp delay={0.1}>
              <ROICalculator />
            </FadeUp>
          </div>
        </ParallaxSection>

        {/* ─── 5E. COMPETITIVE COMPARISON SECTION ──────────────────────────── */}
        <div className="section-gradient-separator" aria-hidden="true">
          <div className="h-px bg-gradient-to-r from-transparent via-[#d4a853]/20 to-transparent" />
        </div>
        <section className="py-20 sm:py-28 bg-navy-900 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 right-[10%] w-[300px] h-[300px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #d4a853 0%, transparent 70%)' }} />
          </div>

          <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center mb-14">
                <Badge variant="outline" className="font-mono text-xs border-[#d4a853]/30 text-[#d4a853] bg-[#d4a853]/5 mb-4">
                  Competitive Edge
                </Badge>
                <h2 className="font-heading text-3xl sm:text-4xl font-bold gradient-text-gold">
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
                  accent: 'from-blue-500/20 to-cyan-500/20',
                  accentBorder: 'border-blue-500/20',
                  iconColor: 'text-blue-400',
                },
                {
                  icon: Award,
                  label: 'Certification',
                  traditional: 'No formal readiness certification',
                  eari: 'Bronze through Platinum tier badging system',
                  accent: 'from-amber-500/20 to-yellow-500/20',
                  accentBorder: 'border-amber-500/20',
                  iconColor: 'text-amber-400',
                },
                {
                  icon: Scale,
                  label: 'Compliance',
                  traditional: 'Manual research across regulatory frameworks',
                  eari: 'Auto-mapped to EU AI Act, NIST RMF & ISO 42001',
                  accent: 'from-emerald-500/20 to-green-500/20',
                  accentBorder: 'border-emerald-500/20',
                  iconColor: 'text-emerald-400',
                },
                {
                  icon: Radar,
                  label: 'Monitoring',
                  traditional: 'One-time point-in-time snapshots',
                  eari: 'Continuous drift detection with real-time alerts',
                  accent: 'from-violet-500/20 to-purple-500/20',
                  accentBorder: 'border-violet-500/20',
                  iconColor: 'text-violet-400',
                },
                {
                  icon: BarChart3,
                  label: 'Benchmarking',
                  traditional: 'Self-reported, unverifiable claims',
                  eari: 'Real sector data with percentile rankings',
                  accent: 'from-rose-500/20 to-pink-500/20',
                  accentBorder: 'border-rose-500/20',
                  iconColor: 'text-rose-400',
                },
              ].map((row, i) => (
                <FadeUp key={row.label} delay={0.05 * i}>
                  <div className={`group glass-card rounded-xl border ${row.accentBorder} hover:border-opacity-60 transition-all duration-300 hover:shadow-lg hover:shadow-eari-blue/5`}>
                    <div className="flex flex-col sm:flex-row items-stretch">
                      {/* Feature label column */}
                      <div className={`flex items-center gap-3 sm:w-44 shrink-0 px-5 py-4 sm:py-0 bg-gradient-to-br ${row.accent} rounded-t-xl sm:rounded-t-none sm:rounded-l-xl border-b sm:border-b-0 sm:border-r border-border/10`}>
                        <row.icon className={`h-5 w-5 ${row.iconColor} shrink-0`} />
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
                      <div className="flex-1 flex items-center gap-3 px-5 py-4 bg-eari-blue/[0.04] rounded-b-xl sm:rounded-b-none sm:rounded-r-xl group-hover:bg-eari-blue/[0.07] transition-colors duration-300">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-eari-blue/15 shrink-0">
                          <AnimatedCheck className="shrink-0" delay={0.1 + i * 0.08} />
                        </div>
                        <span className="text-sm text-eari-blue-light font-medium font-sans">{row.eari}</span>
                      </div>
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>

            {/* Column headers legend */}
            <FadeUp delay={0.35}>
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
                  <span className="text-xs text-eari-blue-light font-sans">E-ARI</span>
                </div>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ─── 5F. AI PULSE SECTION ─────────────────────────────────────────── */}
        <div className="section-gradient-separator" aria-hidden="true">
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
        </div>
        <ParallaxSection speed={0.03} className="py-20 sm:py-28 bg-navy-800/30 relative overflow-hidden" id="ai-pulse">
          {/* Subtle pulse-wave background */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }} />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center max-w-3xl mx-auto mb-14">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Activity className="h-6 w-6 text-cyan-400" />
                  </motion.div>
                  <SparkleBadge>
                    <Badge variant="outline" className="font-mono text-xs border-cyan-500/40 text-cyan-300 relative z-10 bg-cyan-500/5">
                      Continuous Monitoring
                    </Badge>
                  </SparkleBadge>
                </div>
                <h2 className="font-heading text-3xl sm:text-4xl font-bold">
                  <span className="gradient-text-blue">AI Pulse</span>
                  <span className="text-foreground"> — Always-On Readiness</span>
                </h2>
                <p className="mt-4 text-lg text-muted-foreground font-sans">
                  Stop relying on point-in-time snapshots. AI Pulse runs monthly readiness checks that track score drift, surface emerging risks, and highlight quick wins — so your AI strategy never goes stale.
                </p>
              </div>
            </FadeUp>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              {/* Left: Visual Pulse Preview */}
              <FadeUp>
                <div className="relative">
                  {/* Pulse rings animation behind the card */}
                  <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-500/10"
                        style={{ width: 160 + i * 80, height: 160 + i * 80 }}
                        animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.05, 0.15] }}
                        transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.5, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>

                  <div className="aurora-card rounded-2xl p-[1px] relative">
                    <div className="bg-navy-800/90 backdrop-blur-sm rounded-2xl p-6 relative z-10">
                      {/* Pulse header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15">
                            <Activity className="h-5 w-5 text-cyan-400" />
                          </div>
                          <div>
                            <p className="font-heading text-sm font-semibold text-foreground">AI Pulse</p>
                            <p className="text-xs text-muted-foreground font-mono">Monthly Drift Check</p>
                          </div>
                        </div>
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-xs font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 inline-block animate-pulse" />
                          LIVE
                        </Badge>
                      </div>

                      {/* Simulated trend sparkline */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground font-sans">Overall Score Trend</span>
                          <span className="text-xs font-mono text-emerald-400">+8% this quarter</span>
                        </div>
                        <svg viewBox="0 0 300 60" className="w-full h-16" aria-label="Score trend sparkline">
                          <defs>
                            <linearGradient id="pulseGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="rgba(6,182,212,0.3)" />
                              <stop offset="100%" stopColor="rgba(6,182,212,0)" />
                            </linearGradient>
                          </defs>
                          {/* Area fill */}
                          <motion.path
                            d="M0,45 Q30,40 60,38 T120,30 T180,25 T240,18 T300,10 L300,60 L0,60 Z"
                            fill="url(#pulseGrad)"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                          />
                          {/* Line */}
                          <motion.path
                            d="M0,45 Q30,40 60,38 T120,30 T180,25 T240,18 T300,10"
                            fill="none"
                            stroke="#06b6d4"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.5, delay: 0.2, ease: 'easeOut' }}
                          />
                          {/* Current dot */}
                          <motion.circle
                            cx="300" cy="10" r="4"
                            fill="#06b6d4"
                            stroke="#0d1117"
                            strokeWidth="2"
                            initial={{ scale: 0 }}
                            whileInView={{ scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.3, delay: 1.5 }}
                          />
                        </svg>
                      </div>

                      {/* Risk & Quick Win pills */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <TrendingDown className="h-3 w-3 text-amber-400" />
                            <span className="text-[10px] font-heading font-semibold text-amber-400 uppercase tracking-wider">Top Risk</span>
                          </div>
                          <p className="text-xs text-foreground font-sans leading-relaxed">Talent pipeline shrinking — 3 key AI roles unfilled for 90+ days</p>
                        </div>
                        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <TrendingUp className="h-3 w-3 text-emerald-400" />
                            <span className="text-[10px] font-heading font-semibold text-emerald-400 uppercase tracking-wider">Quick Win</span>
                          </div>
                          <p className="text-xs text-foreground font-sans leading-relaxed">Formalize data governance policy — could lift Data pillar by 12 points</p>
                        </div>
                      </div>

                      {/* Monthly comparison */}
                      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground font-mono">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          <span>Mar 2025</span>
                        </div>
                        <div className="flex-1 h-px bg-border/30" />
                        <span className="text-foreground font-semibold">67%</span>
                        <span className="text-emerald-400">+3</span>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeUp>

              {/* Right: Feature points */}
              <FadeUp delay={0.1}>
                <div className="space-y-6">
                  {[
                    {
                      icon: RefreshCw,
                      title: 'Monthly Auto-Pulse',
                      desc: 'Automated monthly readiness re-assessments that compare your current scores against the previous month, so you always know which direction your AI readiness is trending without manual effort.',
                      color: '#06b6d4',
                    },
                    {
                      icon: TrendingDown,
                      title: 'Drift Detection & Alerts',
                      desc: 'Intelligent drift detection flags pillars where scores have declined, triggering proactive alerts before small gaps become strategic liabilities. Catch regressions within 30 days, not 12 months.',
                      color: '#f59e0b',
                    },
                    {
                      icon: TrendingUp,
                      title: 'Quick Wins Surfaced',
                      desc: 'Each pulse run identifies the highest-impact, lowest-effort improvements you can make right now. Not generic advice — actionable steps grounded in your actual pillar scores and sector benchmarks.',
                      color: '#10b981',
                    },
                    {
                      icon: Activity,
                      title: 'Trend Visualization',
                      desc: 'Visual trend charts track your overall and per-pillar readiness over time, with sector average reference lines so you can see how you compare against industry peers month after month.',
                      color: '#8b5cf6',
                    },
                  ].map((point, i) => {
                    const Icon = point.icon
                    return (
                      <motion.div
                        key={point.title}
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        className="flex gap-4 items-start group"
                      >
                        <motion.div
                          className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 mt-0.5 icon-float"
                          style={{ backgroundColor: `${point.color}20`, animationDelay: `${i * 0.5}s` }}
                          whileHover={{ scale: 1.1 }}
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

        {/* ─── 5G. INTEGRATIONS SECTION ────────────────────────────────────── */}
        <div className="section-gradient-separator" aria-hidden="true">
          <div className="h-px bg-gradient-to-r from-transparent via-[#d4a853]/20 to-transparent" />
        </div>
        <section className="py-20 sm:py-28 bg-navy-900 relative overflow-hidden" id="integrations">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center max-w-2xl mx-auto mb-14">
                <span className="inline-block font-mono text-xs tracking-widest uppercase text-[#d4a853]/70 mb-3">Enterprise-Ready</span>
                <h2 className="font-heading text-3xl sm:text-4xl font-bold gradient-text-gold">
                  Integrations That Fit Your Stack
                </h2>
                <p className="mt-4 text-base text-muted-foreground font-sans leading-relaxed">
                  Connect to your existing ecosystem — identity, cloud, compliance, and data. No rip-and-replace.
                </p>
              </div>
            </FadeUp>

            {/* ── 2-col: Featured API panel + compact integration rows ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">

              {/* LEFT — Featured API panel */}
              <FadeUp delay={0.1}>
                <div className="h-full rounded-2xl border border-white/[0.06] bg-navy-800/60 overflow-hidden flex flex-col">
                  <div className="flex items-center gap-3 px-6 py-5 border-b border-white/[0.04]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                      <Code2 className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                      <h3 className="font-heading text-base font-semibold text-foreground">REST API</h3>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">OpenAPI 3.0 · TypeScript & Python SDKs</p>
                    </div>
                  </div>
                  <div className="flex-1 p-5">
                    <div className="rounded-lg bg-navy-900/70 border border-white/[0.04] p-4 font-mono text-xs leading-6 overflow-x-auto">
                      <span className="text-muted-foreground/50"># Fetch your latest assessment scores</span><br />
                      <span className="text-[#d4a853]">curl</span> <span className="text-emerald-400">-H</span> <span className="text-amber-300">&quot;Authorization: Bearer eari_sk_...&quot;</span> \<br />
                      &nbsp;&nbsp;<span className="text-eari-blue-light">https://api.e-ari.io/v1/assessments/latest/scores</span><br /><br />
                      <span className="text-muted-foreground/50"># Response</span><br />
                      <span className="text-muted-foreground/40">{'{'}</span><br />
                      &nbsp;&nbsp;<span className="text-violet-400">&quot;composite&quot;</span>: <span className="text-amber-300">63.8</span>,<br />
                      &nbsp;&nbsp;<span className="text-violet-400">&quot;band&quot;</span>: <span className="text-emerald-400">&quot;Developing&quot;</span>,<br />
                      &nbsp;&nbsp;<span className="text-violet-400">&quot;pillars&quot;</span>: <span className="text-muted-foreground/40">[...8 scores]</span><br />
                      <span className="text-muted-foreground/40">{'}'}</span>
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t border-white/[0.04] flex flex-wrap gap-2">
                    {['Assessment CRUD', 'Score retrieval', 'Benchmark queries', 'User management'].map(item => (
                      <span key={item} className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-300/80 border border-violet-500/10">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </FadeUp>

              {/* RIGHT — Stacked integration rows */}
              <div className="space-y-3">
                {[
                  { icon: KeyRound, title: 'SSO & Identity', items: ['SAML 2.0', 'OAuth 2.0 / OIDC', 'Active Directory', 'Okta / Azure AD'], desc: 'Single sign-on with your existing identity provider.', color: '#3b82f6' },
                  { icon: Cloud, title: 'Cloud Platforms', items: ['AWS', 'Azure', 'Google Cloud', 'Multi-cloud'], desc: 'Deploy on any major cloud or in your own VPC.', color: '#06b6d4' },
                  { icon: Webhook, title: 'Webhooks & Events', items: ['Score change events', 'Certification milestones', 'Drift alerts', 'Custom triggers'], desc: 'Real-time notifications into your workflows.', color: '#10b981' },
                  { icon: Globe, title: 'Compliance Frameworks', items: ['EU AI Act', 'NIST AI RMF', 'ISO 42001', 'SOC 2 Type II'], desc: 'Pre-mapped regulatory gap analyses.', color: '#f59e0b' },
                  { icon: Layers, title: 'Data & Export', items: ['PDF reports', 'DOCX exports', 'CSV data dumps', 'BI tool feeds'], desc: 'Export or pipe data into your BI tools.', color: '#ec4899' },
                ].map((integration, i) => {
                  const Icon = integration.icon
                  return (
                    <FadeUp key={integration.title} delay={i * 0.05}>
                      <motion.div
                        className="group flex items-center gap-4 rounded-xl border border-white/[0.04] bg-navy-800/40 px-5 py-4 hover:border-white/[0.08] hover:bg-navy-800/60 transition-all duration-200 cursor-default"
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0" style={{ backgroundColor: `${integration.color}12` }}>
                          <Icon className="h-4 w-4" style={{ color: integration.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-heading text-sm font-semibold text-foreground group-hover:text-white transition-colors">{integration.title}</span>
                            <span className="text-[10px] text-muted-foreground/50 hidden sm:inline">{integration.desc}</span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {integration.items.map(item => (
                              <span key={item} className="text-[9px] font-mono px-2 py-0.5 rounded-full border border-white/[0.04] text-muted-foreground/60 bg-white/[0.02]">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors flex-shrink-0" />
                      </motion.div>
                    </FadeUp>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <div className="section-gradient-separator" aria-hidden="true">
          <div className="h-px bg-gradient-to-r from-transparent via-eari-blue/20 to-transparent" />
        </div>

        {/* ─── 6. PRICING SECTION ───────────────────────────────────────── */}
        <ParallaxSection speed={0.03} className="py-20 sm:py-28 bg-navy-900 relative overflow-hidden" id="pricing">
          {/* Subtle grid background */}
          <div className="absolute inset-0 pricing-grid-bg pointer-events-none" aria-hidden="true" />
          {/* Floating decorative orbs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <div
              className="absolute top-[20%] left-[10%] w-[300px] h-[300px] rounded-full opacity-[0.04]"
              style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }}
            />
            <div
              className="absolute bottom-[10%] right-[5%] w-[250px] h-[250px] rounded-full opacity-[0.03]"
              style={{ background: 'radial-gradient(circle, #d4a853 0%, transparent 70%)' }}
            />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center max-w-3xl mx-auto">
                <h2 className="font-heading text-3xl sm:text-4xl font-bold gradient-text-blue">
                  Simple, Transparent Pricing
                </h2>
                <p className="mt-4 text-lg text-muted-foreground font-sans">
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
              {PRICING_TIERS.map((tier, i) => {
                const TierIcon = tier.icon
                const isPro = tier.highlighted
                const isEnterprise = tier.name === 'Enterprise'
                return (
                  <FadeUp key={tier.name} delay={i * 0.1}>
                    <motion.div
                      whileHover={{ y: -8, scale: isPro ? 1.03 : 1.02 }}
                      transition={{ duration: 0.3 }}
                      className={`h-full ${isPro ? 'pricing-glow-pro' : ''} ${isEnterprise ? 'pricing-glow-enterprise' : ''}`}
                    >
                      <Card
                        className={`h-full relative overflow-hidden transition-all duration-300 ${
                          isPro
                            ? 'bg-navy-800/90 border-eari-blue/30 shadow-xl shadow-eari-blue/10 pricing-pattern-pro ring-1 ring-eari-blue/20'
                            : isEnterprise
                            ? 'bg-navy-800/80 border-[#d4a853]/20 pricing-pattern-enterprise'
                            : 'bg-navy-800/70 border-border/50 pricing-pattern'
                        }`}
                      >
                        {/* Shimmer border on recommended card */}
                        {isPro && (
                          <>
                            <div className="absolute top-0 left-0 right-0 h-[2px] shimmer-border" />
                            <div className="absolute bottom-0 left-0 right-0 h-[2px] shimmer-border" />
                            <div className="absolute top-0 bottom-0 left-0 w-[2px] shimmer-border" />
                            <div className="absolute top-0 bottom-0 right-0 w-[2px] shimmer-border" />
                          </>
                        )}

                        {/* Popular badge for Professional */}
                        {isPro && (
                          <div className="absolute -top-0 left-1/2 -translate-x-1/2 z-10">
                            <div className="relative">
                              <div className="absolute inset-0 bg-eari-blue/30 blur-md rounded-full" />
                              <Badge className="relative bg-eari-blue text-white font-heading text-xs px-4 py-1 shadow-lg shadow-eari-blue/40">
                                ★ Most Popular
                              </Badge>
                            </div>
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
                              <span className="font-heading text-5xl font-bold gradient-text-blue">{isAnnual ? tier.yearlyPrice : tier.price}</span>
                            ) : isEnterprise ? (
                              <span className="font-heading text-5xl font-bold gradient-text-gold">{isAnnual ? tier.yearlyPrice : tier.price}</span>
                            ) : (
                              <span className="font-heading text-5xl font-bold text-foreground">{isAnnual ? tier.yearlyPrice : tier.price}</span>
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
                                  ? 'pricing-cta-gradient text-white border-0'
                                  : isEnterprise
                                  ? 'pricing-cta-gold border-0'
                                  : 'bg-transparent border border-border/60 text-foreground hover:bg-navy-700 hover:border-border'
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

        {/* ─── CTA Banner ───────────────────────────────────────────────── */}
        <ParallaxSection speed={0.03} className="py-20 sm:py-28 bg-navy-900" id="faq">
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
                  <Button size="lg" className="group relative overflow-hidden bg-gradient-to-r from-eari-blue via-blue-600 to-cyan-600 hover:from-eari-blue-dark hover:via-blue-700 hover:to-cyan-700 text-white font-heading font-semibold h-12 px-8 text-base w-full sm:w-auto shadow-lg shadow-eari-blue/25 hover:shadow-eari-blue/40 transition-all duration-300">
                    <span className="relative z-10 flex items-center">
                      Start Free Assessment
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
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

      {/* AI Agent Assistant Panel */}
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

      {/* Back to top button */}
      <BackToTop />
    </div>
  )
}
