'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  X,
  Zap,
  Sparkles,
  Shield,
  ArrowRight,
  ArrowUpRight,
  TrendingUp,
  ChevronDown,
  HelpCircle,
  CreditCard,
  Lock,
  Users,
  Brain,
  FileText,
  BarChart3,
  MessageSquare,
  Compass,
  BookOpen,
  Bot,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Navigation } from '@/components/shared/navigation'
import { Footer } from '@/components/shared/footer'

// ---------------------------------------------------------------------------
// Animation helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Billing period type
// ---------------------------------------------------------------------------

type BillingPeriod = 'monthly' | 'yearly'

// ---------------------------------------------------------------------------
// Pricing tiers data
// ---------------------------------------------------------------------------

const PRICING_TIERS = [
  {
    id: 'free',
    name: 'Starter',
    price: '$0',
    yearlyPrice: '$0',
    period: 'forever',
    yearlyPeriod: '',
    description: '1 assessment and 3 pulse checks per month to explore AI readiness at no cost',
    icon: Zap,
    color: '#64748b',
    colorClass: 'text-slate-400',
    bgColor: 'bg-slate-500/15',
    borderColor: 'border-slate-500/30',
    features: [
      { text: '1 full assessment / month', included: true, highlight: true },
      { text: '3 pulse checks / month', included: true },
      { text: '1 team member', included: true },
      { text: 'Basic Literacy Hub', included: true },
      { text: '1 .docx report / month (€29 add-on)', included: true },
      { text: '1 sector benchmark', included: true },
      { text: 'Community support', included: true },
      { text: 'Admin portal', included: false },
      { text: 'API access', included: false },
    ],
    highlighted: false,
    ctaText: 'Start Free',
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '€49',
    yearlyPrice: '€40.83',
    period: '/month',
    yearlyPeriod: '/mo, billed yearly',
    description: '5 assessments and 15 pulse checks per month with full Literacy Hub access',
    icon: Sparkles,
    color: '#2563eb',
    colorClass: 'text-eari-blue-light',
    bgColor: 'bg-eari-blue/15',
    borderColor: 'border-eari-blue/30',
    features: [
      { text: '5 full assessments / month', included: true, highlight: true },
      { text: '15 pulse checks / month', included: true },
      { text: '5 team members', included: true },
      { text: 'Full Literacy library', included: true },
      { text: '3 .docx reports included', included: true },
      { text: '5 sector benchmarks', included: true },
      { text: 'Basic admin portal', included: true },
      { text: 'Email support (48h)', included: true },
      { text: 'API access', included: false },
    ],
    highlighted: true,
    ctaText: 'Get Professional',
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '€149',
    yearlyPrice: '€124.17',
    period: '/month',
    yearlyPeriod: '/mo, billed yearly',
    description: '20 assessments and 50 pulse checks with full admin portal, all sectors, and read-only API',
    icon: TrendingUp,
    color: '#8b5cf6',
    colorClass: 'text-violet-400',
    bgColor: 'bg-violet-500/15',
    borderColor: 'border-violet-500/30',
    features: [
      { text: '20 full assessments / month', included: true, highlight: true },
      { text: '50 pulse checks / month', included: true },
      { text: '25 team members', included: true },
      { text: 'Full library + Learning Paths', included: true },
      { text: 'Unlimited .docx reports', included: true },
      { text: 'All sectors', included: true },
      { text: 'Full admin portal', included: true },
      { text: 'Read-only API access', included: true },
      { text: 'Chat + Quarterly Review', included: true, highlight: true },
    ],
    highlighted: false,
    ctaText: 'Get Growth',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    yearlyPrice: 'Custom',
    period: '',
    yearlyPeriod: '',
    description: 'Unlimited everything with SSO/SAML, full CRUD API, and a dedicated CSM',
    icon: Shield,
    color: '#d4a853',
    colorClass: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
    borderColor: 'border-amber-500/30',
    features: [
      { text: 'Unlimited assessments', included: true, highlight: true },
      { text: 'Unlimited pulse checks', included: true },
      { text: 'Unlimited team members', included: true },
      { text: 'Full library + Custom Content', included: true },
      { text: 'Unlimited reports + Custom Branding', included: true },
      { text: 'All sectors + Custom Benchmarks', included: true },
      { text: 'Full admin portal + SSO/SAML', included: true },
      { text: 'Full CRUD API access', included: true },
      { text: 'Dedicated CSM + SLA', included: true, highlight: true },
    ],
    highlighted: false,
    ctaText: 'Contact Sales',
  },
]

