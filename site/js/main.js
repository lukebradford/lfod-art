import { Pattern, Field, nextState } from './lfod.js';
import { CATALOG, PUFFERS, byId } from './catalog.js';
import { Stage, Clock, reducedMotion, wake, paintField, COLORS } from './stage.js';
import { encodeHash, decodeHash } from './share.js';
import { parseOutcome, phrase } from './collisions.js';
import { PAIRS, TRIPLES, EVIL_EYES, THREE } from './diamonds.js';
import { QUADS, SETTLE, VANISH } from './four.js';
import * as F5 from './five.js';
import * as SL from './slow.js';
import * as RK from './rakes.js';
import * as GN from './guns.js';

const $ = (s) => document.querySelector(s);

// ---------------------------------------------------------------------------
// Hero: the monster (p19), live, on an unbounded plane, on the bit-packed Field engine.
// Tapping (or arrow keys and Enter) toggles a cell; every edit is a new beginning, so
// the counter restarts at 0 and the address bar becomes a link to that beginning.
// The field grows as the pattern does, so it stays exact on the plane, and the view
// pulls back by halves (cells stay whole device pixels) to keep every live cell in
// frame. Once a pattern overflows the frame both ways at one pixel per cell, or the
// field would pass HERO_CAP cells, it stops and says so rather than approximate.
const HERO_CAP = 48_000_000;
const PAD = 4; // grow the field before live cells come this close to its edge

function hero() {
  const canvas = $('#field');
  const stage = new Stage(canvas);
  const genEl = $('#gen'), popEl = $('#pop'), statusEl = $('#status');
  const scaleWrap = $('#hero-scale-wrap'), scaleEl = $('#hero-scale');
  const playBtn = $('#play'), shareBtn = $('#share'), hint = $('#hint');

  const monster = () => {
    const p = Pattern.fromRLE(byId.monster.rle);
    // centre the monster's 16x13 hull on the origin
    return new Pattern(p.x0 - 2, p.y0 - 1, p.w, p.h, p.data, 0);
  };
  let shared = decodeHash(location.hash);
  // what the first frame shows, and the box the opening zoom is sized for
  const opening = () => shared
    ? { p: shared, box: [Math.max(16, shared.w + 4), Math.max(13, shared.h + 4)], c: [shared.w / 2, shared.h / 2] }
    : { p: monster(), box: [16, 13], c: [0, 0.5] };

  let f = null, cs = 1, csTop = 1, cx = 0, cy = 0, halted = false, box = [16, 13];
  let cursor = null; // keyboard cursor cell, while the canvas has keyboard focus

  const topSize = () => {
    const { W, H } = stage;
    const frac = W / stage.dpr < 600 ? 0.66 : 0.5;
    return Math.max(2, Math.floor(Math.min((W * frac) / box[0], (H * frac) / box[1])));
  };
  const ox = () => Math.round(stage.W / 2 - cx * cs);
  const oy = () => Math.round(stage.H * 0.47 - cy * cs);
  // how the live cells sit in the frame: [overflows horizontally, overflows vertically]
  const overflow = (b) => {
    const X = ox(), Y = oy();
    return [b.x0 * cs + X < 0 || (b.x1 + 1) * cs + X > stage.W, b.y0 * cs + Y < 0 || (b.y1 + 1) * cs + Y > stage.H];
  };

  function begin() {
    const o = opening();
    box = o.box; [cx, cy] = o.c;
    f = Field.around(o.p, 64);
    csTop = cs = topSize();
    halted = false;
    setStatus('');
    canvas.setAttribute('aria-label', shared
      ? `An exact Live Free or Die simulation of a shared beginning of ${shared.population} cells. Tap, or use the arrow keys and Enter, to place cells.`
      : 'An exact Live Free or Die simulation. A period-19 oscillator called the monster. Tap, or use the arrow keys and Enter, to place cells.');
    shareBtn.hidden = !shared;
    draw();
  }

  // grow the field so that every live cell, and (x, y) if given, is at least PAD from its edge
  function room(x, y) {
    const b = f.bounds();
    let x0 = b ? b.x0 : x, x1 = b ? b.x1 : x, y0 = b ? b.y0 : y, y1 = b ? b.y1 : y;
    if (x !== undefined) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (x0 === undefined) return true;
    const l = PAD - (x0 - f.x0), r = PAD - (f.x0 + f.w - 1 - x1);
    const t = PAD - (y0 - f.y0), btm = PAD - (f.y0 + f.h - 1 - y1);
    if (l <= 0 && r <= 0 && t <= 0 && btm <= 0) return true;
    // grow generously (half again) so this happens rarely
    const gx = Math.max(64, f.w >> 1), gy = Math.max(64, f.h >> 1);
    const L = l > 0 ? Math.max(l, gx) : 0, R = r > 0 ? Math.max(r, gx) : 0;
    const T = t > 0 ? Math.max(t, gy) : 0, B = btm > 0 ? Math.max(btm, gy) : 0;
    if ((f.w + L + R + 64) * (f.h + T + B) > HERO_CAP) return false;
    f = f.expanded(L, T, R, B);
    return true;
  }

  // zoom out by halves (recentring on the live cells) until they fit, if they can
  function fit() {
    const b = f.bounds();
    if (!b) return true;
    let [ovx, ovy] = overflow(b);
    while ((ovx || ovy) && cs > 1) {
      cs = Math.max(1, cs >> 1);
      cx = (b.x0 + b.x1 + 1) / 2; cy = (b.y0 + b.y1 + 1) / 2;
      [ovx, ovy] = overflow(b);
    }
    if (ovx || ovy) { cx = (b.x0 + b.x1 + 1) / 2; cy = (b.y0 + b.y1 + 1) / 2; [ovx, ovy] = overflow(b); }
    if (cs < csTop) hint.classList.add('gone'); // the pattern needs the whole frame now
    return !(ovx && ovy);
  }

  function draw() {
    const X = ox(), Y = oy();
    paintField(stage, f, cs, X, Y);
    if (cursor) {
      const { ctx, dpr } = stage, s = Math.max(cs, Math.round(10 * dpr)), off = (s - cs) / 2;
      ctx.strokeStyle = COLORS.free;
      ctx.lineWidth = Math.max(1, Math.round(1.5 * dpr));
      ctx.strokeRect(X + cursor[0] * cs - off - 0.5, Y + cursor[1] * cs - off - 0.5, s + 1, s + 1);
    }
    genEl.textContent = f.gen;
    popEl.textContent = f.population.toLocaleString('en');
    const css = cs / stage.dpr;
    scaleWrap.hidden = cs === csTop;
    scaleEl.textContent = css >= 1 ? String(Math.round(css * 10) / 10) : '1/' + Math.round(1 / css);
    // fewer generations per second while cells are big enough to follow one by one
    clock.rate = css >= 8 ? 7 : css >= 4 ? 12 : css >= 2 ? 20 : 30;
  }
  function setStatus(s) { statusEl.textContent = s; }
  function halt(msg) {
    halted = true;
    clock.setPlaying(false);
    syncButton();
    setStatus(msg);
  }

  function step() {
    if (halted) return;
    if (!room()) { halt('too large to follow exactly; stopped'); return; }
    const was = f.population;
    f.step();
    if (!fit()) { draw(); halt('still growing; it has filled the frame'); return; }
    if (f.population === 0 && was > 0) setStatus('blank again');
    draw();
  }

  const clock = new Clock(canvas, 7, step);
  const syncButton = () => {
    playBtn.textContent = clock.playing ? 'Pause' : 'Play';
    playBtn.setAttribute('aria-label', clock.playing ? 'Pause' : 'Play');
  };
  syncButton();

  playBtn.onclick = () => { if (!halted) { clock.setPlaying(!clock.playing); syncButton(); } };
  $('#step').onclick = () => { clock.setPlaying(false); syncButton(); step(); };
  $('#restore').onclick = () => {
    shared = null;
    history.replaceState(null, '', location.pathname + location.search);
    clock.setPlaying(!reducedMotion.matches); syncButton();
    begin();
  };

  // A new beginning: the cell toggled, the counter back to 0, the link updated.
  function toggle(x, y) {
    if (!room(x, y)) { setStatus('too large to follow exactly; stopped'); return; }
    f.set(x, y, f.get(x, y) ? 0 : 1);
    f.gen = 0;
    halted = false;
    setStatus('');
    hint.classList.add('gone');
    const h = encodeHash(f.toPattern());
    history.replaceState(null, '', location.pathname + location.search + (h || ''));
    shareBtn.hidden = !f.population;
    shareBtn.dataset.big = h === null ? '1' : '';
    draw();
  }

  // 'click' rather than 'pointerdown' so that swiping to scroll on a phone never places cells
  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    const px = (e.clientX - r.left) * (stage.W / r.width);
    const py = (e.clientY - r.top) * (stage.H / r.height);
    toggle(Math.floor((px - ox()) / cs), Math.floor((py - oy()) / cs));
  });

  // keyboard: arrows move a cursor, Enter or Space toggles the cell under it
  canvas.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d && e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (!cursor) cursor = [Math.floor(cx), Math.floor(cy)];
    if (d) {
      const n = e.shiftKey ? 8 : 1;
      cursor = [cursor[0] + d[0] * n, cursor[1] + d[1] * n];
      draw();
    } else toggle(cursor[0], cursor[1]);
  });
  canvas.addEventListener('focus', () => {
    if (canvas.matches(':focus-visible') && !cursor) { cursor = [Math.floor(cx), Math.floor(cy)]; draw(); }
  });
  canvas.addEventListener('blur', () => { if (cursor) { cursor = null; draw(); } });

  shareBtn.onclick = async () => {
    if (shareBtn.dataset.big) { setStatus('too large to share as a link'); return; }
    const url = location.href;
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: 'Live Free or Die · B2/S0', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setStatus('link copied');
    } catch (err) {
      if (err?.name !== 'AbortError') setStatus('copy the address bar to share');
    }
  };

  addEventListener('hashchange', () => {
    const p = decodeHash(location.hash);
    if (!p) return;
    shared = p;
    hint.classList.add('gone');
    begin();
  });

  stage.onresize = () => {
    if (!f) return;
    const top = topSize();
    if (cs === csTop) cs = top; else cs = Math.min(cs, top);
    csTop = top;
    fit();
    draw();
  };
  if (shared) {
    hint.textContent = 'A shared beginning. Restore brings back the monster.';
  }
  begin();
}

