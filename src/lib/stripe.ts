// E-ARI — Stripe Server-Side Utilities
// Initializes Stripe SDK and provides helpers for Checkout, Portal, and Webhook verification.

import Stripe from 'stripe'

// ---------------------------------------------------------------------------
// Stripe initialization (dev fallbacks so the app boots without real keys)
// ---------------------------------------------------------------------------

export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_000000000000000000000000',
  {
    apiVersion: '2026-03-25.dahlia',
    typescript: true,
  },
)

// ---------------------------------------------------------------------------
// Price IDs — set via env vars; fallbacks for local dev
// ---------------------------------------------------------------------------

export const STRIPE_PRICE_PRO =
  process.env.STRIPE_PRICE_PRO || 'price_pro_placeholder'

export const STRIPE_PRICE_PRO_YEARLY =
  process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly_placeholder'

export const STRIPE_PRICE_GROWTH =
  process.env.STRIPE_PRICE_GROWTH || 'price_growth_placeholder'

export const STRIPE_PRICE_GROWTH_YEARLY =
  process.env.STRIPE_PRICE_GROWTH_YEARLY || 'price_growth_yearly_placeholder'

// ---------------------------------------------------------------------------
// Webhook secret — used to verify incoming Stripe events
// ---------------------------------------------------------------------------

export const STRIPE_WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder'

// ---------------------------------------------------------------------------
// Create a Stripe Checkout Session (one-time payment for Professional tier)
// ---------------------------------------------------------------------------

export async function createCheckoutSession({
  userId,
  email,
  priceId,
  tier,
  successUrl,
  cancelUrl,
}: {
  userId: string
  email: string
  priceId: string
  tier: string
  successUrl: string
  cancelUrl: string
}) {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      userId,
      tier,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  })

  return session
}

// ---------------------------------------------------------------------------
// Create a Stripe Billing Portal Session (for managing existing subscriptions)
// ---------------------------------------------------------------------------

export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string
  returnUrl: string
}) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session
}

// ---------------------------------------------------------------------------
// Verify a Stripe webhook signature
// Returns the parsed Stripe event, or throws on verification failure
// ---------------------------------------------------------------------------

export function verifyWebhookSignature(body: string, signature: string) {
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    STRIPE_WEBHOOK_SECRET,
  )
  return event
}
