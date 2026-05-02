'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Shield,
  Sparkles,
  CreditCard,
  AlertCircle,
  Crown,
  Lock,
  Award,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Navigation } from '@/components/shared/navigation'
import { Footer } from '@/components/shared/footer'

// ---------------------------------------------------------------------------
// Plan configuration
// ---------------------------------------------------------------------------

const PLANS: Record<string, {
  name: string
  price: string
  period: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
  features: string[]
}> = {
  professional: {
    name: 'Professional',
    price: '$29',
    period: '/month',
    icon: Award,
    color: 'text-eari-blue-light',
    bgColor: 'bg-eari-blue/15',
    borderColor: 'border-eari-blue/30',
    features: [
      'Unlimited assessments',
      'AI-powered narrative insights',
      'PDF report generation',
      'Historical benchmarking',
      'Custom weighting options',
      'Priority email support',
      'All 6 AI agents',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    icon: Crown,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
    borderColor: 'border-amber-500/30',
    features: [
      'Everything in Professional',
      'Multi-organization management',
      'Admin dashboard & analytics',
      'REST API access',
      'Custom branding & white-label',
      'SSO / SAML integration',
      'Dedicated account manager',
      'SLA guarantees',
    ],
  },
}

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
// Component
// ---------------------------------------------------------------------------

export default function CheckoutPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()

  const plan = searchParams.get('plan') || searchParams.get('tier') || 'professional'
  const planConfig = PLANS[plan]

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If the plan is invalid, default to professional
  const effectivePlan = planConfig ? plan : 'professional'
  const effectiveConfig = PLANS[effectivePlan]

  // ---------------------------------------------------------------------------
  // Handle checkout submission
  // ---------------------------------------------------------------------------

  const handleCheckout = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: effectivePlan }),
      })

      const data = await res.json()

      if (res.status === 401) {
        // Not authenticated — redirect to login with callback
        if (data.url) {
          router.push(data.url)
          return
        }
        router.push(`/auth/login?callbackUrl=${encodeURIComponent(`/checkout?plan=${effectivePlan}`)}`)
        return
      }

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        return
      }

      // Redirect to the Stripe Checkout URL or the contact form
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Loading state (session loading)
  // ---------------------------------------------------------------------------

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex flex-col bg-navy-900">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-eari-blue" />
        </main>
        <Footer />
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Unauthenticated state
  // ---------------------------------------------------------------------------

  if (sessionStatus === 'unauthenticated' || !session) {
    return (
      <div className="min-h-screen flex flex-col bg-navy-900">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="max-w-md mx-auto px-4 text-center">
            <FadeUp>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-eari-blue/15 mx-auto mb-6">
                <Lock className="h-8 w-8 text-eari-blue-light" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-foreground mb-3">
                Sign in to Continue
              </h1>
              <p className="text-muted-foreground font-sans mb-8">
                You need to be signed in to upgrade your plan. Sign in or create an account to proceed with checkout.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href={`/auth/login?callbackUrl=${encodeURIComponent(`/checkout?plan=${effectivePlan}`)}`}>
                  <Button className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading w-full sm:w-auto min-h-[44px]">
                    Sign In
                  </Button>
                </Link>
                <Link href={`/auth/register?callbackUrl=${encodeURIComponent(`/checkout?plan=${effectivePlan}`)}`}>
                  <Button variant="outline" className="border-border hover:bg-navy-700 text-foreground font-heading w-full sm:w-auto min-h-[44px]">
                    Create Account
                  </Button>
                </Link>
              </div>
            </FadeUp>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Already on this tier
  // ---------------------------------------------------------------------------

  const userTier = (session.user as Record<string, unknown>)?.tier as string | undefined
  const isAlreadyOnPlan = userTier === effectivePlan || (effectivePlan === 'professional' && userTier === 'enterprise')
  const PlanIcon = effectiveConfig.icon

  // ---------------------------------------------------------------------------
  // Render: Authenticated checkout
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          {/* Back link */}
          <FadeUp>
            <Link href="/pricing" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-sans mb-8 min-h-[44px]">
              <ArrowLeft className="h-4 w-4" />
              Back to Pricing
            </Link>
          </FadeUp>

          {/* Order Summary Card */}
          <FadeUp delay={0.05}>
            <div className="relative">
              {/* Gradient border glow for Pro */}
              {effectivePlan === 'professional' && (
                <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-eari-blue/40 via-cyan-500/30 to-eari-blue/40 blur-sm" />
              )}
              {effectivePlan === 'enterprise' && (
                <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-amber-500/40 via-yellow-500/30 to-amber-500/40 blur-sm" />
              )}

              <Card className="relative bg-navy-800 border-border/60 rounded-xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${effectiveConfig.bgColor}`}>
                        <PlanIcon className={`h-6 w-6 ${effectiveConfig.color}`} />
                      </div>
                      <div>
                        <CardTitle className="font-heading text-xl text-foreground">
                          {effectiveConfig.name} Plan
                        </CardTitle>
                        <CardDescription className="font-sans text-sm">
                          Order Summary
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={`${effectiveConfig.bgColor} ${effectiveConfig.color} ${effectiveConfig.borderColor} border font-heading`}>
                      {effectiveConfig.name}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Price */}
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-heading text-4xl font-bold text-foreground">
                        {effectiveConfig.price}
                      </span>
                      {effectiveConfig.period && (
                        <span className="text-muted-foreground font-sans text-sm">
                          {effectiveConfig.period}
                        </span>
                      )}
                    </div>
                    {effectivePlan === 'professional' && (
                      <p className="text-xs text-muted-foreground font-sans mt-1">
                        One-time payment per assessment
                      </p>
                    )}
                    {effectivePlan === 'enterprise' && (
                      <p className="text-xs text-muted-foreground font-sans mt-1">
                        Contact our sales team for custom pricing
                      </p>
                    )}
                  </div>

                  <Separator className="bg-border/40" />

                  {/* Account info */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-heading uppercase tracking-wider">Account</p>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-navy-700/50">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-eari-blue/20 text-eari-blue-light font-heading font-bold text-sm">
                        {(session.user.name || session.user.email || 'U')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-heading font-semibold text-foreground truncate">
                          {session.user.name || 'User'}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {session.user.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-border/40" />

                  {/* Features */}
                  <div>
                    <p className="text-xs text-muted-foreground font-heading uppercase tracking-wider mb-3">
                      What you&apos;ll get
                    </p>
                    <ul className="space-y-2.5">
                      {effectiveConfig.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5">
                          <div className={`flex h-5 w-5 items-center justify-center rounded-full ${effectiveConfig.bgColor} flex-shrink-0 mt-0.5`}>
                            <Check className={`h-3 w-3 ${effectiveConfig.color}`} />
                          </div>
                          <span className="text-sm text-foreground font-sans">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-4 pt-2">
                  {/* Error message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                    >
                      <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                      <p className="text-sm text-red-300 font-sans">{error}</p>
                    </motion.div>
                  )}

                  {/* Already on this plan */}
                  {isAlreadyOnPlan ? (
                    <div className="w-full flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      <p className="text-sm text-emerald-300 font-sans">
                        You&apos;re already on the {effectiveConfig.name} plan.
                      </p>
                    </div>
                  ) : (
                    /* CTA Button */
                    <Button
                      onClick={handleCheckout}
                      disabled={loading || isAlreadyOnPlan}
                      className={`w-full font-heading font-semibold h-12 text-base ${
                        effectivePlan === 'enterprise'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-navy-900 shadow-lg shadow-amber-500/20'
                          : 'bg-gradient-to-r from-eari-blue to-cyan-600 hover:from-eari-blue-dark hover:to-cyan-700 text-white shadow-lg shadow-eari-blue/20'
                      }`}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : effectivePlan === 'enterprise' ? (
                        <>
                          <Sparkles className="mr-2 h-5 w-5" />
                          Contact Sales
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-5 w-5" />
                          Proceed to Payment
                        </>
                      )}
                    </Button>
                  )}

                  {/* Trust signals */}
                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground font-sans">
                    <span className="flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5" />
                      Secure checkout
                    </span>
                    <span className="flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5" />
                      SSL encrypted
                    </span>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </FadeUp>

          {/* Compare plans link */}
          <FadeUp delay={0.1}>
            <div className="mt-8 text-center">
              <Link href="/pricing" className="inline-flex items-center gap-1.5 text-sm text-eari-blue-light hover:text-eari-blue transition-colors font-sans min-h-[44px]">
                Compare all plans
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </FadeUp>
        </div>
      </main>

      <Footer />
    </div>
  )
}
