// E-ARI — Create Stripe Checkout Session
// POST /api/checkout
// Authenticates the user, creates a Stripe Checkout Session, and returns the URL.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  createCheckoutSession,
  STRIPE_PRICE_PRO,
  STRIPE_PRICE_PRO_YEARLY,
  STRIPE_PRICE_GROWTH,
  STRIPE_PRICE_GROWTH_YEARLY,
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
    const requestedTier = tier || 'professional'

    // Enterprise tier → redirect to a contact form (no real Stripe checkout)
    if (requestedTier === 'enterprise') {
      return NextResponse.json({
        url: '/pricing?contact=sales',
      })
    }

    // Resolve price ID based on tier + billing interval
    const isAnnual = billing === 'annual'
    let priceId: string
    if (requestedTier === 'growth') {
      priceId = isAnnual ? STRIPE_PRICE_GROWTH_YEARLY : STRIPE_PRICE_GROWTH
    } else {
      priceId = isAnnual ? STRIPE_PRICE_PRO_YEARLY : STRIPE_PRICE_PRO
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''
    const successUrl = `${origin}/api/checkout/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${origin}/pricing?canceled=1`

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
    console.error('[checkout] Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 },
    )
  }
}
