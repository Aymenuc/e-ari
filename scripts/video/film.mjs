/**
 * Designed motion film — every frame computed, nothing captured.
 *
 * Why this exists: filming the live app with page.screenshot() cannot produce
 * smooth motion. Each capture costs 100–300ms of wall clock, so "4 seconds of
 * video" samples 25–40 seconds of real time at irregular intervals. Live
 * animation recorded that way is time-warped and stuttering no matter how
 * correct the code is, and holding a final state repeats one still frame for a
 * second at a time.
 *
 * Here the whole frame is a pure function of t. Frame 42 IS t = 1.400s. Motion
 * is exact, easing is real, and nothing can freeze unless it is written to.
 *
 * Every number is Aurora Health Group's real result, and every colour and type
 * choice is lifted from the product's own tokens — so this is a faithful
 * recreation of the UI, not an invention of it.
 */

// ── Aurora Health Group, from the database ─────────────────────────────────
export const AURORA = {
  org: 'Aurora Health Group',
  sector: 'Healthcare',
  score: 53,
  pillars: [
    { name: 'Strategy & Vision', v: 63, status: 'adequate' },
    { name: 'Data & Infrastructure', v: 35, status: 'below halfway' },
    { name: 'Technology & Tools', v: 60, status: 'adequate' },
    { name: 'Talent & Skills', v: 20, status: 'needs work now' },
    { name: 'Governance & Ethics', v: 70, status: 'adequate' },
    { name: 'Culture & Change', v: 45, status: 'below halfway' },
    { name: 'Process & Operations', v: 45, status: 'below halfway' },
    { name: 'Security & Compliance', v: 80, status: 'strong' },
  ],
  gain: 1.5,
};

// ── Design tokens, from globals.css ────────────────────────────────────────
const BG = '#080d18';
const NAVY = '#0a1024';
const PANEL = 'rgba(22,27,34,0.55)';
const TEXT = '#f8fafc';
const MUTED = '#8b98ab';
const DIM = '#5b6b83';
const HAIR = 'rgba(255,255,255,0.08)';

const HEAD = "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif";
const SANS = "'Inter', 'Helvetica Neue', Arial, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

/** The product's score ramp: dim steel at 40, bright sky at 85. */
export function ramp(v) {
  const t = Math.max(0, Math.min(1, (v - 40) / 45));
  const c = (a, b) => Math.round(a + (b - a) * t);
  return `rgb(${c(0x3a, 0x38)}, ${c(0x52, 0xbd)}, ${c(0x74, 0xf8)})`;
}

// ── Easing ────────────────────────────────────────────────────────────────
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInOut = (t) =>
  clamp01(t) < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * clamp01(t) + 2, 3) / 2;
/** Slight overshoot — gives an arrival some weight. */
export const backOut = (t) => {
  const c = 1.70158, x = clamp01(t) - 1;
  return 1 + (c + 1) * x * x * x + c * x * x;
};

/** Window a global time into a local 0..1 for one element. */
export const at = (t, start, dur) => clamp01((t - start) / dur);

// ── Shared chrome ─────────────────────────────────────────────────────────
export function shell(inner, { w, h, vignette = true }) {
  return `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:${w}px;height:${h}px;background:${BG};overflow:hidden;
       font-family:${SANS};-webkit-font-smoothing:antialiased}
  .stage{position:absolute;inset:0}
</style>
<div class="stage">${inner}</div>
${vignette ? `<div style="position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(ellipse 80% 70% at 50% 46%, transparent 40%, rgba(0,0,0,0.6) 100%)"></div>` : ''}`;
}