// ---------------------------------------------------------------------------
// The rule, as three tiny worked examples computed by the engine's nextState().
function laws() {
  const host = $('#laws');
  const examples = [
    { title: 'Birth', text: 'An empty cell with exactly two living neighbors comes alive.', centre: 0, nbrs: [0, 5] },
    { title: 'Freedom', text: 'A living cell with no living neighbors survives.', centre: 1, nbrs: [] },
    { title: 'Death', text: 'A living cell with any company at all dies.', centre: 1, nbrs: [2] },
  ];
  // neighbor index order around the centre (row-major, skipping the centre)
  const ring = [0, 1, 2, 3, 5, 6, 7, 8];
  for (const ex of examples) {
    const fig = document.createElement('figure');
    fig.className = 'law';
    const before = document.createElement('div');
    before.className = 'nb';
    before.setAttribute('aria-hidden', 'true');
    const on = new Set(ex.nbrs.map((i) => ring[i]));
    for (let i = 0; i < 9; i++) {
      const c = document.createElement('i');
      if (i === 4) { c.classList.add('c'); if (ex.centre) c.classList.add('on'); }
      else if (on.has(i)) c.classList.add('on');
      before.append(c);
    }
    const after = document.createElement('div');
    after.className = 'nb';
    after.setAttribute('aria-hidden', 'true');
    const n = ex.nbrs.length;
    const next = nextState(ex.centre, n);
    for (let i = 0; i < 9; i++) {
      const c = document.createElement('i');
      if (i === 4) {
        c.classList.add('c');
        if (next) c.classList.add(ex.centre ? 'free' : 'on');
      } else c.style.visibility = 'hidden';
      after.append(c);
    }
    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.textContent = '→';
    arrow.setAttribute('aria-hidden', 'true');
    const cap = document.createElement('figcaption');
    cap.innerHTML = `<b>${ex.title}</b>${ex.text}`;
    fig.append(before, arrow, after, cap);
    host.append(fig);
  }
}

// ---------------------------------------------------------------------------
// Two cells parting: a vertical domino resolves into two free ships flying apart.
// The ships fly on out of the frame (still simulated, the counter still running); once
// the nearer edge of each is PAST cells beyond the frame, it starts again from gen 0.
const PAST = 24;

function parting() {
  const canvas = $('#parting-canvas');
  const genEl = canvas.parentElement.querySelector('.stage-gen b');
  const stage = new Stage(canvas);
  const start = () => Pattern.fromCells([[0, -1], [0, 0]]);
  let cur = start(), prev = null, cs = 1, ox = 0, oy = 0, halfCells = 10;

  function layout() {
    const { W, H } = stage;
    cs = Math.max(2, Math.floor(Math.min(H / 20, W / 72)));
    ox = Math.round(W / 2 - 0.5 * cs);
    oy = Math.round(H / 2);
    halfCells = Math.ceil(W / 2 / cs);
    draw();
  }
  function draw() {
    stage.draw(cur, prev, cs, ox, oy);
    genEl.textContent = cur.gen;
  }
  // how far the innermost live cell is from the domino's column (the ships fly apart
  // along the row, so this is the distance of the nearer ship's trailing edge)
  const inner = (p) => Math.min(...p.cells().map(([x]) => Math.abs(x)));
  const clock = new Clock(canvas, 10, () => {
    if (cur.population && inner(cur) > halfCells + PAST) {
      cur = start(); prev = null; clock.hold = 500;
    } else {
      prev = cur; cur = cur.next();
    }
    draw();
  });
  canvas.addEventListener('click', () => clock.setPlaying(!clock.playing));
  stage.onresize = layout;
  layout();
}

// ---------------------------------------------------------------------------
// Bestiary cards.
function facts(e) {
  const pop = e.pop[0] === e.pop[1] ? `${e.pop[0]} cell${e.pop[0] > 1 ? 's' : ''}` : `${e.pop[0]}–${e.pop[1]} cells`;
  if (e.kind === 'still') return `still life · ${pop}`;
  if (e.kind === 'osc') return `oscillator · period ${e.period} · ${pop}`;
  const d = Math.max(Math.abs(e.dx), Math.abs(e.dy));
  const speed = d === e.period ? 'c' : `${d}c/${e.period}`;
  return `spaceship · speed ${speed} · period ${e.period} · ${pop}`;
}