// ---------------------------------------------------------------------------
// Agent icons for professional tier visual
// ---------------------------------------------------------------------------

const AGENT_ICONS = [
  { name: 'Scoring', icon: BarChart3 },
  { name: 'Insight', icon: Brain },
  { name: 'Discovery', icon: Compass },
  { name: 'Report', icon: FileText },
  { name: 'Literacy', icon: BookOpen },
  { name: 'Assistant', icon: Bot },
]

// ---------------------------------------------------------------------------
// Comparison table data
// ---------------------------------------------------------------------------

const COMPARISON_FEATURES = [
  { category: 'Usage' },
  { feature: 'Full Assessments / month', starter: '1', professional: '5', growth: '20', enterprise: 'Unlimited' },
  { feature: 'Pulse Checks / month', starter: '3', professional: '15', growth: '50', enterprise: 'Unlimited' },
  { feature: 'Team Members', starter: '1', professional: '5', growth: '25', enterprise: 'Unlimited' },

  { category: 'Reports' },
  { feature: '.docx Report Downloads', starter: '1/mo (€29 add-on)', professional: '3 included', growth: 'Unlimited', enterprise: 'Unlimited + Custom Branding' },

  { category: 'Learning & Benchmarking' },
  { feature: 'Literacy Hub Access', starter: 'Basic only', professional: 'Full library', growth: 'Full + Learning Paths', enterprise: 'Full + Custom Content' },
  { feature: 'Sector Benchmarking', starter: '1 sector', professional: '5 sectors', growth: 'All sectors', enterprise: 'All + Custom Benchmarks' },

  { category: 'Administration & API' },
  { feature: 'Admin Portal', starter: false, professional: 'Basic', growth: 'Full', enterprise: 'Full + SSO/SAML' },
  { feature: 'API Access', starter: false, professional: false, growth: 'Read-only', enterprise: 'Full CRUD' },

  { category: 'Support' },
  { feature: 'Support Level', starter: 'Community', professional: 'Email (48h)', growth: 'Chat + Quarterly Review', enterprise: 'Dedicated CSM + SLA' },
  { feature: 'Annual Discount', starter: '–', professional: '€40.83/mo (17% off)', growth: '€124.17/mo (17% off)', enterprise: 'Custom' },
]

// ---------------------------------------------------------------------------
// FAQ data
// ---------------------------------------------------------------------------

