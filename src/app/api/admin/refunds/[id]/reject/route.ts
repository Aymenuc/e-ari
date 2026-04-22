// E-ARI — Admin Reject Refund
// POST /api/admin/refunds/[id]/reject
// Rejects a refund request and emails the user.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { sendRefundStatusEmail } from '@/lib/email-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // ── Authenticate & authorize ──────────────────────────────────────────
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      )
    }

    const { id } = await params

    // ── Parse optional rejection reason ───────────────────────────────────
    let rejectionReason: string | undefined
    try {
      const body = await request.json()
      rejectionReason = body.rejectionReason
    } catch {
      // Body may be empty, that's fine
    }

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

    // ── Update refund request status ──────────────────────────────────────
    const updatedRequest = await db.refundRequest.update({
      where: { id },
      data: { status: 'rejected' },
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
          status: 'rejected',
          rejectionReason,
        },
      )
    } catch (emailErr) {
      console.error('[reject-refund] Failed to send status email:', emailErr)
    }

    console.log(`[reject-refund] Refund request ${id} rejected by admin ${session.user.id}`)

    return NextResponse.json(updatedRequest)
  } catch (error) {
    console.error('[reject-refund] Error rejecting refund:', error)
    return NextResponse.json(
      { error: 'Failed to reject refund request' },
      { status: 500 },
    )
  }
}
