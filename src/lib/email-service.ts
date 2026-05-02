/**
 * E-ARI Email Notification Service
 *
 * Sends premium, brand-aligned email notifications for:
 * - Welcome/onboarding emails
 * - Assessment completion reports
 * - Quarterly re-assessment reminders
 * - Monthly AI Pulse summaries
 * - Significant score change alerts
 * - Refund request and status notifications
 * - Certification achievement emails
 * - Admin custom messages
 * - Contact form submissions
 *
 * Architecture:
 * - In-app notifications via Prisma (always works)
 * - Email delivery via Resend
 * - Graceful fallback when RESEND_API_KEY is not configured
 *
 * Environment variables:
 * - RESEND_API_KEY: Resend API key
 * - EMAIL_FROM_ADDRESS: support@e-ari.com — used for refund/support emails
 * - EMAIL_FROM_HELLO: hello@e-ari.com — used for welcome/promotional/pulse emails
 */

import { Resend } from 'resend';
import { db } from './db';
import { PILLARS, MATURITY_BANDS } from './pillars';
import { getBaseUrl } from './site-url';
import { isOptedOut, unsubscribeUrl } from './email-preferences';
import {
  welcomeEmailHtml,
  assessmentCompleteEmailHtml,
  quarterlyReminderEmailHtml,
  monthlyPulseEmailHtml,
  scoreChangeAlertEmailHtml,
  certificationEmailHtml,
  customEmailHtml,
  contactFormEmailHtml,
  refundRequestEmailHtml,
  refundStatusEmailHtml,
  complianceClassifiedEmailHtml,
  complianceFriaReadyEmailHtml,
  complianceGapCriticalEmailHtml,
  complianceAttestationDueEmailHtml,
} from './email-templates';

// ─── Types ──────────────────────────────────────────────────────────────────

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  from: string;
  category: string;
  headers?: Record<string, string>;
}

interface EmailResult {
  sent: boolean;
  method: 'email' | 'notification_only';
  error?: string;
}

export interface RefundEmailDetails {
  id: string;
  userEmail: string;
  userName: string | null;
  amount: number;
  reason: string;
  details: string | null;
  createdAt: string;
  status?: string;
  rejectionReason?: string;
}

// ─── Configuration ──────────────────────────────────────────────────────────

const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev';
const EMAIL_FROM_HELLO = process.env.EMAIL_FROM_HELLO || EMAIL_FROM_ADDRESS;
const BASE_URL = getBaseUrl();
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const SIGNIFICANT_SCORE_THRESHOLD = 8;

const REASON_DISPLAY: Record<string, string> = {
  duplicate: 'Duplicate charge',
  not_as_described: 'Not as described',
  accidental: 'Accidental purchase',
  other: 'Other',
};

// ─── Core Email Sending ────────────────────────────────────────────────────

