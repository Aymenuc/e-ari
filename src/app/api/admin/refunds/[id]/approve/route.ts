// E-ARI — Admin Approve Refund
// POST /api/admin/refunds/[id]/approve
// Approves a refund request, issues a Stripe refund, updates DB, and emails the user.

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { sendRefundStatusEmail } from '@/lib/email-service'
import { verifyAdmin } from '@/lib/verify-admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // ── Authenticate & authorize ──────────────────────────────────────────
    const adminCheck = await verifyAdmin();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.message }, { status: adminCheck.status });
    }
    const session = adminCheck.session!

    const { id } = await params

    // ── Find the refund request ───────────────────────────────────────────
    const refundRequest = await db.refundRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    })

    if (!refundRequest) {
      return NextResponse.json(
        { error: 'Refund request not found' },
        { status: 404 },
      )
    }

    if (refundRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Refund request is already ${refundRequest.status}` },
        { status: 400 },
      )
    }

    // ── Process Stripe refund ─────────────────────────────────────────────
    let refundId: string | null = null
    let chargeId = refundRequest.chargeId

    // Try to find the charge ID from recent Stripe charges if not stored
    if (!chargeId) {
      try {
        const charges = await stripe.charges.list({
          customer: refundRequest.user.email,
          limit: 10,
        })

        const matchingCharge = charges.data.find(
          (charge) =>
            charge.amount === Math.round(refundRequest.amount * 100) &&
            charge.status === 'succeeded',
        )

        if (matchingCharge) {
          chargeId = matchingCharge.id
        }
      } catch (stripeErr) {
        console.warn('[approve-refund] Could not lookup charges:', stripeErr)
      }
    }

    if (chargeId) {
      try {
        const refund = await stripe.refunds.create({
          charge: chargeId,
          amount: Math.round(refundRequest.amount * 100), // Convert to cents
          reason: 'requested_by_customer',
        })
        refundId = refund.id
        console.log(`[approve-refund] Stripe refund ${refund.id} created for charge ${chargeId}`)
      } catch (stripeErr) {
        console.error('[approve-refund] Stripe refund failed:', stripeErr)
        // Still update status but note the failure
        await db.refundRequest.update({
          where: { id },
          data: {
            status: 'approved',
            chargeId,
          },
        })

        return NextResponse.json(
          {
            error: 'Stripe refund failed. Request marked as approved but refund was not processed.',
            details: stripeErr instanceof Error ? stripeErr.message : 'Unknown Stripe error',
          },
          { status: 502 },
        )
      }
    }

    // ── Update refund request in DB ───────────────────────────────────────
    const updateData: {
      status: string
      chargeId?: string | null
      refundId?: string | null
      refundedAt: Date
    } = {
      status: refundId ? 'refunded' : 'approved',
      chargeId,
      refundedAt: new Date(),
    }

    if (refundId) {
      updateData.refundId = refundId
    }

    const updatedRequest = await db.refundRequest.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, email: true, name: true, tier: true },
        },
      },
    })

    // ── Send email notification to user ───────────────────────────────────
    try {
      await sendRefundStatusEmail(
        refundRequest.user.email,
        {
          id: updatedRequest.id,
          userEmail: refundRequest.user.email,
          userName: refundRequest.user.name,
          amount: refundRequest.amount,
          reason: refundRequest.reason,
          details: refundRequest.details,
          createdAt: refundRequest.createdAt.toISOString(),
          status: refundId ? 'refunded' : 'approved',
        },
      )
    } catch (emailErr) {
      console.error('[approve-refund] Failed to send status email:', emailErr)
    }

    console.log(`[approve-refund] Refund request ${id} approved by admin ${session.user.id}`)

    return NextResponse.json(updatedRequest)
  } catch (error) {
    console.error('[approve-refund] Error approving refund:', error)
    return NextResponse.json(
      { error: 'Failed to approve refund request' },
      { status: 500 },
    )
  }
}
