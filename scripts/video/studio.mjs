/**
 * Studio shots — motion design on live DOM.
 *
 * The first cut was screenshots of whole pages with a slow scale on top. That
 * is a screen recording, and it reads like one: nothing is composed, nothing is
 * isolated, and the eye has no idea where to look.
 *
 * These primitives lift a single real element out of the running app, drop it
 * on a clean stage, and animate it. The element keeps the app's own stylesheet,
 * so what you see is genuinely the product — just framed like a shot instead of
 * captured like a screenshot.
 */

/** Build the empty stage once, over the live page. */
export async function openStudio(page, { bg = '#080d18' } = {}) {
  await page.evaluate((bg) => {
    document.getElementById('__studio')?.remove();
    const s = document.createElement('div');
    s.id = '__studio';
    Object.assign(s.style, {
      position: 'fixed', inset: '0', zIndex: '2147483000',
      background: bg, display: 'grid', placeItems: 'center', overflow: 'hidden',
    });
    // A soft key light, so an isolated element does not float on flat black.
    const glow = document.createElement('div');
    Object.assign(glow.style, {
      position: 'absolute', width: '1200px', height: '1200px', borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(120,150,190,0.10) 0%, transparent 62%)',
      pointerEvents: 'none',
    });
    s.appendChild(glow);
    const holder = document.createElement('div');
    holder.id = '__studio_holder';
    Object.assign(holder.style, { position: 'relative', willChange: 'transform, opacity' });
    s.appendChild(holder);
    document.body.appendChild(s);

    // Any fixed-position app chrome (the assistant launcher, back-to-top) sits
    // above the stage on its own z-index and shows through an otherwise clean
    // shot. Park it for the duration.
    // Match on computed position, not on being a direct child of body: the
    // assistant launcher is nested inside the app root, so a body > * sweep
    // walks straight past it and it shows through the shot.
    const MINE = ['__studio', '__scap', '__cursor', '__ripple'];
    document.querySelectorAll('*').forEach((n) => {
      if (MINE.includes(n.id) || n.closest('#__studio')) return;
      const cs = getComputedStyle(n);
      if (cs.position === 'fixed' && cs.visibility !== 'hidden') {
        n.setAttribute('data-studio-hidden', '1');
        n.style.visibility = 'hidden';
      }
    });
  }, bg);
}

/**
 * Place a real element on the stage.
 *
 * Cloned rather than moved: the live node stays in the page so React never
 * notices, and the clone keeps every class, so the app's own CSS still paints
 * it. `scale` is applied to the clone's wrapper, not the element, so internal
 * layout stays exactly as designed.
 */
export async function place(page, selector, { scale = 1, width } = {}) {
  return page.evaluate(
    ({ selector, scale, width }) => {
      const src = document.querySelector(selector);
      const holder = document.getElementById('__studio_holder');
      if (!src || !holder) return false;
      holder.innerHTML = '';
      const clone = src.cloneNode(true);
      if (width) clone.style.width = `${width}px`;
      const wrap = document.createElement('div');
      wrap.id = '__studio_el';
      wrap.style.display = 'flex';
      wrap.style.justifyContent = 'center';
      // Remembered so pose() can compose with it. Writing a bare scale() in
      // pose() destroyed this, which silently shrank every placed element and
      // left boxOf()'s measurements pointing at coordinates that no longer
      // existed — the cursor aimed at where the button used to be.
      wrap.dataset.baseScale = String(scale);
      wrap.style.transform = `scale(${scale})`;
      wrap.style.transformOrigin = 'center center';
      wrap.appendChild(clone);
      holder.appendChild(wrap);
      return true;
    },
    { selector, scale, width },
  );
}

