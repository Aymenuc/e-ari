'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Plug,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Key,
  Link2,
  X,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Navigation } from '@/components/shared/navigation'
import { Footer } from '@/components/shared/footer'
import { AIAssistant } from '@/components/shared/ai-assistant'

/* ─── Animation helpers ────────────────────────────────────────────────── */

function FadeUp({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ─── Real Brand SVG Icons ────────────────────────────────────────────────── */

function SlackIcon({ className, ...props }: { className?: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 122.8 122.8" className={className} {...props}>
      <path fill="#E01E5A" d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9z" />
      <path fill="#E01E5A" d="M32.3 77.6c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" />
      <path fill="#2EB67D" d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2z" />
      <path fill="#2EB67D" d="M45.2 32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" />
      <path fill="#ECB22E" d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2z" />
      <path fill="#ECB22E" d="M90.5 45.2c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" />
      <path fill="#36C5F0" d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9z" />
      <path fill="#36C5F0" d="M77.6 90.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" />
    </svg>
  )
}

function TeamsIcon({ className, ...props }: { className?: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...props}>
      <path fill="#505AC9" d="M0 18.5l1.2-14.1c.1-.7.6-1.2 1.3-1.3l14.1-1.2c.9-.1 1.6.6 1.6 1.5v14.6c0 .8-.7 1.5-1.6 1.5L2.4 19.4c-1.3-.1-2.5-1.3-2.4-2.5v1.6z" />
      <path fill="#7B83EB" d="M2.5 3.1l14.1-1.2c.9-.1 1.6.6 1.6 1.5v14.6c0 .8-.7 1.5-1.6 1.5L2.5 20.6c-.9.1-1.6-.6-1.6-1.5V4.6c0-.8.7-1.5 1.6-1.5z" />
      <path fill="#FFF" d="M12 8.5c0-1.7-1.3-3-3-3s-3 1.3-3 3 1.3 3 3 3 3-1.3 3-3zm-5.5 8c0-1.4 1.1-2.5 2.5-2.5h1c1.4 0 2.5 1.1 2.5 2.5v.5c0 .3-.2.5-.5.5H7c-.3 0-.5-.2-.5-.5v-.5z" />
      <path fill="#505AC9" d="M19.5 7.5c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2s-2-.9-2-2v-4c0-1.1.9-2 2-2z" />
      <circle fill="#7B83EB" cx="19.5" cy="5.5" r="2" />
      <path fill="#4F52B2" d="M14.5 6h2v12h-2z" opacity=".1" />
    </svg>
  )
}

function JiraIcon({ className, ...props }: { className?: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...props}>
      <path fill="#0052CC" d="M23.1 11.7L12.5 1.1l-.6-.6-.6.6L.7 11.7c-.4.4-.4 1 0 1.4l5.8 5.8 5.4 5.4c.4.4 1 .4 1.4 0l5.4-5.4 5.8-5.8c.4-.4.4-1 0-1.4h-1.4z" />
      <path fill="#2684FF" d="M11.9 12.3L6.5 6.9c-.4-.4-1-.4-1.4 0L.7 11.3c-.4.4-.4 1 0 1.4l5.8 5.8 5.4 5.4V12.3z" opacity=".6" />
      <path fill="#2684FF" d="M11.9 12.3l5.4-5.4c.4-.4 1-.4 1.4 0l4.4 4.4c.4.4.4 1 0 1.4l-5.8 5.8-5.4 5.4V12.3z" />
      <path fill="#FFF" d="M11.9 12.3L6.5 6.9 11.9 1.5l5.4 5.4z" opacity=".2" />
    </svg>
  )
}

function AsanaIcon({ className, ...props }: { className?: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...props}>
      <defs>
        <linearGradient id="asana1" x1="8.4" y1="3.2" x2="2.4" y2="14.3" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F95853" />
          <stop offset="1" stopColor="#E3262D" />
        </linearGradient>
        <linearGradient id="asana2" x1="15.6" y1="3.2" x2="21.6" y2="14.3" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F95853" />
          <stop offset="1" stopColor="#E3262D" />
        </linearGradient>
        <linearGradient id="asana3" x1="12" y1="9.2" x2="12" y2="21.5" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FBBC04" />
          <stop offset="1" stopColor="#F9A400" />
        </linearGradient>
      </defs>
      <circle fill="url(#asana1)" cx="6.5" cy="6.5" r="4" />
      <circle fill="url(#asana2)" cx="17.5" cy="6.5" r="4" />
      <circle fill="url(#asana3)" cx="12" cy="17.5" r="4" />
    </svg>
  )
}

