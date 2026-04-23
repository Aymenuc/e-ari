'use client'

import { useState } from 'react'
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
    description: 'Explore AI readiness with up to 3 assessments and taste the AI magic',
    icon: Zap,
    color: '#64748b',
    colorClass: 'text-slate-400',
    bgColor: 'bg-slate-500/15',
    borderColor: 'border-slate-500/30',
    features: [
      { text: '3 assessments per account', included: true, highlight: true },
      { text: 'Score breakdown by pillar', included: true },
      { text: 'Maturity band classification', included: true },
      { text: '1 AI Insight summary', included: true, highlight: true },
      { text: 'Literacy Agent (basic assessment)', included: true },
      { text: 'Community support', included: true },
      { text: 'PDF report generation', included: false },
      { text: 'Discovery Agent', included: false },
      { text: 'Report Agent', included: false },
      { text: 'AI Assistant', included: false },
      { text: 'Historical benchmarking', included: false },
      { text: 'Custom weighting options', included: false },
    ],
    highlighted: false,
    ctaText: 'Start Free',
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$59',
    yearlyPrice: '$49',
    period: '/month',
    yearlyPeriod: '/mo, billed yearly',
    description: 'Unlimited AI-powered assessments with all 6 agents and strategic outputs',
    icon: Sparkles,
    color: '#2563eb',
    colorClass: 'text-eari-blue-light',
    bgColor: 'bg-eari-blue/15',
    borderColor: 'border-eari-blue/30',
    features: [
      { text: 'Unlimited assessments', included: true, highlight: true },
      { text: 'All 6 AI Agents', included: true, highlight: true },
      { text: 'Full AI narrative insights', included: true },
      { text: 'PDF report with executive summary', included: true },
      { text: 'Historical benchmarking & sector comparison', included: true },
      { text: 'Custom weighting options', included: true },
      { text: 'AI Assistant (interactive Q&A)', included: true },
      { text: 'Roadmap & strategic recommendations', included: true },
      { text: 'Priority email support', included: true },
      { text: 'Dedicated account manager', included: false },
    ],
    highlighted: true,
    ctaText: 'Upgrade to Pro',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    yearlyPrice: 'Custom',
    period: '',
    yearlyPeriod: '',
    description: 'Organization-wide AI readiness at scale with dedicated support and custom pricing',
    icon: Shield,
    color: '#d4a853',
    colorClass: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
    borderColor: 'border-amber-500/30',
    features: [
      { text: 'Everything in Professional', included: true },
      { text: 'Multi-organization management', included: true },
      { text: 'Admin dashboard & analytics', included: true },
      { text: 'REST API access', included: true },
      { text: 'Custom branding & white-label', included: true },
      { text: 'SSO / SAML integration', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'SLA guarantees', included: true },
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
  { category: 'Assessments' },
  { feature: 'Assessments', starter: '3', professional: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'Pillar breakdowns', starter: true, professional: true, enterprise: true },
  { feature: 'Maturity classification', starter: true, professional: true, enterprise: true },
  { feature: 'Sector-specific questions', starter: true, professional: true, enterprise: true },
  { feature: 'AI Insight summary', starter: '1 summary', professional: 'Full narratives', enterprise: 'Full narratives' },

  { category: 'AI Agents' },
  { feature: 'Scoring Agent', starter: true, professional: true, enterprise: true },
  { feature: 'Insight Agent (AI narratives)', starter: 'Limited (1)', professional: true, enterprise: true },
  { feature: 'Discovery Agent', starter: false, professional: true, enterprise: true },
  { feature: 'Literacy Agent', starter: 'Basic', professional: true, enterprise: true },
  { feature: 'Report Agent (PDF)', starter: false, professional: true, enterprise: true },
  { feature: 'Assistant Agent (Q&A)', starter: false, professional: true, enterprise: true },

  { category: 'Analytics & Reporting' },
  { feature: 'Basic dashboard', starter: true, professional: true, enterprise: true },
  { feature: 'Historical benchmarking', starter: false, professional: true, enterprise: true },
  { feature: 'Sector comparison', starter: false, professional: true, enterprise: true },
  { feature: 'Custom weighting', starter: false, professional: true, enterprise: true },
  { feature: 'PDF report export', starter: false, professional: true, enterprise: true },
  { feature: 'Executive summary', starter: false, professional: true, enterprise: true },
  { feature: 'Roadmap & recommendations', starter: false, professional: true, enterprise: true },
  { feature: 'Risk assessment matrix', starter: false, professional: true, enterprise: true },

  { category: 'Organization' },
  { feature: 'Multi-org management', starter: false, professional: false, enterprise: true },
  { feature: 'Admin dashboard', starter: false, professional: false, enterprise: true },
  { feature: 'REST API access', starter: false, professional: false, enterprise: true },
  { feature: 'Custom branding / white-label', starter: false, professional: false, enterprise: true },
  { feature: 'SSO / SAML', starter: false, professional: false, enterprise: true },

  { category: 'Support' },
  { feature: 'Community support', starter: true, professional: true, enterprise: true },
  { feature: 'Priority email support', starter: false, professional: true, enterprise: true },
  { feature: 'Dedicated account manager', starter: false, professional: false, enterprise: true },
  { feature: 'SLA guarantees', starter: false, professional: false, enterprise: true },
]

