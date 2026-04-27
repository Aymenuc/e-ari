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

const SITE_URL = process.env.NEXTAUTH_URL || 'https://www.e-ari.com';
const LOGO_URL = `${SITE_URL}/logo-mark.png`;
const YEAR = new Date().getFullYear();

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          '#06091a',
  card:        '#0c1124',
  border:      '#1e2a45',
  headerBg:    '#0a1020',
  accent:      '#3b5bdb',
  heading:     '#e8edf5',
  body:        '#8b95a8',
  bodyStrong:  '#c8d0dc',
  muted:       '#4a5568',
  divider:     '#1a2236',
  btnText:     '#ffffff',
  iconBgMail:  '#0d1f3c',
  iconBgKey:   '#1a1230',
  iconBorder:  '#1e3a6e',
  iconBorderKey: '#2e1f5e',
  iconStroke:  '#4a7fd4',
  warnBg:      '#1a160a',
  warnBorder:  '#78490a',
  warnText:    '#d4820a',
  footerText:  '#2d3748',
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
  <meta name="color-scheme" content="dark light">
  <meta name="supported-color-schemes" content="dark light">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <title>E-ARI</title>
  <style>
    @media (prefers-color-scheme: light) {
      .outer-bg  { background-color: #f0f4f8 !important; }
      .card      { background-color: #ffffff !important; border-color: #d1dbe8 !important; }
      .card-hdr  { background-color: #f7f9fc !important; border-color: #e2e8f0 !important; }
      .h1        { color: #111827 !important; }
      .body-p    { color: #374151 !important; }
      .strong-p  { color: #111827 !important; }
      .div-line td { border-color: #e2e8f0 !important; }
      .ftr       { background-color: #f0f4f8 !important; border-color: #e2e8f0 !important; }
      .ftr-p     { color: #6b7280 !important; }
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
                  <img src="${LOGO_URL}" alt="" width="32" height="32"
                    style="display:block;width:32px;height:32px;border-radius:7px;border:0;outline:none">
                </td>
                <td style="vertical-align:middle">
                  <span style="font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;color:#e8edf5;letter-spacing:-0.2px">E-ARI</span>
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
            <tr><td style="background-color:${C.bg};border-top:1px solid ${C.divider};padding:22px 40px;text-align:center">
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
    <td width="44" height="44" style="width:44px;height:44px;background-color:#0d2218;border-radius:10px;text-align:center;vertical-align:middle;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#3ecf8e">W</td>
    <![endif]-->
    <!--[if !mso]><!-->
    <td style="width:44px;height:44px;background-color:#0d2218;border:1px solid #1a4a34;border-radius:10px;text-align:center;vertical-align:middle;padding:0">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
        style="display:block;margin:11px auto 0">
        <circle cx="12" cy="8" r="3.5" stroke="#3ecf8e" stroke-width="1.8"/>
        <path d="M5 20c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="#3ecf8e" stroke-width="1.8" stroke-linecap="round"/>
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
        <td style="vertical-align:top;background-color:#0a1020;border:1px solid ${C.border};border-radius:10px;padding:14px 16px">
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
  const content = `
    <!-- Header -->
    <table class="card-hdr" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background-color:${C.headerBg};padding:28px 40px;border-bottom:1px solid ${C.border}">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${iconMail()}
            <td style="padding-left:16px;vertical-align:middle">
              <h1 class="h1" style="margin:0 0 3px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:19px;font-weight:700;color:${C.heading};line-height:1.2">Verify your email</h1>
              <p style="margin:0;font-size:13px;color:${C.body};font-family:'Segoe UI',Helvetica,Arial,sans-serif">Activate your E-ARI account</p>
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
          Thanks for signing up. Click the button below to verify your email address and activate your account.
          This link is valid for <strong class="strong-p" style="color:${C.bodyStrong}">24 hours</strong>.
        </p>

        ${ctaButton(verifyUrl, 'Verify Email Address')}

        ${divider()}

        <p style="margin:0 0 6px;font-size:12px;color:${C.muted};font-family:'Segoe UI',Helvetica,Arial,sans-serif">
          Button not working? Copy and paste this URL into your browser:
        </p>
        <p style="margin:0;font-size:11px;color:${C.accent};word-break:break-all;line-height:1.6;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
          ${verifyUrl}
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
