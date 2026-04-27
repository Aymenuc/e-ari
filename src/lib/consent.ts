/**
 * Google Consent Mode v2 helpers
 *
 * Consent is stored in localStorage under 'ea_consent'.
 * Possible values: 'granted' | 'denied' | null (not yet chosen)
 *
 * On page load the layout sets all signals to 'denied' by default.
 * If the user previously granted consent we upgrade immediately via
 * the beforeInteractive script so GA never fires without permission.
 */

export type ConsentState = 'granted' | 'denied';

const STORAGE_KEY = 'ea_consent';

export function getStoredConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === 'granted' || v === 'denied') return v;
  return null;
}

export function updateConsent(state: ConsentState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, state);

  // Push update to dataLayer — works whether gtag is loaded or not yet
  // because the consent default script already initialised dataLayer.
  const win = window as Window & { gtag?: (...args: unknown[]) => void };
  if (typeof win.gtag === 'function') {
    win.gtag('consent', 'update', {
      analytics_storage:    state,
      ad_storage:           state,
      ad_user_data:         state,
      ad_personalization:   state,
    });
  }
}