/** Per-frame transform on the placed element. */
export async function pose(page, { scale = 1, x = 0, y = 0, opacity = 1, blur = 0 }) {
  await page.evaluate(
    ({ scale, x, y, opacity, blur }) => {
      const el = document.getElementById('__studio_el');
      if (!el) return;
      const base = parseFloat(el.dataset.baseScale || '1');
      el.style.transform = `translate(${x}px, ${y}px) scale(${base * scale})`;
      el.style.opacity = String(opacity);
      el.style.filter = blur ? `blur(${blur}px)` : 'none';
    },
    { scale, x, y, opacity, blur },
  );
}

/**
 * A pointer. Real product films show intent — the cursor arrives, presses, and
 * the UI answers. A static screenshot of a button never shows it is a button.
 */
export async function cursor(page, { x, y, pressed = false, visible = true }) {
  await page.evaluate(
    ({ x, y, pressed, visible }) => {
      let c = document.getElementById('__cursor');
      if (!c) {
        c = document.createElement('div');
        c.id = '__cursor';
        c.innerHTML = `
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
               style="filter:drop-shadow(0 4px 10px rgba(0,0,0,0.7))">
            <path d="M5 3l14 8-6 1.6L10.5 19 5 3z" fill="#fff" stroke="#0b1020" stroke-width="1.1"
                  stroke-linejoin="round"/>
          </svg>`;
        Object.assign(c.style, { position: 'fixed', zIndex: '2147483600', pointerEvents: 'none' });
        document.body.appendChild(c);
      }
      c.style.display = visible ? 'block' : 'none';
      c.style.left = `${x}px`;
      c.style.top = `${y}px`;
      c.style.transform = pressed ? 'scale(0.82)' : 'scale(1)';

      let r = document.getElementById('__ripple');
      if (pressed) {
        if (!r) {
          r = document.createElement('div');
          r.id = '__ripple';
          Object.assign(r.style, {
            position: 'fixed', zIndex: '2147483500', pointerEvents: 'none',
            width: '64px', height: '64px', marginLeft: '-32px', marginTop: '-32px',
            borderRadius: '50%', border: '2px solid rgba(148,197,255,0.85)',
          });
          document.body.appendChild(r);
        }
        r.style.left = `${x}px`;
        r.style.top = `${y}px`;
        r.style.display = 'block';
      } else if (r) {
        r.style.display = 'none';
      }
    },
    { x, y, pressed, visible },
  );
}

export async function ripple(page, { x, y, t }) {
  await page.evaluate(
    ({ x, y, t }) => {
      const r = document.getElementById('__ripple');
      if (!r) return;
      r.style.left = `${x}px`;
      r.style.top = `${y}px`;
      r.style.display = t >= 1 ? 'none' : 'block';
      const size = 24 + 90 * t;
      r.style.width = `${size}px`;
      r.style.height = `${size}px`;
      r.style.marginLeft = `${-size / 2}px`;
      r.style.marginTop = `${-size / 2}px`;
      r.style.opacity = String(Math.max(0, 1 - t));
    },
    { x, y, t },
  );
}

/** Where a cloned child sits on screen — so the cursor can aim at it. */
export async function boxOf(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(`#__studio_el ${sel}`);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, h: b.height };
  }, selector);
}

/** Apply a class to a cloned child — used to fire the app's own hover/selected styles. */
export async function markChild(page, selector, className) {
  await page.evaluate(
    ({ selector, className }) => {
      const el = document.querySelector(`#__studio_el ${selector}`);
      if (el) el.className = `${el.className} ${className}`;
    },
    { selector, className },
  );
}

/** Set the text of a cloned child — drives count-ups on real elements. */
export async function setChildText(page, selector, text) {
  await page.evaluate(
    ({ selector, text }) => {
      const el = document.querySelector(`#__studio_el ${selector}`);
      if (el) el.textContent = text;
    },
    { selector, text },
  );
}

