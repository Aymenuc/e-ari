'use client'

/**
 * The workspace top bar.
 *
 * The shell was rendering the marketing navigation, whose links are
 * Assessment, Portal, AI systems and Evidence — every one of which the rail
 * now owns. Two navigations offering the same destinations is worse than
 * either alone: it doubles the chrome and makes the rail look optional.
 *
 * What only a top bar can carry stays: the mark as a way home, notifications,
 * and the account menu. Navigation is the rail's job, so there is none here.
 */

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { ChevronDown, LogOut, Settings, ShieldAlert } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationBell } from '@/components/shared/notification-bell'
import { BrandWordmark } from '@/components/shared/brand-wordmark'

export function WorkspaceBar() {
  const { data: session } = useSession()
  const initial =
    session?.user?.name?.[0]?.toUpperCase() ||
    session?.user?.email?.[0]?.toUpperCase() ||
    'U'

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-navy-900/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between px-4 sm:px-6">
        {/* Home is the workspace, not the marketing site — someone signed in
            who clicks the logo wants their dashboard, not the sales page. */}
        <Link href="/portal" className="group flex items-center gap-2" aria-label="Go to your workspace">
          <img
            src="/logo.svg"
            alt=""
            className="h-8 w-8 rounded-lg transition-opacity duration-200 group-hover:opacity-95"
          />
          <BrandWordmark size="md" />
        </Link>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2" aria-label="Account menu">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-slate-100 font-heading text-xs font-semibold text-navy-900">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-border bg-navy-800">
              {session?.user?.email ? (
                <>
                  <div className="px-2 py-1.5">
                    <p className="truncate font-sans text-[12px] text-slate-400">{session.user.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-border" />
                </>
              ) : null}
              <DropdownMenuItem asChild>
                <Link href="/portal/account" className="flex cursor-pointer items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Account &amp; billing
                </Link>
              </DropdownMenuItem>
              {session?.user?.role === 'admin' && (
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="flex cursor-pointer items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    Admin
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex cursor-pointer items-center gap-2 text-red-400 focus:text-red-400"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
