/**
 * E-ARI Email Notification Service
 *
 * Sends professional, value-focused email notifications via Resend:
 * - Quarterly re-assessment reminders
 * - Monthly AI Pulse summaries
 * - Significant score change alerts
 * - Welcome/onboarding emails
 * - Refund request and status notifications
 *
 * Environment variables:
 * - RESEND_API_KEY: Resend API key
 * - EMAIL_FROM_ADDRESS: support@e-ari.com — used for refund/support emails
 * - EMAIL_FROM_HELLO: hello@e-ari.com — used for welcome/promotional/pulse emails
 */

import { Resend } from 'resend';
import { db } from './db';
import { PILLARS, MATURITY_BANDS } from './pillars';

// ─── Types ──────────────────────────────────────────────────────────────────

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  from: string;
  category: string;
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

const SIGNIFICANT_SCORE_THRESHOLD = 8; // Points change to trigger alert

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

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: payload.from || EMAIL_FROM_ADDRESS,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    if (error) {
      return { sent: false, method: 'notification_only', error: error.message };
    }

    return { sent: true, method: 'email' };
  } catch (error) {
    return { sent: false, method: 'notification_only', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function getActionUrlForCategory(category: string): string {
  switch (category) {
    case 'quarterly_reminder': return '/assessment';
    case 'pulse_ready': return '/pulse';
    case 'benchmark_update': return '/results';
    case 'weekly_digest': return '/portal';
    default: return '/portal';
  }
}

// ─── Email Template Builders ────────────────────────────────────────────────

function buildEmailWrapper(content: string, preheader: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>E-ARI</title>
  <style>
    body { margin: 0; padding: 0; background: #0d1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background: #161b22; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%); padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 24px; margin: 0; font-weight: 800; letter-spacing: -0.02em; }
    .header p { color: rgba(255,255,255,0.8); font-size: 14px; margin: 8px 0 0; }
    .content { padding: 32px 24px; color: #e6edf3; }
    .content h2 { color: #e6edf3; font-size: 20px; margin: 0 0 16px; font-weight: 700; }
    .content p { color: #8b949e; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
    .metric { background: #21262d; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #2563eb; }
    .metric .value { color: #3b82f6; font-size: 28px; font-weight: 800; }
    .metric .label { color: #8b949e; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
    .metric .change-positive { color: #22c55e; font-size: 13px; }
    .metric .change-negative { color: #ef4444; font-size: 13px; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #2563eb, #06b6d4); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 16px 0; }
    .risk-item { background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; padding: 12px; margin: 8px 0; border-radius: 4px; }
    .risk-item p { color: #fbbf24; font-size: 13px; margin: 0; }
    .win-item { background: rgba(34, 197, 94, 0.1); border-left: 3px solid #22c55e; padding: 12px; margin: 8px 0; border-radius: 4px; }
    .win-item p { color: #4ade80; font-size: 13px; margin: 0; }
    .footer { padding: 24px; text-align: center; color: #484f58; font-size: 12px; border-top: 1px solid #21262d; }
    .footer a { color: #3b82f6; text-decoration: none; }
    .preheader { display: none !important; visibility: hidden; mso-hide: all; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; }
  </style>
</head>
<body>
  <div class="preheader">${preheader}</div>
  <div class="container">
    ${content}
    <div class="footer">
      <p>E-ARI — Enterprise AI Readiness Assessment Platform</p>
      <p>You're receiving this because you have an active E-ARI account. <a href="${process.env.NEXTAUTH_URL || 'https://e-ari.com'}/portal">Manage notifications</a></p>
    </div>
  </div>
</body>
</html>`;
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
  const firstName = userName?.split(' ')[0] || 'there';
  const maturityLabel = MATURITY_BANDS[maturityBand as keyof typeof MATURITY_BANDS]?.label || maturityBand;
  const urgencyText = daysUntilReview <= 0
    ? 'Your quarterly AI readiness review is <strong>overdue</strong>'
    : daysUntilReview <= 30
    ? `Your quarterly review is due in <strong>${daysUntilReview} days</strong>`
    : `Your next quarterly review is in <strong>${daysUntilReview} days</strong>`;

  const html = buildEmailWrapper(`
    <div class="header">
      <h1>Quarterly Review Reminder</h1>
      <p>${urgencyText}</p>
    </div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>AI readiness is not a one-time measurement — it evolves as your organization adopts new technologies, processes, and strategies. Regular re-assessment ensures your readiness score reflects your current state and helps track meaningful progress over time.</p>
      
      <div class="metric">
        <div class="label">Last Assessment Score</div>
        <div class="value">${Math.round(overallScore)}%</div>
        <div style="margin-top: 4px; color: #8b949e; font-size: 13px;">${maturityLabel} maturity &middot; Assessed ${new Date(lastAssessmentDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
      </div>

      <h2>Why Re-assess Now?</h2>
      <p>Your AI readiness landscape changes faster than you might think. A quarterly re-assessment captures:</p>
      <ul style="color: #8b949e; font-size: 14px; line-height: 1.8; padding-left: 20px;">
        <li>Progress from recent AI initiatives and investments</li>
        <li>Changes in governance posture due to new regulations</li>
        <li>Impact of talent acquisition or upskilling programs</li>
        <li>Infrastructure and data pipeline improvements</li>
        <li>Shifts in organizational culture and AI adoption</li>
      </ul>

      <a href="${process.env.NEXTAUTH_URL || 'https://e-ari.com'}/assessment" class="cta-button">Re-run Assessment</a>
      <p style="font-size: 12px; color: #484f58;">Your previous answers will be pre-filled for quick updating.</p>
    </div>
  `, `Your quarterly AI readiness review is ${daysUntilReview <= 0 ? 'overdue' : `due in ${daysUntilReview} days`}. Current score: ${Math.round(overallScore)}%.`);

  const result = await sendEmail({
    to: userEmail,
    subject: daysUntilReview <= 0
      ? 'Action Required: Your AI Readiness Review Is Overdue'
      : `${daysUntilReview}-Day Notice: Quarterly AI Readiness Review Coming Up`,
    html,
    text: `Hi ${firstName}, ${urgencyText.replace(/<[^>]*>/g, '')}. Your last score was ${Math.round(overallScore)}% (${maturityLabel}). Re-run your assessment at ${process.env.NEXTAUTH_URL || 'https://e-ari.com'}/assessment`,
    from: EMAIL_FROM_HELLO,
    category: 'quarterly_reminder',
  });

  // Also create in-app notification with userId
  try {
    await db.notification.create({
      data: {
        userId,
        type: 'quarterly_reminder',
        title: daysUntilReview <= 0
          ? 'AI Readiness Review Overdue'
          : `${daysUntilReview} Days Until Quarterly Review`,
        message: `Your last assessment scored ${Math.round(overallScore)}% (${maturityLabel}). Re-run to track your progress.`,
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
  const firstName = userName?.split(' ')[0] || 'there';
  const delta = previousScore !== null ? Math.round(overallScore - previousScore) : null;
  const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const deltaHtml = delta !== null ? `
    <div style="display: inline-block; margin-left: 12px; padding: 4px 10px; border-radius: 6px; font-size: 14px; font-weight: 600; ${delta >= 0 ? 'background: rgba(34,197,94,0.15); color: #22c55e;' : 'background: rgba(239,68,68,0.15); color: #ef4444;'}">
      ${delta >= 0 ? '+' : ''}${delta}%
    </div>
  ` : '';

  const risksHtml = topRisks.slice(0, 3).map(r => `<div class="risk-item"><p>${r}</p></div>`).join('');
  const winsHtml = topQuickWins.slice(0, 3).map(w => `<div class="win-item"><p>${w}</p></div>`).join('');

  const html = buildEmailWrapper(`
    <div class="header">
      <h1>AI Pulse Report</h1>
      <p>${monthLabel} Readiness Summary</p>
    </div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>Here's your monthly AI readiness pulse check. This automated analysis compares your current assessment profile to identify emerging risks and high-impact improvement opportunities.</p>
      
      <div class="metric">
        <div class="label">Overall Readiness</div>
        <div style="display: flex; align-items: center;">
          <div class="value">${Math.round(overallScore)}%</div>
          ${deltaHtml}
        </div>
      </div>

      ${risksHtml ? `<h2>Top Risks</h2>${risksHtml}` : ''}
      ${winsHtml ? `<h2>Quick Wins</h2>${winsHtml}` : ''}

      <a href="${process.env.NEXTAUTH_URL || 'https://e-ari.com'}/pulse" class="cta-button">View Full Pulse Report</a>
    </div>
  `, `${monthLabel} AI Pulse: Score ${Math.round(overallScore)}%${delta !== null ? ` (${delta >= 0 ? '+' : ''}${delta}%)` : ''}. ${topRisks.length} risks, ${topQuickWins.length} quick wins.`);

  const result = await sendEmail({
    to: userEmail,
    subject: `${monthLabel} AI Pulse: Your Readiness Score Is ${Math.round(overallScore)}%`,
    html,
    text: `${monthLabel} AI Pulse: Overall ${Math.round(overallScore)}%${delta !== null ? ` (${delta >= 0 ? '+' : ''}${delta}%)` : ''}. ${topRisks.length} risks and ${topQuickWins.length} quick wins identified. View at ${process.env.NEXTAUTH_URL || 'https://e-ari.com'}/pulse`,
    from: EMAIL_FROM_HELLO,
    category: 'pulse_ready',
  });

  // Create in-app notification
  try {
    await db.notification.create({
      data: {
        userId,
        type: 'pulse_ready',
        title: `${monthLabel} AI Pulse Ready`,
        message: `Overall readiness: ${Math.round(overallScore)}%${delta !== null ? ` (${delta >= 0 ? '+' : ''}${delta}%)` : ''}. ${topRisks.length} risks, ${topQuickWins.length} quick wins.`,
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

  const pillarChangesHtml = changedPillars.map(cp => {
    const isPositive = cp.delta > 0;
    return `<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; margin: 4px 0; background: #21262d; border-radius: 6px;">
      <span style="color: #e6edf3; font-size: 13px;">${cp.pillarName}</span>
      <span style="font-size: 13px; font-weight: 600; ${isPositive ? 'color: #22c55e;' : 'color: #ef4444;'}">
        ${cp.previousScore}% → ${cp.currentScore}% (${isPositive ? '+' : ''}${cp.delta}%)
      </span>
    </div>`;
  }).join('');

  const html = buildEmailWrapper(`
    <div class="header" style="background: ${isImprovement ? 'linear-gradient(135deg, #22c55e 0%, #06b6d4 100%)' : 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)'};">
      <h1>${isImprovement ? 'Readiness Score Increased' : 'Readiness Score Changed'}</h1>
      <p>Your AI readiness score ${isImprovement ? 'improved' : 'changed'} by ${Math.abs(overallDelta)} points</p>
    </div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>Your latest assessment shows a <strong>${isImprovement ? 'positive' : 'significant'}</strong> change in your AI readiness profile. Here's what shifted:</p>
      
      <div class="metric">
        <div class="label">Overall Score Change</div>
        <div style="display: flex; align-items: center;">
          <div class="value" style="color: ${isImprovement ? '#22c55e' : '#ef4444'};">${Math.round(previousScore)}% → ${Math.round(currentScore)}%</div>
        </div>
        <div class="${isImprovement ? 'change-positive' : 'change-negative'}" style="margin-top: 4px;">
          ${isImprovement ? '+' : ''}${overallDelta} point${Math.abs(overallDelta) !== 1 ? 's' : ''}
        </div>
      </div>

      <h2>Pillar Changes</h2>
      ${pillarChangesHtml}

      ${isImprovement ? `
        <p>Your investments in AI readiness are paying off. Continue monitoring your progress with monthly AI Pulse reports and consider focusing on your remaining gaps to sustain momentum.</p>
      ` : `
        <p>A declining readiness score often reflects changes in organizational priorities, talent turnover, or evolving regulatory requirements. Re-assess your strategy and focus on the pillars showing the steepest declines.</p>
      `}

      <a href="${process.env.NEXTAUTH_URL || 'https://e-ari.com'}/portal" class="cta-button">View Full Results</a>
    </div>
  `, `Your AI readiness score ${isImprovement ? 'increased' : 'changed'} by ${overallDelta} points to ${Math.round(currentScore)}%.`);

  const result = await sendEmail({
    to: userEmail,
    subject: isImprovement
      ? `Your AI Readiness Score Improved to ${Math.round(currentScore)}% (+${Math.abs(overallDelta)})`
      : `Alert: AI Readiness Score Changed to ${Math.round(currentScore)}% (${overallDelta})`,
    html,
    text: `Score changed from ${Math.round(previousScore)}% to ${Math.round(currentScore)}% (${overallDelta >= 0 ? '+' : ''}${overallDelta}). ${changedPillars.length} pillars changed. View at ${process.env.NEXTAUTH_URL || 'https://e-ari.com'}/portal`,
    from: EMAIL_FROM_HELLO,
    category: 'benchmark_update',
  });

  // Create in-app notification
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

// ─── Welcome Email ──────────────────────────────────────────────────────────

export async function sendWelcomeEmail(
  userId: string,
  userEmail: string,
  userName: string | null
): Promise<EmailResult> {
  const firstName = userName?.split(' ')[0] || 'there';

  const html = buildEmailWrapper(`
    <div class="header">
      <h1>Welcome to E-ARI</h1>
      <p>Your AI Readiness journey starts now</p>
    </div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>Welcome to E-ARI — the Enterprise AI Readiness Assessment platform that helps you measure, track, and improve your organization's preparedness for AI adoption across 8 critical dimensions.</p>
      
      <h2>Get Started in 3 Steps</h2>
      <div style="background: #21262d; border-radius: 8px; padding: 16px; margin: 12px 0;">
        <p style="margin: 0 0 8px; color: #3b82f6; font-weight: 600; font-size: 14px;">1. Complete Your First Assessment</p>
        <p style="margin: 0; font-size: 13px;">Answer 40 questions across 8 readiness pillars — takes about 15 minutes.</p>
      </div>
      <div style="background: #21262d; border-radius: 8px; padding: 16px; margin: 12px 0;">
        <p style="margin: 0 0 8px; color: #3b82f6; font-weight: 600; font-size: 14px;">2. Review Your AI Readiness Score</p>
        <p style="margin: 0; font-size: 13px;">Get a detailed breakdown by pillar with maturity classification and AI-generated insights.</p>
      </div>
      <div style="background: #21262d; border-radius: 8px; padding: 16px; margin: 12px 0;">
        <p style="margin: 0 0 8px; color: #3b82f6; font-weight: 600; font-size: 14px;">3. Track Progress Over Time</p>
        <p style="margin: 0; font-size: 13px;">Use quarterly re-assessments and monthly AI Pulse reports to measure improvement.</p>
      </div>

      <a href="${process.env.NEXTAUTH_URL || 'https://e-ari.com'}/assessment" class="cta-button">Start Your First Assessment</a>
    </div>
  `, `Welcome to E-ARI! Start your first AI readiness assessment today.`);

  const emailResult = await sendEmail({
    to: userEmail,
    subject: 'Welcome to E-ARI — Start Your AI Readiness Assessment',
    html,
    text: `Hi ${firstName}, welcome to E-ARI! Start your first AI readiness assessment at ${process.env.NEXTAUTH_URL || 'https://e-ari.com'}/assessment`,
    from: EMAIL_FROM_HELLO,
    category: 'weekly_digest',
  });

  // Also create in-app notification
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

// ─── Refund Request Email (notifies support) ────────────────────────────────

export async function sendRefundRequestEmail(
  to: string,
  refundDetails: RefundEmailDetails,
): Promise<EmailResult> {
  const reasonLabel = REASON_DISPLAY[refundDetails.reason] || refundDetails.reason;
  const firstName = refundDetails.userName?.split(' ')[0] || 'there';

  const html = buildEmailWrapper(`
    <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);">
      <h1>New Refund Request</h1>
      <p>Action required from the support team</p>
    </div>
    <div class="content">
      <p>A new refund request has been submitted:</p>

      <div class="metric">
        <div class="label">Refund Amount</div>
        <div class="value" style="color: #f59e0b;">$${refundDetails.amount.toFixed(2)}</div>
      </div>

      <div style="background: #21262d; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px; color: #8b949e; font-size: 13px;"><strong style="color: #e6edf3;">User:</strong> ${firstName} (${refundDetails.userEmail})</p>
        <p style="margin: 0 0 8px; color: #8b949e; font-size: 13px;"><strong style="color: #e6edf3;">Reason:</strong> ${reasonLabel}</p>
        ${refundDetails.details ? `<p style="margin: 0 0 8px; color: #8b949e; font-size: 13px;"><strong style="color: #e6edf3;">Details:</strong> ${refundDetails.details}</p>` : ''}
        <p style="margin: 0; color: #8b949e; font-size: 13px;"><strong style="color: #e6edf3;">Request ID:</strong> ${refundDetails.id}</p>
      </div>

      <a href="${process.env.NEXTAUTH_URL || 'https://e-ari.com'}/admin/refunds" class="cta-button" style="background: linear-gradient(135deg, #f59e0b, #ef4444);">Review in Admin Panel</a>
    </div>
  `, `New refund request from ${refundDetails.userEmail} for $${refundDetails.amount.toFixed(2)}.`);

  const result = await sendEmail({
    to,
    subject: `New Refund Request: $${refundDetails.amount.toFixed(2)} from ${refundDetails.userEmail}`,
    html,
    text: `New refund request from ${refundDetails.userEmail} for $${refundDetails.amount.toFixed(2)}. Reason: ${reasonLabel}. Review at ${process.env.NEXTAUTH_URL || 'https://e-ari.com'}/admin/refunds`,
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

  const statusConfig: Record<string, { title: string; gradient: string; message: string }> = {
    approved: {
      title: 'Refund Approved',
      gradient: 'linear-gradient(135deg, #22c55e 0%, #06b6d4 100%)',
      message: 'Your refund request has been approved. The refund will be processed to your original payment method within 5-10 business days.',
    },
    rejected: {
      title: 'Refund Request Rejected',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
      message: `Your refund request has been rejected.${refundDetails.rejectionReason ? ` Reason: ${refundDetails.rejectionReason}` : ''} If you believe this is an error, please contact our support team.`,
    },
    refunded: {
      title: 'Refund Processed',
      gradient: 'linear-gradient(135deg, #22c55e 0%, #06b6d4 100%)',
      message: 'Your refund has been successfully processed. The amount will appear on your original payment method within 5-10 business days.',
    },
    pending: {
      title: 'Refund Request Received',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      message: 'We have received your refund request and it is being reviewed by our support team. You will be notified once a decision is made.',
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  const html = buildEmailWrapper(`
    <div class="header" style="background: ${config.gradient};">
      <h1>${config.title}</h1>
      <p>Refund request for $${refundDetails.amount.toFixed(2)}</p>
    </div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>${config.message}</p>

      <div style="background: #21262d; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px; color: #8b949e; font-size: 13px;"><strong style="color: #e6edf3;">Amount:</strong> $${refundDetails.amount.toFixed(2)}</p>
        <p style="margin: 0 0 8px; color: #8b949e; font-size: 13px;"><strong style="color: #e6edf3;">Reason:</strong> ${reasonLabel}</p>
        <p style="margin: 0; color: #8b949e; font-size: 13px;"><strong style="color: #e6edf3;">Request ID:</strong> ${refundDetails.id}</p>
      </div>

      <a href="${process.env.NEXTAUTH_URL || 'https://e-ari.com'}/portal" class="cta-button">Go to Your Account</a>
    </div>
  `, `${config.title}: Your refund request for $${refundDetails.amount.toFixed(2)} has been ${status}.`);

  const result = await sendEmail({
    to,
    subject: `${config.title} — $${refundDetails.amount.toFixed(2)} Refund`,
    html,
    text: `${config.title}. ${config.message} Amount: $${refundDetails.amount.toFixed(2)}. Request ID: ${refundDetails.id}. View at ${process.env.NEXTAUTH_URL || 'https://e-ari.com'}/portal`,
    from: EMAIL_FROM_ADDRESS,
    category: 'integration_alert',
  });

  // Also create in-app notification
  try {
    const user = await db.user.findUnique({ where: { email: to } });
    if (user) {
      await db.notification.create({
        data: {
          userId: user.id,
          type: 'integration_alert',
          title: config.title,
          message: `Your refund request for $${refundDetails.amount.toFixed(2)} has been ${status}.`,
          actionUrl: '/portal',
        },
      });
    }
  } catch {}

  return result;
}

// ─── Scheduled Notification Processing ──────────────────────────────────────

/**
 * Process quarterly reminders for all users with completed assessments.
 * Called by a scheduled job (cron or API endpoint).
 *
 * Checks:
 * - Users with assessments completed > 60 days ago → 30-day reminder
 * - Users with assessments completed > 80 days ago → 10-day reminder
 * - Users with assessments completed > 90 days ago → overdue reminder
 */
export async function processQuarterlyReminders(): Promise<number> {
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Find users with completed assessments that are 60+ days old
  // and who haven't been notified in the last 7 days
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

  // Deduplicate: only the latest assessment per user
  const latestByUser = new Map<string, typeof assessments[0]>();
  for (const a of assessments) {
    if (!latestByUser.has(a.userId)) {
      latestByUser.set(a.userId, a);
    }
  }

  let notificationsSent = 0;

  for (const [userId, assessment] of Array.from(latestByUser.entries())) {
    // Check if we already sent a reminder in the last 7 days
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

/**
 * Process score change alerts by comparing the latest two assessments.
 * Only triggers for changes >= SIGNIFICANT_SCORE_THRESHOLD points.
 */
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

    // Check if we already alerted about this specific assessment
    const existingAlert = await db.notification.findFirst({
      where: {
        userId: user.id,
        type: 'benchmark_update',
        assessmentId: latest.id,
      },
    });

    if (existingAlert) continue;

    // Find changed pillars
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
