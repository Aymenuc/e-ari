"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, LayoutDashboard, LogOut, Shield, Users, Plug, Menu, X } from "lucide-react";
import { NotificationBell } from "@/components/shared/notification-bell";
import { useState } from "react";

export function Navigation() {
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-navy-900/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <img
              src="/logo.svg"
              alt="E-ARI"
              className="h-9 w-9 rounded-lg transition-transform duration-200 group-hover:scale-105"
            />
            <span className="font-heading font-semibold text-lg text-foreground tracking-tight">
              E-ARI
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {session && (
              <>
                <Link href="/assessment">
                  <Button variant="ghost" className="text-muted-foreground hover:text-foreground font-sans">
                    Assessment
                  </Button>
                </Link>
                <Link href="/portal">
                  <Button variant="ghost" className="text-muted-foreground hover:text-foreground font-sans">
                    Portal
                  </Button>
                </Link>
                {session.user?.role === "admin" && (
                  <Link href="/admin">
                    <Button variant="ghost" className="text-muted-foreground hover:text-foreground font-sans">
                      Admin
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Auth Actions + Mobile Menu Button (grouped right) */}
          <div className="flex items-center gap-3">
            {status === "loading" ? (
              <div className="h-9 w-24 animate-pulse rounded-md bg-navy-700" />
            ) : session ? (
              <>
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-eari-blue text-white text-xs font-heading">
                          {session.user?.name?.[0]?.toUpperCase() || session.user?.email?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-navy-800 border-border">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium text-foreground">{session.user?.name || "User"}</p>
                      <p className="text-xs text-muted-foreground font-mono">{session.user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/portal" className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/assessment" className="flex items-center gap-2 cursor-pointer">
                        <Shield className="h-4 w-4" />
                        New Assessment
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/integrations" className="flex items-center gap-2 cursor-pointer">
                        <Plug className="h-4 w-4" />
                        Integrations
                      </Link>
                    </DropdownMenuItem>
                    {session.user?.role === "admin" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="flex items-center gap-2 cursor-pointer">
                            <Shield className="h-4 w-4" />
                            Admin Panel
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login">
                  <Button variant="ghost" className="text-muted-foreground hover:text-foreground font-sans">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button className="group relative overflow-hidden bg-gradient-to-r from-eari-blue via-blue-600 to-cyan-600 hover:from-eari-blue-dark hover:via-blue-700 hover:to-cyan-700 text-white font-sans shadow-md shadow-eari-blue/20 hover:shadow-eari-blue/35 transition-all duration-300">
                    <span className="relative z-10">Get Started</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  </Button>
                </Link>
              </div>
            )}
            {/* Mobile Menu Button */}
            <button
              className="md:hidden flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-navy-900/95 backdrop-blur-xl">
          <div className="px-4 py-3 space-y-1">
            {session ? (
              <>
                <Link href="/assessment" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground font-sans">
                    Assessment
                  </Button>
                </Link>
                <Link href="/portal" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground font-sans">
                    Portal
                  </Button>
                </Link>
                {session.user?.role === "admin" && (
                  <Link href="/admin" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground font-sans">
                      Admin
                    </Button>
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground font-sans">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/register" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-eari-blue via-blue-600 to-cyan-600 text-white font-sans">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