// ---------------------------------------------------------------------------
// FAQ data
// ---------------------------------------------------------------------------

const FAQ_ITEMS = [
  {
    question: 'What happens when I upgrade to Professional?',
    answer: 'Your account is instantly upgraded to Professional with full access to all 6 AI agents, PDF reports, benchmarking, and the AI Assistant. Cancel anytime — if you cancel, your account reverts to the free Starter plan.',
  },
  {
    question: 'Is the Professional plan per user or per organization?',
    answer: 'Professional is priced per user — $59/month billed monthly or $49/month billed annually ($588/year). Each user gets unlimited assessments and full access to all 6 AI agents. For multi-user or organization-wide deployments, contact us for an Enterprise quote.',
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes, absolutely. Cancel at any time with no penalties or hidden fees. You retain access until the end of your current billing period, then your account reverts to the Starter plan.',
  },
  {
    question: 'What is the AI Insight summary on the free plan?',
    answer: 'The Starter plan includes 1 AI Insight summary per assessment — a brief strategic overview of your results. The Professional plan unlocks full AI narrative insights with detailed cross-pillar analysis, risk identification, and actionable recommendations.',
  },
  {
    question: 'How does the yearly billing work?',
    answer: 'Choosing yearly billing locks you in at $49/month ($588/year) instead of $59/month — saving you $120 per year. You can switch between monthly and yearly at any time; the new rate applies at your next billing cycle.',
  },
  {
    question: 'How does Enterprise pricing work?',
    answer: 'Enterprise pricing is custom and depends on your organization size, number of users, and required features (SSO, API access, custom branding, SLA). Contact us through the form and we will put together a tailored quote — typically within 24 hours.',
  },
  {
    question: 'What are the 6 AI Agents?',
    answer: 'E-ARI uses 6 specialized AI agents that work together: the Scoring Agent (deterministic pillar scoring), Insight Agent (LLM-powered strategic narratives), Discovery Agent (organizational AI landscape mapping), Report Agent (PDF report compilation), Literacy Agent (AI literacy assessment and learning paths), and the Assistant Agent (interactive Q&A about your results).',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes. All data is encrypted in transit and at rest. We use industry-standard security practices and never share your assessment data with third parties. Enterprise customers can also enable SSO/SAML for additional access control.',
  },
]

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PricingPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly')

  const userTier = sessionStatus === 'authenticated'
    ? ((session?.user as Record<string, unknown>)?.tier as string) || 'free'
    : null

  const isLoggedIn = sessionStatus === 'authenticated'
  const isFree = userTier === 'free' || userTier === null
  const isPro = userTier === 'professional'
  const isEnterprise = userTier === 'enterprise'

  // ---------------------------------------------------------------------------
  // Render CTA button per tier
  // ---------------------------------------------------------------------------

  function renderCTA(tierId: string, ctaText: string) {
    if (!isLoggedIn) {
      // Not logged in
      if (tierId === 'free') {
        return (
          <Link href="/auth/register" className="w-full">
            <Button variant="outline" className="w-full border-border hover:bg-navy-700 text-foreground font-heading min-h-[44px]">
              {ctaText}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )
      }
      if (tierId === 'professional') {
        return (
          <Link href="/auth/register" className="w-full">
            <Button className="w-full bg-gradient-to-r from-eari-blue to-cyan-600 hover:from-eari-blue-dark hover:to-cyan-700 text-white font-heading font-semibold shadow-lg shadow-eari-blue/20 min-h-[44px]">
              {ctaText}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )
      }
      if (tierId === 'enterprise') {
        return (
          <Link href="/auth/register" className="w-full">
            <Button className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-navy-900 font-heading font-semibold shadow-lg shadow-amber-500/20 min-h-[44px]">
              {ctaText}
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )
      }
    }

    // Logged in
    if (tierId === 'free') {
      return (
        <Button variant="outline" disabled className="w-full border-border text-muted-foreground font-heading min-h-[44px]">
          {isFree ? 'Current Plan' : 'Free'}
        </Button>
      )
    }

    if (tierId === 'professional') {
      if (isPro) {
        return (
          <Button disabled className="w-full bg-eari-blue/20 text-eari-blue-light border border-eari-blue/30 font-heading min-h-[44px]">
            Current Plan
          </Button>
        )
      }
      if (isEnterprise) {
        return (
          <Button disabled className="w-full bg-navy-700 text-muted-foreground font-heading min-h-[44px]">
            Included in Enterprise
          </Button>
        )
      }
      // Free tier user
      return (
        <Link href="/checkout?plan=professional" className="w-full">
          <Button className="w-full bg-gradient-to-r from-eari-blue to-cyan-600 hover:from-eari-blue-dark hover:to-cyan-700 text-white font-heading font-semibold shadow-lg shadow-eari-blue/20 min-h-[44px]">
            {ctaText}
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      )
    }

    if (tierId === 'enterprise') {
      if (isEnterprise) {
        return (
          <Button disabled className="w-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-heading min-h-[44px]">
            Current Plan
          </Button>
        )
      }
      return (
        <Link href="/checkout?plan=enterprise" className="w-full">
          <Button className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-navy-900 font-heading font-semibold shadow-lg shadow-amber-500/20 min-h-[44px]">
            {ctaText}
            <ArrowUpRight className="ml-2 h-4 w-4" />
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
                <span className="gradient-text-blue">Unlocked Your Way</span>
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
                    Save 17%
                  </Badge>
                </button>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* --- Pricing Cards --- */}
        <section className="pb-16 sm:pb-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
              {PRICING_TIERS.map((tier, index) => {
                const TierIcon = tier.icon
                const displayPrice = billingPeriod === 'yearly' ? tier.yearlyPrice : tier.price
                const displayPeriod = billingPeriod === 'yearly' ? tier.yearlyPeriod : tier.period
                return (
                  <FadeUp key={tier.id} delay={index * 0.08}>
                    <div className={`relative h-full ${tier.highlighted ? 'pricing-glow-pro' : ''}`}>
                      {/* Recommended badge */}
                      {tier.highlighted && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                          <Badge className="bg-gradient-to-r from-eari-blue to-cyan-600 text-white border-0 font-heading text-xs px-3 py-1 shadow-lg shadow-eari-blue/20">
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
                            {tier.id === 'professional' && billingPeriod === 'yearly' && (
                              <p className="mt-1 text-xs text-emerald-400 font-sans">
                                Save $198 per year (2 months free)
                              </p>
                            )}
                            {tier.id === 'enterprise' && billingPeriod === 'yearly' && (
                              <p className="mt-1 text-xs text-emerald-400 font-sans">
                                Save $990 per year (2 months free)
                              </p>
                            )}
                          </div>
                        </CardHeader>

                        {/* Agent visual for Professional */}
                        {tier.id === 'professional' && (
                          <div className="px-6 pb-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {AGENT_ICONS.map((agent) => {
                                const AgentIcon = agent.icon
                                return (
                                  <div
                                    key={agent.name}
                                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-eari-blue/10 border border-eari-blue/20"
                                  >
                                    <AgentIcon className="h-3 w-3 text-eari-blue-light" />
                                    <span className="text-[10px] font-heading text-eari-blue-light">{agent.name}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

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
                          <th className="text-left p-4 font-heading font-semibold text-foreground">
                            Feature
                          </th>
                          <th className="text-center p-4 font-heading font-semibold text-muted-foreground w-28">
                            Starter
                          </th>
                          <th className="text-center p-4 font-heading font-semibold text-eari-blue-light w-28 bg-eari-blue/5">
                            Professional
                          </th>
                          <th className="text-center p-4 font-heading font-semibold text-amber-400 w-28">
                            Enterprise
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {COMPARISON_FEATURES.map((item, i) => {
                          // Category row
                          if ('category' in item) {
                            return (
                              <tr key={`cat-${i}`} className="bg-navy-700/30">
                                <td colSpan={4} className="px-4 py-2.5 font-heading font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                                  {item.category}
                                </td>
                              </tr>
                            )
                          }

                          // Feature row
                          return (
                            <tr key={`feat-${i}`} className="border-b border-border/20 hover:bg-navy-700/20 transition-colors">
                              <td className="px-4 py-3 text-foreground font-sans">
                                {item.feature}
                              </td>
                              {(['starter', 'professional', 'enterprise'] as const).map((tier) => {
                                const value = item[tier]
                                const isProCol = tier === 'professional'
                                return (
                                  <td key={tier} className={`text-center px-4 py-3 ${isProCol ? 'bg-eari-blue/5' : ''}`}>
                                    {typeof value === 'boolean' ? (
                                      value ? (
                                        <Check className="h-4 w-4 text-emerald-400 mx-auto" />
                                      ) : (
                                        <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                                      )
                                    ) : (
                                      <span className={`font-sans text-xs ${value === 'Limited (1)' || value === 'Basic' ? 'text-amber-400' : 'text-foreground'}`}>{value}</span>
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
        <section className="pb-16 sm:pb-20">
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
                          <Button size="lg" className="bg-gradient-to-r from-eari-blue to-cyan-600 hover:from-eari-blue-dark hover:to-cyan-700 text-white font-heading font-semibold shadow-lg shadow-eari-blue/20 min-h-[44px]">
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
                        <Button size="lg" className="bg-gradient-to-r from-eari-blue to-cyan-600 hover:from-eari-blue-dark hover:to-cyan-700 text-white font-heading font-semibold shadow-lg shadow-eari-blue/20 min-h-[44px]">
                          Upgrade to Pro
                          <ArrowUpRight className="ml-2 h-5 w-5" />
                        </Button>
                      </Link>
                    ) : isPro ? (
                      <Link href="/checkout?plan=enterprise">
                        <Button size="lg" className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-navy-900 font-heading font-semibold shadow-lg shadow-amber-500/20 min-h-[44px]">
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