async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, method: 'notification_only' };
  }

  if (IS_PRODUCTION) {
    if (!process.env.EMAIL_FROM_ADDRESS) {
      return { sent: false, method: 'notification_only', error: 'EMAIL_FROM_ADDRESS is required in production' };
    }
    if (!process.env.EMAIL_FROM_HELLO) {
      return { sent: false, method: 'notification_only', error: 'EMAIL_FROM_HELLO is required in production' };
    }
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: payload.from || EMAIL_FROM_ADDRESS,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      headers: payload.headers,
    });

    if (error) {
      return { sent: false, method: 'notification_only', error: error.message };
    }

    return { sent: true, method: 'email' };
  } catch (error) {
    return { sent: false, method: 'notification_only', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ─── Welcome Email ──────────────────────────────────────────────────────────

export async function sendWelcomeEmail(
  userId: string,
  userEmail: string,
  userName: string | null
): Promise<EmailResult> {
  const firstName = userName?.split(' ')[0] || 'there';
  const assessmentUrl = `${BASE_URL}/assessment`;

  const html = welcomeEmailHtml(firstName, assessmentUrl);

  const emailResult = await sendEmail({
    to: userEmail,
    subject: 'Welcome to E-ARI — Your AI Readiness Journey Starts Here',
    html,
    text: `Hi ${firstName}, welcome to E-ARI! Start your first AI readiness assessment at ${BASE_URL}/assessment`,
    from: EMAIL_FROM_HELLO,
    category: 'weekly_digest',
  });

  try {
    await db.notification.create({
      data: {
        userId,
        type: 'weekly_digest',
        title: 'Welcome to E-ARI!',
        message: 'Start your first AI readiness assessment to get your baseline score across 8 pillars.',
        actionUrl: '/assessment',
      },
    });
  } catch {}

  return emailResult;
}

// ─── Assessment Complete Email ───────────────────────────────────────────────

export async function sendAssessmentCompleteEmail(
  userId: string,
  userEmail: string,
  userName: string | null,
  overallScore: number,
  maturityBand: string,
  pillarScores: Array<{ pillarId: string; normalizedScore: number }>,
  assessmentId: string
): Promise<EmailResult> {
  const firstName = userName?.split(' ')[0] || 'there';
  const maturityLabel = MATURITY_BANDS[maturityBand as keyof typeof MATURITY_BANDS]?.label || maturityBand;

  const pillarDisplay = pillarScores.map(ps => {
    const pillarDef = PILLARS.find(p => p.id === ps.pillarId);
    return {
      name: pillarDef?.shortName || ps.pillarId,
      score: Math.round(ps.normalizedScore),
      color: pillarDef?.color || '#3b82f6',
    };
  });

  const scoreRounded = Math.round(overallScore);
  const html = assessmentCompleteEmailHtml(
    userName || firstName,
    overallScore,
    maturityLabel,
    pillarDisplay,
    `${BASE_URL}/assessment/${assessmentId}`,
  );

  const result = await sendEmail({
    to: userEmail,
    subject: `Assessment Complete — E-ARI Score: ${scoreRounded} (${maturityLabel})`,
    html,
    text: `Hi ${firstName}, your assessment is complete. E-ARI score: ${scoreRounded} (${maturityLabel}). View at ${BASE_URL}/assessment/${assessmentId}`,
    from: EMAIL_FROM_HELLO,
    category: 'benchmark_update',
  });

  try {
    await db.notification.create({
      data: {
        userId,
        type: 'benchmark_update',
        title: 'Assessment Complete',
        message: `Your E-ARI score is ${scoreRounded} (${maturityLabel}). View your detailed readiness profile.`,
        actionUrl: `/assessment/${assessmentId}`,
      },
    });
  } catch {}

  return result;
}

// ─── Quarterly Re-assessment Reminder ────────────────────────────────────────

export async function sendQuarterlyReminder(
  userId: string,
  userEmail: string,
  userName: string | null,
  daysUntilReview: number,
  lastAssessmentDate: string,
  overallScore: number,
  maturityBand: string
): Promise<EmailResult> {
  if (await isOptedOut(userEmail, 'quarterly_reminder')) {
    return { sent: false, method: 'notification_only' };
  }

  const firstName = userName?.split(' ')[0] || 'there';
  const maturityLabel = MATURITY_BANDS[maturityBand as keyof typeof MATURITY_BANDS]?.label || maturityBand;
  const scoreRounded = Math.round(overallScore);
  const isOverdue = daysUntilReview <= 0;

  const html = quarterlyReminderEmailHtml(
    userName || firstName,
    overallScore,
    maturityLabel,
    lastAssessmentDate,
    daysUntilReview,
    isOverdue,
    unsubscribeUrl(userEmail, 'quarterly_reminder'),
  );

  const result = await sendEmail({
    to: userEmail,
    subject: isOverdue
      ? 'Action Required: Your AI Readiness Review Is Overdue'
      : `${daysUntilReview}-Day Notice: Quarterly AI Readiness Review`,
    html,
    text: `Hi ${firstName}, your quarterly AI readiness review is ${isOverdue ? 'overdue' : `due in ${daysUntilReview} days`}. Last score: ${scoreRounded} (${maturityLabel}). Re-run at ${BASE_URL}/assessment`,
    from: EMAIL_FROM_HELLO,
    category: 'quarterly_reminder',
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl(userEmail, 'quarterly_reminder')}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });

  try {
    await db.notification.create({
      data: {
        userId,
        type: 'quarterly_reminder',
        title: isOverdue
          ? 'AI Readiness Review Overdue'
          : `${daysUntilReview} Days Until Quarterly Review`,
        message: `Your last assessment scored ${scoreRounded} (${maturityLabel}). Re-run to track your progress.`,
        actionUrl: '/assessment',
      },
    });
  } catch {}

  return result;
}

// ─── Monthly Pulse Summary ──────────────────────────────────────────────────

export async function sendMonthlyPulseEmail(
  userId: string,
  userEmail: string,
  userName: string | null,
  overallScore: number,
  previousScore: number | null,
  topRisks: string[],
  topQuickWins: string[],
  month: string
): Promise<EmailResult> {
  if (await isOptedOut(userEmail, 'pulse_ready')) {
    return { sent: false, method: 'notification_only' };
  }

  const firstName = userName?.split(' ')[0] || 'there';
  const delta = previousScore !== null ? Math.round(overallScore - previousScore) : null;
  const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const scoreRounded = Math.round(overallScore);

  const html = monthlyPulseEmailHtml(
    userName || firstName,
    overallScore,
    delta,
    topRisks,
    topQuickWins,
    monthLabel,
    unsubscribeUrl(userEmail, 'pulse_ready'),
  );

  const result = await sendEmail({
    to: userEmail,
    subject: `${monthLabel} AI Pulse: Your Readiness Score Is ${scoreRounded}%`,
    html,
    text: `${monthLabel} AI Pulse: Overall ${scoreRounded}%${delta !== null ? ` (${delta >= 0 ? '+' : ''}${delta}%)` : ''}. ${topRisks.length} risks and ${topQuickWins.length} quick wins. View at ${BASE_URL}/pulse`,
    from: EMAIL_FROM_HELLO,
    category: 'pulse_ready',
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl(userEmail, 'pulse_ready')}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });

  try {
    await db.notification.create({
      data: {
        userId,
        type: 'pulse_ready',
        title: `${monthLabel} AI Pulse Ready`,
        message: `Overall readiness: ${scoreRounded}%${delta !== null ? ` (${delta >= 0 ? '+' : ''}${delta}%)` : ''}. ${topRisks.length} risks, ${topQuickWins.length} quick wins.`,
        actionUrl: '/pulse',
      },
    });
  } catch {}

  return result;
}

