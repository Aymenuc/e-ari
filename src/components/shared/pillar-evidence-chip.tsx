'use client';

import Link from 'next/link';
import { FileStack } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PillarEvidenceChip({
  count,
  vaultHref,
  className,
}: {
  count: number;
  vaultHref?: string;
  className?: string;
}) {
  const label =
    count === 0
      ? 'No mapped clauses yet'
      : `${count} clause${count === 1 ? '' : 's'} mapped`;

  return (
    <div
      className={cn(
        'mt-2 flex flex-wrap items-center gap-2 px-6 pl-9 pb-3',
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-navy-900/40 px-2 py-1 font-mono text-[10px] text-muted-foreground">
        <FileStack className="h-3 w-3 shrink-0 text-eari-blue-light/90" aria-hidden />
        {label}
      </span>
      {vaultHref && count > 0 ? (
        <Link
          href={vaultHref}
          className="font-heading text-[10px] uppercase tracking-wide text-eari-blue-light underline-offset-4 hover:underline"
        >
          Open vault
        </Link>
      ) : null}
    </div>
  );
}
