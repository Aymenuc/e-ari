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

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" width="40" height="40" style="display:inline-block;vertical-align:middle;">
  <path d="M24 3L43 13.5V34.5L24 45L5 34.5V13.5L24 3Z" stroke="#60a5fa" stroke-width="1.5" fill="none" opacity="0.4"/>
  <path d="M24 8L37.5 15.5V30.5L24 38L10.5 30.5V15.5L24 8Z" stroke="#60a5fa" stroke-width="1" fill="none" opacity="0.2"/>
  <circle cx="24" cy="24" r="5" fill="#2563eb"/>
  <circle cx="24" cy="24" r="3" fill="#60a5fa"/>
  <line x1="24" y1="24" x2="24" y2="11" stroke="#60a5fa" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="24" y1="24" x2="35.3" y2="17.5" stroke="#60a5fa" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="24" y1="24" x2="35.3" y2="30.5" stroke="#60a5fa" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="24" y1="24" x2="24" y2="37" stroke="#60a5fa" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="24" y1="24" x2="12.7" y2="30.5" stroke="#60a5fa" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="24" y1="24" x2="12.7" y2="17.5" stroke="#60a5fa" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="24" cy="11" r="2.5" fill="#60a5fa"/>
  <circle cx="35.3" cy="17.5" r="2.5" fill="#8b5cf6"/>
  <circle cx="35.3" cy="30.5" r="2.5" fill="#06b6d4"/>
  <circle cx="24" cy="37" r="2.5" fill="#10b981"/>
  <circle cx="12.7" cy="30.5" r="2.5" fill="#f59e0b"/>
  <circle cx="12.7" cy="17.5" r="2.5" fill="#ec4899"/>
  <circle cx="29.7" cy="13.3" r="2" fill="#ef4444"/>
  <circle cx="18.3" cy="34.7" r="2" fill="#14b8a6"/>