// ─── Score Change Alert ─────────────────────────────────────────────────────

export async function sendScoreChangeAlert(
  userId: string,
  userEmail: string,
  userName: string | null,
  previousScore: number,
  currentScore: number,
  changedPillars: Array<{ pillarName: string; previousScore: number; currentScore: number; delta: number }>
): Promise<EmailResult> {
  const firstName = userName?.split(' ')[0] || 'there';
  const overallDelta = Math.round(currentScore - previousScore);
  const isImprovement = overallDelta > 0;

  const html = scoreChangeAlertEmailHtml(
    userName || firstName,
    previousScore,
    currentScore,
    changedPillars,
  );

  const result = await sendEmail({
    to: userEmail,
    subject: isImprovement
      ? `Your AI Readiness Score Improved to ${Math.round(currentScore)}% (+${Math.abs(overallDelta)})`
      : `Alert: AI Readiness Score Changed to ${Math.round(currentScore)}% (${overallDelta})`,
    html,
    text: `Score changed from ${Math.round(previousScore)}% to ${Math.round(currentScore)}% (${overallDelta >= 0 ? '+' : ''}${overallDelta}). ${changedPillars.length} pillars changed. View at ${BASE_URL}/portal`,
    from: EMAIL_FROM_HELLO,
    category: 'benchmark_update',
  });

  try {
    await db.notification.create({
      data: {
        userId,
        type: 'benchmark_update',
        title: isImprovement ? 'Readiness Score Increased' : 'Readiness Score Changed',
        message: `Overall score: ${Math.round(previousScore)}% → ${Math.round(currentScore)}% (${overallDelta >= 0 ? '+' : ''}${overallDelta}). ${changedPillars.length} pillars changed.`,
        actionUrl: '/portal',
      },
    });
  } catch {}

  return result;
}

