// E-ARI — Stripe Webhook Handler
// POST /api/webhooks/stripe
// Verifies the webhook signature and processes events (checkout.session.completed, etc.)

import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/stripe'
import { db } from '@/lib/db'
import type Stripe from 'stripe'

export async function POST(request: NextRequest) {
  // ── Read raw body for signature verification ───────────────────────────
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.warn('[stripe-webhook] Missing stripe-signature header')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  // ── Verify webhook signature ───────────────────────────────────────────
  let event: Stripe.Event
  try {
    event = verifyWebhookSignature(body, signature)
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // ── Handle events ──────────────────────────────────────────────────────
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const tier = session.metadata?.tier

        if (userId && tier) {
          await db.user.update({
            where: { id: userId },
            data: { tier },
          })
          console.log(`[stripe-webhook] User ${userId} upgraded to ${tier}`)
        } else {
          console.warn('[stripe-webhook] checkout.session.completed missing metadata:', session.metadata)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId
        const tier = subscription.metadata?.tier

        if (userId && tier) {
          await db.user.update({
            where: { id: userId },
            data: { tier },
          })
          console.log(`[stripe-webhook] User ${userId} subscription updated to ${tier}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId

        if (userId) {
          // Downgrade to free when subscription is cancelled
          await db.user.update({
            where: { id: userId },
            data: { tier: 'free' },
          })
          console.log(`[stripe-webhook] User ${userId} subscription deleted, downgraded to free`)
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const chargeId = charge.id

        // Find any refund request associated with this charge
        const refundRequest = await db.refundRequest.findFirst({
          where: { chargeId },
        })

        if (refundRequest && refundRequest.status !== 'refunded') {
          await db.refundRequest.update({
            where: { id: refundRequest.id },
            data: {
              status: 'refunded',
              refundId: charge.refunds?.data?.[0]?.id || null,
              refundedAt: new Date(),
            },
          })
          console.log(`[stripe-webhook] Refund request ${refundRequest.id} auto-updated to refunded via charge.refunded webhook`)
        } else if (!refundRequest) {
          console.log(`[stripe-webhook] charge.refunded for ${chargeId} — no matching refund request found`)
        }
        break
      }

      default:
        // Acknowledge unhandled event types (Stripe requirement)
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error('[stripe-webhook] Error processing event:', err)
    // Still return 200 so Stripe doesn't retry indefinitely
  }

  return NextResponse.json({ received: true })
}
