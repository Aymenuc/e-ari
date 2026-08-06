import { UseCaseStepRail } from '@/components/shared/use-case-step-rail';

/**
 * The step rail only. Chrome comes from the portal shell above this.
 *
 * This layout used to add the marketing Navigation and Footer as well, so the
 * route rendered two stacked top bars — the shell's at y=0 and the marketing
 * nav at y=57, both `sticky top-0`, the nav at z-50 over the header at z-30, so
 * the two overlapped as soon as the page scrolled. The portal layout says the
 * shell supplies the nav; this nested layout was the one place that had not
 * been updated to match.
 */
export default async function UseCaseSystemLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start gap-8 px-4 py-10 sm:px-6 lg:px-8 md:flex-row">
      <aside className="w-full shrink-0 md:w-52">
        <UseCaseStepRail systemId={id} />
      </aside>
      <div className="min-w-0 flex-1 space-y-6">{children}</div>
    </div>
  );
}