/** Caption anchored bottom-left, rising in. */
export function caption(t, { title, sub, w }) {
  const a = easeOut(at(t, 0, 0.4));
  return `
  <div style="position:absolute;left:${w < 1200 ? 56 : 84}px;bottom:${w < 1200 ? 64 : 84}px;
              max-width:${w * 0.55}px;opacity:${a};transform:translateY(${(1 - a) * 14}px)">
    <div style="font-family:${HEAD};font-size:${w < 1200 ? 30 : 38}px;font-weight:600;
                letter-spacing:-0.025em;color:${TEXT};line-height:1.12">${title}</div>
    ${sub ? `<div style="margin-top:11px;font-size:${w < 1200 ? 16 : 19}px;color:${MUTED};
                line-height:1.45">${sub}</div>` : ''}
  </div>`;
}

// ── SCENE: the mark drawing itself ────────────────────────────────────────
export function sceneLogo(t, { w, h, kicker, title, size = 132 }) {
  const u = size / 48;
  const bars = [
    { y: 0, wf: 1.0, o: 1.0 },
    { y: 1, wf: 0.583, o: 0.62 },
    { y: 2, wf: 1.0, o: 0.35 },
  ]
    .map((b, i) => {
      const p = easeOut(at(t, i * 0.14, 0.44));
      return `<div style="position:absolute;left:${12 * u}px;top:${(13 + b.y * 9) * u}px;
        width:${24 * u * b.wf * p}px;height:${4 * u}px;border-radius:${1.2 * u}px;
        background:${TEXT};opacity:${b.o}"></div>`;
    })
    .join('');

  const wp = easeOut(at(t, 0.48, 0.5));
  const tp = easeOut(at(t, 0.72, 0.42));

  return shell(`
    <div style="position:absolute;inset:0;display:grid;place-items:center">
      <div style="text-align:center">
        <div style="display:flex;align-items:center;justify-content:center">
          <div style="position:relative;width:${size}px;height:${size}px;border-radius:${11 * u}px;
                      background:${NAVY};border:1px solid rgba(38,49,77,0.9);
                      box-shadow:0 30px 80px -30px rgba(0,0,0,0.9)">${bars}</div>
          <div style="margin-left:${26 * u}px;font-family:${HEAD};font-size:${size * 0.46}px;
                      font-weight:600;letter-spacing:-0.02em;color:${TEXT};
                      opacity:${wp};transform:translateX(${(1 - wp) * -16}px)">E-ARI</div>
        </div>
        ${title ? `<div style="margin-top:${size * 0.4}px;opacity:${tp};
            transform:translateY(${(1 - tp) * 12}px)">
            ${kicker ? `<div style="font-family:${MONO};font-size:13px;letter-spacing:0.3em;
                text-transform:uppercase;color:${DIM};margin-bottom:16px">${kicker}</div>` : ''}
            <div style="font-family:${HEAD};font-size:${size * 0.34}px;font-weight:600;
                 letter-spacing:-0.03em;color:${TEXT}">${title}</div>
          </div>` : ''}
      </div>
    </div>`, { w, h, vignette: false });
}

