// E-ARI — Refund Request API
// POST /api/refunds/request
// Creates a new refund request for the authenticated user.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { sendRefundRequestEmail } from '@/lib/email-service'

const VALID_REASONS = ['duplicate', 'not_as_described', 'accidental', 'other'] as const
type RefundReason = (typeof VALID_REASONS)[number]

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

    // ── Parse and validate body ───────────────────────────────────────────
    const body = await request.json()
    const { amount, reason, details } = body as {
      amount?: number
      reason?: string
      details?: string
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 },
      )
    }

    // Validate reason
    if (!reason || !VALID_REASONS.includes(reason as RefundReason)) {
      return NextResponse.json(
        { error: `Reason must be one of: ${VALID_REASONS.join(', ')}` },
        { status: 400 },
      )
    }

    // ── Create refund request ─────────────────────────────────────────────
    const refundRequest = await db.refundRequest.create({
      data: {
        userId: session.user.id,
        amount,
        reason: reason as RefundReason,
        details: details || null,
        status: 'pending',
      },
    })

    // ── Send email notification to support ────────────────────────────────
    try {
      await sendRefundRequestEmail(
        session.user.email,
        {
          id: refundRequest.id,
          userEmail: session.user.email,
          userName: session.user.name || null,
          amount,
          reason: reason as RefundReason,
          details: details || null,
          createdAt: refundRequest.createdAt.toISOString(),
        },
      )
    } catch (emailErr) {
      console.error('[refund-request] Failed to send email notification:', emailErr)
      // Don't fail the request if email fails
    }

    console.log(`[refund-request] Created refund request ${refundRequest.id} for user ${session.user.id}`)

    return NextResponse.json(refundRequest, { status: 201 })
  } catch (error) {
    console.error('[refund-request] Error creating refund request:', error)
    return NextResponse.json(
      { error: 'Failed to create refund request' },
      { status: 500 },
    )
  }
}

// GET /api/refunds/request
// Returns the authenticated user's refund requests.

export async function GET() {
  try {
    // ── Authenticate ──────────────────────────────────────────────────────
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    // ── Fetch user's refund requests ──────────────────────────────────────
    const refundRequests = await db.refundRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(refundRequests)
  } catch (error) {
    console.error('[refund-request] Error fetching refund requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch refund requests' },
      { status: 500 },
    )
  }
}
