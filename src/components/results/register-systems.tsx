'use client'

/**
 * The bridge from a readiness score to an AI inventory.
 *
 * The score answers "can this organisation govern AI". Every obligation under
 * the Act attaches to a *system*, so the next question is always "which ones",
 * and until it is answered the assessment stays a one-off diagnostic. The
 * registry that answers it already exists — AISystem even carries an
 * assessmentId relation — and nothing was ever writing to it from here.
 *
 * These are candidates for recognition, never detections: the assessment does
 * not ask what anyone runs, so the copy says "which of these do you run" and
 * the empty state is a link to add your own. Risk tier is left unset; the
 * classifier decides that from the registered detail, not from a checkbox.
 */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check, Loader2, Plus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { candidateSystemsForSector, type CandidateSystem } from '@/lib/sector-ai-systems'
import { FadeUp } from './fade-up'

export function RegisterSystems({
  assessmentId, sector, alreadyRegistered = 0,
}: {
  assessmentId: string
  sector: string | null
  alreadyRegistered?: number
}) {
  const router = useRouter()
  const candidates = useMemo(() => candidateSystemsForSector(sector), [sector])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Once the inventory exists this block has done its job — nagging someone
  // who already registered their systems is how a prompt becomes noise.
  if (alreadyRegistered > 0 && saved === null) return null

  const toggle = (name: string) =>
    setPicked(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })

  const save = async () => {
    const chosen = candidates.filter(c => picked.has(c.name))
    if (chosen.length === 0) return
    setSaving(true); setError(null)
    try {
      // Sequential rather than parallel: each is a write against the same
      // registry, and a half-failed burst is worse than a slower loop.
      let created = 0
      for (const c of chosen) {
        const res = await fetch('/api/compliance/systems', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: c.name,
            description: c.description,
            purpose: c.purpose,
            deployerRole: 'deployer',
            sector: sector ?? 'general',
            populationsAffected: c.populationsAffected ?? null,
            assessmentId,
          }),
        })
        if (!res.ok) throw new Error(await res.text().catch(() => 'Could not save'))
        created += 1
      }
      setSaved(created)
      router.refresh()
    } catch {
      setError('Some systems could not be saved. Your selection is still here — try again, or add them in the registry.')
    } finally {
      setSaving(false)
    }
  }

  if (saved !== null) {
    return (
      <FadeUp>
        <Card className="border-emerald-500/20 bg-navy-800/90">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
              <Check className="h-5 w-5 text-emerald-400" />
            </span>
            <div className="flex-1">
              <p className="font-heading text-base font-semibold text-slate-100">
                {saved} system{saved === 1 ? '' : 's'} registered
              </p>
              <p className="mt-1 font-sans text-sm text-muted-foreground">
                Each one still needs a risk classification — that decides which
                obligations apply to it.
              </p>
            </div>
            <Button
              onClick={() => router.push('/portal/use-cases')}
              className="btn-brand h-10 shrink-0 font-heading text-sm font-semibold"
            >
              Classify them <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </FadeUp>
    )
  }

  return (
    <FadeUp>
      <Card className="bg-navy-800/90 border-border/50">
        <CardHeader>
          <CardTitle className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Which of these do you actually run?
          </CardTitle>
          <CardDescription className="font-sans text-sm">
            Your score says how well you govern AI. Obligations attach to
            individual systems, so this is the next question — and it is easier
            to recognise them than to remember them. Common in your sector; tick
            what applies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {candidates.map((c: CandidateSystem, i) => {
              const on = picked.has(c.name)
              return (
                <motion.button
                  key={c.name}
                  onClick={() => toggle(c.name)}
                  aria-pressed={on}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 26, delay: i * 0.02 }}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                    on
                      ? 'border-eari-blue/60 bg-eari-blue/[0.08]'
                      : 'border-border bg-navy-900/40 hover:border-white/[0.16] hover:bg-navy-700/40'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors ${
                      on ? 'border-eari-blue bg-eari-blue' : 'border-white/20 bg-transparent'
                    }`}
                    style={{ height: 18, width: 18 }}
                  >
                    <AnimatePresence>
                      {on && (
                        <motion.span
                          initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                        >
                          <Check className="h-3 w-3 text-white" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                  <span className="min-w-0">
                    <span className="block font-sans text-sm font-medium text-slate-100">{c.name}</span>
                    <span className="mt-0.5 block font-sans text-xs leading-relaxed text-muted-foreground">
                      {c.description}
                    </span>
                  </span>
                </motion.button>
              )
            })}
          </div>

          {error && (
            <p className="mt-4 font-sans text-sm text-red-400">{error}</p>
          )}

          <div className="mt-5 flex flex-col gap-3 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-center">
            <Button
              onClick={save}
              disabled={picked.size === 0 || saving}
              className="btn-brand h-11 font-heading text-sm font-semibold disabled:opacity-40"
            >
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registering…</>
              ) : (
                <>Register {picked.size > 0 ? `${picked.size} ` : ''}system{picked.size === 1 ? '' : 's'}</>
              )}
            </Button>
            <button
              onClick={() => router.push('/portal/use-cases/systems/new')}
              className="self-center font-sans text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
            >
              <Plus className="mr-1 inline h-3.5 w-3.5" />
              Add one that is not listed
            </button>
          </div>
        </CardContent>
      </Card>
    </FadeUp>
  )
}
