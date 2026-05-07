// E-ARI — Create Stripe Checkout Session
// POST /api/checkout
// Authenticates the user, creates a Stripe Checkout Session, and returns the URL.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import Stripe from 'stripe'
import { authOptions } from '@/lib/auth'
import { getBaseUrl } from '@/lib/site-url'
import {
  createCheckoutSession,
  STRIPE_PRICE_PRO,
  STRIPE_PRICE_PRO_YEARLY,
  STRIPE_PRICE_GROWTH,
  STRIPE_PRICE_GROWTH_YEARLY,
  isStripeSecretConfigured,
} from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tier, billing } = body as { tier?: string; billing?: string }

    // ── Authenticate ──────────────────────────────────────────────────────
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session.user.email) {
      // Return 401 with a login redirect URL so the client can send the user there
      const callbackUrl = tier
        ? `/checkout?plan=${tier}`
        : '/checkout'
      return NextResponse.json(
        {
          error: 'Authentication required',
          url: `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        },
        { status: 401 },
      )
    }

    // ── Determine tier ────────────────────────────────────────────────────
    // Allow-list check — caller is the browser, we never trust an arbitrary
    // string into Stripe metadata. Anything unknown falls back to Pro.
    const ALLOWED_REQUEST_TIERS = ['professional', 'growth', 'enterprise'] as const
    type RequestTier = (typeof ALLOWED_REQUEST_TIERS)[number]
    const requestedTier: RequestTier = ALLOWED_REQUEST_TIERS.includes(tier as RequestTier)
      ? (tier as RequestTier)
      : 'professional'

    // Enterprise tier → redirect to a contact form (no real Stripe checkout)
    if (requestedTier === 'enterprise') {
      return NextResponse.json({
        url: '/pricing?contact=sales',
      })
    }

    // Resolve price ID based on tier + billing interval. Billing is also
    // allow-list checked — anything other than 'annual' is monthly.
    const isAnnual = billing === 'annual'
    let priceId: string
    if (requestedTier === 'growth') {
      priceId = isAnnual ? STRIPE_PRICE_GROWTH_YEARLY : STRIPE_PRICE_GROWTH
    } else {
      priceId = isAnnual ? STRIPE_PRICE_PRO_YEARLY : STRIPE_PRICE_PRO
    }

    // Stripe requires absolute URLs; Origin can be missing on some server-side paths.
    const origin = (
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      getBaseUrl()
    ).replace(/\/+$/, '')
    const successUrl = `${origin}/api/checkout/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${origin}/pricing?canceled=1`

    if (!isStripeSecretConfigured()) {
      console.error('[checkout] STRIPE_SECRET_KEY is missing or placeholder.')
      return NextResponse.json(
        { error: 'Billing is temporarily unavailable.' },
        { status: 503 },
      )
    }

    if (priceId.includes('placeholder')) {
      console.error(
        '[checkout] Placeholder price ID for tier=%s billing=%s — check STRIPE_PRICE_* or STRIPE_*_PRICE_ID env vars.',
        requestedTier,
        billing || 'monthly',
      )
      return NextResponse.json(
        { error: 'Billing is temporarily unavailable.' },
        { status: 503 },
      )
    }

    const checkoutSession = await createCheckoutSession({
      userId: session.user.id,
      email: session.user.email,
      priceId,
      tier: requestedTier,
      successUrl,
      cancelUrl,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error('[checkout] Stripe error:', error.type, error.message, error.code)
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 502 },
      )
    }
    console.error('[checkout] Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 },
    )
  }
}