// ─── Certification Achievement Email ─────────────────────────────────────────

export async function sendCertificationEmail(
  userId: string,
  userEmail: string,
  userName: string | null,
  certificationLevel: string,
  overallScore: number
): Promise<EmailResult> {
  const firstName = userName?.split(' ')[0] || 'there';
  const scoreRounded = Math.round(overallScore);
  const html = certificationEmailHtml(userName || firstName, certificationLevel, overallScore);

  const result = await sendEmail({
    to: userEmail,
    subject: `E-ARI ${certificationLevel} Certification Achieved — Score: ${scoreRounded}`,
    html,
    text: `Hi ${firstName}, congratulations! You've earned E-ARI ${certificationLevel} Certification with a score of ${scoreRounded}. View at ${BASE_URL}/portal`,
    from: EMAIL_FROM_HELLO,
    category: 'benchmark_update',
  });

  try {
    await db.notification.create({
      data: {
        userId,
        type: 'benchmark_update',
        title: `${certificationLevel} Certification Achieved!`,
        message: `You've earned E-ARI ${certificationLevel} Certification with a score of ${scoreRounded}.`,
        actionUrl: '/portal',
      },
    });
  } catch {}

  return result;
}

// ─── Admin → User Custom Email ──────────────────────────────────────────────

export async function sendCustomEmail(
  to: string,
  userName: string | null,
  subject: string,
  messageBody: string,
): Promise<EmailResult> {
  const firstName = userName?.split(' ')[0] || 'there';
  const html = customEmailHtml(firstName, subject, messageBody);

  return sendEmail({
    to,
    subject,
    html,
    text: `Hi ${firstName},\n\n${messageBody}\n\n---\nThe E-ARI Team\nsupport@e-ari.com`,
    from: EMAIL_FROM_HELLO,
    category: 'admin_message',
  });
}

// ─── Contact Form → Support ─────────────────────────────────────────────────

export async function sendContactFormEmail(
  name: string,
  email: string,
  company: string | null,
  subject: string,
  message: string,
): Promise<EmailResult> {
  const supportEmail = (process.env.EMAIL_FROM_ADDRESS || 'support@e-ari.com')
    .replace(/^.*<(.+)>.*$/, '$1');

  const html = contactFormEmailHtml(name, email, company, subject, message);

  return sendEmail({
    to: supportEmail,
    subject: `[Contact] ${subject} — from ${name}`,
    html,
    text: `Contact Form Submission\n\nName: ${name}\nEmail: ${email}${company ? `\nCompany: ${company}` : ''}\nSubject: ${subject}\n\n${message}`,
    from: EMAIL_FROM_ADDRESS,
    category: 'contact_form',
  });
}

// ─── Refund Request Email (notifies support) ────────────────────────────────

export async function sendRefundRequestEmail(
  to: string,
  refundDetails: RefundEmailDetails,
): Promise<EmailResult> {
  const reasonLabel = REASON_DISPLAY[refundDetails.reason] || refundDetails.reason;
  const firstName = refundDetails.userName?.split(' ')[0] || 'there';

  const html = refundRequestEmailHtml(
    firstName,
    refundDetails.userEmail,
    refundDetails.amount,
    reasonLabel,
    refundDetails.details || null,
    refundDetails.id,
  );

  const result = await sendEmail({
    to,
    subject: `New Refund Request: $${refundDetails.amount.toFixed(2)} from ${refundDetails.userEmail}`,
    html,
    text: `New refund request from ${refundDetails.userEmail} for $${refundDetails.amount.toFixed(2)}. Reason: ${reasonLabel}. Review at ${BASE_URL}/admin/refunds`,
    from: EMAIL_FROM_ADDRESS,
    category: 'integration_alert',
  });

  return result;
}

// ─── Refund Status Email (notifies user of status change) ───────────────────

