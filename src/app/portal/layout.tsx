import { PortalShell } from '@/components/shared/portal-shell'

/**
 * Every authenticated page under /portal gets the workspace rail.
 *
 * The shell supplies the nav and the page frame, so the pages themselves no
 * longer each re-declare them — that duplication is why the sidebar could not
 * simply be added around them.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>
}
