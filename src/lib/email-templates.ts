/**
 * E-ARI transactional email templates
 *
 * Icon strategy:
 *   - Modern clients (Gmail, Apple Mail, iOS): inline SVG inside a styled container
 *   - Outlook: conditional comment hides SVG, shows a plain styled-text fallback
 *
 * Other design rules:
 *   - No CSS gradient dependencies on structural elements (Outlook fallback)
 *   - PNG logo via absolute hosted URL
 *   - Inline styles only, no classes except for media-query overrides
 *   - Font stack: 'Segoe UI', Helvetica, Arial
 */

import { getCanonicalSiteUrl } from "@/lib/site-url";

const SITE_URL = getCanonicalSiteUrl();
const LOGO_URL = `${SITE_URL}/logo-mark.png`;
const YEAR = new Date().getFullYear();

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          '#f3f6fb',
  card:        '#ffffff',
  border:      '#dbe4f0',
  headerBg:    '#f8fbff',
  accent:      '#2f5edb',
  heading:     '#111827',
  body:        '#4b5563',
  bodyStrong:  '#0f172a',
  muted:       '#6b7280',
  divider:     '#e6edf5',
  btnText:     '#ffffff',
  iconBgMail:  '#eef4ff',
  iconBgKey:   '#f1f2ff',
  iconBorder:  '#c8dafd',
  iconBorderKey: '#d4d7ff',
  iconStroke:  '#2f5edb',
  warnBg:      '#fff8eb',
  warnBorder:  '#e0a528',
  warnText:    '#9a6400',
  footerText:  '#7b8797',
} as const;

// ─── SVG icon components ──────────────────────────────────────────────────────
// Outlook strips SVG entirely — wrap in conditional comments so Outlook sees
// a plain styled-letter fallback and modern clients see the SVG.

function iconMail(): string {
  return `
    <!--[if mso]>
    <td width="44" height="44" style="width:44px;height:44px;background-color:${C.iconBgMail};border-radius:10px;text-align:center;vertical-align:middle;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:${C.iconStroke}">@</td>
    <![endif]-->
    <!--[if !mso]><!-->
    <td style="width:44px;height:44px;background-color:${C.iconBgMail};border:1px solid ${C.iconBorder};border-radius:10px;text-align:center;vertical-align:middle;padding:0">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
        style="display:block;margin:11px auto 0">
        <rect x="2" y="4" width="20" height="16" rx="2.5" stroke="${C.iconStroke}" stroke-width="1.8"/>
        <path d="M2 8.5L10.5 13.5C11.4 14.1 12.6 14.1 13.5 13.5L22 8.5" stroke="${C.iconStroke}" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    </td>
    <!--<![endif]-->`;
}

function iconKey(): string {
  return `
    <!--[if mso]>
    <td width="44" height="44" style="width:44px;height:44px;background-color:${C.iconBgKey};border-radius:10px;text-align:center;vertical-align:middle;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:${C.iconStroke}">K</td>
    <![endif]-->
    <!--[if !mso]><!-->
    <td style="width:44px;height:44px;background-color:${C.iconBgKey};border:1px solid ${C.iconBorderKey};border-radius:10px;text-align:center;vertical-align:middle;padding:0">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
        style="display:block;margin:11px auto 0">
        <circle cx="8" cy="12" r="4" stroke="${C.iconStroke}" stroke-width="1.8"/>
        <path d="M12 12H21" stroke="${C.iconStroke}" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M18 12V15" stroke="${C.iconStroke}" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M21 12V14" stroke="${C.iconStroke}" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    </td>
    <!--<![endif]-->`;
}

// ─── CTA button ───────────────────────────────────────────────────────────────

