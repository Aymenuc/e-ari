import { db } from './db';

/**
 * Subject access / portability export (GDPR Art. 15 and Art. 20).
 *
 * The privacy policy names Access, Portability, Rectification and Erasure, but
 * nothing in the product could actually produce a user's data — so the first
 * request would have been answered by hand-writing SQL. This builds the whole
 * record in one structured, machine-readable document, which is what Art. 20
 * asks for ("commonly used, machine-readable format").
 *
 * Deliberately excluded: passwordHash, and OAuth access/refresh tokens. Those
 * are credentials, not personal data the subject is owed, and a support person
 * opening an export should never be handed a way to authenticate as someone.
 */

export async function buildUserExport(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, image: true, role: true, tier: true,
      organization: true, sector: true, orgSize: true, emailVerified: true,
      createdAt: true, updatedAt: true, stripeCustomerId: true,
      earlyAccessAt: true, foundingMemberNo: true,
      lastSeenAt: true, lastSeenIp: true, lastSeenCountry: true, lastSeenCity: true,
    },
  });
  if (!user) return null;

  const [assessments, pulseRuns, notifications, aiSystems, evidenceItems, refundRequests, consents, accounts] =
    await Promise.all([
      db.assessment.findMany({
        where: { userId },
        select: {
          id: true, status: true, sector: true, entityType: true, overallScore: true,
          maturityBand: true, scoringVersion: true, createdAt: true, completedAt: true,
          responses: { select: { questionId: true, answer: true } },
        },
      }),
      db.pulseRun.findMany({ where: { userId } }),
      db.notification.findMany({ where: { userId } }),
      db.aISystem.findMany({ where: { userId } }),
      db.evidence.findMany({ where: { userId } }),
      db.refundRequest.findMany({ where: { userId } }),
      db.benchmarkConsent.findMany({ where: { userId } }),
      // Which providers are linked, never the tokens themselves.
      db.account.findMany({ where: { userId }, select: { provider: true, type: true } }),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    format: 'e-ari-subject-access-v1',
    notice:
      'Personal data held for this account. Excludes password hashes and OAuth tokens, ' +
      'which are credentials rather than personal data and are never exported. ' +
      'lastSeenIp is stored truncated (final IPv4 octet zeroed) and, with the ' +
      'location fields, is cleared 90 days after last activity.',
    user,
    assessments,
    pulseRuns,
    notifications,
    aiSystems,
    evidenceItems,
    refundRequests,
    benchmarkConsents: consents,
    linkedAccounts: accounts,
    counts: {
      assessments: assessments.length,
      pulseRuns: pulseRuns.length,
      notifications: notifications.length,
      aiSystems: aiSystems.length,
      evidenceItems: evidenceItems.length,
    },
  };
}
