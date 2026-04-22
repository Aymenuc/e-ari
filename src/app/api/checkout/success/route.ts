// E-ARI — Post-Checkout Success Handler
// GET /api/checkout/success?session_id=xxx
// Verifies the Stripe session, updates the user tier (redundant with webhook
// but ensures it works even if the webhook fails), then redirects to /portal.

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'

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
    const tier = session.metadata?.tier

    if (userId && tier) {
      // Update the user's tier and Stripe customer ID in the database (idempotent — safe to call multiple times)
      const updateData: { tier: string; stripeCustomerId?: string } = { tier }

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
    }

    // Redirect to portal with success indicator
    return NextResponse.redirect(new URL('/portal?upgraded=true', request.url))
  } catch (err) {
    console.error('[checkout-success] Error verifying session:', err)
    return NextResponse.redirect(new URL('/pricing?error=verification_failed', request.url))
  }
}
