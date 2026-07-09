export const metadata = { title: "Maintenance — E-ARI" };

/** Shown to non-admin visitors while the admin maintenance toggle is on. */
export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 h-12 w-12 rounded-xl bg-eari-blue/15 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-eari-blue-light" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a5 5 0 0 0-6.6 6.6L3 18v3h3l5.1-5.1a5 5 0 0 0 6.6-6.6l-3.2 3.2-2-2 3.2-3.2z" />
          </svg>
        </div>
        <h1 className="font-heading text-2xl font-bold text-slate-50">Scheduled maintenance</h1>
        <p className="mt-3 font-sans text-[15px] leading-relaxed text-slate-400">
          E-ARI is briefly offline while we apply updates. Your data, evidence, and
          compliance records are safe. We&apos;ll be back shortly.
        </p>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
          support@e-ari.com
        </p>
      </div>
    </div>
  );
}
