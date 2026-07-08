import Link from 'next/link';
import { Navigation } from '@/components/shared/navigation';
import { Footer } from '@/components/shared/footer';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'API Reference — E-ARI',
  description: 'E-ARI public API v1 — programmatic access to assessments, the AI registry, vendor risk, and compliance controls.',
};

const ENDPOINTS: { method: string; path: string; scope: string; desc: string }[] = [
  { method: 'GET', path: '/api/v1/assessments', scope: 'read', desc: 'Completed assessments with overall score, maturity band, entity type, and per-pillar scores.' },
  { method: 'GET', path: '/api/v1/systems', scope: 'read', desc: 'AI system registry — name, purpose, deployer role, risk tier, classification rationale.' },
  { method: 'GET', path: '/api/v1/systems/:id', scope: 'read', desc: 'Single registry entry including open obligation gaps.' },
  { method: 'POST', path: '/api/v1/systems', scope: 'write', desc: 'Create a registry entry (name, description, purpose, deployerRole, sector).' },
  { method: 'PATCH', path: '/api/v1/systems/:id', scope: 'write', desc: 'Update registry-entry fields.' },
  { method: 'DELETE', path: '/api/v1/systems/:id', scope: 'write', desc: 'Delete a registry entry and its dependent artefacts.' },
  { method: 'GET', path: '/api/v1/vendors', scope: 'read', desc: 'Third-party AI vendors with questionnaire status, risk score, tier, and review dates.' },
  { method: 'GET', path: '/api/v1/controls', scope: 'read', desc: 'Derived compliance controls: passing / failing / pending per EU AI Act obligation, plus attestation warnings.' },
];

export default function DevelopersPage() {
  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-12 space-y-10">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span aria-hidden className="h-px w-8 bg-eari-blue/60" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-eari-blue-light/90">Developers</span>
          </div>
          <h1 className="font-heading text-3xl font-bold text-foreground">E-ARI API <span className="text-eari-blue-light italic">v1</span></h1>
          <p className="mt-3 font-sans text-[15px] leading-relaxed text-muted-foreground max-w-2xl">
            Programmatic access to your assessments, AI registry, vendor risk results, and compliance
            controls — pull E-ARI state into your GRC platform, BI stack, or internal dashboards.
            Read access from the Growth tier; write access on Enterprise.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold text-foreground">Authentication</h2>
          <p className="font-sans text-sm text-muted-foreground">
            Create a key in <Link href="/portal/api-keys" className="text-eari-blue-light hover:underline">Portal → API Keys</Link> and
            send it as a Bearer token. Keys are scoped <code className="font-mono text-xs">read</code> or <code className="font-mono text-xs">write</code> and
            can be revoked at any time. Rate limit: 30 requests / 15 minutes per key.
          </p>
          <pre className="bg-navy-800 border border-border/60 rounded-lg p-4 overflow-x-auto font-mono text-xs text-slate-300">{`curl https://www.e-ari.com/api/v1/assessments \\
  -H "Authorization: Bearer eari_live_..."`}</pre>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold text-foreground">Endpoints</h2>
          <div className="space-y-2">
            {ENDPOINTS.map((e) => (
              <div key={`${e.method} ${e.path}`} className="border border-border/40 rounded-md px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline" className={`font-mono text-[10px] ${e.method === 'GET' ? 'border-emerald-500/30 text-emerald-400' : e.method === 'DELETE' ? 'border-red-500/30 text-red-400' : 'border-amber-500/30 text-amber-400'}`}>{e.method}</Badge>
                  <code className="font-mono text-sm text-foreground">{e.path}</code>
                  <Badge variant="outline" className={`ml-auto font-mono text-[10px] uppercase ${e.scope === 'write' ? 'border-amber-500/30 text-amber-400' : 'border-eari-blue/30 text-eari-blue-light'}`}>{e.scope}</Badge>
                </div>
                <p className="mt-1.5 font-sans text-xs text-muted-foreground">{e.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold text-foreground">Responses & errors</h2>
          <p className="font-sans text-sm text-muted-foreground">
            Success responses wrap payloads in <code className="font-mono text-xs">{'{ "data": … }'}</code>. Errors return
            <code className="font-mono text-xs"> {'{ "error": "…" }'}</code> with conventional status codes:
            401 (missing/invalid key), 403 (insufficient scope or tier), 404, 429 (rate limit — includes <code className="font-mono text-xs">retryAfter</code>).
            List endpoints return up to 100–200 records, newest first.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
