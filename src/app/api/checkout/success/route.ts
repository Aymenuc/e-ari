// E-ARI — Post-Checkout Success Handler
// GET /api/checkout/success?session_id=xxx
// Verifies the Stripe session, updates the user tier (redundant with webhook
// but ensures it works even if the webhook fails), then redirects to /portal.

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { ALL_TIERS, type Tier } from '@/lib/tier'

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id')

  if (!sessionId) {
    return NextResponse.redirect(new URL('/pricing?error=missing_session', request.url))
  }

  try {
    // Retrieve the session from Stripe to verify it
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    // Only process completed sessions
    if (session.payment_status !== 'paid') {
      return NextResponse.redirect(new URL('/pricing?error=payment_failed', request.url))
    }

    const userId = session.metadata?.userId
    const rawTier = session.metadata?.tier

    // Allow-list validation — never write a tier value the platform
    // doesn't know about. Stripe metadata is set by us, but we still
    // validate to prevent any deploy accident from writing garbage into
    // the User.tier column (which gates billing + entitlements).
    const tier = ALL_TIERS.includes(rawTier as Tier) ? (rawTier as Tier) : null

    if (userId && tier) {
      // Update the user's tier and Stripe customer ID in the database (idempotent — safe to call multiple times)
      const updateData: { tier: Tier; stripeCustomerId?: string } = { tier }

      // Save the Stripe customer ID if available
      if (session.customer) {
        updateData.stripeCustomerId = typeof session.customer === 'string'
          ? session.customer
          : session.customer.id
      }

      await db.user.update({
        where: { id: userId },
        data: updateData,
      })
      console.log(`[checkout-success] User ${userId} upgraded to ${tier}`)
    } else if (userId && rawTier) {
      console.warn(`[checkout-success] Refusing to write unknown tier "${rawTier}" for user ${userId}`)
    }

    // Redirect to portal with success indicator
    return NextResponse.redirect(new URL('/portal?upgraded=true', request.url))
  } catch (err) {
    console.error('[checkout-success] Error verifying session:', err)
    return NextResponse.redirect(new URL('/pricing?error=verification_failed', request.url))
  }
}
