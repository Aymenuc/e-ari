// E-ARI — Stripe Billing Portal Session
// POST /api/billing-portal
// Creates a Stripe billing portal session for the authenticated user.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { stripe, createPortalSession } from '@/lib/stripe'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // ── Authenticate ──────────────────────────────────────────────────────
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    // ── Look up user's Stripe customer ID ─────────────────────────────────
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true, email: true },
    })

    let customerId = user?.stripeCustomerId

    // If no customer ID in DB, try to find by email in Stripe
    if (!customerId) {
      const customers = await stripe.customers.list({
        email: session.user.email,
        limit: 1,
      })

      if (customers.data.length > 0) {
        customerId = customers.data[0].id

        // Save the found customer ID to the user record
        await db.user.update({
          where: { id: session.user.id },
          data: { stripeCustomerId: customerId },
        })
      } else {
        return NextResponse.json(
          { error: 'No Stripe customer account found. Please complete a purchase first.' },
          { status: 404 },
        )
      }
    }

    // ── Create portal session ─────────────────────────────────────────────
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''
    const returnUrl = `${origin}/portal`

    const portalSession = await createPortalSession({
      customerId,
      returnUrl,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error('[billing-portal] Error creating portal session:', error)
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 },
    )
  }
}
