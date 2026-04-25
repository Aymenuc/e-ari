import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { db } from './db';

export async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { authorized: false, status: 401, message: 'Authentication required' };
  }

  // Always verify against database, not just JWT
  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { role: true, tier: true },
  });

  if (!user || user.role !== 'admin') {
    return { authorized: false, status: 403, message: 'Admin access required' };
  }

  return { authorized: true, user, session };
}
