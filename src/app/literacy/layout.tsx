import { PortalShell } from '@/components/shared/portal-shell'

/** In the workspace, like every other destination the rail offers. */
export default function LiteracyLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>
}
