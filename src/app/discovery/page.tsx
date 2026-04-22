'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Send,
  Loader2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Target,
  Database,
  Cpu,
  Users,
  Shield,
  Heart,
  Settings,
  Lock,
  ChevronRight,
} from 'lucide-react'
import { Navigation } from '@/components/shared/navigation'
import { Footer } from '@/components/shared/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ReadinessProfile {
  summary: string
  estimatedScore: number
  estimatedBand: string
  likelyStrengths: string[]
  likelyGaps: string[]
  focusPillars: { name: string; reason: string }[]
}

// ─── Pillar icons for the profile display ───────────────────────────────────

const PILLAR_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Strategy: Target,
  Data: Database,
  Technology: Cpu,
  Talent: Users,
  Governance: Shield,
  Culture: Heart,
  Process: Settings,
  Security: Lock,
}

// ─── Discovery Agent Page ───────────────────────────────────────────────────

export default function DiscoveryPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Welcome to the E-ARI Discovery Agent! I'll help assess your organization's AI readiness through a guided conversation. Let's start — could you tell me about your organization? What industry are you in, and roughly how large is your organization?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [profile, setProfile] = useState<ReadinessProfile | null>(null)
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false)
  const [exchangeCount, setExchangeCount] = useState(0)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setExchangeCount(prev => prev + 1)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'discovery_interview',
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!res.ok) throw new Error('Failed to get response')

      const data = await res.json()
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.content || data.message || 'I apologize, but I was unable to process your request. Please try again.',
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I encountered an error. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const generateProfile = async () => {
    setIsGeneratingProfile(true)

    try {
      const profileRequest: ChatMessage = {
        id: `user-profile-${Date.now()}`,
        role: 'user',
        content: 'Based on everything we\'ve discussed, please provide a preliminary AI readiness profile for my organization. Respond ONLY with valid JSON in this exact format: {"estimatedScore": <number 0-100>, "strengths": ["<strength1>", "<strength2>", "<strength3>"], "gaps": ["<gap1>", "<gap2>", "<gap3>"], "focusPillars": [{"name": "<pillar name from: Strategy, Data, Technology, Talent, Governance, Culture, Process, Security>", "reason": "<why this pillar needs focus>"}]}. Base your assessment on our entire conversation.',
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, profileRequest])

      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'discovery_interview',
          messages: [...messages, profileRequest].map(m => ({
            role: m.role,
            content: m.content,
          })),
          synthesis: true,
        }),
      })

      if (!res.ok) throw new Error('Failed to generate profile')

      const data = await res.json()
      const content = data.content || data.message || ''

      // Try to parse JSON from the LLM response
      let profileData: {
        estimatedScore?: number
        strengths?: string[]
        gaps?: string[]
        focusPillars?: { name: string; reason: string }[]
      } = {}

      try {
        // Extract JSON from response (may be wrapped in markdown code blocks)
        let jsonStr = content.trim()
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          jsonStr = jsonMatch[0]
        }
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
        }
        profileData = JSON.parse(jsonStr)
      } catch {
        // JSON parsing failed — will use fallback values
        console.warn('Could not parse profile JSON from LLM response')
      }

      // Extract score — prefer parsed, fall back to regex, then default
      let estimatedScore = 50
      if (typeof profileData.estimatedScore === 'number') {
        estimatedScore = Math.min(100, Math.max(0, profileData.estimatedScore))
      } else {
        const scoreMatch = content.match(/(\d{1,3})(?:\s*[-/]\s*100)?/)
        if (scoreMatch) {
          estimatedScore = Math.min(100, Math.max(0, parseInt(scoreMatch[1])))
        }
      }

      let estimatedBand = 'Follower'
      if (estimatedScore <= 25) estimatedBand = 'Laggard'
      else if (estimatedScore <= 50) estimatedBand = 'Follower'
      else if (estimatedScore <= 75) estimatedBand = 'Chaser'
      else estimatedBand = 'Pacesetter'

      // Use LLM-derived data with fallbacks
      const likelyStrengths = Array.isArray(profileData.strengths) && profileData.strengths.length > 0
        ? profileData.strengths.slice(0, 3)
        : ['Strategy & Vision', 'Governance & Ethics']

      const likelyGaps = Array.isArray(profileData.gaps) && profileData.gaps.length > 0
        ? profileData.gaps.slice(0, 3)
        : ['Talent & Skills', 'Data & Infrastructure']

      const focusPillars = Array.isArray(profileData.focusPillars) && profileData.focusPillars.length > 0
        ? profileData.focusPillars.slice(0, 3).map(p => ({
            name: typeof p.name === 'string' ? p.name : 'Unknown',
            reason: typeof p.reason === 'string' ? p.reason : 'Identified as a key area for improvement',
          }))
        : [
            { name: 'Talent', reason: 'Talent acquisition and upskilling appear to be key challenges' },
            { name: 'Data', reason: 'Data infrastructure needs strengthening for AI workloads' },
          ]

      setProfile({
        summary: content,
        estimatedScore,
        estimatedBand,
        likelyStrengths,
        likelyGaps,
        focusPillars,
      })

      const assistantMessage: ChatMessage = {
        id: `assistant-profile-${Date.now()}`,
        role: 'assistant',
        content: "I've generated your preliminary readiness profile based on our conversation. You can view it below. For a precise, evidence-based assessment, I recommend taking the formal E-ARI assessment.",
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch {
      // Fallback profile
      setProfile({
        summary: 'Based on our conversation, your organization shows initial AI readiness with some foundational elements in place.',
        estimatedScore: 45,
        estimatedBand: 'Follower',
        likelyStrengths: ['Strategy & Vision', 'Governance & Ethics'],
        likelyGaps: ['Talent & Skills', 'Data & Infrastructure'],
        focusPillars: [
          { name: 'Talent', reason: 'Talent acquisition and upskilling appear to be key challenges' },
          { name: 'Data', reason: 'Data infrastructure needs strengthening for AI workloads' },
        ],
      })
    } finally {
      setIsGeneratingProfile(false)
    }
  }

  // ── Loading state ────────────────────────────────────────────────────────
  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex flex-col bg-navy-900">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-eari-blue-light" />
        </main>
        <Footer />
      </div>
    )
  }

  // ── Auth check ───────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen flex flex-col bg-navy-900">
        <Navigation />
        <main className="flex-1 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="w-full max-w-md bg-navy-800 border-border">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-eari-blue/10">
                  <Brain className="h-7 w-7 text-eari-blue-light" />
                </div>
                <CardTitle className="font-heading text-xl text-foreground">
                  Sign In Required
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  You must be signed in to use the Discovery Agent. Create a free account or sign in to continue.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Link href="/auth/login" className="w-full">
                  <Button className="w-full bg-eari-blue hover:bg-eari-blue-dark text-white font-sans h-11">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/register" className="w-full">
                  <Button variant="outline" className="w-full font-sans h-11 border-border">
                    Create Account
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </main>
        <Footer />
      </div>
    )
  }

  const bandColors: Record<string, string> = {
    Laggard: '#ef4444',
    Follower: '#f59e0b',
    Chaser: '#3b82f6',
    Pacesetter: '#22c55e',
  }

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6">
          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-eari-blue/10">
                <Brain className="h-5 w-5 text-eari-blue-light" />
              </div>
              <div>
                <h1 className="font-heading text-2xl font-bold text-foreground">
                  Discovery Agent
                </h1>
                <p className="text-sm text-muted-foreground font-sans">
                  AI-powered stakeholder interview for preliminary readiness assessment
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3">
              <Badge className="bg-eari-blue/15 text-eari-blue-light border-eari-blue/30 text-xs font-mono">
                <Sparkles className="h-3 w-3 mr-1" />
                AI-Powered
              </Badge>
              <span className="text-xs text-muted-foreground font-sans">
                {exchangeCount} exchanges • {profile ? 'Profile generated' : 'Interviewing'}
              </span>
            </div>
          </motion.div>

          {/* Profile section (shown when profile is generated) */}
          <AnimatePresence>
            {profile && (
              <motion.div
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-6"
              >
                <Card className="bg-navy-800 border-border overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-heading text-lg text-foreground">
                        Preliminary Readiness Profile
                      </CardTitle>
                      <Badge
                        className="font-heading text-xs text-white"
                        style={{ backgroundColor: bandColors[profile.estimatedBand] || '#3b82f6' }}
                      >
                        {profile.estimatedBand}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Score ring */}
                    <div className="flex items-center gap-6 mb-6">
                      <div className="relative flex-shrink-0">
                        <svg width="80" height="80" viewBox="0 0 100 100" aria-label={`Estimated readiness score: ${profile.estimatedScore}%`}>
                          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(48,57,74,0.4)" strokeWidth="6" />
                          <circle
                            cx="50" cy="50" r="45" fill="none"
                            stroke={bandColors[profile.estimatedBand] || '#3b82f6'}
                            strokeWidth="6" strokeLinecap="round"
                            strokeDasharray={283}
                            strokeDashoffset={283 - 283 * (profile.estimatedScore / 100)}
                            transform="rotate(-90 50 50)"
                          />
                          <text x="50" y="46" textAnchor="middle" fill="#e6edf3" fontSize="20" fontWeight="700" fontFamily="var(--font-plus-jakarta)">
                            {profile.estimatedScore}
                          </text>
                          <text x="50" y="62" textAnchor="middle" fill="#8b949e" fontSize="10" fontFamily="var(--font-inter)">
                            / 100
                          </text>
                        </svg>
                      </div>
                      <div>
                        <p className="font-heading font-semibold text-foreground">
                          Estimated E-ARI Score
                        </p>
                        <p className="text-sm text-muted-foreground font-sans mt-1">
                          This is a preliminary estimate based on your interview. Take the formal assessment for precise scores.
                        </p>
                      </div>
                    </div>

                    {/* Focus pillars */}
                    <div className="space-y-3 mb-6">
                      <h4 className="font-heading font-semibold text-sm text-foreground">Recommended Focus Pillars</h4>
                      {profile.focusPillars.map((pillar) => {
                        const PillarIcon = PILLAR_ICONS[pillar.name] || Target
                        return (
                          <div key={pillar.name} className="flex items-start gap-3 p-3 rounded-lg bg-navy-700/30 border border-border/30">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-eari-blue/10 flex-shrink-0 mt-0.5">
                              <PillarIcon className="h-4 w-4 text-eari-blue-light" />
                            </div>
                            <div>
                              <p className="font-heading font-medium text-sm text-foreground">{pillar.name}</p>
                              <p className="text-xs text-muted-foreground font-sans mt-0.5">{pillar.reason}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* CTA */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link href="/assessment" className="flex-1">
                        <Button className="w-full bg-eari-blue hover:bg-eari-blue-dark text-white font-heading font-semibold h-11">
                          Take Formal Assessment
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setProfile(null)
                          setMessages([{
                            id: 'restart',
                            role: 'assistant',
                            content: "Let's start a new discovery session! Tell me about your organization — what industry are you in, and what's the approximate size?",
                            timestamp: new Date(),
                          }])
                          setExchangeCount(0)
                        }}
                        className="font-sans h-11 border-border"
                      >
                        Start New Interview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat area */}
          <Card className="bg-navy-800 border-border">
            <CardContent className="p-0">
              {/* Messages */}
              <div className="h-[400px] overflow-y-auto p-4 sm:p-6 space-y-4" style={{ scrollbarWidth: 'thin' }}>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm font-sans leading-relaxed ${
                        message.role === 'user'
                          ? 'bg-eari-blue text-white rounded-br-sm'
                          : 'text-foreground rounded-bl-sm'
                      }`}
                      style={
                        message.role === 'assistant'
                          ? { background: 'rgba(22, 27, 34, 0.7)', border: '1px solid rgba(48, 57, 74, 0.5)' }
                          : undefined
                      }
                    >
                      {message.content}
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div
                      className="flex items-center gap-2 rounded-lg px-3.5 py-2.5"
                      style={{ background: 'rgba(22, 27, 34, 0.7)', border: '1px solid rgba(48, 57, 74, 0.5)' }}
                    >
                      <Loader2 className="h-4 w-4 text-eari-blue-light animate-spin" />
                      <span className="text-sm text-muted-foreground font-sans">Thinking...</span>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="border-t border-border/50 p-3 sm:p-4">
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Describe your organization's AI readiness..."
                    disabled={isLoading || isGeneratingProfile}
                    className="flex-1 h-10 rounded-lg border border-border/50 bg-navy-800 px-3 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-eari-blue/50 disabled:opacity-50"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isLoading || isGeneratingProfile || !input.trim()}
                    className="h-10 w-10 bg-eari-blue hover:bg-eari-blue-dark text-white flex-shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>

                {/* Generate profile button — shown after sufficient exchanges */}
                {exchangeCount >= 3 && !profile && !isGeneratingProfile && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3"
                  >
                    <Button
                      onClick={generateProfile}
                      className="w-full bg-eari-blue/10 border border-eari-blue/30 text-eari-blue-light hover:bg-eari-blue/20 font-heading font-semibold h-11"
                      variant="outline"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Preliminary Readiness Profile
                    </Button>
                  </motion.div>
                )}

                {isGeneratingProfile && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 flex items-center justify-center gap-2 py-2"
                  >
                    <Loader2 className="h-4 w-4 animate-spin text-eari-blue-light" />
                    <span className="text-sm text-muted-foreground font-sans">Generating your readiness profile...</span>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Info cards below chat */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-navy-800 border-border/50 h-full">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-eari-blue-light" />
                    <h3 className="font-heading font-semibold text-sm text-foreground">AI-Guided Interview</h3>
                  </div>
                  <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                    The Discovery Agent asks targeted questions about your organization's AI readiness context.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-navy-800 border-border/50 h-full">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <h3 className="font-heading font-semibold text-sm text-foreground">Preliminary Profile</h3>
                  </div>
                  <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                    After the interview, get an estimated readiness score and focus areas before the formal assessment.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-navy-800 border-border/50 h-full">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-orange-400" />
                    <h3 className="font-heading font-semibold text-sm text-foreground">Not a Substitute</h3>
                  </div>
                  <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                    Discovery is qualitative. The formal assessment provides precise, deterministic scores across 8 pillars.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
