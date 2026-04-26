import { db } from './db';

export interface PlatformSettings {
  allow_registrations: boolean;
  require_email_verification: boolean;
  enable_ai_assistant: boolean;
  public_proposals_default: boolean;
  maintenance_mode: boolean;
  require_2fa: boolean;
  session_timeout: number;
  rate_limiting: boolean;
  audit_logging: boolean;
  ip_whitelisting: boolean;
}

const DEFAULTS: PlatformSettings = {
  allow_registrations: true,
  require_email_verification: false,
  enable_ai_assistant: true,
  public_proposals_default: false,
  maintenance_mode: false,
  require_2fa: false,
  session_timeout: 30,
  rate_limiting: true,
  audit_logging: true,
  ip_whitelisting: false,
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    const rows = await db.platformSetting.findMany();
    const settings = { ...DEFAULTS };
    for (const row of rows) {
      try {
        const key = row.key as keyof PlatformSettings;
        if (key in DEFAULTS) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (settings as any)[key] = JSON.parse(row.value);
        }
      } catch { /* skip malformed */ }
    }
    return settings;
  } catch {
    // Table may not exist yet (before first migration)
    return { ...DEFAULTS };
  }
}

export async function getSetting<K extends keyof PlatformSettings>(key: K): Promise<PlatformSettings[K]> {
  try {
    const row = await db.platformSetting.findUnique({ where: { key } });
    if (!row) return DEFAULTS[key];
    return JSON.parse(row.value) as PlatformSettings[K];
  } catch {
    return DEFAULTS[key];
  }
}
