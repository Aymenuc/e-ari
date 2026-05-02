'use client';

import { PieChart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export function CoverageGaugeCard({
  obligationsApplicable,
  obligationsEvidenced,
}: {
  obligationsApplicable: number;
  obligationsEvidenced: number;
}) {
  const pct =
    obligationsApplicable > 0
      ? Math.round((obligationsEvidenced / obligationsApplicable) * 100)
      : 0;

  return (
    <Card className="border-border/60 bg-navy-800/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-heading text-base text-foreground">
          <PieChart className="h-4 w-4 text-eari-blue-light" />
          Obligation coverage
        </CardTitle>
        <CardDescription className="font-sans text-xs">
          Across classified use cases (AI Act catalogue by tier)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="font-heading text-3xl font-semibold tabular-nums text-eari-blue-light">
          {pct}%
        </p>
        <Progress value={pct} className="h-2 bg-navy-900/80" />
        <p className="font-mono text-[11px] text-muted-foreground">
          {obligationsEvidenced} / {obligationsApplicable} obligations evidenced
        </p>
      </CardContent>
    </Card>
  );
}