export async function sendRefundStatusEmail(
  to: string,
  refundDetails: RefundEmailDetails,
): Promise<EmailResult> {
  const firstName = refundDetails.userName?.split(' ')[0] || 'there';
  const status = refundDetails.status || 'pending';
  const reasonLabel = REASON_DISPLAY[refundDetails.reason] || refundDetails.reason;

  const html = refundStatusEmailHtml(
    firstName,
    status,
    refundDetails.amount,
    reasonLabel,
    refundDetails.rejectionReason || null,
    refundDetails.id,
  );

  const result = await sendEmail({
    to,
    subject: `Refund ${status.charAt(0).toUpperCase() + status.slice(1)} — $${refundDetails.amount.toFixed(2)}`,
    html,
    text: `Hi ${firstName}, your refund of $${refundDetails.amount.toFixed(2)} has been ${status}. Request ID: ${refundDetails.id}. View at ${BASE_URL}/portal`,
    from: EMAIL_FROM_ADDRESS,
    category: 'integration_alert',
  });

  try {
    const user = await db.user.findUnique({ where: { email: to } });
    if (user) {
      await db.notification.create({
        data: {
          userId: user.id,
          type: 'integration_alert',
          title: `Refund ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: `Your refund request for $${refundDetails.amount.toFixed(2)} has been ${status}.`,
          actionUrl: '/portal',
        },
      });
    }
  } catch {}

  return result;
}

// ─── Scheduled Notification Processing ──────────────────────────────────────

export async function processQuarterlyReminders(): Promise<number> {
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const assessments = await db.assessment.findMany({
    where: {
      status: 'completed',
      completedAt: { lte: sixtyDaysAgo },
      overallScore: { not: null },
    },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: { completedAt: 'desc' },
  });

  const latestByUser = new Map<string, typeof assessments[0]>();
  for (const a of assessments) {
    if (!latestByUser.has(a.userId)) {
      latestByUser.set(a.userId, a);
    }
  }

  let notificationsSent = 0;

  for (const [userId, assessment] of Array.from(latestByUser.entries())) {
    const recentReminder = await db.notification.findFirst({
      where: {
        userId,
        type: 'quarterly_reminder',
        createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    if (recentReminder) continue;

    const completedAt = assessment.completedAt!;
    const daysSinceCompletion = Math.floor((now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilReview = Math.max(0, 90 - daysSinceCompletion);

    await sendQuarterlyReminder(
      userId,
      assessment.user.email,
      assessment.user.name,
      daysUntilReview,
      completedAt.toISOString(),
      assessment.overallScore!,
      assessment.maturityBand || 'follower'
    );

    notificationsSent++;
  }

  return notificationsSent;
}

export async function processScoreChangeAlerts(): Promise<number> {
  const users = await db.user.findMany({
    select: { id: true, email: true, name: true },
  });

  let alertsSent = 0;

  for (const user of users) {
    const assessments = await db.assessment.findMany({
      where: { userId: user.id, status: 'completed', overallScore: { not: null } },
      orderBy: { completedAt: 'desc' },
      take: 2,
      include: { responses: true },
    });

    if (assessments.length < 2) continue;

    const latest = assessments[0];
    const previous = assessments[1];
    const delta = Math.round((latest.overallScore ?? 0) - (previous.overallScore ?? 0));

    if (Math.abs(delta) < SIGNIFICANT_SCORE_THRESHOLD) continue;

    const existingAlert = await db.notification.findFirst({
      where: {
        userId: user.id,
        type: 'benchmark_update',
        assessmentId: latest.id,
      },
    });

    if (existingAlert) continue;

    let latestPillarScores: Array<{ pillarId: string; normalizedScore: number }> = [];
    let previousPillarScores: Array<{ pillarId: string; normalizedScore: number }> = [];

    try {
      latestPillarScores = JSON.parse(latest.pillarScores || '[]');
      previousPillarScores = JSON.parse(previous.pillarScores || '[]');
    } catch { continue; }

    const changedPillars = latestPillarScores
      .map(lps => {
        const pps = previousPillarScores.find(p => p.pillarId === lps.pillarId);
        if (!pps) return null;
        const pillarDelta = Math.round(lps.normalizedScore - pps.normalizedScore);
        if (Math.abs(pillarDelta) < 3) return null;
        const pillarDef = PILLARS.find(p => p.id === lps.pillarId);
        return {
          pillarName: pillarDef?.name || lps.pillarId,
          previousScore: Math.round(pps.normalizedScore),
          currentScore: Math.round(lps.normalizedScore),
          delta: pillarDelta,
        };
      })
      .filter((cp): cp is NonNullable<typeof cp> => cp !== null);

    if (changedPillars.length === 0) continue;

    await sendScoreChangeAlert(user.id, user.email, user.name, previous.overallScore ?? 0, latest.overallScore ?? 0, changedPillars);
    alertsSent++;
  }

  return alertsSent;
}

// ─── Compliance vault emails ─────────────────────────────────────────────────

export async function sendComplianceClassificationEmail(
  _userId: string,
  userEmail: string,
  userName: string | null | undefined,
  systemName: string,
  riskTier: string
): Promise<EmailResult> {
  if (!userEmail) return { sent: false, method: 'notification_only' };
  if (await isOptedOut(userEmail, 'system_classified')) {
    return { sent: false, method: 'notification_only' };
  }
  const firstName = userName?.split(' ')[0] || 'there';
  const html = complianceClassifiedEmailHtml(systemName, riskTier);
  return sendEmail({
    to: userEmail,
    subject: `Compliance: ${systemName} classified (${riskTier})`,
    html,
    text: `Hi ${firstName}, ${systemName} was classified as ${riskTier} (draft). Review in E-ARI Compliance.`,
    from: EMAIL_FROM_HELLO,
    category: 'compliance',
  });
}

export async function sendComplianceFriaReadyEmail(
  _userId: string,
  userEmail: string,
  userName: string | null | undefined,
  systemName: string
): Promise<EmailResult> {
  if (!userEmail) return { sent: false, method: 'notification_only' };
  if (await isOptedOut(userEmail, 'fria_ready')) {
    return { sent: false, method: 'notification_only' };
  }
  const firstName = userName?.split(' ')[0] || 'there';
  const html = complianceFriaReadyEmailHtml(systemName);
  return sendEmail({
    to: userEmail,
    subject: `FRIA draft ready — ${systemName}`,
    html,
    text: `Hi ${firstName}, a FRIA draft is ready for ${systemName}. Open Compliance in E-ARI.`,
    from: EMAIL_FROM_HELLO,
    category: 'compliance',
  });
}

export async function sendComplianceGapCriticalEmail(
  _userId: string,
  userEmail: string,
  userName: string | null | undefined,
  systemName: string,
  criticalCount: number
): Promise<EmailResult> {
  if (!userEmail) return { sent: false, method: 'notification_only' };
  if (await isOptedOut(userEmail, 'gap_critical')) {
    return { sent: false, method: 'notification_only' };
  }
  const firstName = userName?.split(' ')[0] || 'there';
  const html = complianceGapCriticalEmailHtml(systemName, criticalCount);
  return sendEmail({
    to: userEmail,
    subject: `Action: ${criticalCount} critical compliance gap(s) — ${systemName}`,
    html,
    text: `Hi ${firstName}, ${criticalCount} critical gap(s) for ${systemName}. Review the gap radar.`,
    from: EMAIL_FROM_HELLO,
    category: 'compliance',
  });
}

export async function sendComplianceAttestationDueEmail(
  _userId: string,
  userEmail: string,
  userName: string | null | undefined,
  systemName: string,
  dueIsoDate: string,
): Promise<EmailResult> {
  if (!userEmail) return { sent: false, method: 'notification_only' };
  if (await isOptedOut(userEmail, 'attestation_due')) {
    return { sent: false, method: 'notification_only' };
  }
  const firstName = userName?.split(' ')[0] || 'there';
  const html = complianceAttestationDueEmailHtml(systemName, dueIsoDate);
  const dueDay = dueIsoDate.slice(0, 10);
  return sendEmail({
    to: userEmail,
    subject: `Reminder: conformity attestation due (${dueDay}) — ${systemName}`,
    html,
    text: `Hi ${firstName}, ${systemName} has an upcoming conformity attestation target (${dueDay}). Review Compliance → Monitoring.`,
    from: EMAIL_FROM_HELLO,
    category: 'compliance',
  });
}
