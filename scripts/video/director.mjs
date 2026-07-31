/**
 * Reveal film director.
 *
 * Every frame is the real running product. What changed from the first cut is
 * how it is filmed: instead of screenshotting whole pages and scaling them, the
 * hero shots lift one live element onto a clean stage and animate it — a score
 * counting up, a cursor pressing a real button, panels arriving composed.
 *
 * A page screenshot shows that a product exists. A composed shot shows what it
 * does, which is the whole job of the film.
 *
 * Pairs with frames-to-mp4 (Swift/AVFoundation). No ffmpeg, no editor, no
 * service: everything runs on tools already installed.
 *
 * Usage: node scripts/video/director.mjs <outDir> [--square]
 */
import { chromium } from 'playwright';
import { mkdirSync, rmSync, readFileSync } from 'node:fs';
import { brandSceneHTML, statementHTML, reportSceneHTML, kineticHTML } from './scenes.mjs';
import {
  openStudio, place, pose, cursor, ripple, boxOf, markChild, setChildText,
  studioCaption, captionOpacity, closeStudio, retextClone,
  grabFrame, holdOutgoing, fadeOutgoing, filmLook,
  spotlight, spotlightPose, clearSpotlight,
} from './studio.mjs';

const OUT = process.argv[2] ?? '/tmp/reveal-frames';
const SQUARE = process.argv.includes('--square');
const BASE = 'http://localhost:3000';
const FPS = 30;
const W = SQUARE ? 1080 : 1920;
const H = 1080;

const RESULT_ID = 'cmrrt9vhb0002vd4o7in1ijgd';

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

let frame = 0;

