/**
 * Title and brand scenes for the reveal film.
 *
 * The logo is three graduated bars — an E that doubles as ascending readiness
 * bars. That is worth animating rather than fading in: drawing the bars in
 * sequence performs the idea the mark encodes, so the open states the product's
 * premise before a single word appears.
 */

const NAVY = '#0a1024';
const BG = '#080d18';

/* Bar geometry from public/logo.svg, scaled up for film. */
const BARS = [
  { y: 0, w: 1.0, o: 1.0 },
  { y: 1, w: 0.583, o: 0.62 },
  { y: 2, w: 1.0, o: 0.35 },
];

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/**
 * The mark at a given animation progress.
 *
 * Each bar has its own window inside 0..1 so they arrive staggered; the
 * wordmark only starts once the last bar is on its way, which keeps the
 * sequence reading as one gesture rather than four separate fades.
 */
export function logoMarkHTML(progress, { size = 132, showWord = true, word = 'E-ARI' } = {}) {
  const unit = size / 48;
  const barH = 4 * unit;
  const gap = 9 * unit;
  const left = 12 * unit;
  const top = 13 * unit;
  const maxW = 24 * unit;

  const bars = BARS.map((b, i) => {
    const start = i * 0.16;
    const t = easeOut(clamp01((progress - start) / 0.42));
    const w = maxW * b.w * t;
    return `<div style="position:absolute;left:${left}px;top:${top + b.y * gap}px;
              width:${w}px;height:${barH}px;border-radius:${1.2 * unit}px;
              background:#f1f5f9;opacity:${b.o}"></div>`;
  }).join('');

  const wordT = easeOut(clamp01((progress - 0.5) / 0.5));
  const wordEl = showWord
    ? `<div style="margin-left:${28 * unit}px;font-family:var(--font-heading, 'Space Grotesk'), 'Helvetica Neue', Helvetica, Arial, sans-serif;
         font-size:${size * 0.46}px;font-weight:600;letter-spacing:-0.02em;color:#f8fafc;
         opacity:${wordT};transform:translateX(${(1 - wordT) * -14}px)">${word}</div>`
    : '';

  return `
    <div style="display:flex;align-items:center">
      <div style="position:relative;width:${size}px;height:${size}px;border-radius:${11 * unit}px;
                  background:${NAVY};border:1px solid rgba(38,49,77,0.9);
                  box-shadow:0 30px 80px -30px rgba(0,0,0,0.9)">${bars}</div>
      ${wordEl}
    </div>`;
}

/** Full-frame brand scene: the mark, optionally with a line under it. */
export function brandSceneHTML(progress, { w, h, title, sub, kicker, size = 132 }) {
  const textT = easeOut(clamp01((progress - 0.55) / 0.45));
  return `
    <body style="margin:0;background:${BG};width:${w}px;height:${h}px;
                 display:grid;place-items:center;font-family:system-ui;overflow:hidden">
      <div style="text-align:center">
        <div style="display:flex;justify-content:center">${logoMarkHTML(progress, { size })}</div>
        ${
          title
            ? `<div style="margin-top:${size * 0.38}px;opacity:${textT};
                 transform:translateY(${(1 - textT) * 10}px)">
                 ${kicker ? `<div style="font-family:ui-monospace,monospace;font-size:14px;
                    letter-spacing:0.26em;text-transform:uppercase;color:#64748b;
                    margin-bottom:18px">${kicker}</div>` : ''}
                 <div style="font-family:var(--font-heading, 'Space Grotesk'), 'Helvetica Neue', Helvetica, Arial, sans-serif;font-size:${size * 0.34}px;
                    font-weight:600;letter-spacing:-0.03em;color:#f8fafc;line-height:1.12">${title}</div>
                 ${sub ? `<div style="margin-top:16px;font-size:20px;color:#8b98ab;line-height:1.5;
                    max-width:680px;margin-left:auto;margin-right:auto">${sub}</div>` : ''}
               </div>`
            : ''
        }
      </div>
    </body>`;
}

