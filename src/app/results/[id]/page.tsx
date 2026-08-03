'use client'

/**
 * Route wrapper.
 *
 * The results experience itself lives in ResultsView so the assessment hub can
 * render it inline without a navigation. This URL exists because a compliance
 * report gets emailed to boards and auditors — it has to stay linkable.
 */

import { useParams } from 'next/navigation'
import { ResultsView } from '@/components/results/results-view'

export default function ResultsPage() {
  const params = useParams()
  // The layout supplies the shell, so the view must not add its own.
  return <ResultsView assessmentId={params.id as string} chrome={false} />
}
