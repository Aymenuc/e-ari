'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/* ─── Logo geometry (mirrors public/logo.svg, 48×48) ──────────────────────
 *
 * v2 — the Threshold E. Three horizontal bars on a navy rounded square.
 * The middle bar is shorter than the outer two so the negative space
 * forms a recognisable "E" without a vertical stroke. Animation: bars
 * draw in from the left in sequence, then a soft glow breathes.
 */

const BARS = [
  { x: 12, y: 13, w: 24, h: 4, fill: '#60a5fa' }, // top    — Pacesetter (lightest)
  { x: 12, y: 22, w: 14, h: 4, fill: '#3b82f6' }, // middle — Chaser
  { x: 12, y: 31, w: 24, h: 4, fill: '#1e40af' }, // bottom — Foundation (deepest)
]

export interface LoadingLogoProps {
  /** Pixel size of the logo square. Default 64. */
  size?: number
  /** Optional label below the logo. */
  label?: string
  className?: string
}

/**
 * Animated E-ARI logo — used as a premium loading indicator.
 * Bars draw in from the left in sequence; the navy frame breathes a
 * soft halo. Matches the static /public/logo.svg.
 */
export function LoadingLogo({ size = 64, label, className }: LoadingLogoProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3', className)}
      role="status"
      aria-live="polite"
      aria-label={label ?? 'Loading'}
    >
      <motion.div style={{ width: size, height: size }} className="relative">
        {/* Ambient blue halo behind the mark */}
        <motion.div
          className="absolute inset-0 rounded-[22%]"
          style={{
            background:
              'radial-gradient(circle, rgba(59,130,246,0.32) 0%, rgba(30,64,175,0.10) 55%, transparent 75%)',
            filter: 'blur(10px)',
          }}
          animate={{ opacity: [0.4, 0.85, 0.4], scale: [0.94, 1.04, 0.94] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        />

        <svg
          viewBox="0 0 48 48"
          fill="none"
          className="relative w-full h-full"
          aria-hidden="true"
        >
          {/* Navy rounded-square frame */}
          <rect width="48" height="48" rx="11" fill="#0a1024" />
          <rect
            x="0.5"
            y="0.5"
            width="47"
            height="47"
            rx="10.5"
            stroke="#1e2a45"
            strokeOpacity="0.8"
            strokeWidth="1"
            fill="none"
          />

          {/* Three bars draw in left-to-right in sequence */}
          {BARS.map((bar, i) => (
            <motion.rect
              key={i}
              x={bar.x}
              y={bar.y}
              height={bar.h}
              rx="1.2"
              fill={bar.fill}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: bar.w, opacity: [0, 1, 1, 0.85] }}
              transition={{
                width: { duration: 0.55, delay: 0.15 + i * 0.18, ease: 'easeOut' },
                opacity: {
                  duration: 2.2,
                  delay: 0.15 + i * 0.18,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  times: [0, 0.25, 0.7, 1],
                },
              }}
              style={{ filter: `drop-shadow(0 0 3px ${bar.fill}55)` }}
            />
          ))}
        </svg>
      </motion.div>

      {label && (
        <motion.span
          className="text-[11px] font-mono tracking-[0.22em] uppercase text-muted-foreground/70"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          {label}
        </motion.span>
      )}
    </div>
  )
}

/**
 * Full-screen premium loading overlay.
 * Use for page-level route transitions or long-running processes.
 */
export function LoadingOverlay({
  label = 'Loading',
  fullscreen = true,
  className,
}: {
  label?: string
  fullscreen?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-navy-900/80 backdrop-blur-md',
        fullscreen ? 'fixed inset-0 z-50' : 'absolute inset-0 z-10',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Ambient aurora backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(600px circle at 30% 40%, rgba(59,130,246,0.12), transparent 60%), radial-gradient(500px circle at 70% 60%, rgba(30,64,175,0.10), transparent 60%)',
        }}
      />
      <LoadingLogo size={96} label={label} className="relative z-10" />
    </div>
  )
}

export default LoadingLogo
