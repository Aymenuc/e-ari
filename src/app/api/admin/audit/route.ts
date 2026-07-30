import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/admin/audit — the admin action trail.
 *
 * Read-only on purpose. There is no endpoint to edit or delete these rows,
 * because an audit log an operator can quietly rewrite is not an audit log.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10) || 0);
  const pageSize = 50;
  const actionRaw = searchParams.get('action');
  const action = actionRaw && actionRaw.trim() ? actionRaw.trim() : undefined;

  const where = action ? { action } : {};

  try {
    const [entries, total] = await Promise.all([
      db.adminAudit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page * pageSize,
        take: pageSize,
      }),
      db.adminAudit.count({ where }),
    ]);

    return NextResponse.json({
      entries,
      total,
      page,
      pageSize,
      hasMore: (page + 1) * pageSize < total,
    });
  } catch (error) {
    console.error('Admin audit read error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