function ctaButton(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 32px">
      <tr>
        <td style="border-radius:10px;background-color:${C.accent}">
          <a href="${href}" target="_blank"
            style="display:block;padding:14px 36px;color:${C.btnText};font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-weight:600;font-size:15px;text-decoration:none;letter-spacing:0.1px;white-space:nowrap">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function divider(): string {
  return `
    <table class="divider-row" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="margin:28px 0">
      <tr><td style="border-top:1px solid ${C.divider}"></td></tr>
    </table>`;
}

// ─── Base wrapper ─────────────────────────────────────────────────────────────

function base(content: string, previewText: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <title>E-ARI</title>
  <style>
    @media (prefers-color-scheme: dark) {
      .outer-bg  { background-color: #0b1220 !important; }
      .card      { background-color: #0f172a !important; border-color: #25324a !important; }
      .card-hdr  { background-color: #121d33 !important; border-color: #2b3953 !important; }
      .h1        { color: #e6edf5 !important; }
      .body-p    { color: #a8b4c7 !important; }
      .strong-p  { color: #d8e1ee !important; }
      .div-line td { border-color: #2a3851 !important; }
      .ftr       { background-color: #0b1220 !important; border-color: #2a3851 !important; }
      .ftr-p     { color: #8ea0b8 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};font-family:'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">

  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${previewText}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>

  <table class="outer-bg" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:${C.bg};padding:40px 16px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:28px">
          <a href="${SITE_URL}" target="_blank" style="text-decoration:none">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto">
              <tr>
                <td style="vertical-align:middle;padding-right:10px">
                  <img src="${LOGO_URL}" alt="E-ARI" width="38" height="38"
                    style="display:block;width:38px;height:38px;border-radius:9px;border:0;outline:none">
                </td>
                <td style="vertical-align:middle">
                  <span style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;color:${C.heading};letter-spacing:-0.2px">E-ARI</span>
                  <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;color:${C.muted};line-height:1.3">Enterprise AI Readiness</div>
                </td>
              </tr>
            </table>
          </a>
        </td></tr>

        <!-- Card -->
        <tr><td class="card"
          style="background-color:${C.card};border-radius:16px;border:1px solid ${C.border};overflow:hidden">

          ${content}

          <!-- Footer -->
          <table class="ftr" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="background-color:${C.headerBg};border-top:1px solid ${C.divider};padding:22px 40px;text-align:center">
              <p class="ftr-p" style="margin:0 0 4px;font-size:12px;color:${C.muted};line-height:1.6">
                &copy; ${YEAR} E-ARI &middot; Enterprise AI Readiness Platform
              </p>
              <p class="ftr-p" style="margin:0;font-size:11px;color:${C.footerText}">
                You received this because you have an account at
                <a href="${SITE_URL}" style="color:${C.muted};text-decoration:underline">e-ari.com</a>.
              </p>
            </td></tr>
          </table>

        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Welcome email ────────────────────────────────────────────────────────────

function iconUser(): string {
  return `
    <!--[if mso]>
    <td width="44" height="44" style="width:44px;height:44px;background-color:#eefcf3;border-radius:10px;text-align:center;vertical-align:middle;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#1f8a4c">W</td>
    <![endif]-->
    <!--[if !mso]><!-->
    <td style="width:44px;height:44px;background-color:#eefcf3;border:1px solid #b7ebcd;border-radius:10px;text-align:center;vertical-align:middle;padding:0">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
        style="display:block;margin:11px auto 0">
        <circle cx="12" cy="8" r="3.5" stroke="#1f8a4c" stroke-width="1.8"/>
        <path d="M5 20c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="#1f8a4c" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    </td>
    <!--<![endif]-->`;
}

function stepRow(num: string, title: string, desc: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px">
      <tr>
        <td width="32" style="vertical-align:top;padding-top:1px;padding-right:14px">
          <div style="width:26px;height:26px;border-radius:50%;background-color:#0d1f3c;border:1px solid ${C.iconBorder};text-align:center;line-height:26px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;font-weight:700;color:${C.iconStroke}">${num}</div>
        </td>
        <td style="vertical-align:top;background-color:${C.headerBg};border:1px solid ${C.border};border-radius:10px;padding:14px 16px">
          <p style="margin:0 0 5px;font-size:14px;font-weight:700;color:${C.heading};font-family:'Segoe UI',Helvetica,Arial,sans-serif">${title}</p>
          <p style="margin:0;font-size:13px;color:${C.body};line-height:1.6;font-family:'Segoe UI',Helvetica,Arial,sans-serif">${desc}</p>
        </td>
      </tr>
    </table>`;
}

export function welcomeEmailHtml(name: string, assessmentUrl: string): string {
  const firstName = name.split(' ')[0];

  const content = `
    <!-- Header -->
    <table class="card-hdr" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background-color:${C.headerBg};padding:28px 40px;border-bottom:1px solid ${C.border}">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${iconUser()}
            <td style="padding-left:16px;vertical-align:middle">
              <h1 class="h1" style="margin:0 0 3px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:19px;font-weight:700;color:${C.heading};line-height:1.2">Welcome to E-ARI</h1>
              <p style="margin:0;font-size:13px;color:${C.body};font-family:'Segoe UI',Helvetica,Arial,sans-serif">Your AI readiness journey starts here</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- Body -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:32px 40px">

        <p class="body-p" style="margin:0 0 16px;font-size:15px;color:${C.body};line-height:1.7;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
          Hi <strong class="strong-p" style="color:${C.bodyStrong}">${firstName}</strong>,
        </p>
        <p class="body-p" style="margin:0 0 28px;font-size:15px;color:${C.body};line-height:1.7;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
          You have joined the platform that organizations use to measure, benchmark, and improve AI readiness.
          Your first step is to establish a baseline score across <strong class="strong-p" style="color:${C.bodyStrong}">8 critical dimensions</strong>.
        </p>

        <!-- Steps -->
        <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:${C.muted};letter-spacing:0.06em;text-transform:uppercase;font-family:'Segoe UI',Helvetica,Arial,sans-serif">Get started in 3 steps</p>

        ${stepRow('1', 'Complete your first assessment', '40 questions across 8 pillars. Takes about 15 minutes. Results in your baseline E-ARI composite score and maturity band.')}
        ${stepRow('2', 'Review your readiness profile', 'Pillar-by-pillar breakdown with AI-generated insights, sector benchmarking, and strategic recommendations.')}
        ${stepRow('3', 'Track progress over time', 'Quarterly re-assessments and monthly AI Pulse reports measure improvement and unlock E-ARI Certification.')}

        <!-- CTA -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px auto 0">
          <tr>
            <td style="border-radius:10px;background-color:${C.accent}">
              <a href="${assessmentUrl}" target="_blank"
                style="display:block;padding:14px 36px;color:${C.btnText};font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-weight:600;font-size:15px;text-decoration:none;letter-spacing:0.1px;white-space:nowrap">
                Start Your First Assessment
              </a>
            </td>
          </tr>
        </table>

        ${divider()}

        <p style="margin:0;font-size:12px;color:${C.muted};text-align:center;font-family:'Segoe UI',Helvetica,Arial,sans-serif;line-height:1.6">
          Free to start &middot; No credit card required &middot; Scoring engine v5.3
        </p>

      </td></tr>
    </table>`;

  return base(content, `Welcome, ${firstName}! Start your first AI readiness assessment today.`);
}

// ─── Verification email ───────────────────────────────────────────────────────

export function verificationEmailHtml(verifyUrl: string, name: string): string {
  const firstName = name.trim().split(/\s+/)[0] || "there";
  const content = `
    <!-- Header -->
    <table class="card-hdr" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background-color:${C.headerBg};padding:28px 40px;border-bottom:1px solid ${C.border}">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${iconMail()}
            <td style="padding-left:16px;vertical-align:middle">
              <h1 class="h1" style="margin:0 0 3px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:19px;font-weight:700;color:${C.heading};line-height:1.2">Verify your email</h1>
              <p style="margin:0;font-size:13px;color:${C.body};font-family:'Segoe UI',Helvetica,Arial,sans-serif">Activate your secure E-ARI workspace</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- Body -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:32px 40px">
        <p class="body-p" style="margin:0 0 16px;font-size:15px;color:${C.body};line-height:1.7;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
          Hi <strong class="strong-p" style="color:${C.bodyStrong}">${firstName}</strong>,
        </p>
        <p class="body-p" style="margin:0 0 32px;font-size:15px;color:${C.body};line-height:1.7;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
          Welcome to E-ARI. Please confirm this email address to unlock your readiness dashboard,
          reports, and assessment workflows.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="margin-bottom:24px;background-color:${C.headerBg};border:1px solid ${C.border};border-radius:10px">
          <tr><td style="padding:16px 20px">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${C.muted};font-family:'Segoe UI',Helvetica,Arial,sans-serif">Verification details</p>
            <p style="margin:0 0 6px;font-size:13px;color:${C.body};line-height:1.6;font-family:'Segoe UI',Helvetica,Arial,sans-serif"><strong style="color:${C.bodyStrong}">Security:</strong> This link is single-use and expires in 24 hours.</p>
            <p style="margin:0;font-size:13px;color:${C.body};line-height:1.6;font-family:'Segoe UI',Helvetica,Arial,sans-serif"><strong style="color:${C.bodyStrong}">Next step:</strong> After verification, sign in to start your first assessment.</p>
          </td></tr>
        </table>

        <p style="margin:0 0 16px;font-size:12px;color:${C.muted};font-family:'Segoe UI',Helvetica,Arial,sans-serif;text-transform:uppercase;letter-spacing:0.08em">
          Confirm your account
        </p>

        ${ctaButton(verifyUrl, 'Verify Email Address')}

        ${divider()}

        <p style="margin:0 0 6px;font-size:12px;color:${C.muted};font-family:'Segoe UI',Helvetica,Arial,sans-serif">
          Button not working? Copy and paste this URL into your browser:
        </p>
        <p style="margin:0;font-size:11px;color:${C.accent};word-break:break-all;line-height:1.6;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
          ${verifyUrl}
        </p>

        <p style="margin:16px 0 0;font-size:12px;color:${C.muted};font-family:'Segoe UI',Helvetica,Arial,sans-serif;line-height:1.6">
          Didn&apos;t create an account? You can ignore this email safely.
        </p>
      </td></tr>
    </table>`;

  return base(content, 'Verify your email address to activate your E-ARI account.');
}

// ─── Password reset email ─────────────────────────────────────────────────────

export function resetEmailHtml(resetUrl: string, name: string): string {
  const content = `
    <!-- Header -->
    <table class="card-hdr" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background-color:${C.headerBg};padding:28px 40px;border-bottom:1px solid ${C.border}">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${iconKey()}
            <td style="padding-left:16px;vertical-align:middle">
              <h1 class="h1" style="margin:0 0 3px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:19px;font-weight:700;color:${C.heading};line-height:1.2">Reset your password</h1>
              <p style="margin:0;font-size:13px;color:${C.body};font-family:'Segoe UI',Helvetica,Arial,sans-serif">Password reset requested for your account</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- Body -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:32px 40px">
        <p class="body-p" style="margin:0 0 16px;font-size:15px;color:${C.body};line-height:1.7;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
          Hi <strong class="strong-p" style="color:${C.bodyStrong}">${name}</strong>,
        </p>
        <p class="body-p" style="margin:0 0 32px;font-size:15px;color:${C.body};line-height:1.7;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
          We received a request to reset your password. Click the button below to choose a new one.
          This link expires in <strong class="strong-p" style="color:${C.bodyStrong}">1 hour</strong>.
          If you did not request this, no action is needed.
        </p>

        ${ctaButton(resetUrl, 'Reset Password')}

        <!-- Security note -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px">
          <tr>
            <td style="background-color:${C.warnBg};border-left:3px solid ${C.warnBorder};border-radius:0 6px 6px 0;padding:12px 16px">
              <p style="margin:0;font-size:13px;color:${C.warnText};line-height:1.6;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
                <strong>Security notice:</strong> If you did not request a password reset, your account may be targeted.
                Contact <a href="mailto:hello@e-ari.com" style="color:${C.warnText};text-decoration:underline">hello@e-ari.com</a> immediately.
              </p>
            </td>
          </tr>
        </table>

        ${divider()}

        <p style="margin:0 0 6px;font-size:12px;color:${C.muted};font-family:'Segoe UI',Helvetica,Arial,sans-serif">
          Button not working? Copy and paste this URL into your browser:
        </p>
        <p style="margin:0;font-size:11px;color:${C.accent};word-break:break-all;line-height:1.6;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
          ${resetUrl}
        </p>
      </td></tr>
    </table>`;

  return base(content, 'Reset your E-ARI password — link expires in 1 hour.');
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function infoRow(label: string, value: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px">
      <tr>
        <td width="110" style="font-size:12px;color:${C.muted};font-family:'Segoe UI',Helvetica,Arial,sans-serif;vertical-align:top;padding-top:1px">${label}</td>
        <td style="font-size:13px;color:${C.bodyStrong};font-family:'Segoe UI',Helvetica,Arial,sans-serif">${value}</td>
      </tr>
    </table>`;
}

function metricBlock(label: string, value: string, sub?: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="margin-bottom:24px;background-color:${C.headerBg};border:1px solid ${C.border};border-radius:10px">
      <tr><td style="padding:20px 24px">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${C.muted};font-family:'Segoe UI',Helvetica,Arial,sans-serif">${label}</p>
        <p style="margin:0;font-size:30px;font-weight:800;color:${C.accent};font-family:'Segoe UI',Helvetica,Arial,sans-serif;letter-spacing:-0.03em;line-height:1">${value}</p>
        ${sub ? `<p style="margin:6px 0 0;font-size:13px;color:${C.body};font-family:'Segoe UI',Helvetica,Arial,sans-serif">${sub}</p>` : ''}
      </td></tr>
    </table>`;
}

function pillarBar(name: string, score: number, color: string): string {
  const fillW = Math.round(Math.min(100, Math.max(0, score)) * 1.8);
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:6px">
      <tr>
        <td width="110" style="font-size:12px;color:${C.body};font-family:'Segoe UI',Helvetica,Arial,sans-serif;padding-right:12px;white-space:nowrap">${name}</td>
        <td style="padding-right:12px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
            style="background-color:#111827;border-radius:4px;height:5px">
            <tr>
              <td width="${fillW}" style="background-color:${color};border-radius:4px;height:5px;font-size:0;line-height:0">&nbsp;</td>
              <td style="height:5px;font-size:0;line-height:0"></td>
            </tr>
          </table>
        </td>
        <td width="28" style="font-size:12px;font-weight:700;color:${C.heading};font-family:'Segoe UI',Helvetica,Arial,sans-serif;text-align:right">${score}</td>
      </tr>
    </table>`;
}

function sectionLabel(text: string): string {
  return `<p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:${C.muted};font-family:'Segoe UI',Helvetica,Arial,sans-serif">${text}</p>`;
}

function alertPanel(text: string, color: string, bg: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px">
      <tr>
        <td style="background-color:${bg};border-left:3px solid ${color};border-radius:0 6px 6px 0;padding:12px 16px">
          <p style="margin:0;font-size:13px;color:${color};line-height:1.6;font-family:'Segoe UI',Helvetica,Arial,sans-serif">${text}</p>
        </td>
      </tr>
    </table>`;
}

function emailHeader(icon: string, title: string, subtitle: string): string {
  return `
    <table class="card-hdr" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background-color:${C.headerBg};padding:28px 40px;border-bottom:1px solid ${C.border}">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${icon}
            <td style="padding-left:16px;vertical-align:middle">
              <h1 class="h1" style="margin:0 0 3px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:19px;font-weight:700;color:${C.heading};line-height:1.2">${title}</h1>
              <p style="margin:0;font-size:13px;color:${C.body};font-family:'Segoe UI',Helvetica,Arial,sans-serif">${subtitle}</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>`;
}

// ─── Icons for remaining templates ───────────────────────────────────────────

function iconChart(): string {
  return `
    <!--[if mso]>
    <td width="44" height="44" style="width:44px;height:44px;background-color:#eef4ff;border-radius:10px;text-align:center;vertical-align:middle;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:${C.iconStroke}">A</td>
    <![endif]-->
    <!--[if !mso]><!-->
    <td style="width:44px;height:44px;background-color:#eef4ff;border:1px solid ${C.iconBorder};border-radius:10px;text-align:center;vertical-align:middle;padding:0">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
        style="display:block;margin:11px auto 0">
        <rect x="3" y="12" width="4" height="9" rx="1" stroke="${C.iconStroke}" stroke-width="1.8"/>
        <rect x="10" y="7" width="4" height="14" rx="1" stroke="${C.iconStroke}" stroke-width="1.8"/>
        <rect x="17" y="3" width="4" height="18" rx="1" stroke="${C.iconStroke}" stroke-width="1.8"/>
      </svg>
    </td>
    <!--<![endif]-->`;
}

function iconStar(): string {
  return `
    <!--[if mso]>
    <td width="44" height="44" style="width:44px;height:44px;background-color:#fff9ed;border-radius:10px;text-align:center;vertical-align:middle;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#a87400">C</td>
    <![endif]-->
    <!--[if !mso]><!-->
    <td style="width:44px;height:44px;background-color:#fff9ed;border:1px solid #f0d8a3;border-radius:10px;text-align:center;vertical-align:middle;padding:0">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
        style="display:block;margin:11px auto 0">
        <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"
          stroke="#a87400" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
    </td>
    <!--<![endif]-->`;
}

function iconRefund(): string {
  return `
    <!--[if mso]>
    <td width="44" height="44" style="width:44px;height:44px;background-color:#fff7ec;border-radius:10px;text-align:center;vertical-align:middle;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#b56c00">$</td>
    <![endif]-->
    <!--[if !mso]><!-->
    <td style="width:44px;height:44px;background-color:#fff7ec;border:1px solid #f2d1a1;border-radius:10px;text-align:center;vertical-align:middle;padding:0">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
        style="display:block;margin:11px auto 0">
        <circle cx="12" cy="12" r="8" stroke="#b56c00" stroke-width="1.8"/>
        <path d="M12 7v1m0 8v1M9.5 9.5A2.5 2.5 0 0112 8a2.5 2.5 0 010 5 2.5 2.5 0 000 5 2.5 2.5 0 002.5-1.5" stroke="#b56c00" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    </td>
    <!--<![endif]-->`;
}

function iconMsg(): string {
  return `
    <!--[if mso]>
    <td width="44" height="44" style="width:44px;height:44px;background-color:#eef4ff;border-radius:10px;text-align:center;vertical-align:middle;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:${C.iconStroke}">M</td>
    <![endif]-->
    <!--[if !mso]><!-->
    <td style="width:44px;height:44px;background-color:#eef4ff;border:1px solid ${C.iconBorder};border-radius:10px;text-align:center;vertical-align:middle;padding:0">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
        style="display:block;margin:11px auto 0">
        <path d="M4 4h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H6l-4 4V6c0-1.1.9-2 2-2z"
          stroke="${C.iconStroke}" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
    </td>
    <!--<![endif]-->`;
}

// ─── Assessment complete ──────────────────────────────────────────────────────

export function assessmentCompleteEmailHtml(
  name: string,
  score: number,
  maturityLabel: string,
  pillarScores: Array<{ name: string; score: number; color: string }>,
  reportUrl: string,
): string {
  const firstName = name.split(' ')[0];
  const scoreRounded = Math.round(score);
  const bars = pillarScores.map(p => pillarBar(p.name, Math.round(p.score), p.color)).join('');

  const content = `
    ${emailHeader(iconChart(), 'Assessment Complete', 'Your AI readiness profile is ready')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:32px 40px">
        <p class="body-p" style="margin:0 0 24px;font-size:15px;color:${C.body};line-height:1.7;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
          Hi <strong class="strong-p" style="color:${C.bodyStrong}">${firstName}</strong>,<br>
          Your assessment has been processed through the E-ARI scoring pipeline (v5.3).
        </p>
        ${metricBlock('E-ARI Composite Score', String(scoreRounded), `${maturityLabel}${scoreRounded >= 80 ? ' &middot; Certified' : ''}`)}
        ${sectionLabel('Pillar Breakdown')}
        ${bars}
        ${divider()}
        <p class="body-p" style="margin:0 0 28px;font-size:14px;color:${C.body};line-height:1.7;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
          Your full report includes AI-generated insights, sector benchmarks, and strategic recommendations.
        </p>
        ${ctaButton(reportUrl, 'View Full Report')}
      </td></tr>
    </table>`;

  return base(content, `Assessment complete. E-ARI score: ${scoreRounded} (${maturityLabel}).`);
}

// ─── Quarterly reminder ───────────────────────────────────────────────────────

export function quarterlyReminderEmailHtml(
  name: string,
  score: number,
  maturityLabel: string,
  lastAssessmentDate: string,
  daysUntilReview: number,
  isOverdue: boolean,
  unsubscribeLink?: string,
): string {
  const firstName = name.split(' ')[0];
  const scoreRounded = Math.round(score);
  const dateLabel = new Date(lastAssessmentDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const urgency = isOverdue
    ? 'Your quarterly AI readiness review is <strong style="color:#e8edf5">overdue</strong>.'
    : daysUntilReview <= 30
    ? `Your quarterly review is due in <strong style="color:#e8edf5">${daysUntilReview} days</strong>.`
    : `Your next quarterly review is in <strong style="color:#e8edf5">${daysUntilReview} days</strong>.`;

  const bullets = ['Progress from recent AI initiatives', 'Governance changes from new regulations (EU AI Act)', 'Impact of talent acquisition or upskilling', 'Infrastructure and data pipeline improvements'];

  const content = `
    ${emailHeader(iconChart(), isOverdue ? 'Review Overdue' : 'Quarterly Review', isOverdue ? 'Action required' : `Due in ${daysUntilReview} days`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:32px 40px">
        <p class="body-p" style="margin:0 0 24px;font-size:15px;color:${C.body};line-height:1.7;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
          Hi <strong class="strong-p" style="color:${C.bodyStrong}">${firstName}</strong>,<br>${urgency}
          AI readiness evolves as your organization adopts new technology and changes governance posture.
        </p>
        ${metricBlock('Last Assessment Score', String(scoreRounded), `${maturityLabel} &middot; Assessed ${dateLabel}`)}
        ${sectionLabel('Why Re-assess?')}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px">
          ${bullets.map(b => `<tr>
            <td width="16" style="vertical-align:top;padding-right:10px">
              <div style="width:5px;height:5px;border-radius:50%;background-color:${C.accent};margin-top:7px">&nbsp;</div>
            </td>
            <td style="font-size:13px;color:${C.body};line-height:1.6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;padding-bottom:8px">${b}</td>
          </tr>`).join('')}
        </table>
        ${ctaButton(`${SITE_URL}/assessment`, 'Re-run Assessment')}
        <p style="margin:-16px 0 0;font-size:12px;color:${C.muted};text-align:center;font-family:'Segoe UI',Helvetica,Arial,sans-serif">Your previous answers will be pre-filled for quick updating.</p>
        ${unsubscribeLink ? `<p style="margin:20px 0 0;font-size:11px;color:${C.muted};text-align:center;font-family:'Segoe UI',Helvetica,Arial,sans-serif">Prefer not to receive reminders? <a href="${unsubscribeLink}" style="color:${C.muted};text-decoration:underline">Unsubscribe from quarterly reminders</a>.</p>` : ""}
      </td></tr>
    </table>`;

  return base(content, `Quarterly review ${isOverdue ? 'overdue' : `due in ${daysUntilReview} days`}. Last score: ${scoreRounded}.`);
}

// ─── Monthly pulse ────────────────────────────────────────────────────────────

export function monthlyPulseEmailHtml(
  name: string,
  score: number,
  delta: number | null,
  topRisks: string[],
  topQuickWins: string[],
  monthLabel: string,
  unsubscribeLink?: string,
): string {
  const firstName = name.split(' ')[0];
  const scoreRounded = Math.round(score);
  const deltaStr = delta !== null ? `${delta >= 0 ? '+' : ''}${delta}%` : null;
  const deltaColor = delta !== null && delta < 0 ? '#ef4444' : '#3ecf8e';

  const content = `
    ${emailHeader(iconChart(), 'AI Pulse Report', `${monthLabel} Readiness Summary`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:32px 40px">
        <p class="body-p" style="margin:0 0 24px;font-size:15px;color:${C.body};line-height:1.7;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
          Hi <strong class="strong-p" style="color:${C.bodyStrong}">${firstName}</strong>,<br>
          Your ${monthLabel} AI readiness pulse is ready.
        </p>
        ${metricBlock('Overall Readiness', `${scoreRounded}%${deltaStr ? ` <span style="font-size:16px;color:${deltaColor}">${deltaStr}</span>` : ''}`)}
        ${topRisks.length ? `${sectionLabel('Top Risks')}${topRisks.slice(0, 3).map(r => alertPanel(r, '#d4820a', '#1a160a')).join('')}` : ''}
        ${topQuickWins.length ? `${sectionLabel('Quick Wins')}${topQuickWins.slice(0, 3).map(w => alertPanel(w, '#3ecf8e', '#0d2218')).join('')}` : ''}
        ${ctaButton(`${SITE_URL}/pulse`, 'View Full Pulse Report')}
        ${unsubscribeLink ? `<p style="margin:20px 0 0;font-size:11px;color:${C.muted};text-align:center;font-family:'Segoe UI',Helvetica,Arial,sans-serif">Prefer not to receive pulse emails? <a href="${unsubscribeLink}" style="color:${C.muted};text-decoration:underline">Unsubscribe from monthly pulse emails</a>.</p>` : ""}
      </td></tr>
    </table>`;

  return base(content, `${monthLabel} AI Pulse: ${scoreRounded}%${deltaStr ? ` (${deltaStr})` : ''}. ${topRisks.length} risks, ${topQuickWins.length} quick wins.`);
}

// ─── Score change alert ───────────────────────────────────────────────────────

export function scoreChangeAlertEmailHtml(
  name: string,
  previousScore: number,
  currentScore: number,
  changedPillars: Array<{ pillarName: string; previousScore: number; currentScore: number; delta: number }>,
): string {
  const firstName = name.split(' ')[0];
  const overallDelta = Math.round(currentScore - previousScore);
  const isUp = overallDelta > 0;

  const changeRows = changedPillars.map(cp => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="margin-bottom:6px;background-color:${C.headerBg};border:1px solid ${C.border};border-radius:8px">
      <tr>
        <td style="padding:10px 14px;font-size:13px;color:${C.bodyStrong};font-family:'Segoe UI',Helvetica,Arial,sans-serif">${cp.pillarName}</td>
        <td style="padding:10px 14px;font-size:13px;font-weight:700;color:${cp.delta > 0 ? '#3ecf8e' : '#ef4444'};font-family:'Segoe UI',Helvetica,Arial,sans-serif;text-align:right;white-space:nowrap">
          ${cp.previousScore}% &rarr; ${cp.currentScore}% (${cp.delta > 0 ? '+' : ''}${cp.delta}%)
        </td>
      </tr>
    </table>`).join('');

  const content = `
    ${emailHeader(iconChart(), isUp ? 'Score Increased' : 'Score Changed', `${isUp ? 'Improved' : 'Changed'} by ${Math.abs(overallDelta)} points`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:32px 40px">
        <p class="body-p" style="margin:0 0 24px;font-size:15px;color:${C.body};line-height:1.7;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
          Hi <strong class="strong-p" style="color:${C.bodyStrong}">${firstName}</strong>,<br>
          Your latest assessment shows a ${isUp ? 'positive' : 'significant'} shift in your readiness profile.
        </p>
        ${metricBlock('Overall Score Change', `${Math.round(previousScore)}% &rarr; ${Math.round(currentScore)}%`, `${isUp ? '+' : ''}${overallDelta} points`)}
        ${sectionLabel('Pillar Changes')}
        ${changeRows}
        ${divider()}
        <p class="body-p" style="margin:0 0 28px;font-size:14px;color:${C.body};line-height:1.7;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
          ${isUp ? 'Your investments in AI readiness are paying off. Continue monitoring with monthly AI Pulse reports.' : 'A declining score often reflects shifts in organizational priorities. Review the pillars showing steepest declines.'}
        </p>
        ${ctaButton(`${SITE_URL}/portal`, 'View Full Results')}
      </td></tr>
    </table>`;

  return base(content, `Your AI readiness score ${isUp ? 'increased' : 'changed'} by ${Math.abs(overallDelta)} points to ${Math.round(currentScore)}%.`);
}

// ─── Certification ────────────────────────────────────────────────────────────

const CERT_DETAILS: Record<string, { range: string; description: string }> = {
  Bronze:   { range: '40–55', description: 'Your organization has established foundational AI readiness practices and is on the path to systematic AI adoption.' },
  Silver:   { range: '56–69', description: 'Your organization demonstrates developing AI readiness with structured processes and growing maturity across key dimensions.' },
  Gold:     { range: '70–84', description: 'Your organization shows established AI readiness with strong governance, robust infrastructure, and strategic AI alignment.' },
  Platinum: { range: '85–100', description: 'Your organization has achieved leading AI readiness with best-in-class practices across all eight pillars — among the most AI-prepared enterprises globally.' },
};

export function certificationEmailHtml(name: string, certificationLevel: string, score: number): string {
  const firstName = name.split(' ')[0];
  const scoreRounded = Math.round(score);
  const detail = CERT_DETAILS[certificationLevel] || CERT_DETAILS.Bronze;
  const isPlatinum = certificationLevel === 'Platinum';
  const badgeColor = isPlatinum ? '#c9900a' : C.accent;
  const badgeBg   = isPlatinum ? '#1a1400' : '#0d1f3c';

  const content = `
    ${emailHeader(iconStar(), 'Certification Achieved', `E-ARI ${certificationLevel} Certification`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:32px 40px">
        <p class="body-p" style="margin:0 0 24px;font-size:15px;color:${C.body};line-height:1.7;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
          Hi <strong class="strong-p" style="color:${C.bodyStrong}">${firstName}</strong>,<br>
          Congratulations. Your organization has earned
          <strong class="strong-p" style="color:${C.bodyStrong}">E-ARI ${certificationLevel} Certification</strong>
          with a composite score of <strong class="strong-p" style="color:${C.bodyStrong}">${scoreRounded}</strong>.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="margin-bottom:24px;background-color:${badgeBg};border:1px solid ${badgeColor}33;border-radius:10px">
          <tr><td style="padding:24px;text-align:center">
            <span style="display:inline-block;padding:8px 24px;border-radius:20px;background-color:${badgeColor}1a;border:1px solid ${badgeColor}55;font-size:15px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:${badgeColor};font-family:'Segoe UI',Helvetica,Arial,sans-serif">${certificationLevel}</span>
            <p style="margin:10px 0 0;font-size:13px;color:${C.body};font-family:'Segoe UI',Helvetica,Arial,sans-serif">Score range: ${detail.range} &middot; Your score: ${scoreRounded}</p>
          </td></tr>
        </table>
        <p class="body-p" style="margin:0 0 20px;font-size:14px;color:${C.body};line-height:1.7;font-family:'Segoe UI',Helvetica,Arial,sans-serif">${detail.description}</p>
        ${alertPanel('<strong>About E-ARI Certification:</strong> This certification validates your AI readiness maturity using our deterministic scoring engine (v5.3). Share it with stakeholders, partners, and auditors.', C.body, C.headerBg)}
        ${ctaButton(`${SITE_URL}/portal`, 'View Your Certificate')}
      </td></tr>
    </table>`;

  return base(content, `Congratulations! E-ARI ${certificationLevel} Certification achieved — score: ${scoreRounded}.`);
}

// ─── Custom admin message ─────────────────────────────────────────────────────

export function customEmailHtml(firstName: string, subject: string, messageBody: string): string {
  const safeBody = messageBody.replace(/\n/g, '<br>');
  const content = `
    ${emailHeader(iconMsg(), 'Message from E-ARI', subject)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:32px 40px">
        <p class="body-p" style="margin:0 0 20px;font-size:15px;color:${C.body};line-height:1.7;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
          Hi <strong class="strong-p" style="color:${C.bodyStrong}">${firstName}</strong>,
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="margin-bottom:24px;background-color:${C.headerBg};border:1px solid ${C.border};border-radius:10px">
          <tr><td style="padding:20px 24px;font-size:14px;color:${C.bodyStrong};line-height:1.8;font-family:'Segoe UI',Helvetica,Arial,sans-serif">${safeBody}</td></tr>
        </table>
        <p style="margin:0;font-size:12px;color:${C.muted};font-family:'Segoe UI',Helvetica,Arial,sans-serif">
          Reply to <a href="mailto:support@e-ari.com" style="color:${C.muted};text-decoration:underline">support@e-ari.com</a> if you have questions.
        </p>
      </td></tr>
    </table>`;
  return base(content, subject);
}

// ─── Contact form (to support) ────────────────────────────────────────────────

export function contactFormEmailHtml(
  name: string,
  email: string,
  company: string | null,
  subject: string,
  message: string,
): string {
  const safeMessage = message.replace(/\n/g, '<br>');
  const content = `
    ${emailHeader(iconMsg(), 'New Contact Message', `From ${name}${company ? ` · ${company}` : ''}`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:32px 40px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="margin-bottom:24px;background-color:${C.headerBg};border:1px solid ${C.border};border-radius:10px">
          <tr><td style="padding:16px 20px">
            ${infoRow('Name', name)}
            ${infoRow('Email', `<a href="mailto:${email}" style="color:${C.accent};text-decoration:none">${email}</a>`)}
            ${company ? infoRow('Company', company) : ''}
            ${infoRow('Subject', subject)}
          </td></tr>
        </table>
        ${sectionLabel('Message')}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="margin-bottom:28px;background-color:${C.headerBg};border:1px solid ${C.border};border-radius:10px">
          <tr><td style="padding:16px 20px;font-size:14px;color:${C.bodyStrong};line-height:1.8;font-family:'Segoe UI',Helvetica,Arial,sans-serif">${safeMessage}</td></tr>
        </table>
        ${ctaButton(`mailto:${email}`, `Reply to ${name}`)}
      </td></tr>
    </table>`;
  return base(content, `Contact from ${name} (${email}): ${subject}`);
}

// ─── Refund request (to support) ─────────────────────────────────────────────

export function refundRequestEmailHtml(
  userFirstName: string,
  userEmail: string,
  amount: number,
  reason: string,
  details: string | null,
  requestId: string,
): string {
  const content = `
    ${emailHeader(iconRefund(), 'New Refund Request', 'Action required from the support team')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:32px 40px">
        <p class="body-p" style="margin:0 0 24px;font-size:15px;color:${C.body};line-height:1.7;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
          A new refund request has been submitted.
        </p>
        ${metricBlock('Refund Amount', `$${amount.toFixed(2)}`)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="margin-bottom:28px;background-color:${C.headerBg};border:1px solid ${C.border};border-radius:10px">
          <tr><td style="padding:16px 20px">
            ${infoRow('User', `${userFirstName} &lt;${userEmail}&gt;`)}
            ${infoRow('Reason', reason)}
            ${details ? infoRow('Details', details) : ''}
            ${infoRow('Request ID', `<span style="font-family:monospace;font-size:11px">${requestId}</span>`)}
          </td></tr>
        </table>
        ${ctaButton(`${SITE_URL}/admin/refunds`, 'Review in Admin Panel')}
      </td></tr>
    </table>`;
  return base(content, `New refund request from ${userEmail} for $${amount.toFixed(2)}.`);
}

// ─── Refund status (to user) ──────────────────────────────────────────────────

const REFUND_STATUS: Record<string, { title: string; subtitle: string; message: string; color: string; bg: string }> = {
  approved: { title: 'Refund Approved',         subtitle: 'Your refund is on its way',             message: 'Your refund has been approved. Funds will return to your original payment method within <strong style="color:#e8edf5">5–10 business days</strong>.', color: '#3ecf8e', bg: '#0d2218' },
  rejected: { title: 'Refund Request Rejected',  subtitle: 'We could not process your refund',      message: 'Your refund request has been reviewed and could not be approved. Contact <a href="mailto:support@e-ari.com" style="color:#8b95a8;text-decoration:underline">support@e-ari.com</a> if you believe this is an error.', color: '#ef4444', bg: '#1a0a0a' },
  refunded: { title: 'Refund Processed',          subtitle: 'Your refund has been issued',           message: 'Your refund has been successfully processed. Funds will appear within <strong style="color:#e8edf5">5–10 business days</strong>.', color: '#3ecf8e', bg: '#0d2218' },
  pending:  { title: 'Refund Request Received',   subtitle: 'We are reviewing your request',         message: 'We have received your refund request and it is being reviewed by our support team. You will be notified once a decision is made.', color: '#d4820a', bg: '#1a160a' },
};

export function refundStatusEmailHtml(
  firstName: string,
  status: string,
  amount: number,
  reason: string,
  rejectionReason: string | null,
  requestId: string,
): string {
  const cfg = REFUND_STATUS[status] || REFUND_STATUS.pending;
  const message = status === 'rejected' && rejectionReason
    ? cfg.message.replace('Contact', `Reason: ${rejectionReason}. Contact`)
    : cfg.message;

  const content = `
    ${emailHeader(iconRefund(), cfg.title, cfg.subtitle)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:32px 40px">
        <p class="body-p" style="margin:0 0 20px;font-size:15px;color:${C.body};line-height:1.7;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
          Hi <strong class="strong-p" style="color:${C.bodyStrong}">${firstName}</strong>,
        </p>
        ${alertPanel(message, cfg.color, cfg.bg)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="margin-bottom:28px;background-color:${C.headerBg};border:1px solid ${C.border};border-radius:10px">
          <tr><td style="padding:16px 20px">
            ${infoRow('Amount', `$${amount.toFixed(2)}`)}
            ${infoRow('Reason', reason)}
            ${infoRow('Status', `<span style="text-transform:capitalize">${status}</span>`)}
            ${infoRow('Request ID', `<span style="font-family:monospace;font-size:11px">${requestId}</span>`)}
          </td></tr>
        </table>
        ${ctaButton(`${SITE_URL}/portal`, 'Go to Your Account')}
      </td></tr>
    </table>`;
  return base(content, `${cfg.title}: refund of $${amount.toFixed(2)} has been ${status}.`);
}

// ─── Compliance (AI Act vault) ───────────────────────────────────────────────

export function complianceClassifiedEmailHtml(systemName: string, riskTier: string): string {
  const content = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.card};border:1px solid ${C.border};border-radius:12px">
      <tr><td style="padding:24px 22px">
        <p style="margin:0 0 12px;font-weight:600;color:${C.heading};font-size:17px">AI system classified</p>
        <p style="margin:0;font-size:14px;line-height:1.55;color:${C.body}">
          <strong>${escapeHtml(systemName)}</strong> was assigned provisional tier <strong>${escapeHtml(riskTier)}</strong> under the EU AI Act framing used in E-ARI.
        </p>
        <p style="margin:14px 0 0;font-size:13px;color:${C.muted}">
          Review rationale on the compliance overview — classification is assistant-generated and requires human validation.
        </p>
      </td></tr>
    </table>`;
  return base(content, `Compliance: ${systemName} classified`);
}

export function complianceFriaReadyEmailHtml(systemName: string): string {
  const content = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.card};border:1px solid ${C.border};border-radius:12px">
      <tr><td style="padding:24px 22px">
        <p style="margin:0 0 12px;font-weight:600;color:${C.heading};font-size:17px">FRIA draft ready</p>
        <p style="margin:0;font-size:14px;line-height:1.55;color:${C.body}">
          A Fundamental Rights Impact Assessment draft was generated for <strong>${escapeHtml(systemName)}</strong>.
        </p>
      </td></tr>
    </table>`;
  return base(content, `FRIA draft for ${systemName}`);
}

export function complianceGapCriticalEmailHtml(systemName: string, criticalCount: number): string {
  const content = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.warnBg};border:1px solid ${C.warnBorder};border-radius:12px">
      <tr><td style="padding:24px 22px">
        <p style="margin:0 0 12px;font-weight:600;color:${C.warnText};font-size:17px">Critical compliance gaps</p>
        <p style="margin:0;font-size:14px;line-height:1.55;color:${C.body}">
          ${criticalCount} critical gap(s) detected for <strong>${escapeHtml(systemName)}</strong>. Open the gap radar to prioritize artifacts.
        </p>
      </td></tr>
    </table>`;
  return base(content, `Critical gaps: ${systemName}`);
}

export function complianceAttestationDueEmailHtml(systemName: string, dueIsoDate: string): string {
  const dueLabel = dueIsoDate.slice(0, 10);
  const content = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.card};border:1px solid ${C.border};border-radius:12px">
      <tr><td style="padding:24px 22px">
        <p style="margin:0 0 12px;font-weight:600;color:${C.heading};font-size:17px">Attestation deadline approaching</p>
        <p style="margin:0;font-size:14px;line-height:1.55;color:${C.body}">
          The monitoring plan for <strong>${escapeHtml(systemName)}</strong> has the next conformity attestation on or before <strong>${escapeHtml(dueLabel)}</strong> (UTC calendar date).
        </p>
        <p style="margin:14px 0 0;font-size:13px;color:${C.muted}">
          Review evidence, gaps, and post-market duties in Compliance — this is a scheduling reminder only.
        </p>
      </td></tr>
    </table>`;
  return base(content, `Attestation reminder: ${systemName}`);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
