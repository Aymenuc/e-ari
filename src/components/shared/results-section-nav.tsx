'use client';

/**
 * Sticky in-page navigation for the results report.
 *
 * The results page is a long-form report (15+ sections). Without a map it
 * reads as an undifferentiated wall of cards — this bar gives it a table
 * of contents that tracks reading position (scrollspy) and jumps smoothly.
 * Anchors are sentinel <div id="sec-…"> elements placed before each major
 * section; missing sentinels (tier-gated sections) are simply not shown.
 */

import { useEffect, useState } from 'react';

export interface ResultsNavSection {
  id: string;
  label: string;
}

export function ResultsSectionNav({ sections }: { sections: ResultsNavSection[] }) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? '');
  const [present, setPresent] = useState<ResultsNavSection[]>([]);

  useEffect(() => {
    // Only offer sections whose sentinel actually rendered for this tier.
    setPresent(sections.filter((s) => document.getElementById(s.id)));
  }, [sections]);

  useEffect(() => {
    if (present.length === 0) return;
    const onScroll = () => {
      // Active = the last sentinel above the upper third of the viewport.
      const line = window.innerHeight * 0.33;
      let current = present[0].id;
      for (const s of present) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [present]);

  if (present.length < 3) return null;

  return (
    <nav
      aria-label="Report sections"
      className="sticky top-0 z-40 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-navy-900/85 backdrop-blur-md border-b border-white/[0.06]"
    >
      <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
        {present.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors ${
              active === s.id
                ? 'bg-eari-blue/15 text-eari-blue-light'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
