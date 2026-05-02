import { Navigation } from '@/components/shared/navigation';
import { Footer } from '@/components/shared/footer';
import { UseCaseStepRail } from '@/components/shared/use-case-step-rail';

export default async function UseCaseSystemLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex min-h-screen flex-col bg-navy-900">
      <Navigation />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start gap-8 px-4 py-10 sm:px-6 lg:px-8 md:flex-row">
        <aside className="w-full shrink-0 md:w-52">
          <UseCaseStepRail systemId={id} />
        </aside>
        <div className="min-w-0 flex-1 space-y-6">{children}</div>
      </div>
      <Footer />
    </div>
  );
}