function GoogleWorkspaceIcon({ className, ...props }: { className?: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...props}>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.9 33.5 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.2-2.7-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.5 18.8 13 24 13c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6 29.2 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5 0 9.6-1.8 13.2-4.8l-6.1-5.2C28.9 35.3 26.5 36 24 36c-5.4 0-9.9-3.5-11.5-8.3l-6.5 5C9.5 39.4 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4-4.1 5.1l6.1 5.2C36.9 38.8 44 34 44 24c0-1.3-.2-2.7-.4-3.9z" />
    </svg>
  )
}

function Microsoft365Icon({ className, ...props }: { className?: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 88 88" className={className} {...props}>
      <defs>
        <linearGradient id="m365grad1" x1="14" y1="7.7" x2="14" y2="79.7" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F25022" />
          <stop offset="1" stopColor="#D83B01" />
        </linearGradient>
        <linearGradient id="m365grad2" x1="43.9" y1="7.7" x2="43.9" y2="79.7" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7FBA00" />
          <stop offset="1" stopColor="#5C9200" />
        </linearGradient>
        <linearGradient id="m365grad3" x1="73.9" y1="7.7" x2="73.9" y2="79.7" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00A4EF" />
          <stop offset="1" stopColor="#0078D4" />
        </linearGradient>
        <linearGradient id="m365grad4" x1="29" y1="7.7" x2="29" y2="79.7" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFB900" />
          <stop offset="1" stopColor="#F9A200" />
        </linearGradient>
        <linearGradient id="m365grad5" x1="58.9" y1="7.7" x2="58.9" y2="79.7" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#737DE8" />
          <stop offset="1" stopColor="#5C5FD0" />
        </linearGradient>
      </defs>
      <path fill="url(#m365grad1)" d="M0 17.3L21.7 12l3.5 31.4L21.7 76 0 70.7V17.3z" />
      <path fill="url(#m365grad2)" d="M21.7 12L44 7.7v72.6L21.7 76V12z" />
      <path fill="url(#m365grad3)" d="M44 7.7L66.3 12v58.7L44 80.3V7.7z" />
      <path fill="url(#m365grad4)" d="M21.7 12l-3 2.5L18 17.3l3.7 26.1L18 69.7l.7 2.8 3 3.5L44 76V12H21.7z" opacity=".6" />
      <path fill="url(#m365grad5)" d="M66.3 12L44 12v64l22.3-4 3-3.5.7-2.8-3.7-26.1 3.7-26.1-.7-2.8z" opacity=".6" />
    </svg>
  )
}

/* ─── Provider definitions ──────────────────────────────────────────────── */

