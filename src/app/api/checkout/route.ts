// E-ARI — Create Stripe Checkout Session
// POST /api/checkout
// Authenticates the user, creates a Stripe Checkout Session, and returns the URL.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createCheckoutSession, STRIPE_PRICE_PRO } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tier } = body as { tier?: string }

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

    // Professional tier → Stripe Checkout
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''
    const successUrl = `${origin}/api/checkout/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${origin}/pricing?canceled=1`

    const checkoutSession = await createCheckoutSession({
      userId: session.user.id,
      email: session.user.email,
      priceId: STRIPE_PRICE_PRO,
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