function card(e) {
  const el = document.createElement('article');
  el.className = 'card';
  el.innerHTML = `
    <figure class="stage"><canvas role="img"></canvas><figcaption class="stage-gen">GEN <b>0</b></figcaption></figure>
    <div class="card-body">
      <h3></h3>
      <div class="facts"></div>
      <div class="namesrc"></div>
      <p></p>
      <details><summary>RLE</summary><pre></pre></details>
    </div>`;
  el.querySelector('h3').textContent = e.name;
  const src = el.querySelector('.namesrc');
  if (e.provisional) {
    src.textContent = 'provisional name (this site)';
  } else {
    const a = document.createElement('a');
    a.href = e.source.url;
    a.textContent = e.source.label;
    a.rel = 'noopener';
    src.append(`${e.aka ? `also “${e.aka}” · ` : ''}name from `, a);
  }
  el.querySelector('.facts').textContent = facts(e);
  el.querySelector('p').textContent = e.note;
  el.querySelector('pre').textContent = e.rle;
  const canvas = el.querySelector('canvas');
  canvas.setAttribute('aria-label', `${e.name}: ${facts(e)}`);
  const genEl = el.querySelector('.stage-gen b');
  $('#cards').append(el);

  const p0 = Pattern.fromRLE(e.rle);
  // co-moving hull over one period; velocity per generation is integer for c ships
  const vx = e.dx / e.period, vy = e.dy / e.period;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let p = p0;
  for (let g = 0; g < e.period; g++) {
    const sx = Math.round(g * vx), sy = Math.round(g * vy);
    minX = Math.min(minX, p.x0 - sx); maxX = Math.max(maxX, p.x0 + p.w - sx);
    minY = Math.min(minY, p.y0 - sy); maxY = Math.max(maxY, p.y0 + p.h - sy);
    p = p.next();
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const span = Math.max(maxX - minX, maxY - minY, 3);

  const stage = new Stage(canvas);
  let cur = p0, prev = null, cs = 1;
  function draw() {
    const { W, H } = stage;
    // integer camera offset that moves exactly with the ship (vx, vy are 0 or ±1 here)
    const camX = cx + Math.round(cur.gen * vx), camY = cy + Math.round(cur.gen * vy);
    const ox = Math.round(W / 2 - camX * cs), oy = Math.round(H / 2 - camY * cs);
    stage.draw(cur, prev, cs, ox, oy);
    genEl.textContent = cur.gen;
  }
  stage.onresize = () => {
    cs = Math.max(2, Math.floor(Math.min(stage.W, stage.H) / (span + 6)));
    cs = Math.min(cs, Math.floor(stage.W / 7));
    draw();
  };
  stage.onresize();
  const rate = e.period >= 12 ? 8 : e.kind === 'ship' ? 6 : 4;
  const clock = new Clock(canvas, rate, () => { prev = cur; cur = cur.next(); draw(); });
  canvas.parentElement.addEventListener('click', () => clock.setPlaying(!clock.playing));
}

// ---------------------------------------------------------------------------
// Wakes: puffers, each in a strip whose camera moves with it at exactly one cell per
// generation (the speed of light), so its frozen trail streams out to the left. One
// clock steps every strip together. Each strip opens already full: it starts at the
// generation whose trail just spans the strip, shown on its counter, and returns
// there (counter visibly jumping back) after RUN generations.
const RUN = 1800;
const AHEAD = 3; // empty cells shown in front of the puffer (nothing can outrun c)

function wakes() {
  const host = $('#strips');
  if (!host) return;
  const strips = PUFFERS.map((e) => {
    const rows = e.band[1] - e.band[0] + 1;
    const el = document.createElement('article');
    el.className = 'strip';
    el.innerHTML = `
      <div class="strip-head"><h3></h3><span class="facts"></span><span class="strip-gen">GEN <b>0</b></span></div>
      <figure class="stage"><canvas role="img"></canvas></figure>
      <p class="strip-note"></p>`;
    const wake = Object.entries(e.wake).map(([k, v]) => `${v} ${k}${v > 1 ? 's' : ''}`).join(' and ');
    const facts = `period ${e.period} · speed c · ${e.pop0} cells · leaves ${wake} every ${e.period} generations`;
    el.querySelector('h3').textContent = e.name;
    el.querySelector('.facts').textContent = facts;
    const note = el.querySelector('.strip-note');
    const a = document.createElement('a');
    a.href = e.source.url; a.textContent = 'glossary'; a.rel = 'noopener';
    note.append(e.note + ' ', a);
    const canvas = el.querySelector('canvas');
    canvas.setAttribute('aria-label', `${e.name}: ${facts}.`);
    // one blank row above and below the band it can ever occupy
    el.querySelector('.stage').style.setProperty('--rows', rows + 2);
    host.append(el);

    const s = { e, stage: new Stage(canvas), genEl: el.querySelector('.strip-gen b'), P0: Pattern.fromRLE(e.rle) };
    s.front0 = s.P0.x0 + s.P0.w - 1;
    s.cur = s.P0; s.prev = null; s.start = null; s.cs = 2;
    s.layout = () => {
      const { W, H, dpr } = s.stage;
      const css = parseFloat(getComputedStyle(canvas.parentElement).getPropertyValue('--cs')) || 5;
      s.cs = Math.max(2, Math.floor(css * dpr));
      if (!s.start) {
        // open with the trail spanning the strip
        const g0 = Math.ceil(W / s.cs);
        let p = s.P0, q = null;
        for (let g = 0; g < g0; g++) { q = p; p = p.next(); }
        s.start = { cur: p, prev: q };
        s.cur = p; s.prev = q;
      }
      s.oy = Math.round((H - rows * s.cs) / 2 - e.band[0] * s.cs);
      draw(s);
    };
    s.stage.onresize = s.layout;
    return s;
  });

  function draw(s) {
    const { W } = s.stage;
    // the camera moves exactly one cell per generation with the puffer
    const ox = W - (AHEAD + 1) * s.cs - (s.front0 + s.cur.gen) * s.cs;
    s.stage.draw(s.cur, s.prev, s.cs, ox, s.oy);
    s.genEl.textContent = s.cur.gen;
  }

  for (const s of strips) s.layout();
  const clock = new Clock(host, 10, () => {
    for (const s of strips) {
      if (!s.start) continue;
      if (s.cur.gen >= s.start.cur.gen + RUN) { s.cur = s.start.cur; s.prev = s.start.prev; }
      else { s.prev = s.cur; s.cur = s.cur.next(); }
      draw(s);
    }
  });
  host.addEventListener('click', () => clock.setPlaying(!clock.playing));
}

// ---------------------------------------------------------------------------
// Rakes: puffers whose trail is ships (rakes.js; every field checked by
// tests/rakes.test.mjs). Each strip's camera moves with its rake at the speed of light,
// like the Wakes. Moons fired backwards fly at c the other way, so they stream out of the
// strip at two cells a generation; the free rake's ships fly straight up at c, so against
// the moving camera they climb away at forty-five degrees. The backflip's checkers are
// frozen, so they stream out at one. Each strip opens with its stream already spanning
// it, and starts over (counter visibly jumping back) after RAKE_RUN generations.
const RAKE_RUN = 900;
const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen'];

function rakes() {
  const host = $('#rstrips');
  if (!host) return;
  const fill = (cls, v) => { for (const el of document.querySelectorAll(cls)) el.textContent = v; };
  fill('.n-rakes', NUM[RK.RAKES.length]);
  fill('.n-rakes-moon', NUM[RK.RAKES.filter((e) => 'moon' in e.fires).length]);
  const strips = RK.ALL.map((e) => {
    const up = e.dir === RK.UP;
    const band = e.band[1] - e.band[0] + 1;
    const rows = up ? band + 48 : band + 2; // the free rake's strip is tall: its ships climb out of the top
    const el = document.createElement('article');
    el.className = 'strip';
    el.innerHTML = `
      <div class="strip-head"><h3></h3><span class="facts"></span><span class="strip-gen">GEN <b>0</b></span></div>
      <figure class="stage"><canvas role="img"></canvas></figure>
      <p class="strip-note"></p>`;
    const list = (o) => Object.entries(o).map(([k, v]) => `${v} ${k === 'freeship' ? 'free ship' : k}${v > 1 ? 's' : ''}`).join(' and ');
    const fires = Object.keys(e.fires).length ? `fires ${list(e.fires)} ${up ? 'sideways' : 'backward'}` : '';
    const wake = Object.keys(e.wake).length ? `leaves ${list(e.wake)}` : '';
    const facts = `period ${e.period} · speed c · ${e.pop0} cells · ${[fires, wake].filter(Boolean).join(', ')} every ${e.period} generations`;
    el.querySelector('h3').textContent = e.name;
    el.querySelector('.facts').textContent = facts;
    const note = el.querySelector('.strip-note');
    const a = document.createElement('a');
    a.href = e.source.url; a.textContent = 'glossary'; a.rel = 'noopener';
    note.append(e.note + ' ', a);
    const canvas = el.querySelector('canvas');
    canvas.setAttribute('aria-label', `${e.name}: ${facts}.`);
    el.querySelector('.stage').style.setProperty('--rows', rows);
    host.append(el);

    const s = { e, up, rows, stage: new Stage(canvas), genEl: el.querySelector('.strip-gen b'), P0: Pattern.fromRLE(e.rle) };
    s.front0 = s.P0.x0 + s.P0.w - 1;
    // how fast the stream crosses the strip, in cells a generation, against the camera
    s.rel = up ? 1 : Object.keys(e.fires).length ? 2 : 1;
    s.cur = s.P0; s.prev = null; s.start = null; s.cs = 2;
    s.layout = () => {
      const { W, H, dpr } = s.stage;
      const css = parseFloat(getComputedStyle(canvas.parentElement).getPropertyValue('--cs')) || 5;
      s.cs = Math.max(2, Math.floor(css * dpr));
      if (!s.start) {
        // open with the stream spanning the strip: across it, or (free rake) up to its top
        const span = up ? rows - band : Math.ceil(W / s.cs);
        const g0 = e.settle + Math.ceil(span / s.rel);
        let p = s.P0, q = null;
        for (let g = 0; g < g0; g++) { q = p; p = p.next(); }
        s.start = { cur: p, prev: q };
        s.cur = p; s.prev = q;
      }
      // the engine's band sits at the bottom of a tall strip, centred in a low one
      s.oy = up ? H - s.cs - (e.band[1] + 1) * s.cs : Math.round((H - band * s.cs) / 2 - e.band[0] * s.cs);
      draw(s);
    };
    s.stage.onresize = s.layout;
    return s;
  });

  function draw(s) {
    const { W } = s.stage;
    // the camera moves exactly one cell per generation with the rake
    const ox = W - (AHEAD + 1) * s.cs - (s.front0 + s.cur.gen) * s.cs;
    s.stage.draw(s.cur, s.prev, s.cs, ox, s.oy);
    s.genEl.textContent = s.cur.gen;
  }

  for (const s of strips) s.layout();
  const clock = new Clock(host, 10, () => {
    for (const s of strips) {
      if (!s.start) continue;
      if (s.cur.gen >= s.start.cur.gen + RAKE_RUN) { s.cur = s.start.cur; s.prev = s.start.prev; }
      else { s.prev = s.cur; s.cur = s.cur.next(); }
      draw(s);
    }
  });
  host.addEventListener('click', () => clock.setPlaying(!clock.playing));
}

// ---------------------------------------------------------------------------
// Guns: things that stand still and fire (guns.js; every field checked by
// tests/guns.test.mjs). The camera is fixed on the gun, which never moves; its moons
// leave along its middle line both ways at c, so each strip is a line of light
// lengthening from its centre. A strip opens with its streams already spanning it. The
// streams repeat in space every period, so starting over after GUN_RUN generations (a
// multiple of both periods) changes nothing on the strip but the counter. The moon
// laser is 170 cells wide: its strip shrinks its cells
// (whole device pixels, never below 2) to fit, and say so by the counter.
const GUN_RUN = 900;
const STREAM = 30; // rows of stream shown above and below a gun that fires up and down

function guns() {
  const host = $('#gstrips');
  if (!host) return;
  const fill = (cls, v) => { for (const el of document.querySelectorAll(cls)) el.textContent = v; };
  fill('.n-guns', NUM[GN.GUNS.length]);
  for (const e of GN.GUNS) {
    const a = $(`#gun-open-${e.id}`);
    if (a) a.href = encodeHash(Pattern.fromRLE(e.rle));
  }

  // one strip: a fixed camera on `cells` (P0), the band of rows [top, bottom] it and its
  // engine occupy, `cols` columns that must fit across (0: as many as the strip holds)
  function strip(where, { name, facts, note, links, cols, top, bottom, rows, P0, label }) {
    const el = document.createElement('article');
    el.className = 'strip';
    el.innerHTML = `
      <div class="strip-head"><h3></h3><span class="facts"></span><span class="strip-scale">CELL <b>6</b> PX</span><span class="strip-gen">GEN <b>0</b></span></div>
      <figure class="stage"><canvas role="img"></canvas><span class="stage-status"></span></figure>
      <p class="strip-note"></p>`;
    el.querySelector('h3').textContent = name;
    el.querySelector('.facts').textContent = facts;
    const noteEl = el.querySelector('.strip-note');
    noteEl.append(note + ' ');
    links.forEach(([text, url], i) => {
      const a = document.createElement('a');
      a.href = url; a.textContent = text; a.rel = 'noopener';
      noteEl.append(i ? ' · ' : '', a);
    });
    const canvas = el.querySelector('canvas');
    canvas.setAttribute('aria-label', label);
    const fig = el.querySelector('.stage');
    fig.style.setProperty('--rows', rows);
    where.append(el);
    const s = { el, fig, stage: new Stage(canvas), genEl: el.querySelector('.strip-gen b'), scaleEl: el.querySelector('.strip-scale b'), statusEl: el.querySelector('.stage-status'), P0, rows, top, bottom };
    s.cur = P0; s.prev = null; s.cs = 2; s.start = null;
    s.layout = () => {
      const { dpr } = s.stage;
      const css = parseFloat(getComputedStyle(fig).getPropertyValue('--cs')) || 5;
      let cs = Math.max(2, Math.floor(css * dpr));
      if (cols) {
        // shrink to fit the gun across, in whole device pixels; the strip's height follows
        const wide = Math.max(2, Math.floor(canvas.getBoundingClientRect().width * dpr / (cols + 4)));
        cs = Math.min(cs, wide);
        fig.style.setProperty('--cs-fit', cs / dpr + 'px'); // if the height changes, the observer brings us back
      }
      s.cs = cs;
      s.scaleEl.textContent = cs / dpr % 1 ? (cs / dpr).toFixed(1) : cs / dpr;
      if (s.open) s.open();
      draw(s);
    };
    s.stage.onresize = s.layout;
    return s;
  }
  function draw(s) {
    const { W, H } = s.stage;
    // the gun's box centred across; the band [top, bottom] centred down
    const ox = Math.round((W - s.width * s.cs) / 2 - s.x0 * s.cs);
    const oy = Math.round((H - (s.bottom - s.top + 1) * s.cs) / 2 - s.top * s.cs);
    s.stage.draw(s.cur, s.prev, s.cs, ox, oy);
    s.genEl.textContent = s.cur.gen;
  }

  const strips = GN.GUNS.map((e) => {
    const [x0, y0, x1, y1] = e.box, vertical = e.axis === 'y';
    const P0 = Pattern.fromRLE(e.rle);
    const ways = vertical ? 'one up and one down' : 'one left and one right';
    const facts = `period ${e.period} · still · ${e.pop0} cells · fires ${e.fires.moon} moons every ${e.period} generations, ${ways}`;
    const s = strip(host, {
      name: e.name, facts, note: e.note,
      links: [[e.source.label, e.source.url], ['forum post', e.forum]],
      cols: vertical ? x1 - x0 + 1 : 0,
      top: vertical ? y0 - STREAM : y0 - 1, bottom: vertical ? y1 + STREAM : y1 + 1,
      rows: vertical ? y1 - y0 + 1 + 2 * STREAM : y1 - y0 + 3,
      P0, label: `${e.name}: ${facts}.`,
    });
    s.x0 = x0; s.width = x1 - x0 + 1;
    s.open = () => {
      if (s.start) return;
      // open with the streams spanning the strip: across it, or up to its top and bottom
      const span = vertical ? STREAM : Math.ceil(s.stage.W / s.cs / 2);
      const g0 = e.settle + e.period * Math.ceil(span / e.period);
      let p = P0, q = null;
      for (let g = 0; g < g0; g++) { q = p; p = p.next(); }
      s.start = { cur: p, prev: q };
      s.cur = p; s.prev = q;
    };
    s.step = () => {
      if (s.cur.gen >= s.start.cur.gen + GUN_RUN) { s.cur = s.start.cur; s.prev = s.start.prev; }
      else { s.prev = s.cur; s.cur = s.cur.next(); }
    };
    return s;
  });

  for (const s of strips) s.layout();
  const clock = new Clock(host, 10, () => {
    for (const s of strips) { if (!s.start) continue; s.step(); draw(s); }
  });
  host.addEventListener('click', () => clock.setPlaying(!clock.playing));
}

// ---------------------------------------------------------------------------
// Diamonds: the smallest explosions, on the bit-packed Field engine. A large stage
// follows one explosion from generation 0, zooming out by halves (cell sizes stay whole
// device pixels) until the diamond fills the frame. Below it, a wall of all 21
// three-cell explosions grows in step; tapping one sends it to the large stage.
const seedPattern = (cells) => Pattern.fromCells(cells);
const seedCentre = (p) => [p.x0 + p.w / 2, p.y0 + p.h / 2];

function diamonds() {
  const canvas = $('#diamond');
  if (!canvas) return null;
  for (const el of document.querySelectorAll('.n-pairs')) el.textContent = PAIRS.placements;
  for (const el of document.querySelectorAll('.n-triples')) el.textContent = TRIPLES.placements;
  for (const el of document.querySelectorAll('.n-triples-boom')) el.textContent = TRIPLES.explode;

  const stage = new Stage(canvas);
  const genEl = canvas.parentElement.querySelector('.stage-gen b');
  const popEl = $('#diamond-pop'), scaleEl = $('#diamond-scale'), statusEl = $('#diamond-status');
  const nameEl = $('#diamond-name'), backBtn = $('#diamond-back');
  const EVIL = { cells: EVIL_EYES, name: 'evil eyes', label: 'Evil eyes, two cells a knight’s move apart' };
  let seed = EVIL.cells, label = EVIL.label;
  let f = null, cs = 1, csTop = 1, cx = 0, cy = 0, done = false;

  // largest cell size (device px) for the opening frames: a power of two up to ~16 CSS px
  const topSize = () => { let c = 1; while (c * 2 <= 16 * stage.dpr) c *= 2; return c; };
  const fits = (b, c) => b && (b.x1 - b.x0 + 9) * c <= stage.W && (b.y1 - b.y0 + 9) * c <= stage.H;

  function start() {
    const p = seedPattern(seed);
    [cx, cy] = seedCentre(p);
    // room for the diamond to fill the frame at one device pixel per cell, plus a margin
    const margin = Math.ceil(Math.min(stage.W, stage.H) / 2) + 16;
    f = Field.around(p, margin);
    csTop = cs = topSize();
    done = false;
    statusEl.textContent = '';
    canvas.setAttribute('aria-label', `${label}, exploding into a diamond, simulated exactly.`);
    if (reducedMotion.matches && !clock.playing) { // show where it ends rather than three dots
      while (!done) advance();
    }
    draw();
  }

  function advance() {
    if (!f.step()) { finish(); return; }
    const b = f.bounds();
    while (cs > 1 && !fits(b, cs)) cs >>= 1;
    if (!fits(b, cs)) finish();
  }
  function finish() {
    done = true;
    statusEl.textContent = 'still growing; it has filled the frame';
  }
  function draw() {
    const ox = Math.round(stage.W / 2 - cx * cs), oy = Math.round(stage.H / 2 - cy * cs);
    paintField(stage, f, cs, ox, oy);
    genEl.textContent = f.gen;
    popEl.textContent = f.population.toLocaleString('en');
    const css = cs / stage.dpr;
    scaleEl.textContent = css >= 1 ? String(Math.round(css * 10) / 10) : '1/' + Math.round(1 / css);
    // fewer generations per second while the cells are big enough to follow one by one
    clock.rate = css >= 8 ? 8 : css >= 4 ? 12 : css >= 2 ? 20 : 30;
  }

  const clock = new Clock(canvas, 8, () => {
    if (done) { start(); return; }
    advance();
    draw();
    if (done) clock.hold = 3200;
  });
  canvas.addEventListener('click', () => clock.setPlaying(!clock.playing));
  stage.onresize = () => {
    if (!f) return;
    // a bigger frame needs a bigger field: start again; otherwise just re-fit the zoom
    const need = Math.ceil(Math.min(stage.W, stage.H) / 2) + 16;
    if (f.w < 2 * need || f.h < 2 * need) { start(); return; }
    csTop = topSize();
    const b = f.bounds();
    cs = csTop;
    while (cs > 1 && !fits(b, cs)) cs >>= 1;
    draw();
  };
  start();

  function load(s) {
    seed = s.cells; label = s.label;
    nameEl.textContent = s.name;
    backBtn.hidden = s === EVIL;
    clock.hold = 0;
    clock.setPlaying(true);
    start();
  }
  backBtn.onclick = (e) => {
    e.stopPropagation();
    for (const t of document.querySelectorAll('.tile')) t.setAttribute('aria-pressed', 'false');
    load(EVIL);
  };
  return { load };
}

function wall(big) {
  const host = $('#wall');
  if (!host) return;
  const genEl = $('#wall-gen');
  const tiles = THREE.map((cells, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    const desc = `three cells at ${cells.map(([x, y]) => `(${x}, ${y})`).join(', ')}`;
    b.setAttribute('aria-label', `Seed ${i + 1}: ${desc}. Show it large.`);
    b.innerHTML = '<canvas aria-hidden="true"></canvas>';
    b.append(glyph(cells));
    host.append(b);
    const p = seedPattern(cells);
    const t = { cells, stage: new Stage(b.querySelector('canvas')), p, centre: seedCentre(p), f: null, b };
    b.onclick = () => {
      for (const o of tiles) o.b.setAttribute('aria-pressed', String(o === t));
      big?.load({ cells, name: `three cells, № ${i + 1}`, label: `Seed ${i + 1}, ${desc}` });
      const fig = $('#diamond').parentElement, r = fig.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight)
        fig.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'center' });
    };
    return t;
  });

  let cs = 1, G = 100, gen = 0;
  function layout() {
    const { W, H } = tiles[0].stage;
    const side = Math.min(W, H);
    cs = Math.max(1, Math.floor(side / (2 * 120 + 10)));
    G = Math.min(200, Math.floor((side / cs - 10) / 2));
  }
  function reset() {
    layout();
    gen = 0;
    for (const t of tiles) t.f = Field.around(t.p, G + 4);
    if (reducedMotion.matches && !clock.playing) { // a still picture of where they end
      for (const t of tiles) while (t.f.gen < G) t.f.step();
      gen = G;
    }
    for (const t of tiles) draw(t);
    genEl.textContent = gen;
  }
  function draw(t) {
    const { W, H } = t.stage;
    paintField(t.stage, t.f, cs, Math.round(W / 2 - t.centre[0] * cs), Math.round(H / 2 - t.centre[1] * cs));
  }
  const clock = new Clock(host, 15, () => {
    if (gen >= G) { reset(); clock.hold = 400; return; }
    gen++;
    for (const t of tiles) { t.f.step(); draw(t); }
    genEl.textContent = gen;
    if (gen >= G) clock.hold = 2800;
  });
  let pending = 0;
  for (const t of tiles) t.stage.onresize = () => {
    // all tiles resize together; rebuild once they have
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => { if (tiles.every((o) => o.f)) reset(); });
  };
  reset();
}