// ── SCENE: kinetic statement ──────────────────────────────────────────────
export function sceneStatement(t, { w, h, kicker, lines, sub, size }) {
  const fs = size ?? (w < 1200 ? 62 : 88);
  const kp = easeOut(at(t, 0, 0.28));
  const rows = lines
    .map((l, i) => {
      const p = easeOut(at(t, 0.12 + i * 0.12, 0.46));
      return `<div style="overflow:hidden;height:${fs * 1.12}px">
        <div style="font-family:${HEAD};font-size:${fs}px;font-weight:600;letter-spacing:-0.04em;
             color:${TEXT};line-height:1.12;white-space:nowrap;
             transform:translateY(${(1 - p) * 105}%)">${l}</div></div>`;
    })
    .join('');
  const sp = easeOut(at(t, 0.5, 0.42));
  return shell(`
    <div style="position:absolute;inset:0;display:grid;place-items:center">
      <div style="text-align:center;padding:0 70px">
        ${kicker ? `<div style="font-family:${MONO};font-size:13px;letter-spacing:0.3em;
            text-transform:uppercase;color:${DIM};margin-bottom:22px;opacity:${kp}">${kicker}</div>` : ''}
        ${rows}
        ${sub ? `<div style="margin-top:22px;font-size:${w < 1200 ? 17 : 20}px;color:${MUTED};
             line-height:1.45;max-width:660px;margin-inline:auto;opacity:${sp};
             transform:translateY(${(1 - sp) * 12}px)">${sub}</div>` : ''}
      </div>
    </div>`, { w, h, vignette: false });
}

// ── SCENE: the Likert row, with a cursor that presses it ──────────────────
export function sceneLikert(t, { w, h }) {
  const OPTS = [
    ['1', 'Strongly Disagree'], ['2', 'Disagree'], ['3', 'Neutral'],
    ['4', 'Agree'], ['5', 'Strongly Agree'],
  ];
  const bw = w < 1200 ? 176 : 250;
  const gap = 14;
  const totalW = bw * 5 + gap * 4;
  const left = (w - totalW) / 2;
  const top = h / 2 - 62;

  // Cursor: travels 0.35→0.95, presses at 1.0, release 1.15
  const travel = easeInOut(at(t, 0.35, 0.6));
  const tx = left + bw * 3 + bw / 2;
  const ty = top + 62;
  const cx = (w * 0.5 + 300) + (tx - (w * 0.5 + 300)) * travel;
  const cy = (h * 0.5 + 240) + (ty - (h * 0.5 + 240)) * travel;
  const pressed = t >= 0.98 && t < 1.12;
  const selected = t >= 1.02;

  const rip = at(t, 0.98, 0.5);
  const ripple = rip > 0 && rip < 1
    ? `<div style="position:absolute;left:${tx}px;top:${ty}px;width:${26 + 120 * rip}px;
         height:${26 + 120 * rip}px;margin-left:${-(26 + 120 * rip) / 2}px;
         margin-top:${-(26 + 120 * rip) / 2}px;border-radius:50%;
         border:2px solid rgba(148,197,255,${(1 - rip) * 0.9})"></div>` : '';

  const cards = OPTS.map(([n, label], i) => {
    const p = easeOut(at(t, 0.05 + i * 0.045, 0.5));
    const sel = selected && i === 3;
    return `<div style="position:absolute;left:${left + i * (bw + gap)}px;top:${top}px;
      width:${bw}px;height:124px;border-radius:14px;
      background:${sel ? 'rgba(255,255,255,0.12)' : `rgba(255,255,255,${0.015 + i * 0.005})`};
      border:1px solid ${sel ? 'rgba(226,232,240,0.85)' : HAIR};
      box-shadow:${sel ? '0 0 0 3px rgba(226,232,240,0.16)' : 'none'};
      display:grid;place-items:center;
      opacity:${p};transform:translateY(${(1 - p) * 22}px) scale(${sel ? 1.045 : 1});
      transition:none">
      <div style="text-align:center">
        <div style="font-family:${HEAD};font-size:30px;font-weight:600;
             color:${sel ? '#fff' : '#94a3b8'}">${n}</div>
        <div style="margin-top:7px;font-size:13.5px;color:${sel ? '#e2e8f0' : MUTED}">${label}</div>
      </div>
    </div>`;
  }).join('');

  const cursor = t > 0.3 && t < 1.5 ? `
    <div style="position:absolute;left:${cx}px;top:${cy}px;
                transform:scale(${pressed ? 0.82 : 1});filter:drop-shadow(0 4px 10px rgba(0,0,0,0.75))">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
        <path d="M5 3l14 8-6 1.6L10.5 19 5 3z" fill="#fff" stroke="#0b1020"
              stroke-width="1.1" stroke-linejoin="round"/>
      </svg>
    </div>` : '';

  return shell(`${cards}${ripple}${cursor}
    ${caption(t - 0.1, { title: 'They answer 40 questions.', sub: 'One neutral scale. Nothing hints at the right answer.', w })}`,
    { w, h });
}

// ── SCENE: the agent pipeline, executing ──────────────────────────────────
export function scenePipeline(t, { w, h }) {
  const STAGES = ['Discover', 'Score', 'Insight', 'Report'];
  const LOG = [
    [0.55, 'ok', '6 sources · entity classified · sector locked'],
    [0.95, 'run', 'scoring — 40 signals → 8 pillars (deterministic)'],
    [1.45, 'ok', 'sector weights applied · baseline 52 → 53'],
    [1.95, 'warn', 'X-RAY P-02 · Ambition Gap — strategy 63 vs talent 20'],
    [2.45, 'run', 'insight — grounding narrative in findings'],
  ];
  const TONE = { run: MUTED, ok: '#6ee7b7', warn: '#fbbf24' };
  const MARK = { run: '▸', ok: '✓', warn: '⚠' };

  const pw = Math.min(w - 120, 1060);
  const px = (w - pw) / 2;
  const py = h / 2 - 250;
  const enter = easeOut(at(t, 0, 0.5));

  // Stage lights advance every 0.62s; connectors fill between them.
  const active = Math.min(3, Math.floor(at(t, 0.3, 1) * 0 + (t - 0.3) / 0.62));
  const rail = STAGES.map((s, i) => {
    const on = i <= active;
    const cxp = px + 34 + i * ((pw - 90) / 3);
    const fill = clamp01(((t - 0.3) - i * 0.62) / 0.5);
    const line = i < 3 ? `<div style="position:absolute;left:${cxp + 96}px;top:${py + 62}px;
        width:${(pw - 90) / 3 - 106}px;height:1.5px;background:rgba(148,163,184,0.14)">
        <div style="height:100%;width:${fill * 100}%;
             background:linear-gradient(90deg,rgba(148,163,184,0.5),rgba(226,232,240,0.75))"></div>
      </div>` : '';
    return `${line}
      <div style="position:absolute;left:${cxp}px;top:${py + 46}px;display:flex;align-items:center;gap:9px">
        <div style="width:32px;height:32px;border-radius:9px;
             border:1px solid ${on ? 'rgba(226,232,240,0.55)' : 'rgba(148,163,184,0.14)'};
             background:${on ? 'rgba(226,232,240,0.12)' : 'rgba(148,163,184,0.03)'};
             display:grid;place-items:center;color:${on ? TEXT : '#475569'};font-size:13px">●</div>
        <div style="font-family:${MONO};font-size:11.5px;letter-spacing:0.16em;text-transform:uppercase;
             color:${on ? TEXT : '#475569'}">${s}</div>
      </div>`;
  }).join('');

  const rows = LOG.filter(([s]) => t >= s).map(([s, tone, text], i) => {
    const p = easeOut(at(t, s, 0.3));
    return `<div style="font-family:${MONO};font-size:14px;line-height:1.95;color:${TONE[tone]};
      opacity:${p};transform:translateY(${(1 - p) * 6}px)">
      <span style="opacity:0.75">${MARK[tone]}</span> ${text}</div>`;
  }).join('');

  // The insight line types out, character by character.
  const TYPED = 'Talent (20) constrains execution. Highest-leverage move: +1.5 pts.';
  const nch = Math.floor(clamp01((t - 2.75) / 1.15) * TYPED.length);
  const typed = t > 2.75 ? `<div style="font-family:${MONO};font-size:14px;line-height:1.95;
      color:#7dd3fc;margin-top:2px"><span style="opacity:0.6">│</span> ${TYPED.slice(0, nch)}<span
      style="display:inline-block;width:7px;height:14px;background:#7dd3fc;
      opacity:${Math.floor(t * 6) % 2 ? 0.9 : 0.25};transform:translateY(2px)"></span></div>` : '';

  // The ring fills as scoring completes.
  const rp = easeOut(at(t, 1.0, 1.5));
  const R = 46, C = 2 * Math.PI * R;

  return shell(`
    <div style="position:absolute;left:${px}px;top:${py}px;width:${pw}px;height:420px;
                border-radius:18px;background:${PANEL};border:1px solid ${HAIR};
                box-shadow:0 40px 90px -40px rgba(0,0,0,0.85);
                opacity:${enter};transform:translateY(${(1 - enter) * 26}px)">
      <div style="display:flex;align-items:center;gap:11px;padding:15px 22px;border-bottom:1px solid ${HAIR}">
        <span style="width:7px;height:7px;border-radius:50%;background:#34d399;
              box-shadow:0 0 10px rgba(52,211,153,0.7)"></span>
        <span style="font-family:${MONO};font-size:11.5px;letter-spacing:0.18em;text-transform:uppercase;
              color:${DIM}">Live assessment · agent pipeline</span>
        <span style="margin-left:auto;font-family:${MONO};font-size:11.5px;color:#475569">v5.3</span>
      </div>
    </div>
    ${rail}
    <div style="position:absolute;left:${px + 34}px;top:${py + 118}px;opacity:${enter}">
      <svg width="112" height="112" viewBox="0 0 112 112">
        <circle cx="56" cy="56" r="${R}" fill="none" stroke="rgba(48,57,74,0.5)" stroke-width="6"/>
        <circle cx="56" cy="56" r="${R}" fill="none" stroke="${ramp(AURORA.score)}" stroke-width="6"
                stroke-linecap="round" stroke-dasharray="${C}"
                stroke-dashoffset="${C - C * (AURORA.score / 100) * rp}"
                transform="rotate(-90 56 56)"/>
        <text x="56" y="54" text-anchor="middle" dominant-baseline="middle"
              font-family="${HEAD}" font-size="27" font-weight="600" fill="${TEXT}">${Math.round(AURORA.score * rp)}</text>
        <text x="56" y="74" text-anchor="middle" font-family="${MONO}" font-size="8"
              letter-spacing="1.4" fill="#64748b">E-ARI SCORE</text>
      </svg>
    </div>
    <div style="position:absolute;left:${px + 186}px;top:${py + 116}px;width:${pw - 220}px;opacity:${enter}">
      ${rows}${typed}
    </div>
    ${caption(t - 0.25, { title: 'Six agents go to work.', sub: 'Discover · score · X-ray · explain · report. Every step auditable.', w })}`,
    { w, h });
}

// ── SCENE: the score, drawn ───────────────────────────────────────────────
export function sceneScore(t, { w, h }) {
  const R = w < 1200 ? 150 : 190;
  const C = 2 * Math.PI * R;
  const p = easeOut(at(t, 0.15, 1.5));
  const shown = Math.round(AURORA.score * p);
  const s = 0.92 + 0.08 * easeOut(at(t, 0, 1.2));
  const size = R * 2 + 70;

  // Three pillar chips orbit in, the way the results page shows them.
  const chips = [
    { label: 'Security', v: 80, a: -0.75 },
    { label: 'Governance', v: 70, a: 2.35 },
    { label: 'Strategy', v: 63, a: 1.15 },
  ].map((c, i) => {
    const cp = easeOut(at(t, 0.9 + i * 0.14, 0.5));
    const rad = R + 46;
    const x = w / 2 + Math.cos(c.a) * rad, y = h / 2 + Math.sin(c.a) * rad;
    return `<div style="position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%) scale(${cp});
      opacity:${cp};padding:7px 13px;border-radius:999px;background:rgba(13,17,23,0.9);
      border:1px solid ${HAIR};font-family:${MONO};font-size:12px;color:${MUTED};white-space:nowrap">
      <span style="color:${ramp(c.v)}">●</span> ${c.label} <b style="color:${TEXT}">${c.v}%</b></div>`;
  }).join('');

  return shell(`
    <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(${s})">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${R}" fill="none"
                stroke="rgba(148,163,184,0.1)" stroke-width="14"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${R}" fill="none" stroke="${ramp(AURORA.score)}"
                stroke-width="14" stroke-linecap="round" stroke-dasharray="${C}"
                stroke-dashoffset="${C - C * (AURORA.score / 100) * p}"
                transform="rotate(-90 ${size / 2} ${size / 2})"/>
        <text x="${size / 2}" y="${size / 2 - 8}" text-anchor="middle" dominant-baseline="middle"
              font-family="${HEAD}" font-size="${R * 0.72}" font-weight="600" fill="${TEXT}">${shown}</text>
        <text x="${size / 2}" y="${size / 2 + R * 0.42}" text-anchor="middle"
              font-family="${SANS}" font-size="19" fill="${MUTED}">out of 100</text>
      </svg>
    </div>
    ${chips}
    ${caption(t - 0.2, { title: `${AURORA.org} scores ${AURORA.score}.`, sub: 'Reproducible arithmetic. Not a model’s opinion.', w })}`,
    { w, h });
}

// ── SCENE: eight bars, staggered ──────────────────────────────────────────
export function sceneBars(t, { w, h }) {
  const rowW = Math.min(w - 140, 940);
  const x = (w - rowW) / 2;
  const y0 = h / 2 - 200;
  const barX = w < 1200 ? 210 : 260;
  const barW = rowW - barX - 190;

  const rows = AURORA.pillars.map((p, i) => {
    const a = easeOut(at(t, 0.1 + i * 0.075, 0.45));
    const f = easeOut(at(t, 0.22 + i * 0.075, 0.7));
    const shown = Math.round(p.v * f);
    return `
    <div style="position:absolute;left:${x}px;top:${y0 + i * 50}px;width:${rowW}px;height:34px;
                opacity:${a};transform:translateX(${(1 - a) * 34}px)">
      <div style="position:absolute;left:0;top:7px;font-family:${HEAD};font-size:15px;
           font-weight:500;color:#cbd5e1">${p.name}</div>
      <div style="position:absolute;left:${barX}px;top:14px;width:${barW}px;height:6px;
           border-radius:99px;background:rgba(255,255,255,0.05);overflow:hidden">
        <div style="height:100%;width:${f * p.v}%;border-radius:99px;background:${ramp(p.v)}"></div>
      </div>
      <div style="position:absolute;left:${barX + barW + 22}px;top:6px;font-family:${MONO};
           font-size:15px;font-weight:600;color:${ramp(p.v)};width:34px;text-align:right">${shown}</div>
      <div style="position:absolute;left:${barX + barW + 74}px;top:8px;font-size:13px;
           color:#64748b">${p.status}</div>
    </div>`;
  }).join('');

  return shell(`${rows}
    ${caption(t - 0.15, { title: 'Eight areas, weighted for healthcare.', sub: 'Each one scored, ranked, and named in plain language.', w })}`,
    { w, h });
}

// ── SCENE: the finding, and the exact move ────────────────────────────────
export function sceneFinding(t, { w, h }) {
  const cw = Math.min(w - 140, 900);
  const x = (w - cw) / 2;
  const enter = easeOut(at(t, 0, 0.5));

  const LINES = [
    ['Where you stand', '4 of the 8 areas sit below the halfway mark, holding the overall position at 53 out of 100.'],
    ['What is holding it back', 'Talent & Skills at 20 is the binding constraint. Work in the stronger areas will not move the number while this one stays where it is.'],
    ['What a reviewer sees first', 'Data & Infrastructure is below halfway — the one most likely to invite follow-up questions.'],
  ].map(([k, v], i) => {
    const a = easeOut(at(t, 0.3 + i * 0.22, 0.5));
    return `<div style="margin-top:${i ? 22 : 0}px;opacity:${a};transform:translateY(${(1 - a) * 14}px)">
      <div style="font-family:${HEAD};font-size:13px;font-weight:600;color:#94a3b8">${k}</div>
      <div style="margin-top:5px;font-size:16.5px;line-height:1.5;color:#e2e8f0">${v}</div>
    </div>`;
  }).join('');

  return shell(`
    <div style="position:absolute;left:${x}px;top:${h / 2 - 200}px;width:${cw}px;
                padding:34px 38px;border-radius:18px;background:${PANEL};border:1px solid ${HAIR};
                opacity:${enter};transform:translateY(${(1 - enter) * 22}px)">
      <div style="font-family:${MONO};font-size:11px;letter-spacing:0.22em;text-transform:uppercase;
           color:${DIM};margin-bottom:20px">What this means</div>
      ${LINES}
    </div>
    ${caption(t - 0.2, { title: 'Talent is the binding constraint.', sub: 'Found in how the answers combine — not in any one of them.', w })}`,
    { w, h });
}

export function sceneMove(t, { w, h }) {
  const cw = Math.min(w - 160, 760);
  const x = (w - cw) / 2;
  const enter = backOut(at(t, 0, 0.6));
  const g = easeOut(at(t, 0.5, 0.9));
  const shown = (AURORA.gain * g).toFixed(1);

  return shell(`
    <div style="position:absolute;left:${x}px;top:${h / 2 - 150}px;width:${cw}px;
                padding:34px 38px;border-radius:18px;background:${PANEL};border:1px solid ${HAIR};
                opacity:${clamp01(enter)};transform:scale(${0.94 + 0.06 * clamp01(enter)})">
      <div style="font-family:${MONO};font-size:11px;letter-spacing:0.22em;text-transform:uppercase;
           color:${DIM}">Start here</div>
      <div style="margin-top:18px;font-size:19px;line-height:1.45;color:#e2e8f0">
        To what extent do non-technical teams have AI literacy sufficient to collaborate on AI initiatives?
      </div>
      <div style="margin-top:20px;display:flex;align-items:baseline;gap:12px">
        <span style="font-family:${HEAD};font-size:62px;font-weight:600;color:#6ee7b7;
              letter-spacing:-0.03em">+${shown}</span>
        <span style="font-size:19px;color:${MUTED}">points on the overall result</span>
      </div>
      <div style="margin-top:12px;font-family:${MONO};font-size:13px;color:#64748b">
        Talent &amp; Skills · re-scored through the full pipeline
      </div>
    </div>
    ${caption(t - 0.2, { title: 'Fix one thing: +1.5 points.', sub: 'Exact, not estimated — the engine re-runs for every answer.', w })}`,
    { w, h });
}

// ── SCENE: the report ─────────────────────────────────────────────────────
export function sceneReport(t, { w, h, imgDataUri }) {
  const p = easeOut(at(t, 0, 1.4));
  return shell(`
    <div style="position:absolute;inset:0;display:grid;place-items:center;perspective:1900px">
      <img src="${imgDataUri}" style="height:${h * 0.8}px;border-radius:7px;
        transform:rotateY(${-30 + 17 * p}deg) rotateX(4deg) scale(${0.86 + 0.16 * p});
        box-shadow:-46px 54px 120px -34px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.07)"/>
    </div>
    ${caption(t - 0.3, { title: 'Board-ready in one click.', sub: 'Methodology, scope and limits included. Nothing to rewrite.', w })}`,
    { w, h });
}

// ── SCENE: the report, opened ─────────────────────────────────────────────
/**
 * Two pages, fanned apart.
 *
 * A single page held at an angle only ever proves a cover exists — which is
 * the one thing a viewer already assumes. Opening to the spread shows the
 * radar and the band scale, so the shot argues that the artefact has content
 * rather than styling. The pages start stacked and separate on a curve, which
 * performs the opening instead of cutting to an already-open document.
 */
export function sceneSpread(t, { w, h, cover, inner }) {
  const p = easeOut(at(t, 0, 1.5));
  const ph = h * (w < 1200 ? 0.54 : 0.68);
  const gap = 26 * p;                 // pages part rather than appearing apart
  const lift = (1 - p) * 26;

  const leaf = (src, side) => `
    <img src="${src}" style="height:${ph}px;border-radius:5px;
      transform:translateX(${side * gap}px) translateY(${lift}px)
                rotateY(${side * (11 - 2 * p)}deg) scale(${0.9 + 0.1 * p});
      transform-origin:${side < 0 ? 'right' : 'left'} center;
      box-shadow:${side * -22}px 46px 110px -34px rgba(0,0,0,0.95),
                 0 0 0 1px rgba(255,255,255,0.07)"/>`;

  return shell(`
    <div style="position:absolute;inset:0;display:flex;align-items:center;
                justify-content:center;gap:10px;perspective:2100px;
                transform:translateY(${-h * 0.045}px)">
      ${leaf(cover, -1)}${leaf(inner, 1)}
    </div>
    ${caption(t - 0.35, {
      title: 'Board-ready in one click.',
      sub: 'Scored profile, structural findings, methodology and limits. Nothing to rewrite.', w })}`,
    { w, h });
}

// ── SCENE: sign-off ───────────────────────────────────────────────────────
/**
 * The last frame has one job: leave an address behind.
 *
 * The mark and line land first and the contact row arrives after, so the eye
 * reaches the email once it has stopped reading — a CTA that appears with the
 * logo competes with it and gets skimmed past.
 */
export function sceneEnd(t, { w, h, size = 116, title, domain, email }) {
  const u = size / 48;
  const bars = [
    { y: 0, wf: 1.0, o: 1.0 },
    { y: 1, wf: 0.583, o: 0.62 },
    { y: 2, wf: 1.0, o: 0.35 },
  ]
    .map((b, i) => {
      const p = easeOut(at(t, i * 0.12, 0.4));
      return `<div style="position:absolute;left:${12 * u}px;top:${(13 + b.y * 9) * u}px;
        width:${24 * u * b.wf * p}px;height:${4 * u}px;border-radius:${1.2 * u}px;
        background:${TEXT};opacity:${b.o}"></div>`;
    })
    .join('');

  const wp = easeOut(at(t, 0.42, 0.46));
  const tp = easeOut(at(t, 0.66, 0.42));
  const cp = easeOut(at(t, 1.05, 0.5));

  return shell(`
    <div style="position:absolute;inset:0;display:grid;place-items:center">
      <div style="text-align:center">
        <div style="display:flex;align-items:center;justify-content:center">
          <div style="position:relative;width:${size}px;height:${size}px;border-radius:${11 * u}px;
                      background:${NAVY};border:1px solid rgba(38,49,77,0.9);
                      box-shadow:0 30px 80px -30px rgba(0,0,0,0.9)">${bars}</div>
          <div style="margin-left:${26 * u}px;font-family:${HEAD};font-size:${size * 0.46}px;
                      font-weight:600;letter-spacing:-0.02em;color:${TEXT};
                      opacity:${wp};transform:translateX(${(1 - wp) * -16}px)">E-ARI</div>
        </div>
        <div style="margin-top:${size * 0.36}px;opacity:${tp};
                    transform:translateY(${(1 - tp) * 12}px)">
          <div style="font-family:${HEAD};font-size:${size * 0.34}px;font-weight:600;
               letter-spacing:-0.03em;color:${TEXT}">${title}</div>
        </div>
        <div style="margin-top:${size * 0.34}px;display:flex;align-items:center;
                    justify-content:center;gap:${w < 1200 ? 18 : 26}px;opacity:${cp};
                    transform:translateY(${(1 - cp) * 14}px)">
          <div style="font-family:${MONO};font-size:${w < 1200 ? 17 : 21}px;letter-spacing:0.02em;
                      color:${TEXT}">${domain}</div>
          <div style="width:1px;height:${w < 1200 ? 16 : 20}px;background:rgba(255,255,255,0.16)"></div>
          <div style="font-family:${MONO};font-size:${w < 1200 ? 17 : 21}px;letter-spacing:0.02em;
                      color:${MUTED}">${email}</div>
        </div>
      </div>
    </div>`, { w, h, vignette: false });
}
