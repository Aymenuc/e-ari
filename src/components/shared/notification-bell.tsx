'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, CheckCircle2, AlertTriangle, Sparkles, Clock, FileText, Zap, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  actionUrl: string | null
  assessmentId: string | null
  createdAt: string
}

const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  pulse_ready: Zap,
  assessment_completed: CheckCircle2,
  insight_ready: Sparkles,
  quarterly_reminder: Clock,
  benchmark_update: FileText,
  weekly_digest: Bell,
  integration_alert: AlertTriangle,
  default: Bell,
}

const NOTIFICATION_COLORS: Record<string, string> = {
  pulse_ready: 'text-emerald-400 bg-emerald-500/15',
  assessment_completed: 'text-eari-blue-light bg-eari-blue/15',
  insight_ready: 'text-purple-400 bg-purple-500/15',
  quarterly_reminder: 'text-amber-400 bg-amber-500/15',
  benchmark_update: 'text-cyan-400 bg-cyan-500/15',
  weekly_digest: 'text-blue-400 bg-blue-500/15',
  integration_alert: 'text-red-400 bg-red-500/15',
  default: 'text-muted-foreground bg-navy-700',
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Fetch notifications
  useEffect(() => {
    async function fetchNotifications() {
      try {
        setLoading(true)
        const res = await fetch('/api/notifications')
        if (res.ok) {
          const data = await res.json()
          setNotifications(data.notifications || [])
          setUnreadCount(data.unreadCount || 0)
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchNotifications()
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        buttonRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, read: true }),
      })
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch {
      // Silently fail
    }
  }

  const markAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch {
      // Silently fail
    }
  }

  const topNotifications = notifications.slice(0, 8)

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-navy-700 transition-colors cursor-pointer"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] flex flex-col rounded-xl overflow-hidden shadow-2xl shadow-black/40"
            style={{ background: 'rgba(13, 17, 23, 0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(48, 57, 74, 0.6)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50" style={{ background: 'rgba(22, 27, 34, 0.8)' }}>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-eari-blue-light" />
                <h3 className="font-heading font-semibold text-sm text-foreground">Notifications</h3>
                {unreadCount > 0 && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-red-500/20 text-red-400 border-red-500/30 border font-mono">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllRead}
                  className="text-[10px] text-eari-blue-light hover:text-eari-blue h-7 px-2 font-sans"
                >
                  Mark all read
                </Button>
              )}
            </div>

            {/* Notifications list */}
            <div className="max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {loading ? (
                <div className="p-6 text-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-eari-blue border-t-transparent mx-auto" />
                  <p className="text-xs text-muted-foreground mt-2 font-sans">Loading...</p>
                </div>
              ) : topNotifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground font-sans">No notifications yet</p>
                  <p className="text-xs text-muted-foreground/60 font-sans mt-1">
                    We&apos;ll notify you when assessments complete or reviews are due.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {topNotifications.map((notification) => {
                    const Icon = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.default
                    const colorClasses = NOTIFICATION_COLORS[notification.type] || NOTIFICATION_COLORS.default
                    const [iconColor, iconBg] = colorClasses.split(' ')

                    const content = (
                      <div
                        className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-navy-700/50 ${
                          !notification.read ? 'bg-navy-700/20' : ''
                        }`}
                        onClick={() => {
                          if (!notification.read) {
                            markAsRead(notification.id)
                          }
                        }}
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${iconBg}`}>
                          <Icon className={`h-4 w-4 ${iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-sans truncate ${!notification.read ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="h-2 w-2 rounded-full bg-eari-blue-light flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-sans mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">
                            {timeAgo(notification.createdAt)}
                          </p>
                        </div>
                        {notification.actionUrl && (
                          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0 mt-1" />
                        )}
                      </div>
                    )

                    if (notification.actionUrl) {
                      return (
                        <Link key={notification.id} href={notification.actionUrl} onClick={() => setIsOpen(false)}>
                          {content}
                        </Link>
                      )
                    }
                    return <div key={notification.id}>{content}</div>
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-border/50 px-4 py-2.5" style={{ background: 'rgba(22, 27, 34, 0.6)' }}>
                <Link href="/portal" onClick={() => setIsOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground font-sans h-8">
                    View All in Portal
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
