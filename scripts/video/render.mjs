/**
 * Render the designed film.
 *
 * The shot list is a timeline: each entry owns a slice of the film and is a
 * pure function of local time. Nothing is captured from a live app, so nothing
 * depends on how long a screenshot took — frame 42 is exactly t = 1.400s.
 *
 * Cross-dissolves are done by rendering both scenes into one document and
 * fading the outgoing one, which is a true blend rather than a hard cut.
 *
 * Usage: node scripts/video/render.mjs <outDir> [--square]
 */
import { chromium } from 'playwright';
import { mkdirSync, rmSync, readFileSync } from 'node:fs';
import {
  sceneLogo, sceneStatement, sceneLikert, scenePipeline, sceneScore,
  sceneBars, sceneFinding, sceneMove, sceneReport, clamp01,
} from './film.mjs';

const OUT = process.argv[2] ?? '/tmp/film';
const SQUARE = process.argv.includes('--square');
const FPS = 30;
const W = SQUARE ? 1080 : 1920;
const H = 1080;
const XF = 0.34; // dissolve length, seconds

const REPORT = 'data:image/png;base64,' +
  readFileSync(new URL('./report-page.png', import.meta.url)).toString('base64');

/** Each shot: how long it runs, and how to draw it at local time t. */
const SHOTS = [
  { d: 1.9, f: (t) => sceneLogo(t, { w: W, h: H, size: SQUARE ? 112 : 134 }) },
  { d: 2.1, f: (t) => sceneStatement(t, {
      w: W, h: H, kicker: 'Aurora Health Group · Healthcare',
      lines: ['How ready are we', 'for the AI we already run?'], size: SQUARE ? 48 : 66 }) },
  { d: 2.3, f: (t) => sceneLikert(t, { w: W, h: H }) },
  { d: 4.6, f: (t) => scenePipeline(t, { w: W, h: H }) },
  { d: 2.6, f: (t) => sceneScore(t, { w: W, h: H }) },
  { d: 2.6, f: (t) => sceneBars(t, { w: W, h: H }) },
  { d: 2.5, f: (t) => sceneFinding(t, { w: W, h: H }) },
  { d: 2.4, f: (t) => sceneMove(t, { w: W, h: H }) },
  { d: 2.2, f: (t) => sceneReport(t, { w: W, h: H, imgDataUri: REPORT }) },
  { d: 2.1, f: (t) => sceneStatement(t, {
      w: W, h: H, kicker: 'Deterministic',
      lines: ['Same answers.', 'Same score.', 'Every time.'], size: SQUARE ? 56 : 78 }) },
  { d: 2.4, f: (t) => sceneStatement(t, {
      w: W, h: H, kicker: 'Founding cohort',
      lines: ['50 places.', 'Free through December.'],
      sub: 'Full platform, no card. Founding members keep a permanent discount.',
      size: SQUARE ? 48 : 68 }) },
  { d: 2.3, f: (t) => sceneLogo(t, {
      w: W, h: H, size: SQUARE ? 98 : 116,
      kicker: 'e-ari.com', title: 'Know where you stand.' }) },
];

// Absolute start time of each shot.
let clock = 0;
const marks = SHOTS.map((s) => { const start = clock; clock += s.d; return start; });
const TOTAL = clock;

/**
 * The whole frame at absolute time T.
 *
 * During a dissolve both shots are drawn and the outgoing one is faded over the
 * incoming one, so the blend is real rather than a cut.
 */
/**
 * A slow push that never stops.
 *
 * Scenes finish their entrances and then hold, which froze 45% of the first
 * designed render — a held frame repeated thirty times is a still image, which
 * is exactly the complaint that started this rebuild. A continuous drift over
 * the whole shot means no two frames are ever identical, and it doubles as the
 * slow camera creep that real product films run underneath everything.
 */
function breathe(inner, local, dur) {
  const k = dur > 0 ? local / dur : 0;
  const scale = 1 + 0.018 * k;
  const lift = -6 * k;
  return `<div style="position:absolute;inset:0;transform:scale(${scale}) translateY(${lift}px);
           transform-origin:50% 48%">${inner}</div>`;
}

function frameAt(T) {
  let i = SHOTS.length - 1;
  for (let k = 0; k < SHOTS.length; k++) if (T >= marks[k]) i = k;
  const local = T - marks[i];
  const current = breathe(SHOTS[i].f(local), local, SHOTS[i].d);

  if (i > 0 && local < XF) {
    const prev = SHOTS[i - 1];
    // The outgoing shot keeps running under the incoming one, so the dissolve
    // blends two moving images rather than a moving one over a frozen one.
    const outgoing = breathe(prev.f(prev.d + local), prev.d + local, prev.d);
    const a = 1 - clamp01(local / XF);
    return `
      <div style="position:absolute;inset:0">${current}</div>
      <div style="position:absolute;inset:0;opacity:${a}">${outgoing}</div>`;
  }
  return current;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

// Load the fonts once, then hold them for the whole render.
await page.setContent(frameAt(0));
await page.waitForLoadState('networkidle').catch(() => {});
await page.evaluate(() => document.fonts.ready).catch(() => {});
await page.waitForTimeout(900);

const total = Math.round(TOTAL * FPS);
for (let n = 0; n < total; n++) {
  await page.setContent(frameAt(n / FPS));
  await page.screenshot({ path: `${OUT}/f${String(n).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
}

console.log(`${total} frames -> ${OUT}  (${TOTAL.toFixed(1)}s at ${FPS}fps, ${W}x${H})`);
await browser.close();
