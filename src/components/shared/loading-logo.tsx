'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/* ─── Logo geometry (mirrors public/logo.svg, 48×48) ────────────────────── */

const CENTER = { x: 24, y: 24 }

// 8 radiating pillar endpoints (position + brand color per pillar)
const PILLAR_NODES = [
  { x: 24,   y: 11,   color: '#60a5fa', r: 2.5 },  // top
  { x: 29.7, y: 13.3, color: '#ef4444', r: 2   },  // top-right-inner
  { x: 35.3, y: 17.5, color: '#8b5cf6', r: 2.5 },  // upper-right
  { x: 35.3, y: 30.5, color: '#06b6d4', r: 2.5 },  // lower-right
  { x: 24,   y: 37,   color: '#10b981', r: 2.5 },  // bottom
  { x: 18.3, y: 34.7, color: '#14b8a6', r: 2   },  // bottom-left-inner
  { x: 12.7, y: 30.5, color: '#f59e0b', r: 2.5 },  // lower-left
  { x: 12.7, y: 17.5, color: '#ec4899', r: 2.5 },  // upper-left
]

const OUTER_HEX = 'M24 3L43 13.5V34.5L24 45L5 34.5V13.5L24 3Z'
const INNER_HEX = 'M24 8L37.5 15.5V30.5L24 38L10.5 30.5V15.5L24 8Z'

export interface LoadingLogoProps {
  /** Pixel size of the logo square. Default 64. */
  size?: number
  /** Optional label below the logo. */
  label?: string
  className?: string
}

/**
 * Animated E-ARI logo — used as an in-line premium loading indicator.
 * Spokes draw outward in sequence, pillar nodes pulse in a ring,
 * the outer hexagon slowly rotates, and the central core breathes.
 */
export function LoadingLogo({ size = 64, label, className }: LoadingLogoProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3', className)}
      role="status"
      aria-live="polite"
      aria-label={label ?? 'Loading'}
    >
      <motion.div
        style={{ width: size, height: size }}
        className="relative"
      >
        {/* Ambient glow halo */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(37,99,235,0.35) 0%, rgba(6,182,212,0.15) 45%, transparent 70%)',
            filter: 'blur(8px)',
          }}
          animate={{ opacity: [0.35, 0.75, 0.35], scale: [0.9, 1.05, 0.9] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        />

        <svg
          viewBox="0 0 48 48"
          fill="none"
          className="relative w-full h-full"
          aria-hidden="true"
        >
          {/* Outer hexagon — slow rotate */}
          <motion.g
            style={{ transformOrigin: '24px 24px' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          >
            <motion.path
              d={OUTER_HEX}
              stroke="#2563eb"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.55, 0.35, 0.55] }}
              transition={{
                pathLength: { duration: 1.4, ease: 'easeOut' },
                opacity: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
              }}
            />
          </motion.g>

          {/* Inner hexagon — counter-rotate */}
          <motion.g
            style={{ transformOrigin: '24px 24px' }}
            animate={{ rotate: -360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          >
            <motion.path
              d={INNER_HEX}
              stroke="#60a5fa"
              strokeWidth="1"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.25 }}
              transition={{ duration: 1.6, delay: 0.2, ease: 'easeOut' }}
            />
          </motion.g>

          {/* 8 radiating spokes — draw in, then sustain */}
          {PILLAR_NODES.map((node, i) => (
            <motion.line
              key={`spoke-${i}`}
              x1={CENTER.x}
              y1={CENTER.y}
              x2={node.x}
              y2={node.y}
              stroke={node.color}
              strokeWidth="1.2"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.85 }}
              transition={{
                pathLength: { duration: 0.55, delay: 0.3 + i * 0.08, ease: 'easeOut' },
                opacity:    { duration: 0.3,  delay: 0.3 + i * 0.08 },
              }}
            />
          ))}

          {/* Flowing data pulses along spokes */}
          {PILLAR_NODES.map((node, i) => (
            <motion.circle
              key={`pulse-${i}`}
              r="1.1"
              fill={node.color}
              style={{ filter: `drop-shadow(0 0 3px ${node.color})` }}
              initial={{ cx: CENTER.x, cy: CENTER.y, opacity: 0 }}
              animate={{
                cx: [CENTER.x, node.x],
                cy: [CENTER.y, node.y],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 1.6,
                delay: 1.1 + i * 0.12,
                repeat: Infinity,
                ease: 'linear',
                times: [0, 0.12, 0.88, 1],
              }}
            />
          ))}

          {/* Pillar endpoint nodes — staggered orbital pulse */}
          {PILLAR_NODES.map((node, i) => (
            <motion.circle
              key={`node-${i}`}
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={node.color}
              style={{ filter: `drop-shadow(0 0 4px ${node.color})` }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale:   [0, 1, 1.15, 1],
                opacity: [0, 1, 1, 0.85],
              }}
              transition={{
                duration: 2.2,
                delay: 0.35 + i * 0.08,
                repeat: Infinity,
                repeatDelay: PILLAR_NODES.length * 0.08 - i * 0.08,
                ease: 'easeInOut',
                times: [0, 0.2, 0.5, 1],
              }}
            />
          ))}

          {/* Central neural core — breathing */}
          <motion.circle
            cx={CENTER.x}
            cy={CENTER.y}
            r="5"
            fill="#2563eb"
            animate={{ scale: [1, 1.12, 1], opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '24px 24px', filter: 'drop-shadow(0 0 6px rgba(37,99,235,0.9))' }}
          />
          <motion.circle
            cx={CENTER.x}
            cy={CENTER.y}
            r="3"
            fill="#60a5fa"
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.85, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            style={{ transformOrigin: '24px 24px' }}
          />
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
            'radial-gradient(600px circle at 30% 40%, rgba(37,99,235,0.12), transparent 60%), radial-gradient(500px circle at 70% 60%, rgba(6,182,212,0.10), transparent 60%)',
        }}
      />
      <LoadingLogo size={96} label={label} className="relative z-10" />
    </div>
  )
}

export default LoadingLogo