/** A caption pinned to the stage rather than the page. */
export async function studioCaption(page, caption) {
  await page.evaluate((c) => {
    document.getElementById('__scap')?.remove();
    if (!c) return;
    const el = document.createElement('div');
    el.id = '__scap';
    const F = "var(--font-heading, 'Space Grotesk'), 'Helvetica Neue', Helvetica, Arial, sans-serif";
    const S = "var(--font-sans, Inter), 'Helvetica Neue', Helvetica, Arial, sans-serif";
    el.innerHTML = `
      <div style="font-family:${F};font-size:38px;font-weight:600;letter-spacing:-0.025em;
                  color:#f8fafc;line-height:1.12">${c.title}</div>
      ${c.sub ? `<div style="margin-top:12px;font-family:${S};font-size:19px;color:#8b98ab;
                  line-height:1.45;max-width:620px">${c.sub}</div>` : ''}`;
    Object.assign(el.style, {
      position: 'fixed', left: '84px', bottom: '84px', zIndex: '2147483400',
      maxWidth: '720px', opacity: '0', transition: 'none',
    });
    document.body.appendChild(el);
  }, caption ?? null);
}

export async function captionOpacity(page, o, lift = 0) {
  await page.evaluate(
    ({ o, lift }) => {
      const el = document.getElementById('__scap');
      if (el) {
        el.style.opacity = String(o);
        el.style.transform = `translateY(${lift}px)`;
      }
    },
    { o, lift },
  );
}

export async function closeStudio(page) {
  await page.evaluate(() => {
    document.getElementById('__studio')?.remove();
    document.getElementById('__scap')?.remove();
    document.getElementById('__cursor')?.remove();
    document.getElementById('__ripple')?.remove();
    document.querySelectorAll('[data-studio-hidden]').forEach((n) => {
      n.style.visibility = '';
      n.removeAttribute('data-studio-hidden');
    });
  });
}

/**
 * Rewrite numbers inside a placed clone.
 *
 * The landing hero's agent panel is a demo loop with its own figures. In a film
 * that follows one organisation the whole way through, a different score in the
 * middle reads as a continuity error — so the clone is repointed at that
 * organisation's real numbers, which are already on screen everywhere else.
 */
export async function retextClone(page, pairs) {
  await page.evaluate((pairs) => {
    const root = document.getElementById('__studio_el');
    if (!root) return;
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const hits = [];
    while (walk.nextNode()) hits.push(walk.currentNode);
    hits.forEach((n) => {
      const t = n.nodeValue;
      pairs.forEach(([from, to]) => {
        if (t && t.trim() === from) n.nodeValue = t.replace(from, to);
      });
    });
  }, pairs);
}

/**
 * Cross-dissolve between shots.
 *
 * Hard cuts everywhere is what made the first cuts read as a slide deck: each
 * shot began from nothing, so nothing carried. Playwright renders frames rather
 * than compositing video, so the dissolve is done in the page — the outgoing
 * frame is pinned over the incoming one and faded out while the new shot is
 * already moving underneath it.
 *
 * grab() must be called on the last frame of the outgoing shot; hold() then
 * runs during the opening frames of the next.
 */
export async function grabFrame(page) {
  const buf = await page.screenshot({ type: 'jpeg', quality: 88 });
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

export async function holdOutgoing(page, dataUri) {
  await page.evaluate((src) => {
    document.getElementById('__xfade')?.remove();
    if (!src) return;
    const img = document.createElement('img');
    img.id = '__xfade';
    img.src = src;
    Object.assign(img.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      objectFit: 'cover', zIndex: '2147483640', pointerEvents: 'none', opacity: '1',
    });
    document.body.appendChild(img);
  }, dataUri);
}

export async function fadeOutgoing(page, opacity) {
  await page.evaluate((o) => {
    const el = document.getElementById('__xfade');
    if (!el) return;
    if (o <= 0) el.remove();
    else el.style.opacity = String(o);
  }, opacity);
}

/**
 * Vignette + a whisper of grain, applied once and left in place.
 *
 * Flat black behind an isolated element reads as a slide. A little falloff at
 * the edges gives the frame depth and makes the composition feel photographed
 * rather than assembled.
 */
