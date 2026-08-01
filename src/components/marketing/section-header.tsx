/**
 * The landing page's section header, as a component.
 *
 * /team and /careers had drifted into a different dialect: pill badges where
 * the landing uses hairline rules (its own comment calls them "calmer than a
 * pill badge"), font-bold against font-semibold, text-foreground against
 * text-slate-50, and no optical tracking on the display sizes. Individually
 * invisible; together they make the marketing site read as three sites.
 *
 * The values below are lifted from src/app/page.tsx rather than re-invented,
 * so "match the landing page" has one definition and the next page added does
 * not restart the drift.
 */

export function SectionHeader({
  eyebrow, title, sub, align = 'center', className = '',
}: {
  eyebrow?: string
  title: React.ReactNode
  sub?: React.ReactNode
  /** Centred sections flank the eyebrow with mirrored rules; left-aligned do not. */
  align?: 'center' | 'left'
  className?: string
}) {
  const centred = align === 'center'
  return (
    <div
      className={`${centred ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl text-left'} ${className}`}
    >
      {eyebrow ? (
        <div className={`mb-5 flex items-center gap-3 ${centred ? 'justify-center' : ''}`}>
          <span aria-hidden className="h-px w-8 eyebrow-rule" />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
            {eyebrow}
          </span>
          {/* The mirrored rule brightens toward the centre, so it only belongs
              on a centred header — on a left-aligned one it reads inverted. */}
          {centred ? <span aria-hidden className="h-px w-8 eyebrow-rule-l" /> : null}
        </div>
      ) : null}
      <h2 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-slate-50 sm:text-4xl">
        {title}
      </h2>
      {sub ? (
        <p className="mt-4 font-sans text-[17px] leading-relaxed text-slate-400">{sub}</p>
      ) : null}
    </div>
  )
}
