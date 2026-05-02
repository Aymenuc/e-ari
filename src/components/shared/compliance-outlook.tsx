'use client';

import Link from 'next/link';
import { Landmark, Layers, PieChart, AlertOctagon, FileStack } from 'lucide-react';
import type { ComplianceOutlook as ComplianceOutlookModel } from '@/lib/compliance-outlook';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export function ComplianceOutlook({
  outlook,
  baselineHref,
}: {
  outlook: ComplianceOutlookModel;
  baselineHref?: string;
}) {
  return (
    <Card className="border-eari-blue/20 bg-navy-800/70 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-eari-blue/15">
              <Landmark className="h-4 w-4 text-eari-blue-light" />
            </div>
            <div>
              <CardTitle className="font-heading text-lg text-foreground">
                Compliance outlook (this baseline)
              </CardTitle>
              <CardDescription className="font-sans text-xs">
                AI Act obligations vs. extracted citations for linked use cases
              </CardDescription>
            </div>
          </div>
          {baselineHref ? (
            <Link
              href={baselineHref}
              className="font-heading text-xs text-eari-blue-light underline-offset-4 hover:underline"
            >
              Manage use cases
            </Link>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric
            icon={Layers}
            label="Use cases"
            value={String(outlook.useCaseCount)}
          />
          <Metric
            icon={PieChart}
            label="Obligations covered"
            value={`${outlook.obligationsEvidenced}/${outlook.obligationsApplicable}`}
          />
          <Metric
            icon={AlertOctagon}
            label="Critical gaps"
            value={String(outlook.criticalOpenGaps)}
          />
          <Metric
            icon={FileStack}
            label="Documents"
            value={String(outlook.documentsUploaded)}
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
            <span>Coverage</span>
            <span className="text-eari-blue-light">{outlook.coveragePct}%</span>
          </div>
          <Progress value={outlook.coveragePct} className="h-2 bg-navy-900/80" />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Layers;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-navy-900/40 p-3">
      <Icon className="mb-2 h-4 w-4 text-eari-blue-light/90" aria-hidden />
      <p className="font-heading text-lg font-semibold tabular-nums text-foreground">{value}</p>
      <p className="font-sans text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