export async function filmLook(page) {
  await page.evaluate(() => {
    if (document.getElementById('__look')) return;
    const v = document.createElement('div');
    v.id = '__look';
    Object.assign(v.style, {
      position: 'fixed', inset: '0', zIndex: '2147483300', pointerEvents: 'none',
      background:
        'radial-gradient(ellipse 78% 68% at 50% 46%, transparent 42%, rgba(0,0,0,0.55) 100%)',
    });
    document.body.appendChild(v);
  });
}

/**
 * Spotlight a LIVE element — the fix for everything looking static.
 *
 * place() clones. A clone is a dead snapshot: React never renders into it, so
 * framer-motion never runs, the typewriter never types, the score ring never
 * counts and the bars never fill. Every animation the product already has was
 * being stripped out at the moment of filming, which is why the UI looked
 * inert.
 *
 * This moves the real node instead. Everything else is covered by a backdrop
 * that sits *under* it, so the element keeps its place in the React tree and
 * goes on animating while the camera frames it.
 */
export async function spotlight(page, selector, { scale = 1.4, y = 0 } = {}) {
  return page.evaluate(
    ({ selector, scale, y }) => {
      const el = document.querySelector(selector);
      if (!el) return false;

      // A full-screen backdrop cannot work here: the target often sits inside a
      // framer-motion transform, which creates a stacking context, so no
      // z-index can lift it above a fixed overlay — it just gets covered.
      // Hiding its siblings up the ancestor chain isolates it without moving
      // it, so React keeps rendering into it and its animations keep running.
      let node = el;
      while (node && node !== document.body) {
        const parent = node.parentElement;
        if (!parent) break;
        Array.from(parent.children).forEach((sib) => {
          if (sib !== node && !sib.dataset.spotKeep) {
            sib.dataset.spotHidden = '1';
            sib.style.visibility = 'hidden';
          }
        });
        parent.dataset.spotKeep = '1';
        parent.dataset.spotBg = parent.style.background || '';
        parent.style.background = 'transparent';
        node = parent;
      }
      document.body.style.background = '#080d18';
      document.documentElement.style.background = '#080d18';

      const b = el.getBoundingClientRect();
      const dx = window.innerWidth / 2 - (b.x + b.width / 2);
      const dy = window.innerHeight / 2 - (b.y + b.height / 2) + y;
      el.dataset.spotlit = '1';
      el.style.transformOrigin = 'center center';
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      el.style.willChange = 'transform';
      return true;
    },
    { selector, scale, y },
  );
}

/** Re-pose the spotlit element without disturbing its own animations. */
export async function spotlightPose(page, selector, { scale, y = 0, extra = 0 }) {
  await page.evaluate(
    ({ selector, scale, y, extra }) => {
      const el = document.querySelector(selector);
      if (!el || !el.dataset.spotlit) return;
      const b = el.getBoundingClientRect();
      // Undo the current transform to measure the natural box, then re-centre.
      const prev = el.style.transform;
      el.style.transform = 'none';
      const nb = el.getBoundingClientRect();
      el.style.transform = prev;
      const dx = window.innerWidth / 2 - (nb.x + nb.width / 2);
      const dy = window.innerHeight / 2 - (nb.y + nb.height / 2) + y + extra;
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    },
    { selector, scale, y, extra },
  );
}

export async function clearSpotlight(page) {
  await page.evaluate(() => {
    document.getElementById('__backdrop')?.remove();
    document.querySelectorAll('[data-spot-hidden]').forEach((n) => {
      n.style.visibility = '';
      delete n.dataset.spotHidden;
    });
    document.querySelectorAll('[data-spot-keep]').forEach((n) => {
      n.style.background = n.dataset.spotBg || '';
      delete n.dataset.spotKeep;
      delete n.dataset.spotBg;
    });
    document.querySelectorAll('[data-spotlit]').forEach((el) => {
      el.style.transform = '';
      el.style.position = '';
      el.style.zIndex = '';
      el.style.willChange = '';
      delete el.dataset.spotlit;
    });
  });
}