const PROVIDERS = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send assessment results and pulse alerts to your Slack channels',
    icon: SlackIcon,
    color: '#e01e5a',
    bgColor: 'bg-[#e01e5a]/15',
    borderColor: 'border-[#e01e5a]/30',
    configType: 'webhook' as const,
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Post readiness updates and review reminders to Teams channels',
    icon: TeamsIcon,
    color: '#6264a7',
    bgColor: 'bg-[#6264a7]/15',
    borderColor: 'border-[#6264a7]/30',
    configType: 'webhook' as const,
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Create tickets for improvement actions from assessment insights',
    icon: JiraIcon,
    color: '#0052cc',
    bgColor: 'bg-[#0052cc]/15',
    borderColor: 'border-[#0052cc]/30',
    configType: 'apikey' as const,
  },
  {
    id: 'asana',
    name: 'Asana',
    description: 'Sync improvement tasks and milestone tracking with Asana projects',
    icon: AsanaIcon,
    color: '#f06a6a',
    bgColor: 'bg-[#f06a6a]/15',
    borderColor: 'border-[#f06a6a]/30',
    configType: 'apikey' as const,
  },
  {
    id: 'google_workspace',
    name: 'Google Workspace',
    description: 'Export reports to Google Drive and schedule via Google Calendar',
    icon: GoogleWorkspaceIcon,
    color: '#4285f4',
    bgColor: 'bg-[#4285f4]/15',
    borderColor: 'border-[#4285f4]/30',
    configType: 'oauth' as const,
  },
  {
    id: 'microsoft_365',
    name: 'Microsoft 365',
    description: 'Integrate with Teams, Outlook, and SharePoint for report sharing',
    icon: Microsoft365Icon,
    color: '#d83b01',
    bgColor: 'bg-[#d83b01]/15',
    borderColor: 'border-[#d83b01]/30',
    configType: 'oauth' as const,
  },
]

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface UserIntegration {
  id: string
  provider: string
  status: string
  config: Record<string, string>
  lastSyncAt: string | null
  createdAt: string
  updatedAt: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   INTEGRATIONS PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function IntegrationsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()

  const [integrations, setIntegrations] = useState<UserIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const [connectModal, setConnectModal] = useState<typeof PROVIDERS[number] | null>(null)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  // Auth gate
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [sessionStatus, router])

  // Fetch integrations
  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/integrations')
      if (res.ok) {
        const data = await res.json()
        setIntegrations(Array.isArray(data) ? data : [])
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchIntegrations()
    }
  }, [sessionStatus, fetchIntegrations])

  // Get integration status for a provider
  const getIntegration = (providerId: string): UserIntegration | undefined =>
    integrations.find(i => i.provider === providerId)

  // Connect integration
  const handleConnect = async () => {
    if (!connectModal) return
    setSaving(true)
    try {
      const config: Record<string, string> = {}
      if (connectModal.configType === 'webhook') {
        config.webhookUrl = webhookUrl
      } else if (connectModal.configType === 'apikey') {
        config.apiKey = apiKey
      }

      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: connectModal.id, config }),
      })

      if (res.ok) {
        const newIntegration = await res.json()
        setIntegrations(prev => {
          const existing = prev.findIndex(i => i.provider === connectModal.id)
          if (existing >= 0) {
            return prev.map((item, idx) => idx === existing ? newIntegration : item)
          }
          return [newIntegration, ...prev]
        })
        setConnectModal(null)
        setWebhookUrl('')
        setApiKey('')
      }
    } catch {
      // Silently fail
    } finally {
      setSaving(false)
    }
  }

  // Disconnect integration
  const handleDisconnect = async (providerId: string) => {
    setDisconnecting(providerId)
    try {
      const res = await fetch('/api/integrations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      })
      if (res.ok) {
        setIntegrations(prev => prev.filter(i => i.provider !== providerId))
      }
    } catch {
      // Silently fail
    } finally {
      setDisconnecting(null)
    }
  }

  // Format last sync time
  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Session tier
  const sessionTier = (session?.user as Record<string, unknown> | undefined)?.tier as string | undefined
  const userTier: 'free' | 'professional' | 'enterprise' = (sessionTier === 'professional' || sessionTier === 'enterprise') ? sessionTier : 'free'

  /* ─── Loading state ───────────────────────────────────────────────────── */
  if (sessionStatus === 'loading' || (sessionStatus === 'authenticated' && loading)) {
    return (
      <div className="min-h-screen flex flex-col bg-navy-900">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-eari-blue" />
        </main>
      </div>
    )
  }

  if (!session) return null

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">

          {/* ─── Page Header ──────────────────────────────────────────── */}
          <FadeUp>
            <section className="relative">
              <div className="aurora-card rounded-2xl p-[1px]">
                <div className="hero-gradient-mesh rounded-2xl">
                  <div className="relative z-10 bg-navy-800/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-eari-blue/15">
                        <Plug className="h-6 w-6 text-eari-blue-light" />
                      </div>
                      <div>
                        <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-slate-100">
                          Integrations
                        </h1>
                        <p className="text-muted-foreground font-sans mt-1">
                          Connect your favorite tools to automate workflows and keep your team informed.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </FadeUp>

          {/* ─── Integration Cards Grid ──────────────────────────────── */}
          <section>
            <FadeUp>
              <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground mb-6">
                Available Integrations
              </h2>
            </FadeUp>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PROVIDERS.map((provider, i) => {
                const integration = getIntegration(provider.id)
                const Icon = provider.icon
                const isConnected = integration?.status === 'active' || integration?.status === 'pending'
                const hasError = integration?.status === 'error'

                return (
                  <FadeUp key={provider.id} delay={i * 0.05}>
                    <Card className="bg-navy-800 border-border/50 hover-lift h-full flex flex-col">
                      <CardContent className="p-6 flex flex-col flex-1">
                        <div className="flex items-start gap-4 mb-4">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0 ${provider.bgColor}`}>
                            <Icon className="h-7 w-7" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-heading text-base font-semibold text-foreground">{provider.name}</h3>
                            <p className="text-xs text-muted-foreground font-sans mt-1 leading-relaxed">
                              {provider.description}
                            </p>
                          </div>
                        </div>

                        <div className="mt-auto">
                          <Separator className="bg-border/30 mb-4" />

                          {/* Status */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isConnected && !hasError && (
                                <>
                                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 border">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Connected
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    Last sync: {formatLastSync(integration?.lastSyncAt || null)}
                                  </span>
                                </>
                              )}
                              {hasError && (
                                <Badge className="bg-red-500/15 text-red-400 border-red-500/30 border">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Error
                                </Badge>
                              )}
                              {!isConnected && !hasError && (
                                <Badge variant="outline" className="text-muted-foreground border-border">
                                  Not connected
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Action button */}
                          <div className="mt-3">
                            {isConnected && !hasError ? (
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 border-border text-muted-foreground hover:text-foreground font-sans h-9 text-xs"
                                  onClick={() => setConnectModal(provider)}
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Reconnect
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 font-sans h-9 text-xs"
                                  onClick={() => handleDisconnect(provider.id)}
                                  disabled={disconnecting === provider.id}
                                >
                                  {disconnecting === provider.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <X className="h-3 w-3 mr-1" />
                                  )}
                                  Remove
                                </Button>
                              </div>
                            ) : hasError ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10 font-sans h-9 text-xs"
                                onClick={() => setConnectModal(provider)}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Reconnect
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="w-full bg-eari-blue hover:bg-eari-blue-dark text-white font-sans h-9 text-xs"
                                onClick={() => setConnectModal(provider)}
                              >
                                <Link2 className="h-3 w-3 mr-1" />
                                Connect
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </FadeUp>
                )
              })}
            </div>
          </section>

        </div>
      </main>

      <Footer />

      {/* Connect Modal */}
      <Dialog open={!!connectModal} onOpenChange={(open) => { if (!open) setConnectModal(null) }}>
        <DialogContent className="bg-navy-800 border-border/60 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg text-foreground flex items-center gap-3">
              {connectModal && (
                <>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${connectModal.bgColor}`}>
                    <connectModal.icon className="h-6 w-6" />
                  </div>
                  Connect {connectModal.name}
                </>
              )}
            </DialogTitle>
            <DialogDescription className="font-sans text-sm text-muted-foreground">
              {connectModal?.configType === 'webhook' && 'Enter your webhook URL to receive notifications.'}
              {connectModal?.configType === 'apikey' && 'Enter your API key to connect your account.'}
              {connectModal?.configType === 'oauth' && 'Click the button below to authenticate via OAuth.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {connectModal?.configType === 'webhook' && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="webhook-url" className="text-sm font-sans text-foreground mb-1.5 block">
                    Webhook URL
                  </Label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="webhook-url"
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="pl-10 bg-navy-700 border-border/50 text-foreground font-mono text-sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground font-sans mt-1.5">
                    Find this in your {connectModal.name} workspace settings under Integrations.
                  </p>
                </div>
              </div>
            )}

            {connectModal?.configType === 'apikey' && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="api-key" className="text-sm font-sans text-foreground mb-1.5 block">
                    API Key / Token
                  </Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="Enter your API key..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="pl-10 bg-navy-700 border-border/50 text-foreground font-mono text-sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground font-sans mt-1.5">
                    Generate an API key from your {connectModal.name} account settings.
                  </p>
                </div>
              </div>
            )}

            {connectModal?.configType === 'oauth' && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-700 border border-border/30">
                  {connectModal && <connectModal.icon className="h-9 w-9" />}
                </div>
                <p className="text-sm text-muted-foreground font-sans text-center">
                  You&apos;ll be redirected to {connectModal.name} to authorize E-ARI access. Your data stays secure.
                </p>
                <Button
                  className="bg-eari-blue hover:bg-eari-blue-dark text-white font-sans"
                  onClick={handleConnect}
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Authorize with {connectModal.name}
                </Button>
              </div>
            )}
          </div>

          {connectModal?.configType !== 'oauth' && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConnectModal(null)}
                className="border-border text-muted-foreground font-sans"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConnect}
                disabled={saving || (connectModal?.configType === 'webhook' && !webhookUrl.trim()) || (connectModal?.configType === 'apikey' && !apiKey.trim())}
                className="bg-eari-blue hover:bg-eari-blue-dark text-white font-sans"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                {saving ? 'Connecting...' : 'Connect'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AIAssistant userTier={userTier} />
    </div>
  )
}
