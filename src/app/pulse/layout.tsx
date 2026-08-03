import { PortalShell } from '@/components/shared/portal-shell'

/**
 * Pulse belongs in the workspace.
 *
 * It sits in the rail under Readiness but rendered outside the shell, so
 * clicking it dropped the reader out of the product — the same gap results
 * had. Any destination the rail offers has to keep the rail.
 */
export default function PulseLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>
}
