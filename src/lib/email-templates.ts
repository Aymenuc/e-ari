/**
 * E-ARI transactional email templates
 *
 * Design principles:
 * - No CSS gradients on structural elements (Outlook fallback issue)
 * - PNG logo via hosted URL (SVG unsupported in most clients)
 * - Inline styles only, no classes
 * - Works in dark mode and light mode
 * - Font stack: 'Segoe UI', Helvetica, Arial — broadest email client support
 */

const SITE_URL = process.env.NEXTAUTH_URL || 'https://www.e-ari.com';
const LOGO_URL = `${SITE_URL}/logo-mark.png`;

const YEAR = new Date().getFullYear();

// ─── Color tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#06091a',
  card: '#0c1124',
  border: '#1e2a45',
  headerBg: '#0a1020',
  accent: '#3b5bdb',       // refined indigo-blue — less harsh than #2563eb
  accentHover: '#3451c7',
  heading: '#e8edf5',
  body: '#8b95a8',
  bodyStrong: '#c8d0dc',
  muted: '#4a5568',
  divider: '#1a2236',
  btnText: '#ffffff',
  warnBg: '#1a160a',
  warnBorder: '#78490a',
  warnText: '#d4820a',
  footerText: '#2d3748',
} as const;

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
      .outer-bg { background-color: #f0f4f8 !important; }
      .card { background-color: #ffffff !important; border-color: #d1dbe8 !important; }
      .card-header { background-color: #f7f9fc !important; }
      .heading { color: #111827 !important; }
      .body-text { color: #374151 !important; }
      .body-strong { color: #111827 !important; }
      .divider-row td { border-color: #e2e8f0 !important; }
      .footer-area { background-color: #f0f4f8 !important; border-color: #e2e8f0 !important; }
      .footer-text { color: #6b7280 !important; }
      .url-text { color: #2563eb !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};font-family:'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">

  <!-- Preview text -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${previewText}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>

  <table class="outer-bg" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:${C.bg};padding:40px 16px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"
        style="max-width:560px;width:100%">

        <!-- ── Logo row ── -->
        <tr><td align="center" style="padding-bottom:28px">
          <a href="${SITE_URL}" target="_blank" style="text-decoration:none;display:inline-flex;align-items:center;gap:10px">
            <img src="${LOGO_URL}" alt="E-ARI" width="36" height="36"
              style="display:inline-block;border:0;outline:none;width:36px;height:36px;border-radius:8px">
            <span style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;color:#e8edf5;letter-spacing:-0.3px;vertical-align:middle">E-ARI</span>
          </a>
        </td></tr>

        <!-- ── Card ── -->
        <tr><td class="card"
          style="background-color:${C.card};border-radius:16px;border:1px solid ${C.border};overflow:hidden">

          ${content}

          <!-- ── Footer ── -->
          <table class="footer-area" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="background-color:${C.bg};border-top:1px solid ${C.divider};padding:24px 40px;text-align:center">
              <p class="footer-text" style="margin:0 0 4px;font-size:12px;color:${C.muted};line-height:1.6">
                © ${YEAR} E-ARI · Enterprise AI Readiness Platform
              </p>
              <p class="footer-text" style="margin:0;font-size:11px;color:${C.footerText}">
                You received this email because you have an account at
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

// ─── CTA button ───────────────────────────────────────────────────────────────

function ctaButton(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 32px">
      <tr>
        <!--[if mso]>
        <td style="border-radius:10px;background-color:${C.accent}">
        <![endif]-->
        <!--[if !mso]><!-->
        <td style="border-radius:10px;background-color:${C.accent}">
        <!--<![endif]-->
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

// ─── Verification email ───────────────────────────────────────────────────────

export function verificationEmailHtml(verifyUrl: string, name: string): string {
  const content = `
    <!-- Header -->
    <table class="card-header" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background-color:${C.headerBg};padding:32px 40px 28px;border-bottom:1px solid ${C.border}">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-right:16px;vertical-align:middle">
              <div style="width:44px;height:44px;border-radius:10px;background-color:#0d1f3c;border:1px solid #1e3a6e;text-align:center;line-height:44px;font-size:22px">✉️</div>
            </td>
            <td style="vertical-align:middle">
              <h1 class="heading" style="margin:0 0 3px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:${C.heading};line-height:1.2">
                Verify your email
              </h1>
              <p style="margin:0;font-size:13px;color:${C.body}">Activate your E-ARI account</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- Body -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:36px 40px">

        <p class="body-text" style="margin:0 0 20px;font-size:15px;color:${C.body};line-height:1.7">
          Hi <strong class="body-strong" style="color:${C.bodyStrong}">${name}</strong>,
        </p>
        <p class="body-text" style="margin:0 0 32px;font-size:15px;color:${C.body};line-height:1.7">
          Thanks for signing up. Click the button below to verify your email address and activate your account.
          This link is valid for <strong class="body-strong" style="color:${C.bodyStrong}">24 hours</strong>.
        </p>

        ${ctaButton(verifyUrl, 'Verify Email Address →')}

        ${divider()}

        <p style="margin:0 0 6px;font-size:12px;color:${C.muted}">
          Button not working? Copy and paste this link into your browser:
        </p>
        <p class="url-text" style="margin:0;font-size:11px;color:${C.accent};word-break:break-all;line-height:1.6">
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
    <table class="card-header" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background-color:${C.headerBg};padding:32px 40px 28px;border-bottom:1px solid ${C.border}">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-right:16px;vertical-align:middle">
              <div style="width:44px;height:44px;border-radius:10px;background-color:#1a1230;border:1px solid #2e1f5e;text-align:center;line-height:44px;font-size:22px">🔑</div>
            </td>
            <td style="vertical-align:middle">
              <h1 class="heading" style="margin:0 0 3px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:${C.heading};line-height:1.2">
                Reset your password
              </h1>
              <p style="margin:0;font-size:13px;color:${C.body}">We received a password reset request</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- Body -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:36px 40px">

        <p class="body-text" style="margin:0 0 20px;font-size:15px;color:${C.body};line-height:1.7">
          Hi <strong class="body-strong" style="color:${C.bodyStrong}">${name}</strong>,
        </p>
        <p class="body-text" style="margin:0 0 32px;font-size:15px;color:${C.body};line-height:1.7">
          Someone requested a password reset for the E-ARI account linked to this address.
          Click below to choose a new password.
          This link expires in <strong class="body-strong" style="color:${C.bodyStrong}">1 hour</strong>.
        </p>

        ${ctaButton(resetUrl, 'Reset Password →')}

        <!-- Security notice -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px">
          <tr>
            <td style="background-color:${C.warnBg};border:1px solid ${C.warnBorder};border-radius:8px;padding:14px 18px">
              <p style="margin:0;font-size:13px;color:${C.warnText};line-height:1.6">
                <strong>Didn't request this?</strong> You can safely ignore this email — your password will not change.
                If you're concerned about your account security, contact us at
                <a href="mailto:hello@e-ari.com" style="color:${C.warnText}">hello@e-ari.com</a>.
              </p>
            </td>
          </tr>
        </table>

        ${divider()}

        <p style="margin:0 0 6px;font-size:12px;color:${C.muted}">
          Button not working? Copy and paste this link into your browser:
        </p>
        <p class="url-text" style="margin:0;font-size:11px;color:${C.accent};word-break:break-all;line-height:1.6">
          ${resetUrl}
        </p>

      </td></tr>
    </table>`;

  return base(content, 'Reset your E-ARI password — this link expires in 1 hour.');
}
