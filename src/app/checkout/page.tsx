'use client'

import { Suspense } from 'react'

// Inner component that uses useSearchParams — must be wrapped in Suspense
import CheckoutPageInner from './checkout-inner'

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-navy-900">
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-eari-blue border-t-transparent" />
        </div>
      </div>
    }>
      <CheckoutPageInner />
    </Suspense>
  )
}
