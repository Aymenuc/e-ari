'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, MessageCircle, X, Send, Loader2, Sparkles, HelpCircle, BookOpen, Lock, ArrowUpRight, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const QUICK_ACTIONS = [
  { label: 'Explain my scores', icon: Sparkles, prompt: 'Can you explain how the E-ARI scoring works and what my scores mean?' },
  { label: 'Assessment help', icon: HelpCircle, prompt: 'I need help understanding the assessment questions. Can you guide me?' },
  { label: 'Methodology guide', icon: BookOpen, prompt: 'Can you walk me through the E-ARI 8-pillar methodology and how each pillar is weighted?' },
]

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm your E-ARI AI Assistant. I can help you understand your AI readiness scores, explain methodology, or guide you through the assessment.",
  timestamp: new Date(),
}

interface AIAssistantProps {
  /** The user's current tier. Free-tier users see a locked state. */
  userTier?: 'free' | 'professional' | 'enterprise'
}

export function AIAssistant({ userTier = 'free' }: AIAssistantProps) {
  const isPro = userTier === 'professional' || userTier === 'enterprise'
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to get response')
      }

      const data = await res.json()
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message || 'I apologize, but I was unable to process your request. Please try again.',
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again in a moment.',
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

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt)
  }

  // ─── Locked state for Free-tier users ──────────────────────────────────
  if (!isPro) {
    return (
      <>
        {/* Locked floating button */}
        <AnimatePresence>
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={() => setIsOpen(!isOpen)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-navy-700 text-muted-foreground shadow-lg shadow-black/20 hover:bg-navy-600 transition-colors cursor-pointer border border-border/50"
            aria-label="AI Assistant — Upgrade Required"
          >
            <Lock className="h-5 w-5" />
          </motion.button>
        </AnimatePresence>

        {/* Locked overlay panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed bottom-6 right-6 z-50 flex w-[340px] max-w-[calc(100%-2rem)] flex-col rounded-xl overflow-hidden shadow-2xl shadow-black/40"
              style={{ background: 'rgba(13, 17, 23, 0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(48, 57, 74, 0.6)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50" style={{ background: 'rgba(22, 27, 34, 0.8)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-eari-blue/20">
                    <Brain className="h-4 w-4 text-eari-blue-light" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-sm text-foreground">E-ARI AI Assistant</h3>
                    <p className="text-[11px] text-amber-400 font-mono flex items-center gap-1">
                      <Crown className="h-3 w-3" />
                      Pro Feature
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Locked content */}
              <div className="p-6 flex flex-col items-center text-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-eari-blue/10 border border-eari-blue/20">
                  <Lock className="h-7 w-7 text-eari-blue-light" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-foreground text-base mb-2">
                    AI Assistant is a Pro Feature
                  </h4>
                  <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                    Get instant, context-aware guidance on your assessment scores, methodology, and strategic recommendations. Upgrade to Professional to unlock the AI Assistant and all 6 AI agents.
                  </p>
                </div>
                <div className="w-full space-y-2">
                  <Link href="/checkout?plan=professional" className="w-full block">
                    <Button className="w-full bg-eari-blue hover:bg-eari-blue-dark text-white font-heading font-semibold h-11 shadow-md shadow-eari-blue/15">
                      <ArrowUpRight className="mr-2 h-4 w-4" />
                      Upgrade to Professional
                    </Button>
                  </Link>
                  <Link href="/pricing" className="w-full block">
                    <Button variant="outline" className="w-full border-border hover:bg-navy-700 text-muted-foreground font-sans text-sm h-9">
                      Compare Plans
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )
  }

  // ─── Pro+ unlocked state ───────────────────────────────────────────────
  return (
    <>
      {/* Floating chat button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-eari-blue text-white shadow-lg shadow-eari-blue/25 hover:bg-eari-blue-dark transition-colors cursor-pointer"
            aria-label="Open AI Assistant"
          >
            <MessageCircle className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 flex h-[520px] w-[380px] max-w-[calc(100%-2rem)] flex-col rounded-xl overflow-hidden shadow-2xl shadow-black/40"
            style={{ background: 'rgba(13, 17, 23, 0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(48, 57, 74, 0.6)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50" style={{ background: 'rgba(22, 27, 34, 0.8)' }}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-eari-blue/20">
                  <Brain className="h-4 w-4 text-eari-blue-light" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-sm text-foreground">E-ARI AI Assistant</h3>
                  <p className="text-[11px] text-emerald-400 font-mono">Online</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'thin' }}>
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

              {/* Loading indicator */}
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

              {/* Quick actions (show when only welcome message) */}
              {messages.length === 1 && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <p className="text-xs text-muted-foreground font-sans px-1">Quick actions:</p>
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon
                    return (
                      <button
                        key={action.label}
                        onClick={() => handleQuickAction(action.prompt)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm font-sans text-foreground hover:bg-navy-700/50 transition-colors cursor-pointer"
                        style={{ background: 'rgba(22, 27, 34, 0.5)', border: '1px solid rgba(48, 57, 74, 0.4)' }}
                      >
                        <Icon className="h-4 w-4 text-eari-blue-light flex-shrink-0" />
                        {action.label}
                      </button>
                    )
                  })}
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-border/50 p-3" style={{ background: 'rgba(22, 27, 34, 0.8)' }}>
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about E-ARI..."
                  disabled={isLoading}
                  className="flex-1 h-10 rounded-lg border border-border/50 bg-navy-800 px-3 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-eari-blue/50 disabled:opacity-50"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !input.trim()}
                  className="h-10 w-10 bg-eari-blue hover:bg-eari-blue-dark text-white flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