// ---------------------------------------------------------------------------
// Four cells: every non-exploding placement of four cells (four.js, all tested). The
// 44 that settle play together from generation 0 for FOUR_RUN generations, each on an
// unbounded plane; a caption darkens at the generation it becomes true. The 26 that
// vanish are listed as glyphs, grouped by the generation they are gone.
const FOUR_RUN = 40;

function glyph(cells, cls = 'glyph') {
  const g = document.createElement('span');
  g.className = cls;
  g.setAttribute('aria-hidden', 'true');
  const gw = Math.max(...cells.map((c) => c[0])) + 1, gh = Math.max(...cells.map((c) => c[1])) + 1;
  g.style.setProperty('--gw', gw); g.style.setProperty('--gh', gh);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const c = document.createElement('i');
    if (cells.some(([a, d]) => a === x && d === y)) c.className = 'on';
    g.append(c);
  }
  return g;
}

function four() {
  const host = $('#fwall');
  if (!host) return;
  const fill = (cls, v) => { for (const el of document.querySelectorAll(cls)) el.textContent = v; };
  const outcomes = SETTLE.map(([, s]) => parseOutcome(s));
  fill('.n-quads', QUADS.placements);
  fill('.n-quads-boom', QUADS.explode);
  fill('.n-quads-calm', QUADS.placements - QUADS.explode);
  fill('.n-settle', SETTLE.length);
  fill('.n-vanish', VANISH.length);
  fill('.n-debris', outcomes.filter((o) => Object.keys(o.objects).every((k) => k === 'dot' || k === 'checker')).length);
  const genEl = $('#four-gen');

  const tiles = SETTLE.map(([cells], i) => {
    const o = outcomes[i];
    const fig = document.createElement('figure');
    fig.className = 'ftile';
    const words = phrase(o.objects);
    const at = o.at === 0 ? 'from the start' : `by gen ${o.at}`;
    fig.innerHTML = '<div class="ftile-stage"><canvas role="img"></canvas></div><figcaption><span></span><small></small></figcaption>';
    fig.querySelector('.ftile-stage').append(glyph(cells));
    fig.querySelector('figcaption span').textContent = words;
    fig.querySelector('figcaption small').textContent = at;
    const desc = cells.map(([x, y]) => `(${x}, ${y})`).join(', ');
    fig.querySelector('canvas').setAttribute('aria-label', `Four cells at ${desc}: ${words}, ${at}.`);
    host.append(fig);
    const p = Pattern.fromCells(cells);
    return { fig, o, p0: p, cur: p, prev: null, centre: seedCentre(p), stage: new Stage(fig.querySelector('canvas')) };
  });

  // the ones that vanish, grouped by the generation they are gone
  const van = $('#vanish');
  const byGen = new Map();
  for (const [cells, at] of VANISH) { if (!byGen.has(at)) byGen.set(at, []); byGen.get(at).push(cells); }
  for (const [at, list] of byGen) {
    const grp = document.createElement('div');
    grp.className = 'vgroup';
    grp.setAttribute('role', 'listitem');
    grp.setAttribute('aria-label', `${list.length} gone by generation ${at}`);
    const lab = document.createElement('span');
    lab.className = 'vlabel';
    lab.textContent = `gone by gen ${at}`;
    lab.setAttribute('aria-hidden', 'true');
    grp.append(lab);
    for (const cells of list) grp.append(glyph(cells, 'glyph vglyph'));
    van.append(grp);
  }
  const vhead = document.createElement('p');
  vhead.className = 'vhead';
  vhead.innerHTML = `And the ${VANISH.length} that vanish. Among them is the <a href="https://lukebradford.github.io/lfod/glossary.html#t-tetromino">T-tetromino</a>, gone by gen 3: it becomes snake eyes, which become a plus, which becomes nothing.`;
  van.before(vhead);

  let cs = 4, gen = 0;
  const still = () => reducedMotion.matches && !clock.playing;
  function draw(t) {
    const { W, H } = t.stage;
    t.stage.draw(t.cur, t.prev, cs, Math.round(W / 2 - t.centre[0] * cs), Math.round(H / 2 - t.centre[1] * cs));
    t.fig.classList.toggle('done', t.cur.gen >= t.o.at);
  }
  function reset() {
    cs = Math.max(2, Math.floor(tiles[0].stage.W / 15));
    gen = 0;
    for (const t of tiles) {
      t.cur = t.p0; t.prev = null;
      // reduced motion: a still picture of each tile at the moment its caption is true
      if (still()) for (let g = 0; g < t.o.at; g++) { t.prev = t.cur; t.cur = t.cur.next(); }
      draw(t);
    }
    genEl.parentElement.hidden = still();
    genEl.textContent = gen;
  }
  const clock = new Clock(host, 8, () => {
    if (gen >= FOUR_RUN) { reset(); clock.hold = 500; return; }
    gen++;
    for (const t of tiles) { t.prev = t.cur; t.cur = t.cur.next(); draw(t); }
    genEl.textContent = gen;
    if (gen >= FOUR_RUN) clock.hold = 2600;
  });
  host.addEventListener('click', () => {
    const wasStill = still();
    clock.setPlaying(!clock.playing);
    if (wasStill) reset(); // from the still picture, play from generation 0
  });
  let pending = 0;
  for (const t of tiles) t.stage.onresize = () => {
    // all tiles resize together; redraw once they have
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      cs = Math.max(2, Math.floor(tiles[0].stage.W / 15));
      for (const o of tiles) draw(o);
    });
  };
  reset();
}

