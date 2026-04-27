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
import { welcomeEmailHtml } from './email-templates';

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
const BASE_URL = process.env.NEXTAUTH_URL || 'https://e-ari.com';

const SIGNIFICANT_SCORE_THRESHOLD = 8;

const REASON_DISPLAY: Record<string, string> = {
  duplicate: 'Duplicate charge',
  not_as_described: 'Not as described',
  accidental: 'Accidental purchase',
  other: 'Other',
};

// ─── Premium Email Design Tokens ────────────────────────────────────────────

const DESIGN = {
  bgOuter: '#080c14',
  bgCard: '#0f1521',
  bgCardElevated: '#141c2b',
  bgMetric: '#111827',

  gradientPrimary: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
  gradientGold: 'linear-gradient(135deg, #d4a853 0%, #f0c878 50%, #d4a853 100%)',
  gradientGreen: 'linear-gradient(135deg, #22c55e 0%, #06b6d4 100%)',
  gradientRed: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
  gradientPurple: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
  gradientAmber: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',

  borderSubtle: 'rgba(255,255,255,0.06)',
  borderAccent: 'rgba(37,99,235,0.3)',
  borderGold: 'rgba(212,168,83,0.3)',

  textPrimary: '#e6edf3',
  textSecondary: '#8b949e',
  textMuted: '#484f58',
  textAccent: '#3b82f6',
  textGold: '#d4a853',

  green: '#22c55e',
  red: '#ef4444',
  amber: '#f59e0b',
  purple: '#8b5cf6',
  cyan: '#06b6d4',

  radiusSm: '6px',
  radiusMd: '10px',
  radiusLg: '16px',

  logoSvg: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="10" fill="url(#logoGrad)"/>
    <path d="M12 14L20 10L28 14V22L20 30L12 22V14Z" stroke="white" stroke-width="1.5" fill="none"/>
    <path d="M20 10V30M12 14L28 22M28 14L12 22" stroke="white" stroke-width="1" opacity="0.4"/>
    <circle cx="20" cy="20" r="3" fill="white" opacity="0.9"/>
    <defs><linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40"><stop stop-color="#2563eb"/><stop offset="1" stop-color="#06b6d4"/></linearGradient></defs>
  </svg>`,
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

// ─── Premium Email Wrapper ─────────────────────────────────────────────────

function buildEmailWrapper(content: string, preheader: string, opts?: { headerGradient?: string }): string {
  const headerGradient = opts?.headerGradient || DESIGN.gradientPrimary;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>E-ARI</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background: ${DESIGN.bgOuter}; }
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    .email-container { max-width: 620px; margin: 0 auto; }
    .email-card { background: ${DESIGN.bgCard}; border-radius: ${DESIGN.radiusLg}; overflow: hidden; border: 1px solid ${DESIGN.borderSubtle}; }
    .email-header { background: ${headerGradient}; padding: 40px 32px 36px; text-align: center; position: relative; }
    .email-header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); }
    .email-header h1 { color: #ffffff; font-family: 'Inter', -apple-system, sans-serif; font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.03em; line-height: 1.2; }
    .email-header p { color: rgba(255,255,255,0.75); font-family: 'Inter', -apple-system, sans-serif; font-size: 14px; margin: 8px 0 0; font-weight: 400; }
    .logo-bar { padding: 24px 32px 0; text-align: center; }
    .email-content { padding: 32px; color: ${DESIGN.textPrimary}; font-family: 'Inter', -apple-system, sans-serif; }
    .email-content h2 { color: ${DESIGN.textPrimary}; font-size: 17px; margin: 28px 0 12px; font-weight: 700; letter-spacing: -0.01em; }
    .email-content p { color: ${DESIGN.textSecondary}; font-size: 14px; line-height: 1.65; margin: 0 0 16px; }
    .email-content strong { color: ${DESIGN.textPrimary}; font-weight: 600; }
    .email-content a { color: ${DESIGN.textAccent}; text-decoration: none; }
    .email-content ul { color: ${DESIGN.textSecondary}; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0 0 16px; }
    .email-content li { margin-bottom: 4px; }
    .metric { background: ${DESIGN.bgMetric}; border-radius: ${DESIGN.radiusMd}; padding: 20px; margin: 20px 0; border: 1px solid ${DESIGN.borderSubtle}; position: relative; overflow: hidden; }
    .metric::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: ${headerGradient}; border-radius: 0 3px 3px 0; }
    .metric .value { color: ${DESIGN.textAccent}; font-size: 32px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; }
    .metric .label { color: ${DESIGN.textMuted}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; margin-bottom: 6px; }
    .metric .sublabel { color: ${DESIGN.textSecondary}; font-size: 13px; margin-top: 6px; }
    .metric .delta-positive { color: ${DESIGN.green}; font-size: 14px; font-weight: 600; }
    .metric .delta-negative { color: ${DESIGN.red}; font-size: 14px; font-weight: 600; }
    .pillar-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
    .pillar-row:last-child { border-bottom: none; }
    .pillar-name { font-size: 12px; color: ${DESIGN.textSecondary}; width: 100px; flex-shrink: 0; font-weight: 500; }
    .pillar-bar-track { flex: 1; height: 5px; background: rgba(255,255,255,0.04); border-radius: 10px; overflow: hidden; }
    .pillar-bar-fill { height: 100%; border-radius: 10px; }
    .pillar-score { font-size: 12px; color: ${DESIGN.textPrimary}; font-weight: 700; width: 28px; text-align: right; flex-shrink: 0; font-variant-numeric: tabular-nums; }
    .risk-item { background: rgba(245,158,11,0.06); border-left: 3px solid ${DESIGN.amber}; padding: 12px 14px; margin: 8px 0; border-radius: 0 ${DESIGN.radiusSm} ${DESIGN.radiusSm} 0; }
    .risk-item p { color: #fbbf24; font-size: 13px; margin: 0; line-height: 1.5; }
    .win-item { background: rgba(34,197,94,0.06); border-left: 3px solid ${DESIGN.green}; padding: 12px 14px; margin: 8px 0; border-radius: 0 ${DESIGN.radiusSm} ${DESIGN.radiusSm} 0; }
    .win-item p { color: #4ade80; font-size: 13px; margin: 0; line-height: 1.5; }
    .step-card { background: ${DESIGN.bgCardElevated}; border-radius: ${DESIGN.radiusMd}; padding: 16px; margin: 10px 0; border: 1px solid ${DESIGN.borderSubtle}; }
    .step-number { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: ${headerGradient}; color: #fff; font-size: 11px; font-weight: 700; margin-right: 10px; flex-shrink: 0; }
    .step-title { color: ${DESIGN.textAccent}; font-weight: 600; font-size: 14px; }
    .step-desc { color: ${DESIGN.textSecondary}; font-size: 13px; margin: 4px 0 0 32px; line-height: 1.5; }
    .info-card { background: ${DESIGN.bgCardElevated}; border-radius: ${DESIGN.radiusMd}; padding: 16px; margin: 16px 0; border: 1px solid ${DESIGN.borderSubtle}; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { color: ${DESIGN.textMuted}; font-family: 'Inter', -apple-system, sans-serif; }
    .info-value { color: ${DESIGN.textPrimary}; font-weight: 500; font-family: 'Inter', -apple-system, sans-serif; }
    .cert-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
    .cert-badge-gold { background: linear-gradient(135deg, rgba(212,168,83,0.15), rgba(240,200,120,0.1)); color: ${DESIGN.textGold}; border: 1px solid ${DESIGN.borderGold}; }
    .cert-badge-blue { background: rgba(37,99,235,0.1); color: ${DESIGN.textAccent}; border: 1px solid ${DESIGN.borderAccent}; }
    .change-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; margin: 4px 0; background: ${DESIGN.bgMetric}; border-radius: ${DESIGN.radiusSm}; border: 1px solid ${DESIGN.borderSubtle}; }
    .change-row .pillar-label { color: ${DESIGN.textPrimary}; font-size: 13px; font-weight: 500; }
    .change-row .score-delta { font-size: 13px; font-weight: 600; }
    .cta-button { display: inline-block; background: ${DESIGN.gradientPrimary}; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: ${DESIGN.radiusMd}; font-weight: 600; font-size: 14px; margin: 20px 0; letter-spacing: -0.01em; font-family: 'Inter', -apple-system, sans-serif; }
    .cta-button-gold { background: ${DESIGN.gradientGold}; color: #0f1521; }
    .separator { height: 1px; background: linear-gradient(90deg, transparent, ${DESIGN.borderSubtle}, transparent); margin: 24px 0; }
    .email-footer { padding: 28px 32px; text-align: center; color: ${DESIGN.textMuted}; font-size: 12px; border-top: 1px solid ${DESIGN.borderSubtle}; font-family: 'Inter', -apple-system, sans-serif; }
    .email-footer a { color: ${DESIGN.textAccent}; text-decoration: none; }
    .email-footer .footer-brand { color: ${DESIGN.textSecondary}; font-weight: 600; font-size: 13px; margin-bottom: 8px; }
    .preheader { display: none !important; visibility: hidden; mso-hide: all; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
      .email-content { padding: 24px 20px !important; }
      .email-header { padding: 32px 20px 28px !important; }
      .metric .value { font-size: 26px !important; }
      .pillar-name { width: 80px !important; font-size: 11px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background: ${DESIGN.bgOuter};">
  <div class="preheader">${preheader}</div>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: ${DESIGN.bgOuter};">
    <tr>
      <td style="padding: 40px 16px;" align="center">
        <div class="email-container">
          <div class="logo-bar">${DESIGN.logoSvg}</div>
          <div class="email-card" style="margin-top: 20px;">
            ${content}
            <div class="email-footer">
              <div class="footer-brand">E-ARI</div>
              <p style="margin: 0 0 4px; color: ${DESIGN.textMuted};">Enterprise AI Readiness Assessment Platform</p>
              <p style="margin: 0; color: ${DESIGN.textMuted};">You're receiving this because you have an active E-ARI account. <a href="${BASE_URL}/portal">Manage notifications</a> &middot; <a href="mailto:support@e-ari.com">support@e-ari.com</a> &middot; <a href="${BASE_URL}/privacy">Privacy Policy</a></p>
            </div>
          </div>
          <p style="text-align: center; margin-top: 20px; font-family: 'Inter', sans-serif; font-size: 11px; color: ${DESIGN.textMuted};">
            Scoring engine v5.3 &middot; Deterministic &middot; Reproducible
          </p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Helper: Build pillar score bars ────────────────────────────────────────

function buildPillarBars(pillarScores: Array<{ name: string; score: number; color: string }>): string {
  return pillarScores.map(p => `
    <div class="pillar-row">
      <span class="pillar-name">${p.name}</span>
      <div class="pillar-bar-track">
        <div class="pillar-bar-fill" style="width: ${p.score}%; background: ${p.color};"></div>
      </div>
      <span class="pillar-score">${p.score}</span>
    </div>
  `).join('');
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

  const pillarBarsHtml = buildPillarBars(pillarDisplay);
  const scoreRounded = Math.round(overallScore);
  const certClass = scoreRounded >= 80 ? 'cert-badge-gold' : 'cert-badge-blue';
  const certText = scoreRounded >= 80 ? `${maturityLabel} Certified` : maturityLabel;

  const html = buildEmailWrapper(`
    <div class="email-header">
      <h1>Assessment Complete</h1>
      <p>Your AI readiness profile is ready</p>
    </div>
    <div class="email-content">
      <p>Hi ${firstName},</p>
      <p>Your E-ARI assessment has been processed through our deterministic scoring pipeline (v5.3). Here are your results:</p>

      <div class="metric">
        <div class="label">E-ARI Composite Score</div>
        <div class="value">${scoreRounded}</div>
        <div class="sublabel">
          <span class="cert-badge ${certClass}">${certText}</span>
        </div>
      </div>

      <h2>Pillar Breakdown</h2>
      ${pillarBarsHtml}

      <div class="separator"></div>
      <p>Your full assessment report includes AI-generated narrative insights, sector benchmark comparisons, and strategic recommendations tailored to your maturity level.</p>

      <div style="text-align: center;">
        <a href="${BASE_URL}/assessment/${assessmentId}" class="cta-button">View Full Report</a>
      </div>
    </div>
  `, `Your E-ARI assessment is complete. Score: ${scoreRounded} (${maturityLabel}). View your detailed readiness profile.`);

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
  const firstName = userName?.split(' ')[0] || 'there';
  const maturityLabel = MATURITY_BANDS[maturityBand as keyof typeof MATURITY_BANDS]?.label || maturityBand;
  const scoreRounded = Math.round(overallScore);
  const isOverdue = daysUntilReview <= 0;

  const urgencyText = isOverdue
    ? 'Your quarterly AI readiness review is <strong>overdue</strong>'
    : daysUntilReview <= 30
    ? `Your quarterly review is due in <strong>${daysUntilReview} days</strong>`
    : `Your next quarterly review is in <strong>${daysUntilReview} days</strong>`;

  const html = buildEmailWrapper(`
    <div class="email-header">
      <h1>${isOverdue ? 'Review Overdue' : 'Quarterly Review'}</h1>
      <p>${urgencyText}</p>
    </div>
    <div class="email-content">
      <p>Hi ${firstName},</p>
      <p>AI readiness is not a one-time measurement. It evolves as your organization adopts new technologies, processes, and strategies. Regular re-assessment ensures your score reflects your current state and captures meaningful progress over time.</p>

      <div class="metric">
        <div class="label">Last Assessment Score</div>
        <div class="value">${scoreRounded}</div>
        <div class="sublabel">
          <span class="cert-badge cert-badge-blue">${maturityLabel}</span>
          &nbsp;&middot;&nbsp; Assessed ${new Date(lastAssessmentDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <h2>Why Re-assess Now?</h2>
      <p>A quarterly re-assessment captures critical changes that affect your readiness posture:</p>
      <ul>
        <li>Progress from recent AI initiatives and investments</li>
        <li>Changes in governance posture due to new regulations (EU AI Act updates)</li>
        <li>Impact of talent acquisition or upskilling programs</li>
        <li>Infrastructure and data pipeline improvements</li>
        <li>Shifts in organizational culture and AI adoption sentiment</li>
      </ul>

      <div style="text-align: center;">
        <a href="${BASE_URL}/assessment" class="cta-button">Re-run Assessment</a>
      </div>
      <p style="font-size: 12px; color: ${DESIGN.textMuted}; text-align: center;">Your previous answers will be pre-filled for quick updating.</p>
    </div>
  `, `Your quarterly AI readiness review is ${isOverdue ? 'overdue' : `due in ${daysUntilReview} days`}. Current score: ${scoreRounded}.`,
  { headerGradient: isOverdue ? DESIGN.gradientRed : DESIGN.gradientPrimary });

  const result = await sendEmail({
    to: userEmail,
    subject: isOverdue
      ? 'Action Required: Your AI Readiness Review Is Overdue'
      : `${daysUntilReview}-Day Notice: Quarterly AI Readiness Review`,
    html,
    text: `Hi ${firstName}, ${urgencyText.replace(/<[^>]*>/g, '')}. Your last score was ${scoreRounded} (${maturityLabel}). Re-run at ${BASE_URL}/assessment`,
    from: EMAIL_FROM_HELLO,
    category: 'quarterly_reminder',
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
  const firstName = userName?.split(' ')[0] || 'there';
  const delta = previousScore !== null ? Math.round(overallScore - previousScore) : null;
  const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const scoreRounded = Math.round(overallScore);

  const deltaHtml = delta !== null ? `
    <div style="display: inline-block; margin-left: 12px; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 700; ${delta >= 0 ? `background: rgba(34,197,94,0.12); color: ${DESIGN.green};` : `background: rgba(239,68,68,0.12); color: ${DESIGN.red};`}">
      ${delta >= 0 ? '+' : ''}${delta}%
    </div>
  ` : '';

  const risksHtml = topRisks.slice(0, 3).map(r => `<div class="risk-item"><p>${r}</p></div>`).join('');
  const winsHtml = topQuickWins.slice(0, 3).map(w => `<div class="win-item"><p>${w}</p></div>`).join('');

  const html = buildEmailWrapper(`
    <div class="email-header">
      <h1>AI Pulse Report</h1>
      <p>${monthLabel} Readiness Summary</p>
    </div>
    <div class="email-content">
      <p>Hi ${firstName},</p>
      <p>Your monthly AI readiness pulse check is ready. This automated analysis compares your current assessment profile to identify emerging risks and high-impact improvement opportunities.</p>

      <div class="metric">
        <div class="label">Overall Readiness</div>
        <div style="display: flex; align-items: center;">
          <div class="value">${scoreRounded}%</div>
          ${deltaHtml}
        </div>
      </div>

      ${risksHtml ? `<h2>Top Risks</h2>${risksHtml}` : ''}
      ${winsHtml ? `<h2>Quick Wins</h2>${winsHtml}` : ''}

      <div style="text-align: center;">
        <a href="${BASE_URL}/pulse" class="cta-button">View Full Pulse Report</a>
      </div>
    </div>
  `, `${monthLabel} AI Pulse: Score ${scoreRounded}%${delta !== null ? ` (${delta >= 0 ? '+' : ''}${delta}%)` : ''}. ${topRisks.length} risks, ${topQuickWins.length} quick wins.`,
  { headerGradient: DESIGN.gradientPurple });

  const result = await sendEmail({
    to: userEmail,
    subject: `${monthLabel} AI Pulse: Your Readiness Score Is ${scoreRounded}%`,
    html,
    text: `${monthLabel} AI Pulse: Overall ${scoreRounded}%${delta !== null ? ` (${delta >= 0 ? '+' : ''}${delta}%)` : ''}. ${topRisks.length} risks and ${topQuickWins.length} quick wins. View at ${BASE_URL}/pulse`,
    from: EMAIL_FROM_HELLO,
    category: 'pulse_ready',
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

  const pillarChangesHtml = changedPillars.map(cp => {
    const isPositive = cp.delta > 0;
    return `<div class="change-row">
      <span class="pillar-label">${cp.pillarName}</span>
      <span class="score-delta" style="color: ${isPositive ? DESIGN.green : DESIGN.red};">
        ${cp.previousScore}% &rarr; ${cp.currentScore}% (${isPositive ? '+' : ''}${cp.delta}%)
      </span>
    </div>`;
  }).join('');

  const html = buildEmailWrapper(`
    <div class="email-header">
      <h1>${isImprovement ? 'Readiness Score Increased' : 'Readiness Score Changed'}</h1>
      <p>Your AI readiness score ${isImprovement ? 'improved' : 'changed'} by ${Math.abs(overallDelta)} points</p>
    </div>
    <div class="email-content">
      <p>Hi ${firstName},</p>
      <p>Your latest assessment shows a <strong>${isImprovement ? 'positive' : 'significant'}</strong> change in your AI readiness profile. Here's what shifted:</p>

      <div class="metric">
        <div class="label">Overall Score Change</div>
        <div class="value" style="color: ${isImprovement ? DESIGN.green : DESIGN.red};">${Math.round(previousScore)}% &rarr; ${Math.round(currentScore)}%</div>
        <div class="${isImprovement ? 'delta-positive' : 'delta-negative'}" style="margin-top: 6px;">
          ${isImprovement ? '+' : ''}${overallDelta} point${Math.abs(overallDelta) !== 1 ? 's' : ''}
        </div>
      </div>

      <h2>Pillar Changes</h2>
      ${pillarChangesHtml}

      <div class="separator"></div>
      ${isImprovement ? `
        <p>Your investments in AI readiness are paying off. Continue monitoring with monthly AI Pulse reports and focus on remaining gaps to sustain momentum.</p>
      ` : `
        <p>A declining readiness score often reflects changes in organizational priorities, talent turnover, or evolving regulatory requirements. Re-assess your strategy and focus on the pillars showing the steepest declines.</p>
      `}

      <div style="text-align: center;">
        <a href="${BASE_URL}/portal" class="cta-button">View Full Results</a>
      </div>
    </div>
  `, `Your AI readiness score ${isImprovement ? 'increased' : 'changed'} by ${overallDelta} points to ${Math.round(currentScore)}%.`,
  { headerGradient: isImprovement ? DESIGN.gradientGreen : DESIGN.gradientRed });

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
  const isPlatinum = certificationLevel === 'Platinum';

  const levelDetails: Record<string, { range: string; description: string }> = {
    Bronze: { range: '40–55', description: 'Your organization has established foundational AI readiness practices and is on the path to systematic AI adoption.' },
    Silver: { range: '56–69', description: 'Your organization demonstrates developing AI readiness with structured processes and growing AI maturity across key dimensions.' },
    Gold: { range: '70–84', description: 'Your organization shows established AI readiness with strong governance, robust infrastructure, and strategic AI alignment.' },
    Platinum: { range: '85–100', description: 'Your organization has achieved leading AI readiness with best-in-class practices across all eight pillars. This places you among the most AI-prepared enterprises globally.' },
  };

  const detail = levelDetails[certificationLevel] || levelDetails.Bronze;

  const html = buildEmailWrapper(`
    <div class="email-header">
      <h1>Certification Achieved</h1>
      <p>E-ARI ${certificationLevel} Certification</p>
    </div>
    <div class="email-content">
      <p>Hi ${firstName},</p>
      <p>Congratulations! Your organization has earned the <strong>E-ARI ${certificationLevel} Certification</strong> with a composite readiness score of <strong>${scoreRounded}</strong>.</p>

      <div class="metric" style="text-align: center; padding: 28px 20px;">
        <span class="cert-badge ${isPlatinum ? 'cert-badge-gold' : 'cert-badge-blue'}" style="font-size: 16px; padding: 10px 24px;">${certificationLevel}</span>
        <div style="margin-top: 12px; color: ${DESIGN.textSecondary}; font-size: 13px;">Score range: ${detail.range} &middot; Your score: ${scoreRounded}</div>
      </div>

      <p>${detail.description}</p>

      <div class="info-card">
        <p style="margin: 0; font-size: 13px; color: ${DESIGN.textSecondary};"><strong style="color: ${DESIGN.textPrimary};">About E-ARI Certification:</strong> This certification is based on our deterministic scoring engine (v5.3) and validates your organization's AI readiness maturity. Share your certification badge with stakeholders, partners, and auditors to demonstrate your commitment to responsible AI adoption.</p>
      </div>

      <div style="text-align: center;">
        <a href="${BASE_URL}/portal" class="cta-button ${isPlatinum ? 'cta-button-gold' : ''}">View Your Certificate</a>
      </div>
    </div>
  `, `Congratulations! You've earned E-ARI ${certificationLevel} Certification with a score of ${scoreRounded}.`,
  { headerGradient: isPlatinum ? DESIGN.gradientGold : DESIGN.gradientPrimary });

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
  const safeBody = messageBody.replace(/\n/g, '<br>');

  const html = buildEmailWrapper(`
    <div class="email-header">
      <h1>Message from E-ARI</h1>
      <p>A direct message from the E-ARI team</p>
    </div>
    <div class="email-content">
      <p>Hi ${firstName},</p>
      <div class="info-card">
        <p style="color: ${DESIGN.textPrimary}; font-size: 14px; line-height: 1.8; margin: 0; white-space: pre-wrap;">${safeBody}</p>
      </div>
      <p style="font-size: 12px; color: ${DESIGN.textMuted}; margin-top: 20px;">This message was sent directly by the E-ARI team. Reply to <a href="mailto:support@e-ari.com">support@e-ari.com</a> if you have questions.</p>
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
    <div class="email-header">
      <h1>New Contact Message</h1>
      <p>From ${name}${company ? ` · ${company}` : ''}</p>
    </div>
    <div class="email-content">
      <div class="info-card">
        <div class="info-row"><span class="info-label">Name</span><span class="info-value">${name}</span></div>
        <div class="info-row"><span class="info-label">Email</span><span class="info-value"><a href="mailto:${email}">${email}</a></span></div>
        ${company ? `<div class="info-row"><span class="info-label">Company</span><span class="info-value">${company}</span></div>` : ''}
        <div class="info-row"><span class="info-label">Subject</span><span class="info-value">${subject}</span></div>
      </div>
      <div class="metric">
        <div class="label">Message</div>
        <p style="color: ${DESIGN.textPrimary}; font-size: 14px; line-height: 1.8; margin: 8px 0 0; white-space: pre-wrap;">${safeMessage}</p>
      </div>
      <div style="text-align: center; margin-top: 20px;">
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
    <div class="email-header">
      <h1>New Refund Request</h1>
      <p>Action required from the support team</p>
    </div>
    <div class="email-content">
      <p>A new refund request has been submitted:</p>

      <div class="metric">
        <div class="label">Refund Amount</div>
        <div class="value" style="color: ${DESIGN.amber};">$${refundDetails.amount.toFixed(2)}</div>
      </div>

      <div class="info-card">
        <div class="info-row"><span class="info-label">User</span><span class="info-value">${firstName} &lt;${refundDetails.userEmail}&gt;</span></div>
        <div class="info-row"><span class="info-label">Reason</span><span class="info-value">${reasonLabel}</span></div>
        ${refundDetails.details ? `<div class="info-row"><span class="info-label">Details</span><span class="info-value">${refundDetails.details}</span></div>` : ''}
        <div class="info-row"><span class="info-label">Request ID</span><span class="info-value" style="font-family: monospace; font-size: 12px;">${refundDetails.id}</span></div>
      </div>

      <div style="text-align: center;">
        <a href="${BASE_URL}/admin/refunds" class="cta-button">Review in Admin Panel</a>
      </div>
    </div>
  `, `New refund request from ${refundDetails.userEmail} for $${refundDetails.amount.toFixed(2)}.`,
  { headerGradient: DESIGN.gradientRed });

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

  const statusConfig: Record<string, { title: string; gradient: string; message: string }> = {
    approved: {
      title: 'Refund Approved',
      gradient: DESIGN.gradientGreen,
      message: 'Your refund request has been approved. The refund will be processed to your original payment method within 5-10 business days.',
    },
    rejected: {
      title: 'Refund Request Rejected',
      gradient: DESIGN.gradientRed,
      message: `Your refund request has been rejected.${refundDetails.rejectionReason ? ` Reason: ${refundDetails.rejectionReason}` : ''} If you believe this is an error, please contact our support team.`,
    },
    refunded: {
      title: 'Refund Processed',
      gradient: DESIGN.gradientGreen,
      message: 'Your refund has been successfully processed. The amount will appear on your original payment method within 5-10 business days.',
    },
    pending: {
      title: 'Refund Request Received',
      gradient: DESIGN.gradientAmber,
      message: 'We have received your refund request and it is being reviewed by our support team. You will be notified once a decision is made.',
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  const html = buildEmailWrapper(`
    <div class="email-header">
      <h1>${config.title}</h1>
      <p>Refund request for $${refundDetails.amount.toFixed(2)}</p>
    </div>
    <div class="email-content">
      <p>Hi ${firstName},</p>
      <p>${config.message}</p>

      <div class="info-card">
        <div class="info-row"><span class="info-label">Amount</span><span class="info-value">$${refundDetails.amount.toFixed(2)}</span></div>
        <div class="info-row"><span class="info-label">Reason</span><span class="info-value">${reasonLabel}</span></div>
        <div class="info-row"><span class="info-label">Status</span><span class="info-value" style="text-transform: capitalize;">${status}</span></div>
        <div class="info-row"><span class="info-label">Request ID</span><span class="info-value" style="font-family: monospace; font-size: 12px;">${refundDetails.id}</span></div>
      </div>

      <div style="text-align: center;">
        <a href="${BASE_URL}/portal" class="cta-button">Go to Your Account</a>
      </div>
    </div>
  `, `${config.title}: Your refund request for $${refundDetails.amount.toFixed(2)} has been ${status}.`,
  { headerGradient: config.gradient });

  const result = await sendEmail({
    to,
    subject: `${config.title} — $${refundDetails.amount.toFixed(2)} Refund`,
    html,
    text: `${config.title}. ${config.message} Amount: $${refundDetails.amount.toFixed(2)}. Request ID: ${refundDetails.id}. View at ${BASE_URL}/portal`,
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
