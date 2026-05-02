import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Navigation } from '@/components/shared/navigation';
import { Footer } from '@/components/shared/footer';
import { ProgressionBanner } from '@/components/shared/progression-banner';
import type { ProgressionState } from '@/lib/progression';

/** Admin-only visual spot-check for progression banner states. // PR-UX-1 */

const MOCK_ASSESSED: ProgressionState = {
  currentStep: 'assessed',
  assessed: {
    complete: false,
    assessmentId: null,
    completedAt: null,
    overallScore: null,
  },
  verifying: {
    obligationsApplicable: 12,
    obligationsEvidenced: 0,
    documentsUploaded: 0,
  },
  complying: {
    friasTotal: 2,
    friasFinalized: 0,
    technicalFilesTotal: 2,
    technicalFilesFinalized: 0,
  },
  monitoring: {
    activeUseCases: 2,
    criticalGaps: 3,
    attestationsDueWithin30Days: 1,
  },
  firstUseCaseId: 'demo-system-1',
};

const MOCK_VERIFYING: ProgressionState = {
  ...MOCK_ASSESSED,
  currentStep: 'verifying',
  assessed: {
    complete: true,
    assessmentId: 'demo-a1',
    completedAt: new Date(),
    overallScore: 72,
  },
};

const MOCK_COMPLYING: ProgressionState = {
  ...MOCK_VERIFYING,
  currentStep: 'complying',
  verifying: {
    obligationsApplicable: 12,
    obligationsEvidenced: 5,
    documentsUploaded: 4,
  },
};

const MOCK_MONITORING: ProgressionState = {
  ...MOCK_COMPLYING,
  currentStep: 'monitoring',
  complying: {
    friasTotal: 2,
    friasFinalized: 2,
    technicalFilesTotal: 2,
    technicalFilesFinalized: 1,
  },
};

export default async function ProgressionDemoPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/auth/login');
  if (session.user.role !== 'admin') notFound();

  const demos: Array<{ title: string; state: ProgressionState }> = [
    { title: 'State: assessed (not complete)', state: MOCK_ASSESSED },
    { title: 'State: verifying', state: MOCK_VERIFYING },
    { title: 'State: complying', state: MOCK_COMPLYING },
    { title: 'State: monitoring', state: MOCK_MONITORING },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-navy-900">
      <Navigation />
      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-10">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-slate-100">
              Progression banner — demo
            </h1>
            <p className="mt-2 font-sans text-sm text-muted-foreground">
              Admin-only. Four mock states for visual QA (no production data).
            </p>
          </div>
          {demos.map(({ title, state }) => (
            <section key={title} className="space-y-3">
              <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {title}
              </h2>
              <ProgressionBanner state={state} />
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
