import { PortalShell } from '@/components/shared/portal-shell'

/** In the workspace, like every other destination the rail offers. */
export default function BrandingLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>
}