/**
 * A statement card. No logo — these are the beats between product shots, and a
 * mark on every card turns a film into a slide deck.
 */
export function statementHTML({ w, h, kicker, title, sub, big = false }) {
  return `
    <body style="margin:0;background:${BG};width:${w}px;height:${h}px;
                 display:grid;place-items:center;font-family:system-ui;overflow:hidden">
      <div style="text-align:center;padding:0 90px;max-width:${Math.min(w - 160, 1180)}px">
        ${kicker ? `<div style="font-family:ui-monospace,monospace;font-size:14px;letter-spacing:0.26em;
            text-transform:uppercase;color:#64748b;margin-bottom:26px">${kicker}</div>` : ''}
        <div style="font-family:var(--font-heading, 'Space Grotesk'), 'Helvetica Neue', Helvetica, Arial, sans-serif;font-size:${big ? 92 : 66}px;
             font-weight:600;letter-spacing:-0.035em;color:#f8fafc;line-height:1.06">${title}</div>
        ${sub ? `<div style="margin-top:24px;font-size:21px;color:#8b98ab;line-height:1.5;
             max-width:720px;margin-left:auto;margin-right:auto">${sub}</div>` : ''}
      </div>
    </body>`;
}

/** The report, held like an object rather than shown as a screenshot. */
export function reportSceneHTML({ w, h, imgDataUri }) {
  return `
    <body style="margin:0;background:${BG};width:${w}px;height:${h}px;
                 display:grid;place-items:center;overflow:hidden;perspective:1800px">
      <img src="${imgDataUri}" style="height:${h * 0.82}px;border-radius:6px;
           transform:rotateY(-13deg) rotateX(3deg);
           box-shadow:-40px 50px 110px -30px rgba(0,0,0,0.95),
                       0 0 0 1px rgba(255,255,255,0.07)" />
    </body>`;
}

/**
 * Kinetic statement — the words arrive rather than appear.
 *
 * A held card is a slide. Wiping each line up from behind a mask, staggered,
 * gives the cut somewhere to go and lets a shot land in under two seconds
 * instead of needing four to feel finished.
 */
export function kineticHTML(progress, { w, h, kicker, lines, sub, size }) {
  const F = "var(--font-heading, 'Space Grotesk'), 'Helvetica Neue', Helvetica, Arial, sans-serif";
  const eo = (t) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
  const fs = size ?? (w < 1200 ? 68 : 96);

  const kickT = eo(progress / 0.22);
  const rows = lines
    .map((line, i) => {
      const t = eo((progress - 0.1 - i * 0.11) / 0.4);
      return `
        <div style="overflow:hidden;height:${fs * 1.1}px">
          <div style="font-family:${F};font-size:${fs}px;font-weight:600;letter-spacing:-0.04em;
                      color:#f8fafc;line-height:1.1;white-space:nowrap;
                      transform:translateY(${(1 - t) * 100}%)">${line}</div>
        </div>`;
    })
    .join('');

  const subT = eo((progress - 0.42) / 0.4);
  return `
    <body style="margin:0;background:#080d18;width:${w}px;height:${h}px;
                 display:grid;place-items:center;font-family:system-ui;overflow:hidden">
      <div style="text-align:center;padding:0 70px">
        ${kicker ? `<div style="font-family:ui-monospace,monospace;font-size:13px;letter-spacing:0.3em;
            text-transform:uppercase;color:#5b6b83;margin-bottom:22px;opacity:${kickT}">${kicker}</div>` : ''}
        ${rows}
        ${sub ? `<div style="margin-top:22px;font-size:20px;color:#8b98ab;line-height:1.45;
             max-width:640px;margin-left:auto;margin-right:auto;opacity:${subT};
             transform:translateY(${(1 - subT) * 12}px)">${sub}</div>` : ''}
      </div>
    </body>`;
}
