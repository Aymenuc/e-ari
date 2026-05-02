'use client';

import { Activity } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AssessmentRow {
  id: string;
  status: string;
  completedAt: string | null;
  overallScore: number | null;
}

export function RecentActivityCard({ assessments }: { assessments: AssessmentRow[] }) {
  const rows = [...assessments]
    .filter((a) => a.status === 'completed' && a.completedAt)
    .sort((a, b) => {
      const ta = new Date(a.completedAt!).getTime();
      const tb = new Date(b.completedAt!).getTime();
      return tb - ta;
    })
    .slice(0, 5);

  return (
    <Card className="border-border/60 bg-navy-800/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-heading text-base text-foreground">
          <Activity className="h-4 w-4 text-eari-blue-light" />
          Recent assessments
        </CardTitle>
        <CardDescription className="font-sans text-xs">
          Latest completed readiness runs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground font-sans">No completed assessments yet.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/results/${a.id}`}
                  className="flex items-center justify-between rounded-lg border border-border/25 px-3 py-2 text-xs hover:bg-navy-700/40 font-sans"
                >
                  <span className="font-mono text-muted-foreground">{a.id.slice(0, 10)}…</span>
                  <span className="text-foreground tabular-nums">
                    {a.overallScore != null ? `${Math.round(a.overallScore)}%` : '—'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(a.completedAt!), 'MMM d')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