const FAQ_ITEMS = [
  {
    question: 'What is the difference between Professional and Growth?',
    answer: 'Professional is for individual practitioners or small teams — 5 assessments, 15 pulse checks, 5 team members, and basic admin. Growth is built for scaling organizations: 20 assessments, 50 pulse checks, 25 team members, all sector benchmarks, unlimited .docx reports, full admin portal, read-only API, and quarterly business reviews with our team.',
  },
  {
    question: 'Are the plan limits per account or per user?',
    answer: 'Limits are per account, shared across all team members. For example, Professional gives your account 5 assessments and 15 pulse checks per month total, used across your 5 team members.',
  },
  {
    question: 'How does annual billing work?',
    answer: 'Paid plans support monthly or annual billing. Professional is €49/month or €490/year (€40.83/mo, save 17%). Growth is €149/month or €1,490/year (€124.17/mo, save 17%). Enterprise is custom pricing based on scope and support needs.',
  },
  {
    question: 'What is the €29 .docx add-on on Starter?',
    answer: 'Starter includes 1 .docx report download per month. If you need additional downloads without upgrading, you can purchase extra reports at €29 each. Professional includes 3, and Growth and Enterprise are unlimited.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes, cancel at any time with no penalties. You retain access until the end of your current billing period, then your account reverts to Starter.',
  },
  {
    question: 'What does the Quarterly Review on Growth include?',
    answer: 'A quarterly 1-hour call with an E-ARI specialist to review your readiness scores, benchmark progress, and prioritize improvement initiatives. It is a structured advisory session, not a sales call.',
  },
  {
    question: 'What does Enterprise add over Growth?',
    answer: 'Unlimited usage across all features, custom sector benchmarks, custom branding on reports, SSO/SAML, full CRUD API, and a dedicated Customer Success Manager with SLA-backed response times.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes. All data is encrypted in transit and at rest. We never share your assessment data with third parties. Enterprise customers can additionally enable SSO/SAML for centralized access control.',
  },
]

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PricingPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly')
  const [enterprisePriceLabel, setEnterprisePriceLabel] = useState('Custom')

  const userTier = sessionStatus === 'authenticated'
    ? ((session?.user as Record<string, unknown>)?.tier as string) || 'free'
    : null

  const isLoggedIn = sessionStatus === 'authenticated'
  const isFree = userTier === 'free' || userTier === null
  const isPro = userTier === 'professional'
  const isGrowth = userTier === 'growth'
  const isEnterprise = userTier === 'enterprise'

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
    tier.id === 'enterprise'
      ? { ...tier, price: enterprisePriceLabel, yearlyPrice: enterprisePriceLabel }
      : tier
  )

  // ---------------------------------------------------------------------------
  // Render CTA button per tier
  // ---------------------------------------------------------------------------

  function renderCTA(tierId: string, ctaText: string) {
    if (!isLoggedIn) {
      if (tierId === 'free') {
        return (
          <Link href="/auth/register" className="w-full">
            <Button variant="outline" className="w-full border-border hover:bg-navy-700 text-foreground font-heading min-h-[44px]">
              {ctaText} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )
      }
      if (tierId === 'professional') {
        return (
          <Link href="/auth/register" className="w-full">
            <Button className="w-full bg-eari-blue hover:bg-eari-blue-dark text-white font-heading font-semibold shadow-md shadow-eari-blue/15 min-h-[44px]">
              {ctaText} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )
      }
      if (tierId === 'growth') {
        return (
          <Link href="/auth/register" className="w-full">
            <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white font-heading font-semibold shadow-md shadow-violet-900/20 min-h-[44px]">
              {ctaText} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )
      }
      if (tierId === 'enterprise') {
        return (
          <Link href="/contact" className="w-full">
            <Button className="w-full bg-[#c9a227] hover:bg-[#b89220] text-navy-950 font-heading font-semibold shadow-md shadow-black/15 min-h-[44px]">
              {ctaText} <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )
      }
    }

    // Logged in
    if (tierId === 'free') {
      return (
        <Button variant="outline" disabled className="w-full border-border text-muted-foreground font-heading min-h-[44px]">
          {isFree ? 'Current Plan' : 'Starter'}
        </Button>
      )
    }
    if (tierId === 'professional') {
      if (isPro) return <Button disabled className="w-full bg-eari-blue/20 text-eari-blue-light border border-eari-blue/30 font-heading min-h-[44px]">Current Plan</Button>
      if (isGrowth || isEnterprise) return <Button disabled className="w-full bg-navy-700 text-muted-foreground font-heading min-h-[44px]">Included in your plan</Button>
      return (
        <Link href="/checkout?plan=professional" className="w-full">
          <Button className="w-full bg-eari-blue hover:bg-eari-blue-dark text-white font-heading font-semibold shadow-md shadow-eari-blue/15 min-h-[44px]">
            {ctaText} <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      )
    }
    if (tierId === 'growth') {
      if (isGrowth) return <Button disabled className="w-full bg-violet-500/20 text-violet-400 border border-violet-500/30 font-heading min-h-[44px]">Current Plan</Button>
      if (isEnterprise) return <Button disabled className="w-full bg-navy-700 text-muted-foreground font-heading min-h-[44px]">Included in Enterprise</Button>
      return (
        <Link href="/checkout?plan=growth" className="w-full">
          <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white font-heading font-semibold shadow-md shadow-violet-900/20 min-h-[44px]">
            {ctaText} <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      )
    }
    if (tierId === 'enterprise') {
      if (isEnterprise) return <Button disabled className="w-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-heading min-h-[44px]">Current Plan</Button>
      return (
        <Link href="/contact" className="w-full">
          <Button className="w-full bg-[#c9a227] hover:bg-[#b89220] text-navy-950 font-heading font-semibold shadow-md shadow-black/15 min-h-[44px]">
            {ctaText} <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      )
    }
    return null
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />

      <main className="flex-1">
        {/* --- Hero Section --- */}
        <section className="relative pt-20 pb-12 sm:pt-28 sm:pb-16">
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d1117 40%, #162a4a 70%, #1e3a5f 100%)' }}
            />
            <div
              className="mesh-blob absolute -top-32 -left-32 w-[400px] h-[400px] rounded-full opacity-15"
              style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }}
            />
            <div
              className="mesh-blob absolute top-1/2 right-0 w-[500px] h-[500px] rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle, #d4a853 0%, transparent 70%)', animationDelay: '-7s' }}
            />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <FadeUp>
              <Badge variant="outline" className="mb-4 font-mono text-xs border-border/60 text-muted-foreground/80 bg-navy-800/50">
                Pricing
              </Badge>
            </FadeUp>
            <FadeUp delay={0.05}>
              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
                AI Readiness,{' '}
                <span className="text-eari-blue-light font-semibold">Unlocked Your Way</span>
              </h1>
            </FadeUp>
            <FadeUp delay={0.1}>
              <p className="mt-4 text-lg text-muted-foreground font-sans max-w-2xl mx-auto leading-relaxed">
                Start free with 3 assessments and 1 AI Insight summary. Upgrade for unlimited assessments and the full power of all 6 AI agents.
              </p>
            </FadeUp>

            {/* Social proof badge */}
            <FadeUp delay={0.15}>
              <div className="mt-6 flex items-center justify-center gap-2">
                <div className="flex -space-x-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-7 w-7 rounded-full border-2 border-navy-900 flex items-center justify-center text-[10px] font-heading font-bold"
                      style={{
                        backgroundColor: ['#2563eb20', '#d4a85320', '#10b98120', '#8b5cf620'][i],
                        color: ['#2563eb', '#d4a853', '#10b981', '#8b5cf6'][i],
                      }}
                    >
                      {['E', 'A', 'R', 'I'][i]}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground font-sans">
                  Trusted by <span className="text-foreground font-semibold">500+</span> organizations
                </span>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* --- Billing Toggle --- */}
        <section className="pb-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex justify-center">
            <FadeUp>
              <div className="flex items-center gap-3 p-1 rounded-xl bg-navy-800 border border-border/60">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`px-4 py-2 rounded-lg text-sm font-heading font-semibold transition-all min-h-[40px] ${
                    billingPeriod === 'monthly'
                      ? 'bg-eari-blue text-white shadow-lg shadow-eari-blue/20'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod('yearly')}
                  className={`px-4 py-2 rounded-lg text-sm font-heading font-semibold transition-all min-h-[40px] flex items-center gap-2 ${
                    billingPeriod === 'yearly'
                      ? 'bg-eari-blue text-white shadow-lg shadow-eari-blue/20'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Yearly
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0">
                    Save 20%
                  </Badge>
                </button>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* --- Pricing Cards --- */}
        <section className="pb-16 sm:pb-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 max-w-7xl mx-auto">
              {pricingTiers.map((tier, index) => {
                const TierIcon = tier.icon
                const displayPrice = billingPeriod === 'yearly' ? tier.yearlyPrice : tier.price
                const displayPeriod = billingPeriod === 'yearly' ? tier.yearlyPeriod : tier.period
                return (
                  <FadeUp key={tier.id} delay={index * 0.08}>
                    <div className={`relative h-full ${tier.highlighted ? 'pricing-glow-pro' : ''}`}>
                      {/* Recommended badge */}
                      {tier.highlighted && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                          <Badge className="bg-eari-blue text-white border-0 font-heading text-xs px-3 py-1 shadow-md shadow-eari-blue/15">
                            Most Popular
                          </Badge>
                        </div>
                      )}

                      <Card className={`h-full flex flex-col bg-navy-800 border-border/60 ${tier.highlighted ? 'ring-2 ring-eari-blue/40 pricing-pattern-pro' : 'pricing-pattern'}`}>
                        <CardHeader className="pb-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tier.bgColor}`}>
                              <TierIcon className={`h-5 w-5 ${tier.colorClass}`} />
                            </div>
                            <CardTitle className="font-heading text-lg text-foreground">
                              {tier.name}
                            </CardTitle>
                          </div>
                          <CardDescription className="font-sans text-sm">
                            {tier.description}
                          </CardDescription>
                          <div className="mt-3">
                            <div className="flex items-baseline gap-1">
                              <AnimatePresence mode="wait">
                                <motion.span
                                  key={displayPrice + displayPeriod}
                                  initial={{ opacity: 0, y: -8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 8 }}
                                  transition={{ duration: 0.2 }}
                                  className="font-heading text-3xl font-bold text-foreground"
                                >
                                  {displayPrice}
                                </motion.span>
                              </AnimatePresence>
                              {displayPeriod && (
                                <span className="text-muted-foreground font-sans text-sm">
                                  {displayPeriod}
                                </span>
                              )}
                            </div>
                            {billingPeriod === 'yearly' && tier.id === 'professional' && (
                              <p className="mt-1 text-xs text-emerald-400 font-sans">Save €98/yr (17% off)</p>
                            )}
                            {billingPeriod === 'yearly' && tier.id === 'growth' && (
                              <p className="mt-1 text-xs text-emerald-400 font-sans">Save €298/yr (17% off)</p>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="flex-1">
                          <Separator className="mb-4 bg-border/40" />
                          <ul className="space-y-2.5">
                            {tier.features.map((feature) => (
                              <li key={feature.text} className="flex items-start gap-2.5">
                                {feature.included ? (
                                  <div className={`flex h-5 w-5 items-center justify-center rounded-full ${feature.highlight ? 'bg-eari-blue/20' : tier.bgColor} flex-shrink-0 mt-0.5`}>
                                    <Check className={`h-3 w-3 ${feature.highlight ? 'text-eari-blue-light' : tier.colorClass}`} />
                                  </div>
                                ) : (
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-700/50 flex-shrink-0 mt-0.5">
                                    <X className="h-3 w-3 text-muted-foreground/50" />
                                  </div>
                                )}
                                <span className={`text-sm font-sans ${feature.included ? (feature.highlight ? 'text-foreground font-semibold' : 'text-foreground') : 'text-muted-foreground/60'}`}>
                                  {feature.text}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>

                        <CardFooter className="pt-4">
                          {renderCTA(tier.id, tier.ctaText)}
                        </CardFooter>
                      </Card>
                    </div>
                  </FadeUp>
                )
              })}
            </div>
          </div>
        </section>

        {/* --- Feature Comparison Table --- */}
        <section className="pb-16 sm:pb-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground text-center mb-2">
                Compare All Features
              </h2>
              <p className="text-muted-foreground font-sans text-center mb-8">
                A detailed breakdown of what each plan includes
              </p>
            </FadeUp>

            <FadeUp delay={0.05}>
              <Card className="bg-navy-800 border-border/60 overflow-hidden">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      {/* Table header */}
                      <thead>
                        <tr className="border-b border-border/40">
                          <th className="text-left p-4 font-heading font-semibold text-foreground min-w-[160px]">Feature</th>
                          <th className="text-center p-3 font-heading font-semibold text-muted-foreground w-28">Starter</th>
                          <th className="text-center p-3 font-heading font-semibold text-eari-blue-light w-28 bg-eari-blue/5">Professional</th>
                          <th className="text-center p-3 font-heading font-semibold text-violet-400 w-28 bg-violet-500/5">Growth</th>
                          <th className="text-center p-3 font-heading font-semibold text-amber-400 w-28">Enterprise</th>
                        </tr>
                      </thead>
                      <tbody>
                        {COMPARISON_FEATURES.map((item, i) => {
                          if ('category' in item) {
                            return (
                              <tr key={`cat-${i}`} className="bg-navy-700/30">
                                <td colSpan={5} className="px-4 py-2.5 font-heading font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                                  {item.category}
                                </td>
                              </tr>
                            )
                          }
                          return (
                            <tr key={`feat-${i}`} className="border-b border-border/20 hover:bg-navy-700/20 transition-colors">
                              <td className="px-4 py-3 text-foreground font-sans text-sm">{item.feature}</td>
                              {(['starter', 'professional', 'growth', 'enterprise'] as const).map((col) => {
                                const value = (item as Record<string, unknown>)[col]
                                return (
                                  <td key={col} className={`text-center px-3 py-3 ${col === 'professional' ? 'bg-eari-blue/5' : col === 'growth' ? 'bg-violet-500/5' : ''}`}>
                                    {typeof value === 'boolean' ? (
                                      value
                                        ? <Check className="h-4 w-4 text-emerald-400 mx-auto" />
                                        : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                                    ) : (
                                      <span className="font-sans text-xs text-foreground">{value as string}</span>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </FadeUp>
          </div>
        </section>

        {/* --- FAQ Section --- */}
        <section id="faq" className="pb-16 sm:pb-20 scroll-mt-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground text-center mb-2">
                Frequently Asked Questions
              </h2>
              <p className="text-muted-foreground font-sans text-center mb-8">
                Everything you need to know about E-ARI pricing
              </p>
            </FadeUp>

            <FadeUp delay={0.05}>
              <Card className="bg-navy-800 border-border/60">
                <CardContent className="p-0">
                  <Accordion type="single" collapsible className="w-full">
                    {FAQ_ITEMS.map((faq, index) => (
                      <AccordionItem key={index} value={`faq-${index}`} className="border-border/40">
                        <AccordionTrigger className="px-6 py-4 font-heading font-semibold text-foreground text-left hover:no-underline hover:bg-navy-700/30 transition-colors min-h-[44px]">
                          <span className="flex items-center gap-2">
                            <HelpCircle className="h-4 w-4 text-eari-blue-light flex-shrink-0" />
                            {faq.question}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-4 text-sm text-muted-foreground font-sans leading-relaxed">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </FadeUp>
          </div>
        </section>

        {/* --- CTA Section --- */}
        <section className="pb-16 sm:pb-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <Card className="bg-navy-800 border-border/60 overflow-hidden relative">
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'radial-gradient(ellipse at 30% 50%, rgba(37,99,235,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, rgba(212,168,83,0.06) 0%, transparent 50%)',
                    }}
                  />
                </div>
                <CardContent className="relative z-10 p-8 sm:p-12 text-center">
                  <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-3">
                    Ready to Assess Your AI Readiness?
                  </h2>
                  <p className="text-muted-foreground font-sans max-w-xl mx-auto mb-8 leading-relaxed">
                    Start free with 3 assessments and 1 AI Insight summary. Upgrade anytime to unlock all 6 AI agents, PDF reports, and strategic recommendations.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {!isLoggedIn ? (
                      <>
                        <Link href="/auth/register">
                          <Button size="lg" className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading font-semibold shadow-md shadow-eari-blue/15 min-h-[44px]">
                            Start Free
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </Button>
                        </Link>
                        <Link href="/auth/login">
                          <Button variant="outline" size="lg" className="border-border hover:bg-navy-700 text-foreground font-heading min-h-[44px]">
                            Sign In
                          </Button>
                        </Link>
                      </>
                    ) : isFree ? (
                      <Link href="/checkout?plan=professional">
                        <Button size="lg" className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading font-semibold shadow-md shadow-eari-blue/15 min-h-[44px]">
                          Upgrade to Pro
                          <ArrowUpRight className="ml-2 h-5 w-5" />
                        </Button>
                      </Link>
                    ) : isPro ? (
                      <Link href="/checkout?plan=enterprise">
                        <Button size="lg" className="bg-[#c9a227] hover:bg-[#b89220] text-navy-950 font-heading font-semibold shadow-md shadow-black/15 min-h-[44px]">
                          Contact Sales for Enterprise
                          <ArrowUpRight className="ml-2 h-5 w-5" />
                        </Button>
                      </Link>
                    ) : (
                      <Link href="/portal">
                        <Button size="lg" className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading font-semibold min-h-[44px]">
                          Go to Dashboard
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            </FadeUp>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
