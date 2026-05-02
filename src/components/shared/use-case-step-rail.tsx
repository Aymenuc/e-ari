'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, FileStack, Radar, ScrollText, FileJson } from 'lucide-react';
import { cn } from '@/lib/utils';

const BASE = '/portal/use-cases/systems';

export function UseCaseStepRail({ systemId }: { systemId: string }) {
  const pathname = usePathname();
  const [summary, setSummary] = useState<{
    evidenceCount: number;
    openGaps: number;
    friaStatus: string | null;
    technicalFileStatus: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/compliance/systems/${systemId}/summary`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;
        setSummary({
          evidenceCount: typeof data.evidenceCount === 'number' ? data.evidenceCount : 0,
          openGaps: typeof data.openGaps === 'number' ? data.openGaps : 0,
          friaStatus: data.friaStatus ?? null,
          technicalFileStatus: data.technicalFileStatus ?? null,
        });
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [systemId]);

  const steps = [
    {
      href: `${BASE}/${systemId}`,
      label: 'Overview',
      Icon: LayoutDashboard,
      badge: null as string | null,
      exact: true,
    },
    {
      href: `${BASE}/${systemId}/evidence`,
      label: 'Evidence',
      Icon: FileStack,
      badge:
        summary != null && summary.evidenceCount > 0
          ? String(summary.evidenceCount)
          : null,
      exact: false,
    },
    {
      href: `${BASE}/${systemId}/gaps`,
      label: 'Gap radar',
      Icon: Radar,
      badge:
        summary != null && summary.openGaps > 0
          ? String(summary.openGaps)
          : null,
      exact: false,
    },
    {
      href: `${BASE}/${systemId}/fria`,
      label: 'FRIA',
      Icon: ScrollText,
      badge: summary?.friaStatus === 'finalized' ? '✓' : null,
      exact: false,
    },
    {
      href: `${BASE}/${systemId}/technical-file`,
      label: 'Annex IV',
      Icon: FileJson,
      badge: summary?.technicalFileStatus === 'finalized' ? '✓' : null,
      exact: false,
    },
  ];

  return (
    <nav
      aria-label="Use case workflow"
      className="rounded-xl border border-white/[0.08] bg-navy-900/50 p-3 backdrop-blur-sm"
    >
      <p className="mb-3 px-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        Workflow
      </p>
      <ul className="space-y-1">
        {steps.map(({ href, label, Icon, badge, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href + '/') || pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-heading transition-colors',
                  active
                    ? 'bg-eari-blue/15 text-eari-blue-light ring-1 ring-eari-blue/25'
                    : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                <span className="flex-1 truncate">{label}</span>
                {badge ? (
                  <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                    {badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
