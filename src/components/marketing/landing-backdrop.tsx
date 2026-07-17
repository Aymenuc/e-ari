'use client';

/**
 * LandingBackdrop — ONE continuous background for the whole landing page.
 *
 * Replaces the patchwork of per-section navy tints and gradient separators
 * with a single fixed canvas: a deep navy vertical grade, two aurora fields
 * anchored to the top (hero region), a faint engineering grid across the
 * entire page — and the signature interaction: the grid and a soft light
 * REVEAL themselves around the cursor, an X-Ray sweep over the page. The
 * motif is the product (structural detection), kept elegant: low opacity,
 * rAF-throttled direct style writes, zero React re-renders, disabled for
 * touch and reduced motion.
 */

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

export function LandingBackdrop() {
  const glowRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;
    const glow = glowRef.current;
    const reveal = revealRef.current;
    if (!glow || !reveal) return;

    let raf = 0;
    let x = -9999;
    let y = -9999;

    const paint = () => {
      raf = 0;
      glow.style.background = `radial-gradient(560px circle at ${x}px ${y}px, rgba(99, 102, 241, 0.07), rgba(37, 99, 235, 0.04) 40%, transparent 70%)`;
      const mask = `radial-gradient(340px circle at ${x}px ${y}px, black 20%, transparent 75%)`;
      reveal.style.maskImage = mask;
      reveal.style.webkitMaskImage = mask;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      x = -9999;
      y = -9999;
      if (!raf) raf = requestAnimationFrame(paint);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [prefersReducedMotion]);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
      {/* One vertical grade for the whole page — no section seams */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#060b16_0%,#0a1020_35%,#0c1019_70%,#0d1117_100%)]" />

      {/* Aurora fields — anchored to the hero region, fading with scroll depth */}
      <div className="hero-aurora-a absolute -top-40 right-[-8%] w-[min(720px,85vw)] h-[min(720px,85vw)] rounded-full" />
      <div className="hero-aurora-b absolute top-[12%] left-[-14%] w-[min(560px,70vw)] h-[min(560px,70vw)] rounded-full" />

      {/* Resting grid — barely there, everywhere */}
      <div className="backdrop-grid absolute inset-0 opacity-50" />

      {/* The X-Ray sweep: a brighter grid revealed only around the cursor */}
      <div
        ref={revealRef}
        className="absolute inset-0 opacity-0 md:opacity-100"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.13) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(340px circle at -9999px -9999px, black 20%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(340px circle at -9999px -9999px, black 20%, transparent 75%)',
        }}
      />

      {/* Soft cursor light */}
      <div ref={glowRef} className="absolute inset-0 opacity-0 md:opacity-100" />
    </div>
  );
}