// ---------------------------------------------------------------------------
// Five cells (five.js, every line tested). Nine placements become double dot puffers:
// each gets a strip on a fixed plane, one cell per generation, all stepping together
// from generation 0 until the last single puffer reaches the right edge. Below, every
// placement that doesn't explode, as a glyph grouped by fate; tapping one plays it.
const cellsKey = (cells) => cells.map(([x, y]) => `(${x}, ${y})`).join(', ');

// a glyph as one element: a cell-sized box whose shadows are the other cells
function sglyph(cells) {
  const g = document.createElement('span');
  g.className = 'sg';
  g.setAttribute('aria-hidden', 'true');
  const w = Math.max(...cells.map((c) => c[0])) + 1, h = Math.max(...cells.map((c) => c[1])) + 1;
  g.style.cssText = `--gw:${w};--gh:${h}`;
  const i = document.createElement('i');
  i.style.boxShadow = cells.map(([x, y]) => `calc(${x} * var(--u)) calc(${y} * var(--u)) 0 0 currentColor`).join(',');
  g.append(i);
  return g;
}

function fivePuffers() {
  const host = $('#pstrips');
  if (!host) return;
  const genEl = $('#five-gen');
  const strips = F5.PUFF.map(([enc, s]) => {
    const cells = F5.cellsOf(enc), o = parseOutcome(s), pair = o.objects.puffer === 2;
    const el = document.createElement('div');
    el.className = 'pstrip';
    el.setAttribute('role', 'listitem');
    el.innerHTML = '<figure class="stage"><canvas aria-hidden="true"></canvas></figure><span class="pcap"></span>';
    el.prepend(sglyph(cells));
    const words = pair ? `two puffers, by gen ${o.at}` : `a puffer, by gen ${o.at}`;
    el.querySelector('.pcap').textContent = pair ? `two, by gen ${o.at}` : `by gen ${o.at}`;
    el.setAttribute('aria-label', `Five cells at ${cellsKey(cells)}: ${words}.`);
    host.append(el);
    const p0 = Pattern.fromCells(cells);
    // every row it occupies: from gen at on the puffer repeats every 4 generations and
    // everything behind it is frozen (tested), so a dozen generations past `at` covers it
    let lo = Infinity, hi = -Infinity, minx = Infinity;
    for (let p = p0, g = 0; g <= o.at + 12; g++, p = p.next()) {
      lo = Math.min(lo, p.y0); hi = Math.max(hi, p.y0 + p.h - 1); minx = Math.min(minx, p.x0);
    }
    return { el, o, pair, p0, cur: p0, prev: null, lo, hi, minx, stage: new Stage(el.querySelector('canvas')) };
  });
  const rows = Math.max(...strips.map((s) => s.hi - s.lo + 1)) + 2;
  host.style.setProperty('--rows', rows);

  let cs = 4, done = false;
  const still = () => reducedMotion.matches && !clock.playing;
  const front = (s) => s.cur.x0 + s.cur.w - 1;
  function origin(s) {
    const { W, H } = s.stage;
    const ox = s.pair ? Math.round(W / 2 - (s.p0.x0 + s.p0.w / 2) * cs) : (1 - s.minx) * cs;
    return [ox, Math.round(H / 2 - ((s.lo + s.hi + 1) / 2) * cs)];
  }
  const finished = () => strips.every((s) => s.pair || origin(s)[0] + (front(s) + 1) * cs >= s.stage.W);
  function draw(s) {
    const [ox, oy] = origin(s);
    s.stage.draw(s.cur, s.prev, cs, ox, oy);
    s.el.classList.toggle('done', s.cur.gen >= s.o.at);
  }
  function reset() {
    const css = parseFloat(getComputedStyle(host).getPropertyValue('--cs')) || 4;
    cs = Math.max(2, Math.floor(css * strips[0].stage.dpr));
    for (const s of strips) { s.cur = s.p0; s.prev = null; }
    done = false;
    if (still()) { // reduced motion: a still picture of the end of the run
      while (!finished()) for (const s of strips) { s.prev = s.cur; s.cur = s.cur.next(); }
      done = true;
    }
    for (const s of strips) draw(s);
    genEl.textContent = strips[0].cur.gen;
  }
  const clock = new Clock(host, 12, () => {
    if (done) { reset(); clock.hold = 500; return; }
    for (const s of strips) { s.prev = s.cur; s.cur = s.cur.next(); draw(s); }
    genEl.textContent = strips[0].cur.gen;
    if (finished()) { done = true; clock.hold = 2800; }
  });
  host.addEventListener('click', () => {
    const wasStill = still();
    clock.setPlaying(!clock.playing);
    if (wasStill) reset();
  });
  let pending = 0;
  for (const s of strips) s.stage.onresize = () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(reset); // a new width is a new run, from generation 0
  };
  reset();
}

