'use client'

/**
 * One shell, two workspaces.
 *
 * The customer portal navigates by route; the admin navigates by tab state
 * inside a single very large page. Those are different enough that the obvious
 * move is a second sidebar — and then two rails drift apart in spacing, active
 * treatment and grouping, which is how the product ended up looking assembled
 * rather than designed in the first place.
 *
 * So an item carries either an `href` or an `onSelect`, and everything else —
 * grouping, the active marker, the mobile drawer, the legal row — is decided
 * here once.
 */

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { type LucideIcon, Menu, X } from 'lucide-react'
import { Navigation } from '@/components/shared/navigation'

export interface ShellItem {
  label: string
  icon: LucideIcon
  /** Route items. */
  href?: string
  /** Tab items — the caller owns the state. */
  id?: string
  /** Matches nested routes, e.g. /portal/use-cases/systems/123. */
  prefix?: boolean
  /** Other route prefixes this item owns. */
  alsoMatch?: string[]
  /** Count shown on the right, e.g. unread inbox. */
  badge?: number
}

export interface ShellGroup {
  label: string
  items: ShellItem[]
}

function itemIsActive(item: ShellItem, pathname: string, activeId?: string): boolean {
  if (item.id) return item.id === activeId
  if (!item.href) return false
  if (item.alsoMatch?.some((p) => pathname.startsWith(p))) return true
  return item.prefix ? pathname.startsWith(item.href) : pathname === item.href
}

function Rail({
  groups, pathname, activeId, onSelect, onNavigate, layoutId,
}: {
  groups: ShellGroup[]
  pathname: string
  activeId?: string
  onSelect?: (id: string) => void
  onNavigate?: () => void
  layoutId: string
}) {
  return (
    <nav aria-label="Workspace" className="flex flex-col gap-7 py-6">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = itemIsActive(item, pathname, activeId)
              const Icon = item.icon
              const inner = (
                <>
                  {active && (
                    <motion.span
                      layoutId={layoutId}
                      className="absolute inset-y-1 left-0 w-[2px] rounded-full bg-slate-300"
                      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    />
                  )}
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.badge ? (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-200 px-1 font-mono text-[9px] font-semibold text-navy-900">
                      {item.badge}
                    </span>
                  ) : null}
                </>
              )
              const cls = `relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-sans text-[13px] transition-colors ${
                active
                  ? 'bg-white/[0.06] text-slate-100'
                  : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
              }`
              return (
                <li key={item.href ?? item.id}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cls}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { onSelect?.(item.id!); onNavigate?.() }}
                      aria-current={active ? 'page' : undefined}
                      className={cls}
                    >
                      {inner}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function AppShell({
  groups, children, pathname = '', activeId, onSelect, layoutId = 'rail-active',
}: {
  groups: ShellGroup[]
  children: React.ReactNode
  pathname?: string
  activeId?: string
  onSelect?: (id: string) => void
  /** Distinct per shell so the two rails never animate into each other. */
  layoutId?: string
}) {
  const [open, setOpen] = useState(false)
  const railProps = { groups, pathname, activeId, onSelect, layoutId }

  return (
    <div className="flex min-h-screen flex-col bg-navy-900">
      <Navigation />
      <div className="mx-auto flex w-full max-w-[1600px] flex-1">
        <aside className="hidden w-[232px] shrink-0 border-r border-white/[0.06] px-3 lg:block">
          <Rail {...railProps} />
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
                <Rail {...railProps} onNavigate={() => setOpen(false)} />
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
              routes have to stay reachable from inside a compliance product. */}
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
