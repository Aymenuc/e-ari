'use client';

import Link from 'next/link';
import { Inbox, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface PortalInboxItem {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export function ComplianceInboxCard({
  items,
  loading,
}: {
  items: PortalInboxItem[];
  loading?: boolean;
}) {
  return (
    <Card className="border-border/60 bg-navy-800/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-heading text-base text-foreground">
          <Inbox className="h-4 w-4 text-eari-blue-light" />
          Compliance inbox
        </CardTitle>
        <CardDescription className="font-sans text-xs">
          Open gaps and deadlines across your use cases
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-xs text-muted-foreground font-sans">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground font-sans">
            Nothing queued — you&apos;re caught up on tracked actions.
          </p>
        ) : (
          <ul className="divide-y divide-border/40 rounded-lg border border-border/30">
            {items.slice(0, 8).map((it) => (
              <li key={it.id}>
                <Link
                  href={it.href}
                  className="flex items-start gap-2 px-3 py-2.5 text-xs hover:bg-navy-700/40 font-sans"
                >
                  <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-eari-blue-light/80" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-heading text-sm text-foreground leading-snug">
                      {it.title}
                    </span>
                    {it.subtitle ? (
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {it.subtitle}
                      </span>
                    ) : null}
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