</svg>`;

function buildEmailWrapper(content: string, preheader: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://e-ari.com';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>E-ARI</title>
  <style>
    body { margin: 0; padding: 0; background: #0a0f1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
    .wrapper { padding: 32px 16px; background: #0a0f1a; }
    .container { max-width: 580px; margin: 0 auto; background: #111827; border-radius: 16px; overflow: hidden; border: 1px solid #1e2a3a; box-shadow: 0 24px 64px rgba(0,0,0,0.5); }
    .topbar { background: #0d1520; padding: 18px 28px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #1e2a3a; }
    .topbar-brand { color: #f1f5f9; font-size: 16px; font-weight: 700; letter-spacing: -0.02em; }
    .topbar-dot { width: 5px; height: 5px; background: #2563eb; border-radius: 50%; display: inline-block; margin: 0 6px; animation: none; }
    .header { padding: 36px 28px 28px; text-align: center; position: relative; overflow: hidden; }
    .header-bg { background: linear-gradient(135deg, #0f2044 0%, #1a1040 50%, #0f2044 100%); }
    .header-accent { position: absolute; top: -40px; left: 50%; transform: translateX(-50%); width: 300px; height: 300px; background: radial-gradient(circle, rgba(37,99,235,0.25) 0%, transparent 70%); border-radius: 50%; pointer-events: none; }
    .header h1 { color: #f1f5f9; font-size: 22px; margin: 16px 0 0; font-weight: 800; letter-spacing: -0.02em; position: relative; }
    .header p { color: rgba(241,245,249,0.65); font-size: 14px; margin: 8px 0 0; position: relative; }
    .divider { height: 1px; background: linear-gradient(90deg, transparent, #1e3a5f, transparent); margin: 0; }
    .content { padding: 32px 28px; color: #e2e8f0; }
    .content h2 { color: #f1f5f9; font-size: 18px; margin: 24px 0 12px; font-weight: 700; letter-spacing: -0.01em; }
    .content p { color: #94a3b8; font-size: 14px; line-height: 1.7; margin: 0 0 14px; }
    .content p strong { color: #e2e8f0; }
    .metric { background: #0d1520; border-radius: 10px; padding: 18px 20px; margin: 16px 0; border: 1px solid #1e3a5f; border-left: 3px solid #2563eb; }
    .metric .value { color: #60a5fa; font-size: 30px; font-weight: 800; letter-spacing: -0.03em; }
    .metric .label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
    .metric .change-positive { color: #34d399; font-size: 13px; font-weight: 600; }
    .metric .change-negative { color: #f87171; font-size: 13px; font-weight: 600; }
    .cta-wrap { text-align: center; margin: 24px 0 8px; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #0891b2 100%); color: #ffffff !important; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-weight: 700; font-size: 14px; letter-spacing: 0.01em; box-shadow: 0 4px 24px rgba(37,99,235,0.35); }
    .step-card { background: #0d1520; border-radius: 10px; padding: 16px 18px; margin: 10px 0; border: 1px solid #1e2a3a; }
    .step-card .step-title { color: #60a5fa; font-weight: 700; font-size: 13px; margin: 0 0 6px; }
    .step-card p { color: #94a3b8; font-size: 13px; margin: 0; line-height: 1.5; }
    .risk-item { background: rgba(245,158,11,0.08); border-left: 3px solid #f59e0b; padding: 12px 14px; margin: 8px 0; border-radius: 6px; }
    .risk-item p { color: #fbbf24; font-size: 13px; margin: 0; }
    .win-item { background: rgba(52,211,153,0.08); border-left: 3px solid #34d399; padding: 12px 14px; margin: 8px 0; border-radius: 6px; }
    .win-item p { color: #34d399; font-size: 13px; margin: 0; }
    .info-card { background: #0d1520; border-radius: 10px; padding: 16px 18px; margin: 16px 0; border: 1px solid #1e2a3a; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { color: #64748b; }
    .info-value { color: #e2e8f0; font-weight: 500; }
    .footer-divider { height: 1px; background: #1e2a3a; margin: 0; }
    .footer { padding: 20px 28px; background: #0d1520; }
    .footer-brand { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .footer-brand-name { color: #64748b; font-size: 13px; font-weight: 600; }
    .footer p { color: #475569; font-size: 12px; line-height: 1.6; margin: 0 0 4px; }
    .footer a { color: #3b82f6; text-decoration: none; }
    .preheader { display: none !important; visibility: hidden; mso-hide: all; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; }
  </style>
</head>
<body>
  <div class="preheader">${preheader}</div>
  <div class="wrapper">
    <div class="container">
      <div class="topbar">
        ${LOGO_SVG}
        <span class="topbar-brand">E-ARI</span>
        <span class="topbar-dot"></span>
        <span style="color:#475569;font-size:12px;">Enterprise AI Readiness</span>
      </div>
      ${content}
      <div class="footer-divider"></div>
      <div class="footer">
        <div class="footer-brand">
          ${LOGO_SVG.replace('width="40" height="40"', 'width="20" height="20"')}
          <span class="footer-brand-name">E-ARI Platform</span>
        </div>
        <p>You're receiving this because you have an active E-ARI account.</p>
        <p><a href="${baseUrl}/portal">Manage notifications</a> &middot; <a href="mailto:support@e-ari.com">support@e-ari.com</a> &middot; <a href="${baseUrl}/privacy">Privacy Policy</a></p>
      </div>
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
    <div class="header header-bg">
      <div class="header-accent"></div>
      <h1>Quarterly Review Reminder</h1>
      <p>${urgencyText}</p>
    </div>
    <div class="divider"></div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>AI readiness is not a one-time measurement — it evolves as your organization adopts new technologies, processes, and strategies. Regular re-assessment ensures your score reflects your current state.</p>

      <div class="metric">
        <div class="label">Last Assessment Score</div>
        <div class="value">${Math.round(overallScore)}%</div>
        <div style="margin-top: 4px; color: #64748b; font-size: 13px;">${maturityLabel} maturity &middot; ${new Date(lastAssessmentDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
      </div>

      <h2>Why Re-assess Now?</h2>
      <p>Your AI readiness landscape shifts faster than you'd expect. A quarterly re-assessment captures:</p>
      <ul style="color: #94a3b8; font-size: 14px; line-height: 1.9; padding-left: 20px; margin: 0 0 16px;">
        <li>Progress from recent AI initiatives and investments</li>
        <li>Changes in governance posture from new regulations</li>
        <li>Impact of talent acquisition or upskilling programs</li>
        <li>Infrastructure and data pipeline improvements</li>
        <li>Shifts in organizational culture and AI adoption</li>
      </ul>

      <div class="cta-wrap">
        <a href="${process.env.NEXTAUTH_URL || 'https://e-ari.com'}/assessment" class="cta-button">Re-run Assessment</a>
      </div>
      <p style="font-size: 12px; color: #475569; text-align: center; margin-top: 8px;">Your previous answers will be pre-filled for quick updating.</p>
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
    <div class="header header-bg">
      <div class="header-accent"></div>
      <h1>AI Pulse Report</h1>
      <p>${monthLabel} Readiness Summary</p>
    </div>
    <div class="divider"></div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>Here's your monthly AI readiness pulse check — an automated analysis that compares your current assessment profile to identify emerging risks and high-impact improvement opportunities.</p>

      <div class="metric">
        <div class="label">Overall Readiness</div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="value">${Math.round(overallScore)}%</div>
          ${deltaHtml}
        </div>
      </div>

      ${risksHtml ? `<h2>Top Risks</h2>${risksHtml}` : ''}
      ${winsHtml ? `<h2>Quick Wins</h2>${winsHtml}` : ''}

      <div class="cta-wrap">
        <a href="${process.env.NEXTAUTH_URL || 'https://e-ari.com'}/pulse" class="cta-button">View Full Pulse Report</a>
      </div>
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
    <div class="header" style="background: ${isImprovement ? 'linear-gradient(135deg, #0a2a1a 0%, #0d2038 100%)' : 'linear-gradient(135deg, #2a0a0a 0%, #1a1020 100%)'};">
      <div class="header-accent" style="background: radial-gradient(circle, ${isImprovement ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'} 0%, transparent 70%);"></div>
      <h1 style="color: ${isImprovement ? '#34d399' : '#f87171'};">${isImprovement ? 'Readiness Score Increased' : 'Readiness Score Changed'}</h1>
      <p>Your AI readiness score ${isImprovement ? 'improved' : 'changed'} by ${Math.abs(overallDelta)} points</p>
    </div>
    <div class="divider"></div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>Your latest assessment shows a <strong>${isImprovement ? 'positive' : 'significant'}</strong> change in your AI readiness profile. Here's what shifted:</p>

      <div class="metric" style="border-left-color: ${isImprovement ? '#34d399' : '#f87171'};">
        <div class="label">Overall Score Change</div>
        <div class="value" style="color: ${isImprovement ? '#34d399' : '#f87171'};">${Math.round(previousScore)}% → ${Math.round(currentScore)}%</div>
        <div class="${isImprovement ? 'change-positive' : 'change-negative'}" style="margin-top: 4px;">
          ${isImprovement ? '+' : ''}${overallDelta} point${Math.abs(overallDelta) !== 1 ? 's' : ''}
        </div>
      </div>

      <h2>Pillar Changes</h2>
      ${pillarChangesHtml}

      <p>${isImprovement
        ? 'Your investments in AI readiness are paying off. Keep monitoring progress with monthly AI Pulse reports and focus on remaining gaps to sustain momentum.'
        : 'A declining score often reflects shifts in priorities, talent turnover, or evolving regulatory requirements. Re-assess your strategy and focus on the pillars showing the steepest declines.'
      }</p>

      <div class="cta-wrap">
        <a href="${process.env.NEXTAUTH_URL || 'https://e-ari.com'}/portal" class="cta-button">View Full Results</a>
      </div>
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
    <div class="header header-bg">
      <div class="header-accent"></div>
      <h1>Welcome to E-ARI</h1>
      <p>Your AI Readiness journey starts now</p>
    </div>
    <div class="divider"></div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>Welcome to <strong>E-ARI</strong> — the Enterprise AI Readiness Assessment platform that helps you measure, track, and improve your organization's preparedness for AI adoption across 8 critical dimensions.</p>

      <h2>Get Started in 3 Steps</h2>

      <div class="step-card">
        <p class="step-title">1 &mdash; Complete Your First Assessment</p>
        <p>Answer 40 questions across 8 readiness pillars — takes about 15 minutes. Your results are immediate.</p>
      </div>
      <div class="step-card">
        <p class="step-title">2 &mdash; Review Your AI Readiness Score</p>
        <p>Get a detailed breakdown by pillar with maturity classification and AI-generated strategic insights.</p>
      </div>
      <div class="step-card">
        <p class="step-title">3 &mdash; Track Progress Over Time</p>
        <p>Use quarterly re-assessments and monthly AI Pulse reports to measure improvement and stay ahead.</p>
      </div>

      <div class="cta-wrap" style="margin-top: 28px;">
        <a href="${process.env.NEXTAUTH_URL || 'https://e-ari.com'}/assessment" class="cta-button">Start Your First Assessment</a>
      </div>
      <p style="text-align: center; font-size: 12px; color: #475569; margin-top: 10px;">Free to start &mdash; no credit card required</p>
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

// ─── Admin → User Custom Email ──────────────────────────────────────────────

export async function sendCustomEmail(
  to: string,
  userName: string | null,
  subject: string,
  messageBody: string,
): Promise<EmailResult> {
  const firstName = userName?.split(' ')[0] || 'there';
  const safeBody = messageBody.replace(/\n/g, '<br>');

  const html = buildEmailWrapper(`
    <div class="header header-bg">
      <div class="header-accent"></div>
      <h1>Message from E-ARI</h1>
      <p>A direct message from the E-ARI team</p>
    </div>
    <div class="divider"></div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <div class="metric" style="border-left-color: #2563eb; padding: 20px;">
        <p style="color: #e2e8f0; font-size: 14px; line-height: 1.8; margin: 0; white-space: pre-wrap;">${safeBody}</p>
      </div>
      <p style="font-size: 12px; color: #475569; margin-top: 20px;">This message was sent directly by the E-ARI team. Reply to <a href="mailto:support@e-ari.com" style="color: #3b82f6;">support@e-ari.com</a> if you have questions.</p>
    </div>
  `, subject);

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

  const safeMessage = message.replace(/\n/g, '<br>');

  const html = buildEmailWrapper(`
    <div class="header header-bg">
      <div class="header-accent"></div>
      <h1>New Contact Message</h1>
      <p>From ${name}${company ? ` · ${company}` : ''}</p>
    </div>
    <div class="divider"></div>
    <div class="content">
      <div class="info-card">
        <div class="info-row"><span class="info-label">Name</span><span class="info-value">${name}</span></div>
        <div class="info-row"><span class="info-label">Email</span><span class="info-value"><a href="mailto:${email}" style="color: #60a5fa;">${email}</a></span></div>
        ${company ? `<div class="info-row"><span class="info-label">Company</span><span class="info-value">${company}</span></div>` : ''}
        <div class="info-row"><span class="info-label">Subject</span><span class="info-value">${subject}</span></div>
      </div>
      <div class="metric">
        <div class="label">Message</div>
        <p style="color: #e2e8f0; font-size: 14px; line-height: 1.8; margin: 8px 0 0; white-space: pre-wrap;">${safeMessage}</p>
      </div>
      <div class="cta-wrap" style="margin-top: 20px;">
        <a href="mailto:${email}" class="cta-button">Reply to ${name}</a>
      </div>
    </div>
  `, `Contact from ${name} (${email}): ${subject}`);

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

  const html = buildEmailWrapper(`
    <div class="header" style="background: linear-gradient(135deg, #1a0f00 0%, #1a0a0a 100%);">
      <div class="header-accent" style="background: radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%);"></div>
      <h1 style="color: #fbbf24;">New Refund Request</h1>
      <p>Action required from the support team</p>
    </div>
    <div class="divider"></div>
    <div class="content">
      <p>A new refund request has been submitted and requires your review.</p>

      <div class="metric" style="border-left-color: #f59e0b;">
        <div class="label">Refund Amount</div>
        <div class="value" style="color: #fbbf24;">$${refundDetails.amount.toFixed(2)}</div>
      </div>

      <div class="info-card">
        <div class="info-row"><span class="info-label">User</span><span class="info-value">${firstName} &lt;${refundDetails.userEmail}&gt;</span></div>
        <div class="info-row"><span class="info-label">Reason</span><span class="info-value">${reasonLabel}</span></div>
        ${refundDetails.details ? `<div class="info-row"><span class="info-label">Details</span><span class="info-value">${refundDetails.details}</span></div>` : ''}
        <div class="info-row"><span class="info-label">Request ID</span><span class="info-value" style="font-family: monospace; font-size: 12px;">${refundDetails.id}</span></div>
      </div>

      <div class="cta-wrap">
        <a href="${process.env.NEXTAUTH_URL || 'https://e-ari.com'}/admin" class="cta-button" style="background: linear-gradient(135deg, #d97706, #dc2626);">Review in Admin Panel</a>
      </div>
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

  const bgColor = status === 'approved' || status === 'refunded' ? 'linear-gradient(135deg, #0a1f15 0%, #0d1520 100%)' : status === 'rejected' ? 'linear-gradient(135deg, #1a0a0a 0%, #1a1020 100%)' : 'linear-gradient(135deg, #1a0f00 0%, #0d1520 100%)';
  const accentColor = status === 'approved' || status === 'refunded' ? 'rgba(52,211,153,0.2)' : status === 'rejected' ? 'rgba(248,113,113,0.2)' : 'rgba(251,191,36,0.2)';
  const titleColor = status === 'approved' || status === 'refunded' ? '#34d399' : status === 'rejected' ? '#f87171' : '#fbbf24';
  const borderColor = status === 'approved' || status === 'refunded' ? '#34d399' : status === 'rejected' ? '#f87171' : '#f59e0b';

  const html = buildEmailWrapper(`
    <div class="header" style="background: ${bgColor};">
      <div class="header-accent" style="background: radial-gradient(circle, ${accentColor} 0%, transparent 70%);"></div>
      <h1 style="color: ${titleColor};">${config.title}</h1>
      <p>Refund request for $${refundDetails.amount.toFixed(2)}</p>
    </div>
    <div class="divider"></div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>${config.message}</p>

      <div class="info-card">
        <div class="info-row"><span class="info-label">Amount</span><span class="info-value" style="color: ${titleColor}; font-weight: 700;">$${refundDetails.amount.toFixed(2)}</span></div>
        <div class="info-row"><span class="info-label">Reason</span><span class="info-value">${reasonLabel}</span></div>
        <div class="info-row"><span class="info-label">Status</span><span class="info-value" style="color: ${titleColor}; text-transform: capitalize;">${status}</span></div>
        <div class="info-row"><span class="info-label">Request ID</span><span class="info-value" style="font-family: monospace; font-size: 12px;">${refundDetails.id}</span></div>
      </div>

      <div class="cta-wrap">
        <a href="${process.env.NEXTAUTH_URL || 'https://e-ari.com'}/portal" class="cta-button">Go to Your Account</a>
      </div>
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