// The census: every five-cell placement that doesn't explode, grouped by fate.
const FATES = [
  ['double dot puffers', (ob) => ob.puffer],
  ['an ant', (ob) => ob.ant],
  ['one free ship', (ob) => ob.freeship === 1],
  ['two free ships', (ob) => ob.freeship === 2],
  ['a moon', (ob) => ob.moon],
  ['an anchor', (ob) => ob.anchor],
  ['a lever', (ob) => ob.lever],
  ['a radar', (ob) => ob.radar],
  ['only dots and checkers', (ob) => Object.keys(ob).length > 0],
  ['nothing at all', () => true],
];

function fiveCensus() {
  const host = $('#mosaic'), fig = $('#player');
  if (!host || !fig) return;
  const fill = (cls, v) => { for (const el of document.querySelectorAll(cls)) el.textContent = v.toLocaleString('en'); };
  const all = [
    ...F5.PUFF.map(([c, s]) => ({ c, o: parseOutcome(s) })),
    ...F5.SETTLE.map(([c, s]) => ({ c, o: parseOutcome(s) })),
    ...F5.VANISH.map(([c, at]) => ({ c, o: { at, kind: 'nothing', objects: {} } })),
  ];
  fill('.n-five', F5.FIVE.placements);
  fill('.n-five-boom', F5.FIVE.explode);
  fill('.n-five-calm', all.length);
  fill('.n-five-vanish', F5.VANISH.length);
  fill('.n-five-settle', F5.SETTLE.length);
  fill('.n-five-puff', F5.PUFF.length);
  fill('.n-five-puff-by', Math.max(...F5.PUFF.map(([, s]) => parseOutcome(s).at)));
  fill('.n-triples-calm', TRIPLES.placements - TRIPLES.explode);

  const words = (o) => o.kind === 'nothing' ? `nothing, gone by gen ${o.at}`
    : `${o.objects.puffer === 2 ? 'two double dot puffers flying apart' : phrase(o.objects)}, ${o.at === 0 ? 'from the start' : `by gen ${o.at}`}`;
  const groups = FATES.map(([label]) => ({ label, items: [] }));
  for (const it of all) groups[FATES.findIndex(([, f]) => f(it.o.objects))].items.push(it);
  let chosen = null;
  for (const g of groups) {
    const row = document.createElement('div');
    row.className = 'mgroup';
    row.innerHTML = '<p class="mlabel"><span></span> <b></b></p><div class="mglyphs" role="group"></div>';
    row.querySelector('.mlabel span').textContent = g.label;
    row.querySelector('.mlabel b').textContent = g.items.length;
    const box = row.querySelector('.mglyphs');
    box.setAttribute('aria-label', `${g.items.length} that become ${g.label}`);
    for (const it of g.items) {
      const cells = F5.cellsOf(it.c);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mg';
      b.setAttribute('aria-label', `Five cells at ${cellsKey(cells)}: ${words(it.o)}. Play it.`);
      b.setAttribute('aria-pressed', 'false');
      b.append(sglyph(cells));
      b.onclick = () => choose(it, b, true);
      it.b = b;
      box.append(b);
    }
    host.append(row);
  }

  const canvas = fig.querySelector('canvas'), stage = new Stage(canvas);
  const genEl = fig.querySelector('.stage-gen b'), nameEl = $('#player-name'), resEl = $('#player-result');
  let cur = null, prev = null, centre = [0, 0], end = 40, cs = 8, it = null;
  const still = () => reducedMotion.matches && !clock.playing;
  function choose(next, b, user) {
    it = next;
    if (chosen) chosen.setAttribute('aria-pressed', 'false');
    chosen = b; b.setAttribute('aria-pressed', 'true');
    const cells = F5.cellsOf(it.c);
    nameEl.replaceChildren(sglyph(cells));
    resEl.textContent = words(it.o);
    canvas.setAttribute('aria-label', `Five cells at ${cellsKey(cells)}, simulated exactly: ${words(it.o)}.`);
    const p = Pattern.fromCells(cells);
    centre = seedCentre(p);
    // long enough to see it settle, and for anything that flies to start on its way
    const ob = it.o.objects;
    end = it.o.kind === 'nothing' ? it.o.at + 8 : it.o.at + (ob.puffer || ob.freeship || ob.moon ? 36 : 20);
    restart();
    if (user) {
      clock.hold = 0;
      clock.setPlaying(true);
      const r = fig.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) fig.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'nearest' });
    }
  }
  function restart() {
    cur = Pattern.fromCells(F5.cellsOf(it.c)); prev = null;
    if (still()) while (cur.gen < it.o.at) { prev = cur; cur = cur.next(); }
    draw();
  }
  function draw() {
    const { W, H } = stage;
    cs = Math.max(2, Math.floor(Math.min(W, H) / 27));
    stage.draw(cur, prev, cs, Math.round(W / 2 - centre[0] * cs), Math.round(H / 2 - centre[1] * cs));
    genEl.textContent = cur.gen;
    fig.classList.toggle('done', cur.gen >= it.o.at);
  }
  const clock = new Clock(fig, 8, () => {
    if (cur.gen >= end) { restart(); clock.hold = 500; return; }
    prev = cur; cur = cur.next(); draw();
    if (cur.gen >= end) clock.hold = 2400;
  });
  canvas.addEventListener('click', () => {
    const wasStill = still();
    clock.setPlaying(!clock.playing);
    if (wasStill) restart();
  });
  stage.onresize = () => { if (it) draw(); };
  const ant = groups[1].items[0];
  choose(ant, ant.b, false);
}

