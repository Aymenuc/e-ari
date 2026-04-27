'use client';

import { useEffect, useState } from 'react';
import { getStoredConsent, updateConsent } from '@/lib/consent';

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if no choice has been made yet
    if (getStoredConsent() === null) {
      // Small delay so the banner animates in after the page loads
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  function accept() {
    updateConsent('granted');
    setVisible(false);
  }

  function decline() {
    updateConsent('denied');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '0 16px 16px',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: '680px',
          margin: '0 auto',
          backgroundColor: '#0c1124',
          border: '1px solid #1e2a45',
          borderRadius: '14px',
          padding: '20px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.5)',
          pointerEvents: 'all',
          animation: 'eari-consent-slide-up 0.35s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <style>{`
          @keyframes eari-consent-slide-up {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Text */}
        <div style={{ flex: '1 1 300px' }}>
          <p style={{
            margin: '0 0 4px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#e8edf5',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
          }}>
            We use cookies
          </p>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: '#8b95a8',
            lineHeight: 1.6,
            fontFamily: "'Segoe UI', system-ui, sans-serif",
          }}>
            We use Google Analytics to understand how visitors use E-ARI so we can improve the platform.
            No data is collected without your consent.{' '}
            <a
              href="/privacy"
              style={{ color: '#3b5bdb', textDecoration: 'underline' }}
            >
              Privacy Policy
            </a>
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
          <button
            onClick={decline}
            style={{
              padding: '9px 20px',
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: "'Segoe UI', system-ui, sans-serif",
              color: '#8b95a8',
              background: 'transparent',
              border: '1px solid #1e2a45',
              borderRadius: '8px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Decline
          </button>
          <button
            onClick={accept}
            style={{
              padding: '9px 20px',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: "'Segoe UI', system-ui, sans-serif",
              color: '#ffffff',
              background: '#3b5bdb',
              border: '1px solid transparent',
              borderRadius: '8px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
