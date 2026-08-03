import { PortalShell } from '@/components/shared/portal-shell'

/**
 * Results belong inside the workspace.
 *
 * This route had no layout, so opening a past report from the portal dropped
 * the reader out of the product entirely — no rail, no way back except the
 * browser. Finishing an assessment showed results in the hub while revisiting
 * one did not, which is the same page behaving two different ways.
 */
export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>
}
