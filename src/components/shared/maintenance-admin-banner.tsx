'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

/**
 * Visible ONLY to admins, ONLY while maintenance mode is on.
 *
 * Admins bypass the maintenance rewrite in proxy.ts so they can flip the
 * toggle back off — which also means the site can be fully down for every
 * visitor while looking perfectly normal to the admin. That exact incident
 * happened pre-launch: the toggle was left on after testing and nobody
 * noticed. This banner makes the state impossible to miss.
 */
export function MaintenanceAdminBanner() {
  const { data: session } = useSession();
  const [on, setOn] = useState(false);

  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    fetch('/api/maintenance-status')
      .then(async (r) => {
        if (!cancelled && r.ok) setOn((await r.json()).maintenance === true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isAdmin]);

  if (!isAdmin || !on) return null;

  return (
    <div className="sticky top-0 z-[100] bg-red-600 text-white text-center px-4 py-2 font-sans text-sm font-medium">
      Maintenance mode is ON — every visitor is seeing the maintenance page, not the site.{' '}
      <Link href="/admin" className="underline font-semibold">Turn it off in Admin → Settings</Link>
    </div>
  );
}
