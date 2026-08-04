'use client'

/**
 * The customer workspace rail.
 *
 * Everything behind sign-in used to be a set of separate pages that happened
 * to share a top navigation: no persistent structure, no sense of where you
 * were, and settings reachable only through an avatar menu. A compliance
 * programme is not a series of visits to documents — it is a workspace you
 * come back to, and it should look like one.
 *
 * Only the groups live here. The shell itself is AppShell, shared with admin,
 * so the two rails cannot drift apart in spacing or active treatment — which
 * is exactly how this product ended up looking assembled rather than designed.
 */

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  Activity, BadgeCheck, BarChart3, Boxes, ClipboardList, FileCheck,
  GraduationCap, KeyRound, LayoutDashboard, Palette, Radar, Settings,
  ShieldCheck, Sparkles, Users,
} from 'lucide-react'
import { AppShell, type ShellGroup } from '@/components/shared/app-shell'

const GROUPS: ShellGroup[] = [
  {
    label: 'Readiness',
    items: [
      { href: '/portal', label: 'Overview', icon: LayoutDashboard },
      { href: '/assessment', label: 'Assessment', icon: ClipboardList },
      { href: '/pulse', label: 'Pulse', icon: Activity },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { href: '/portal/use-cases', label: 'AI systems', icon: Boxes, prefix: true },
      { href: '/portal/evidence', label: 'Evidence', icon: FileCheck },
      { href: '/portal/controls', label: 'Controls', icon: ShieldCheck },
      { href: '/portal/vendors', label: 'Vendors', icon: BadgeCheck },
      // "Discovery" alone was ambiguous: this is the Shadow AI scan, and the
      // Discovery Agent at /discovery is a different tool entirely.
      { href: '/portal/discovery', label: 'Shadow AI scan', icon: Radar },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/portal/team', label: 'Team', icon: Users },
      // Two different tools, and only the manager's view was reachable: this
      // assigns modules and exports Article 4 evidence, while /literacy is the
      // learner's own path. Someone assigned training had no way to open it.
      { href: '/portal/literacy-compliance', label: 'Training programme', icon: GraduationCap },
      { href: '/literacy', label: 'My learning', icon: Sparkles },
    ],
  },
  {
    label: 'Account',
    items: [
      // Billing lives on the account page rather than a route of its own; the
      // entry lands on the section instead of inventing a page for one card.
      { href: '/portal/account', label: 'Account & billing', icon: Settings },
      { href: '/portal/api-keys', label: 'API keys', icon: KeyRound },
      // Was reachable only from one button inside the certification tab.
      { href: '/branding', label: 'Branding', icon: Palette },
    ],
  },
]

/**
 * Results point at the newest completed assessment.
 *
 * A report needs an id, so there is no static href — which is why the section
 * did not exist and results were reachable only by finding a row in a table.
 * Until an assessment is completed the entry is omitted rather than shown as a
 * dead link: an empty destination teaches nothing.
 */
function useLatestResultId(): string | null {
  const [id, setId] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch('/api/assessment')
      .then((r) => (r.ok ? r.json() : null))
      .then((rows: Array<{ id: string; status: string; isPulse?: boolean }> | null) => {
        if (cancelled || !Array.isArray(rows)) return
        const latest = rows.find((a) => a.status === 'completed' && !a.isPulse)
        if (latest) setId(latest.id)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])
  return id
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const latestResultId = useLatestResultId()

  const groups: ShellGroup[] = latestResultId
    ? GROUPS.map((g) =>
        g.label !== 'Readiness'
          ? g
          : {
              ...g,
              items: [
                ...g.items.slice(0, 2),
                { href: `/results/${latestResultId}`, label: 'Results', icon: BarChart3, alsoMatch: ['/results'] },
                ...g.items.slice(2),
              ],
            },
      )
    : GROUPS

  return (
    <AppShell groups={groups} pathname={pathname} layoutId="portal-rail">
      {children}
    </AppShell>
  )
}
