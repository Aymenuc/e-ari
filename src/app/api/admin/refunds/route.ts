// E-ARI — Admin Refund Requests API
// GET /api/admin/refunds — List refund requests (with pagination, filtering by status)
// POST /api/admin/refunds — Create manual refund (admin override)

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
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

    // ── Parse query parameters ────────────────────────────────────────────
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // ── Build where clause ────────────────────────────────────────────────
    const where: { status?: string } = {}
    if (status && status !== 'all') {
      where.status = status
    }

    // ── Fetch refund requests with user info ──────────────────────────────
    const [refundRequests, total] = await Promise.all([
      db.refundRequest.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              tier: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.refundRequest.count({ where }),
    ])

    return NextResponse.json({
      refundRequests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('[admin-refunds] Error fetching refund requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch refund requests' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
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

    // ── Parse body ────────────────────────────────────────────────────────
    const body = await request.json()
    const { userId, amount, reason, details, chargeId } = body as {
      userId?: string
      amount?: number
      reason?: string
      details?: string
      chargeId?: string
    }

    if (!userId || typeof amount !== 'number' || amount <= 0 || !reason) {
      return NextResponse.json(
        { error: 'userId, amount (positive number), and reason are required' },
        { status: 400 },
      )
    }

    // ── Create manual refund request ──────────────────────────────────────
    const refundRequest = await db.refundRequest.create({
      data: {
        userId,
        amount,
        reason,
        details: details || null,
        chargeId: chargeId || null,
        status: 'approved', // Admin override — pre-approved
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            tier: true,
          },
        },
      },
    })

    console.log(`[admin-refunds] Admin ${session.user.id} created manual refund request ${refundRequest.id}`)

    return NextResponse.json(refundRequest, { status: 201 })
  } catch (error) {
    console.error('[admin-refunds] Error creating manual refund:', error)
    return NextResponse.json(
      { error: 'Failed to create manual refund' },
      { status: 500 },
    )
  }
}