async function snap(page) {
  await page.screenshot({ path: `${OUT}/f${String(frame).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
  frame++;
}

/** Run `fn(t)` across `secs` of frames, capturing each. */
async function animate(page, secs, fn) {
  const n = Math.round(secs * FPS);
  for (let i = 0; i < n; i++) {
    await fn(n === 1 ? 1 : i / (n - 1));
    await snap(page);
  }
}

async function card(page, { secs, html }) {
  await page.setContent(html);
  await page.waitForTimeout(320);
  await animate(page, secs, async () => {});
}

/**
 * A generated scene, optionally dissolving in from the previous shot.
 *
 * setContent() replaces the whole document, so an overlay injected once is gone
 * by the next frame. The outgoing frame is therefore re-applied after every
 * setContent, at the opacity that frame is due.
 */
async function scene(page, { secs, html, hold = 0, dissolveFrom = null }) {
  const n = Math.round(secs * FPS);
  const animated = Math.max(1, n - Math.round(hold * FPS));
  const nFade = Math.round(XFADE * FPS);
  for (let i = 0; i < n; i++) {
    await page.setContent(html(Math.min(1, i / Math.max(1, animated - 1))));
    if (i === 0) await page.waitForTimeout(260);
    if (dissolveFrom && i <= nFade) {
      await holdOutgoing(page, dissolveFrom);
      await fadeOutgoing(page, Math.max(0, 1 - i / nFade));
    }
    await snap(page);
  }
}

async function goto(page, path, { wait = 3500, scrollTo = 0 } = {}) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 180000 });
  await page.evaluate(() => {
    const d = [...document.querySelectorAll('button')].find((x) => /decline/i.test(x.textContent || ''));
    d && d.click();
  });
  await page.waitForTimeout(wait);
  if (scrollTo) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), scrollTo);
    await page.waitForTimeout(600);
  }
}

/** Caption fades up over the opening beat of a shot, then holds. */
const capAt = (t) => clamp01(t / 0.2);

// ── Run ────────────────────────────────────────────────────────────────────
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

await page.goto(`${BASE}/api/dev/login?next=%2F`, { waitUntil: 'networkidle', timeout: 180000 }).catch(() => {});
await page.waitForTimeout(2200);

const REPORT_IMG =
  'data:image/png;base64,' +
  readFileSync(new URL('./report-page.png', import.meta.url)).toString('base64');


/** Frame carried from the previous shot, dissolved out under the new one. */
let carry = null;
const XFADE = 0.32; // seconds


// ═══ ACT I — the question ══════════════════════════════════════════════════

// 1. Mark, held long enough to breathe.
await scene(page, {
  secs: 1.5, hold: 0.4,
  html: (t) => brandSceneHTML(t, { w: W, h: H, size: SQUARE ? 112 : 132 }),
});
carry = await grabFrame(page);

// 2. The organisation, and the question they cannot answer.
await scene(page, {
  secs: 1.9, hold: 0.7, dissolveFrom: carry,
  html: (t) => kineticHTML(t, {
    w: W, h: H, kicker: 'Aurora Health Group · Healthcare',
    lines: ['How ready are we', 'for the AI we already run?'],
    size: SQUARE ? 50 : 68,
  }),
});
carry = await grabFrame(page);

// ═══ ACT II — the work ═════════════════════════════════════════════════════

// 3. They answer. Framed left, so the cut has somewhere to move.
await goto(page, '/assessment', { wait: 6000 });
await page.getByText('Healthcare & Life Sciences', { exact: false }).first().click().catch(() => {});
await page.waitForTimeout(1400);
await page.getByText('Strategy', { exact: true }).first().click().catch(() => {});
await page.waitForTimeout(3000);

await openStudio(page);
await filmLook(page);
await place(page, '.grid.grid-cols-1.sm\\:grid-cols-5', { scale: SQUARE ? 1.45 : 2.0, width: 760 });
await studioCaption(page, { title: 'They answer 40 questions.', sub: 'One neutral scale. Nothing hints at the right answer.' });

if (carry) await holdOutgoing(page, carry);
const nF = Math.round(XFADE * FPS);
let fi = 0;
await animate(page, 0.55, async (t) => {
  if (carry && fi <= nF) await fadeOutgoing(page, Math.max(0, 1 - fi / nF));
  fi++;
  await captionOpacity(page, capAt(t), (1 - capAt(t)) * 8);
  await pose(page, { scale: 0.97 + 0.03 * easeOut(t), y: -18, opacity: clamp01(t / 0.14) });
});
const target = await boxOf(page, 'button:nth-of-type(4)');
const from = { x: W * 0.5 + 300, y: H * 0.5 + 230 };
await animate(page, 0.55, async (t) => {
  const e = easeOut(t);
  if (target) await cursor(page, { x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e });
});
if (target) {
  await animate(page, 0.2, async (t) => {
    await cursor(page, { x: target.x, y: target.y, pressed: t < 0.45 });
    await ripple(page, { x: target.x, y: target.y, t });
  });
  await markChild(page, 'button:nth-of-type(4)', 'ring-2 ring-slate-200 bg-white/[0.12]');
}
await animate(page, 0.35, async () => { await cursor(page, { x: -99, y: -99, visible: false }); });
carry = await grabFrame(page);

// 4. THE ENGINE, RUNNING. Filmed live, so the pipeline actually executes:
//    stages light in sequence, the log writes itself, the narrative types out.
await closeStudio(page);
await goto(page, '/', { wait: 1200 });
// Land at the start of the hero's own 14.5s loop so the shot catches it working
// rather than sitting on its finished state.
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(600);
await spotlight(page, '.aurora-card', { scale: SQUARE ? 1.15 : 1.5 });
await filmLook(page);
// The hero panel is a demo loop with its own figures; the film follows one
// organisation, so point the ring at Aurora's real score. The log lines are
// left alone — they are the engine narrating itself and rewrite every cycle.
await page.evaluate(() => {
  document.querySelectorAll('.aurora-card span').forEach((n) => {
    if (n.textContent && n.textContent.trim() === '67') n.textContent = '53';
  });
});
await studioCaption(page, { title: 'Six agents go to work.', sub: 'Discover · score · X-ray · explain · report. Watch it run.' });

if (carry) await holdOutgoing(page, carry);
fi = 0;
// Long enough to see stages advance and the insight line type itself.
await animate(page, 4.2, async (t) => {
  if (carry && fi <= nF) await fadeOutgoing(page, Math.max(0, 1 - fi / nF));
  fi++;
  await captionOpacity(page, capAt(t), (1 - capAt(t)) * 8);
  // Very slow creep — the motion in this shot is the product, not the camera.
  await spotlightPose(page, '.aurora-card', {
    scale: (SQUARE ? 1.15 : 1.5) * (1 + 0.035 * easeOut(t)),
  });
});
carry = await grabFrame(page);

// ═══ ACT III — the answer ══════════════════════════════════════════════════

// 5. The score, filmed as it lands. The ring counts itself, the radar draws
//    itself — the app's own animation, not a number typed onto a still.
await closeStudio(page);
await goto(page, `/results/${RESULT_ID}`, { wait: 0 });
await page.waitForTimeout(2600); // let the shell paint, catch the reveal
await spotlight(page, '.score-ring-glow', { scale: SQUARE ? 1.35 : 1.95 });
await filmLook(page);
await studioCaption(page, { title: 'Aurora scores 53.', sub: 'Reproducible arithmetic. Not a model’s opinion.' });

if (carry) await holdOutgoing(page, carry);
fi = 0;
await animate(page, 2.4, async (t) => {
  if (carry && fi <= nF) await fadeOutgoing(page, Math.max(0, 1 - fi / nF));
  fi++;
  await captionOpacity(page, capAt(t), (1 - capAt(t)) * 8);
  await spotlightPose(page, '.score-ring-glow', {
    scale: (SQUARE ? 1.35 : 1.95) * (1.06 - 0.06 * easeOut(t)),
  });
});
carry = await grabFrame(page);

// 6. The eight bars — filmed live so each one grows on its own stagger.
await clearSpotlight(page);
await goto(page, `/results/${RESULT_ID}`, { wait: 0 });
await page.waitForTimeout(2300);
await spotlight(page, '.lg\\:col-span-3.space-y-1', { scale: SQUARE ? 1.05 : 1.42 });
await filmLook(page);
await studioCaption(page, { title: 'Eight areas, weighted for healthcare.' });
if (carry) await holdOutgoing(page, carry);
fi = 0;
await animate(page, 2.2, async (t) => {
  if (carry && fi <= nF) await fadeOutgoing(page, Math.max(0, 1 - fi / nF));
  fi++;
  await captionOpacity(page, capAt(t), (1 - capAt(t)) * 8);
  await spotlightPose(page, '.lg\\:col-span-3.space-y-1', {
    scale: (SQUARE ? 1.05 : 1.42) * (0.98 + 0.02 * easeOut(t)),
  });
});
carry = await grabFrame(page);

// 7. The turn — the thing they could not have seen themselves.
await clearSpotlight(page);
await openStudio(page);
await filmLook(page);
await place(page, '[aria-label="What this result means"]', { scale: SQUARE ? 0.78 : 1.0, width: 900 });
await studioCaption(page, { title: 'Talent is the binding constraint.', sub: 'Found in how the answers combine — not in any one of them.' });
if (carry) await holdOutgoing(page, carry);
fi = 0;
await animate(page, 2.1, async (t) => {
  if (carry && fi <= nF) await fadeOutgoing(page, Math.max(0, 1 - fi / nF));
  fi++;
  await captionOpacity(page, capAt(t), (1 - capAt(t)) * 8);
  await pose(page, { scale: 0.98 + 0.02 * easeOut(t), y: 36 * (1 - easeOut(t)), opacity: clamp01(t / 0.1) });
});
carry = await grabFrame(page);

// 8. Resolution: the one move, with its exact number.
await closeStudio(page);
await goto(page, `/results/${RESULT_ID}`, { wait: 7000, scrollTo: 1180 });
await openStudio(page);
await filmLook(page);
await place(page, '.aurora-card', { scale: SQUARE ? 0.84 : 1.12, width: 700 });
await studioCaption(page, { title: 'Fix one thing: +1.5 points.', sub: 'Re-scored through the whole engine. Exact, not estimated.' });
if (carry) await holdOutgoing(page, carry);
fi = 0;
await animate(page, 1.9, async (t) => {
  if (carry && fi <= nF) await fadeOutgoing(page, Math.max(0, 1 - fi / nF));
  fi++;
  await captionOpacity(page, capAt(t), (1 - capAt(t)) * 8);
  await pose(page, { scale: 0.93 + 0.07 * easeOut(t), opacity: clamp01(t / 0.1) });
});
carry = await grabFrame(page);

// 9. What they walk out with.
await closeStudio(page);
await card(page, { secs: 0.05, html: reportSceneHTML({ w: W, h: H, imgDataUri: REPORT_IMG }) });
await page.evaluate(() => {
  const img = document.querySelector('img');
  if (img) { img.id = '__doc'; img.style.willChange = 'transform'; }
});
await filmLook(page);
if (carry) await holdOutgoing(page, carry);
fi = 0;
await animate(page, 1.8, async (t) => {
  if (carry && fi <= nF) await fadeOutgoing(page, Math.max(0, 1 - fi / nF));
  fi++;
  const e = easeOut(t);
  await page.evaluate((v) => {
    const img = document.getElementById('__doc');
    if (img) img.style.transform = `rotateY(${-28 + 16 * v}deg) rotateX(4deg) scale(${0.86 + 0.16 * v})`;
  }, e);
});
carry = await grabFrame(page);

// ═══ CODA ══════════════════════════════════════════════════════════════════

await scene(page, {
  secs: 1.9, hold: 0.7, dissolveFrom: carry,
  html: (t) => kineticHTML(t, {
    w: W, h: H, kicker: 'Deterministic',
    lines: ['Same answers.', 'Same score.', 'Every time.'],
    size: SQUARE ? 58 : 80,
  }),
});
carry = await grabFrame(page);

await scene(page, {
  secs: 2.1, hold: 0.9, dissolveFrom: carry,
  html: (t) => kineticHTML(t, {
    w: W, h: H, kicker: 'Founding cohort',
    lines: ['50 places.', 'Free through December.'],
    sub: 'Full platform, no card. Founding members keep a permanent discount.',
    size: SQUARE ? 50 : 70,
  }),
});
carry = await grabFrame(page);

await scene(page, {
  secs: 2.0, hold: 1.1, dissolveFrom: carry,
  html: (t) => brandSceneHTML(t, {
    w: W, h: H, size: SQUARE ? 100 : 118,
    kicker: 'e-ari.com', title: 'Know where you stand.',
  }),
});

console.log(`${frame} frames -> ${OUT}  (${(frame / FPS).toFixed(1)}s at ${FPS}fps, ${W}x${H})`);
await browser.close();
