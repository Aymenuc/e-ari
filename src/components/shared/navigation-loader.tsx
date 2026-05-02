'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { LoadingOverlay } from './loading-logo'

export function NavigationLoader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)
  const isFirstRender = useRef(true)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Skip the very first render — don't show loader on initial page load
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    // Show loader on next tick to avoid synchronous state updates in effect
    if (showTimer.current) clearTimeout(showTimer.current)
    showTimer.current = setTimeout(() => setVisible(true), 0)

    // Auto-hide after a max of 1.2s in case the page loads fast or the
    // route change resolves instantly
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setVisible(false), 1200)

    return () => {
      if (showTimer.current) clearTimeout(showTimer.current)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [pathname, searchParams])

  if (!visible) return null
  return <LoadingOverlay label="Loading" />
}