// ---------------------------------------------------------------------------
// Slower than light: the glossary's slow ships (slow.js; every number checked by
// tests/slow.test.mjs). A race of the smallest ship at each orthogonal speed, the moon
// for light, noses on one column at generation 0, the region beyond the light front
// shaded; the three diagonal ships against the diagonal speed limit (max x + y gains at
// most one a generation, proved in Diamonds); and a table of all of them with a viewer
// whose camera moves with the chosen ship. Each lane and tile is its own exact plane.
const RACE_RATE = 12;

function slow() {
  const raceEl = $('#race'), diagsEl = $('#diags'), table = $('#slowtable'), fig = $('#slowstage');
  if (!raceEl || !diagsEl || !table || !fig) return;
  const fill = (cls, v) => { for (const el of document.querySelectorAll(cls)) el.textContent = v; };
  const cap = (s) => s.replace(/^./, (c) => c.toUpperCase());
  const words = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen'];
  fill('.n-slow', SL.SHIPS.length);
  fill('.n-slow-c2', cap(words[SL.SHIPS.filter((e) => SL.speed(e) === 'c/2').length]));
  fill('.n-slow-min', Math.min(...SL.SHIPS.map((e) => e.pop[0])));
  fill('.n-slow-jb', cap(words[SL.SHIPS.filter((e) => e.credit === 'Josh Ball').length]));

  const front = (p) => p.x0 + p.w - 1;
  const lead = (p) => { let m = -Infinity; for (const [x, y] of p.cells()) if (x + y > m) m = x + y; return m; };
  const cells = (e) => e.pop[0] === e.pop[1] ? `${e.pop[0]} cells` : `${e.pop[0]}–${e.pop[1]} cells`;
  const facts = (e) => `${SL.speed(e)} · period ${e.period} · ${cells(e)}`;
  const link = (e) => {
    const a = document.createElement('a');
    a.href = SL.GLOSSARY + e.id; a.rel = 'noopener'; a.textContent = e.name;
    return a;
  };
  const moon = { ...byId.moon, id: 'moon', name: 'moon' };

  // ----- the race
  const lanes = [moon, ...SL.RACE.map(SL.byId)].map((e) => {
    const el = document.createElement('div');
    el.className = 'lane';
    el.setAttribute('role', 'listitem');
    el.innerHTML = '<div class="lane-head"><span class="lane-name"></span><span class="facts"></span></div><div class="stage"><canvas role="img"></canvas></div>';
    el.querySelector('.lane-name').append(link(e));
    el.querySelector('.facts').textContent = facts(e) + (e.credit ? ` · ${e.credit}` : '');
    el.querySelector('canvas').setAttribute('aria-label', `The ${e.name}, ${facts(e)}, racing from the starting line, simulated exactly.`);
    raceEl.append(el);
    const P0 = Pattern.fromRLE(e.rle), ext = SL.extent(e);
    return { e, el, box: el.querySelector('.stage'), stage: new Stage(el.querySelector('canvas')), P0, ext, f0: front(P0), cur: P0, prev: null };
  });
  // columns behind the start line that hold every ship's tail at generation 0
  const TAILS = Math.max(...lanes.map((l) => l.f0 - l.ext.x0)) + 2;
  const race = { cs: 2, cols: 0, lap: 0, mx: 0, behind: TAILS, gen: $('#race-gen') };
  function raceLayout() {
    const { W, dpr } = lanes[0].stage;
    // On narrow screens the longest tails start cropped by the frame's left edge (and
    // come into view as they move), so the cells can stay big enough to read.
    const narrow = W / dpr < 640;
    race.behind = narrow ? Math.min(TAILS, 40) : TAILS;
    race.cs = Math.max(2, Math.floor(W / (race.behind + (narrow ? 110 : 240))));
    race.cols = Math.floor(W / race.cs);
    race.mx = Math.floor((W - race.cols * race.cs) / 2);
    race.lap = race.cols - race.behind - 2; // the moon's nose stops one column short of the edge
    for (const l of lanes) {
      const rows = l.ext.y1 - l.ext.y0 + 3;
      l.box.style.height = `${(rows * race.cs) / dpr}px`;
    }
    if (reducedMotion.matches && !raceClock?.playing) raceTo(race.lap);
    raceDraw();
  }
  function raceTo(g) {
    for (const l of lanes) {
      l.cur = l.P0; l.prev = null;
      for (let i = 0; i < g; i++) { l.prev = l.cur; l.cur = l.cur.next(); }
    }
  }
  function raceDraw() {
    const { cs, mx } = race;
    for (const l of lanes) {
      const { W, H } = l.stage;
      if (!W) continue;
      const ox = mx + (race.behind - l.f0) * cs, oy = Math.round((H - (l.ext.y1 - l.ext.y0 + 1) * cs) / 2) - l.ext.y0 * cs;
      const g = l.cur.gen;
      l.stage.draw(l.cur, l.prev, cs, ox, oy, {
        under: (ctx) => { ctx.fillStyle = COLORS.beyond; const X = ox + (l.f0 + g + 1) * cs; ctx.fillRect(X, 0, W - X, H); },
      });
    }
    race.gen.textContent = lanes[0].cur.gen;
  }
  let raceClock = null;
  lanes[0].stage.onresize = raceLayout;
  for (const l of lanes.slice(1)) l.stage.onresize = raceDraw;
  raceClock = new Clock(raceEl, RACE_RATE, () => {
    if (lanes[0].cur.gen >= race.lap) { raceTo(0); raceClock.hold = 1600; }
    else for (const l of lanes) { l.prev = l.cur; l.cur = l.cur.next(); }
    raceDraw();
  });
  raceEl.addEventListener('click', () => raceClock.setPlaying(!raceClock.playing));
  raceLayout();

  // ----- diagonal tiles: one scale for all three
  const TRAVEL = 48; // diagonal steps shown, about 190 generations
  const dl = SL.DIAGONAL.map(SL.byId).map((e) => ({ e, ext: SL.extent(e) }));
  const N = Math.max(...dl.map(({ ext }) => Math.max(ext.x1 - ext.x0, ext.y1 - ext.y0) + 1)) + TRAVEL + 4;
  for (const d of dl) {
    const { e, ext } = d;
    const el = document.createElement('figure');
    el.className = 'stage-flot';
    el.setAttribute('role', 'listitem');
    el.innerHTML = '<div class="stage"><canvas role="img"></canvas><span class="stage-gen">GEN <b>0</b></span></div><figcaption><span></span><br><i></i></figcaption>';
    el.querySelector('figcaption span').append(link(e));
    el.querySelector('figcaption i').textContent = `${facts(e)} · ${e.credit}`;
    el.querySelector('canvas').setAttribute('aria-label', `The ${e.name}, ${facts(e)}, behind the diagonal speed limit, simulated exactly.`);
    diagsEl.append(el);
    d.P0 = Pattern.fromRLE(e.rle); d.s0 = lead(d.P0); d.cur = d.P0; d.prev = null;
    d.stage = new Stage(el.querySelector('canvas')); d.gen = el.querySelector('.stage-gen b');
    // the ship's first-period box starts 2 cells in from the tile's top left corner, and
    // the run ends, a whole number of periods later, while it is still 2 cells clear of the far edges
    d.tx = ext.x0 - 2; d.ty = ext.y0 - 2;
    d.lap = Math.floor((N - 3 - Math.max(ext.x1 - d.tx, ext.y1 - d.ty)) / e.dx) * e.period;
    d.draw = () => {
      const { W, H } = d.stage;
      const cs = Math.max(1, Math.floor(Math.min(W, H) / N));
      const ox = Math.round((W - N * cs) / 2) - d.tx * cs, oy = Math.round((H - N * cs) / 2) - d.ty * cs;
      const k = d.s0 + d.cur.gen; // nothing can be alive where x + y > k
      d.stage.draw(d.cur, d.prev, cs, ox, oy, {
        under: (ctx) => {
          ctx.fillStyle = COLORS.beyond;
          const y0 = Math.floor(-oy / cs) - 1, y1 = Math.ceil((H - oy) / cs) + 1;
          for (let y = y0; y <= y1; y++) {
            const X = Math.max(0, ox + (k - y + 1) * cs);
            if (X < W) ctx.fillRect(X, oy + y * cs, W - X, cs);
          }
        },
      });
      d.gen.textContent = d.cur.gen;
    };
    d.reset = () => {
      d.cur = d.P0; d.prev = null;
      if (reducedMotion.matches && !d.clock?.playing) for (let g = 0; g < d.lap; g++) { d.prev = d.cur; d.cur = d.cur.next(); }
    };
    d.clock = new Clock(el, RACE_RATE, () => {
      if (d.cur.gen >= d.lap) { d.reset(); d.clock.hold = 1600; }
      else { d.prev = d.cur; d.cur = d.cur.next(); }
      d.draw();
    });
    el.addEventListener('click', () => d.clock.setPlaying(!d.clock.playing));
    d.stage.onresize = d.draw;
    d.reset(); d.draw();
  }

  // ----- every slow ship: the table and the viewer
  const stage = new Stage(fig.querySelector('canvas'));
  const genEl = fig.querySelector('.stage-gen b'), nameEl = $('#slowstage-name');
  const view = { e: null, cur: null, prev: null, ext: null, cs: 2 };
  const buttons = [];
  for (const e of SL.SHIPS) {
    const tr = document.createElement('tr');
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = e.name; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => { choose(e); if (matchMedia('(max-width: 860px)').matches) fig.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
    buttons.push([e, b]);
    const th = document.createElement('th'); th.scope = 'row'; th.append(b);
    tr.append(th);
    for (const v of [SL.speed(e), e.period, e.pop[0], e.credit === 'discoverer not recorded' ? 'not recorded' : e.credit]) {
      const td = document.createElement('td'); td.textContent = v; tr.append(td);
    }
    table.tBodies[0].append(tr);
  }
  function viewDraw() {
    const { W, H } = stage, { e, ext } = view;
    if (!W || !e) return;
    const w = ext.x1 - ext.x0 + 1, h = ext.y1 - ext.y0 + 1;
    const cs = Math.max(2, Math.min(18, Math.floor(Math.min(W / (w + 10), H / (h + 8)))));
    // the camera moves with the ship: a whole cell at a time, at its average speed
    const g = view.cur.gen;
    const cx = (ext.x0 + ext.x1 + 1) / 2 + Math.floor((g * e.dx) / e.period);
    const cy = (ext.y0 + ext.y1 + 1) / 2 + Math.floor((g * e.dy) / e.period);
    stage.draw(view.cur, view.prev, cs, Math.round(W / 2 - cx * cs), Math.round(H / 2 - cy * cs));
    genEl.textContent = g;
  }
  function choose(e) {
    view.e = e; view.ext = SL.extent(e); view.cur = Pattern.fromRLE(e.rle); view.prev = null;
    nameEl.replaceChildren(link(e), ` · ${SL.speed(e)} · period ${e.period}`);
    for (const [o, b] of buttons) b.setAttribute('aria-pressed', String(o === e));
    viewDraw();
  }
  const viewClock = new Clock(fig, 8, () => { view.prev = view.cur; view.cur = view.cur.next(); viewDraw(); });
  fig.addEventListener('click', (ev) => { if (!ev.target.closest('a')) viewClock.setPlaying(!viewClock.playing); });
  stage.onresize = viewDraw;
  choose(SL.byId('decade-ship'));
}

function anchors() {
  for (const sec of document.querySelectorAll('main section[id]')) {
    const h = sec.querySelector('h2');
    if (!h || h.querySelector('.h-link')) continue;
    const a = document.createElement('a');
    a.className = 'h-link';
    a.href = `#${sec.id}`;
    a.textContent = '#';
    a.setAttribute('aria-label', `Link to ${h.textContent}`);
    h.append(a);
  }
  // A link to a section is followed before the scripts have built the sections above
  // it, which then grow and push it down. Until the reader does anything (wheel, touch,
  // key, click), keep the section at the top whenever the page changes size, for a
  // moment after load.
  let id = '';
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const target = id && document.getElementById(id);
  if (!target || !target.matches('main section, main nav')) return;
  // A reload would otherwise put back the old scroll position, which (the page having
  // been rebuilt since) lands somewhere else. A page opened at a section reopens there.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const INPUT = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
  const ro = new ResizeObserver(() => target.scrollIntoView());
  const stop = () => { ro.disconnect(); for (const ev of INPUT) removeEventListener(ev, stop); };
  for (const ev of INPUT) addEventListener(ev, stop, { passive: true });
  ro.observe(document.body);
  requestAnimationFrame(() => target.scrollIntoView());
  const later = () => setTimeout(stop, 1500);
  if (document.readyState === 'complete') later();
  else addEventListener('load', later, { once: true });
}

hero();
laws();
parting();
for (const e of CATALOG) card(e);
wakes();
rakes();
guns();
wall(diamonds());
four();
fivePuffers();
fiveCensus();
slow();
anchors();
reducedMotion.addEventListener?.('change', wake);
