'use client'

/**
 * The application shell.
 *
 * Everything behind sign-in used to be a set of separate pages that happened
 * to share a top navigation: no persistent structure, no sense of where you
 * were, and settings reachable only through an avatar menu. A compliance
 * programme is not a series of visits to documents — it is a workspace you
 * come back to, and it should look like one.
 *
 * The sidebar is grouped by what the work actually is rather than by which
 * route happens to exist: assess, then the registry the assessment feeds,
 * then the people and the account around it. Sections a tier cannot reach are
 * omitted rather than shown locked — a padlocked rail teaches nothing except
 * how much you are not paying for.
 */

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, BadgeCheck, Boxes, ClipboardList, FileCheck, GraduationCap,
  KeyRound, LayoutDashboard, type LucideIcon, Menu, Radar, Settings,
  ShieldCheck, Users, X,
} from 'lucide-react'
import { Navigation } from '@/components/shared/navigation'

interface Item {
  href: string
  label: string
  icon: LucideIcon
  /** Matches nested routes too, e.g. /portal/use-cases/systems/123. */
  prefix?: boolean
}

interface Group {
  label: string
  items: Item[]
}

const GROUPS: Group[] = [
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
      { href: '/portal/discovery', label: 'Discovery', icon: Radar },
    ],
  },
  {
    label: 'Organisation',
    items: [
      { href: '/portal/team', label: 'Team', icon: Users },
      { href: '/portal/literacy-compliance', label: 'Training', icon: GraduationCap },
      { href: '/portal/api-keys', label: 'API keys', icon: KeyRound },
    ],
  },
  {
    label: 'Account',
    items: [
      // Billing lives on the account page rather than a route of its own; the
      // anchor lands on the section instead of inventing a page that would
      // hold one card.
      { href: '/portal/account', label: 'Account & billing', icon: Settings },
    ],
  },
]

function isActive(pathname: string, item: Item): boolean {
  return item.prefix ? pathname.startsWith(item.href) : pathname === item.href
}

function Rail({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Workspace" className="flex flex-col gap-7 py-6">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item)
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex items-center gap-3 rounded-lg px-3 py-2 font-sans text-[13px] transition-colors ${
                      active
                        ? 'bg-white/[0.06] text-slate-100'
                        : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="rail-active"
                        className="absolute inset-y-1 left-0 w-[2px] rounded-full bg-slate-300"
                        transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                      />
                    )}
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-navy-900">
      <Navigation />
      <div className="mx-auto flex w-full max-w-[1600px] flex-1">
        {/* Persistent rail from lg up; a drawer below that, because a 240px
            rail on a phone leaves nothing for the work itself. */}
        <aside className="hidden w-[232px] shrink-0 border-r border-white/[0.06] px-3 lg:block">
          <Rail pathname={pathname} />
        </aside>

        <AnimatePresence>
          {open && (
            <>
              <motion.div
                className="fixed inset-0 z-40 bg-black/60 lg:hidden"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
              />
              <motion.aside
                className="fixed inset-y-0 left-0 z-50 w-[264px] overflow-y-auto border-r border-white/[0.08] bg-navy-900 px-3 lg:hidden"
                initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
                transition={{ type: 'spring', stiffness: 420, damping: 38 }}
              >
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close navigation"
                    className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.05] hover:text-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <Rail pathname={pathname} onNavigate={() => setOpen(false)} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main className="min-w-0 flex-1">
          <div className="border-b border-white/[0.06] px-4 py-2 lg:hidden">
            <button
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 font-sans text-sm text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
            >
              <Menu className="h-4 w-4" />
              Menu
            </button>
          </div>
          {children}

          {/* A workspace does not want the marketing footer, but the legal
              routes have to stay reachable from inside a compliance product —
              stripping the per-page footers took them with it. This is the
              minimum that keeps them one click away. */}
          <footer className="mt-12 border-t border-white/[0.06] px-4 py-5 sm:px-6">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-[12px] text-slate-500">
              <Link href="/privacy" className="transition-colors hover:text-slate-300">Privacy</Link>
              <Link href="/terms" className="transition-colors hover:text-slate-300">Terms</Link>
              <Link href="/data-processing" className="transition-colors hover:text-slate-300">Data processing</Link>
              <Link href="/contact" className="transition-colors hover:text-slate-300">Contact</Link>
              <a href="mailto:support@e-ari.com" className="transition-colors hover:text-slate-300">support@e-ari.com</a>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
