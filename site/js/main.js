import { Pattern, Field, nextState } from './lfod.js';
import { CATALOG, PUFFERS, byId } from './catalog.js';
import { Stage, Clock, reducedMotion, wake, paintField, COLORS } from './stage.js';
import { encodeHash, decodeHash } from './share.js';
import { TARGETS, targetById, setup, parseOutcome, allCollisions, shortLabel, sentence, phrase } from './collisions.js';
import { PAIRS, TRIPLES, EVIL_EYES, THREE } from './diamonds.js';
import { QUADS, SETTLE, VANISH } from './four.js';
import * as F5 from './five.js';
import * as D2 from './dominoes.js';
import * as SB from './abreast.js';
import * as HO from './headon.js';
import * as SL from './slow.js';
import * as CR from './crossing.js';

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
    playBtn.textContent = clock.playing ? 'pause' : 'play';
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
    { title: 'Birth', text: 'An empty cell with exactly two living neighbours comes alive.', centre: 0, nbrs: [0, 5] },
    { title: 'Freedom', text: 'A living cell with no living neighbours survives.', centre: 1, nbrs: [] },
    { title: 'Death', text: 'A living cell with any company at all dies.', centre: 1, nbrs: [2] },
  ];
  // neighbour index order around the centre (row-major, skipping the centre)
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
// Runs until the ships near the edge of the frame, holds, then restarts at gen 0.
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
    halfCells = Math.floor(W / 2 / cs);
    draw();
  }
  function draw() {
    stage.draw(cur, prev, cs, ox, oy);
    genEl.textContent = cur.gen;
  }
  const clock = new Clock(canvas, 10, () => {
    // stop when the next generation would put a ship within two cells of the edge
    if (Math.max(-cur.x0, cur.x0 + cur.w) + 3 > halfCells) {
      cur = start(); prev = null; clock.hold = 300;
    } else {
      prev = cur; cur = cur.next();
      if (Math.max(-cur.x0, cur.x0 + cur.w) + 3 > halfCells) clock.hold = 1600;
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
    <figure class="stage"><canvas role="img"></canvas><figcaption class="stage-gen">gen <b>0</b></figcaption></figure>
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
      <div class="strip-head"><h3></h3><span class="facts"></span><span class="strip-gen">gen <b>0</b></span></div>
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
// Collisions: a moon sent at another moon, a dot or a checker. The atlas lists every
// offset where they touch (outcomes from collisions.js, each checked by a test);
// choosing one plays it on the stage from generation 0, exactly. A clean run goes on
// until the result has settled and anything moving has left the frame; an explosion
// stops when it reaches the edge of the frame, and says so.
function collisions() {
  const canvas = $('#collide');
  if (!canvas) return;
  const stage = new Stage(canvas);
  const genEl = canvas.parentElement.querySelector('.stage-gen b');
  const statusEl = $('#collide-status'), resultEl = $('#collide-result');
  const targetsEl = $('#targets'), atlas = $('#atlas');
  const all = allCollisions();
  $('#n-touch').textContent = all.length;
  $('#n-explode').textContent = all.filter((c) => c.outcome.kind === 'explodes').length;

  let sel = { target: targetById.moon, gap: 25, dy: 0 };
  let o = null, cur = null, prev = null, cs = 8, ox = 0, oy = 0, cols = 40, rows = 36, done = false;

  const signed = (n) => (n > 0 ? '+' + n : n < 0 ? '−' + -n : '0');
  const describe = () => `Moon versus ${sel.target.label}, offset ${signed(sel.dy)}${Object.keys(sel.target.rows).length > 1 ? `, ${sel.gap % 2 ? 'odd' : 'even'} gap` : ''}.`;

  function start() {
    o = parseOutcome(sel.target.rows[sel.gap][sel.dy - sel.target.dy[0]]);
    cur = Pattern.fromCells(setup(sel.target, sel.dy, sel.gap));
    prev = null; done = false;
    statusEl.textContent = '';
    resultEl.textContent = describe();
    canvas.setAttribute('aria-label', `${describe()} ${sentence(o, sel.target.id)}`);
    layout();
  }

  function layout() {
    const { W, H } = stage;
    cs = Math.max(2, Math.floor(Math.min(W / 36, H / 34)));
    cols = Math.floor(W / cs); rows = Math.floor(H / cs);
    // centre on the point of impact: halfway between two moons, or just left of a
    // standing target so the incoming moon is in view from the start
    const cx = sel.target.id === 'moon' ? (1 - sel.gap) / 2 : -3;
    const cy = (sel.dy + 3) / 2 + 0.5;
    ox = Math.round(W / 2 - cx * cs);
    oy = Math.round(H / 2 - cy * cs);
    draw();
  }
  function draw() {
    stage.draw(cur, prev, cs, ox, oy);
    genEl.textContent = cur.gen;
  }
  // world rectangle in view
  const inView = (p) => p.x0 * cs + ox >= 0 && (p.x0 + p.w) * cs + ox <= stage.W
    && p.y0 * cs + oy >= 0 && (p.y0 + p.h) * cs + oy <= stage.H;
  const anyInView = (p) => p.w > 0 && (p.x0 + p.w) * cs + ox > 0 && p.x0 * cs + ox < stage.W
    && (p.y0 + p.h) * cs + oy > 0 && p.y0 * cs + oy < stage.H;
  // a clean run ends once its result is reached and anything moving is out of view
  const moving = () => o.objects.moon || o.objects.freeship;
  function finished() {
    if (o.kind === 'explodes') {
      if (cur.population > 400 && !inView(cur)) {
        statusEl.textContent = 'still growing; stopped at the edge of the frame';
        resultEl.textContent = `${describe()} ${sentence(o)}`;
        return true;
      }
      return false;
    }
    if (cur.gen < o.at) return false;
    if (cur.gen === o.at) resultEl.textContent = `${describe()} ${sentence(o, sel.target.id)}`;
    if (o.kind === 'nothing') return cur.gen >= o.at + 12;
    if (moving()) return cur.gen >= o.at + Math.ceil(Math.max(cols, rows) / 2) + 6;
    return cur.gen >= o.at + 38; // two full turns of a monster; plenty for blinkers
  }

  const clock = new Clock(canvas, 9, () => {
    if (done) { start(); return; }
    prev = cur; cur = cur.next();
    draw();
    if (finished()) { done = true; clock.hold = o.kind === 'explodes' ? 2600 : 2000; }
  });
  canvas.addEventListener('click', () => clock.setPlaying(!clock.playing));

  // target choice and the atlas of outcomes
  const tbtns = TARGETS.map((t) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = t.label;
    b.onclick = () => {
      const gaps = Object.keys(t.rows).map(Number);
      // open on the most remarkable clean outcome for this target
      const best = all.filter((c) => c.target === t && c.outcome.kind !== 'explodes')
        .sort((a, b) => score(b) - score(a))[0];
      sel = best ? { target: t, gap: best.gap, dy: best.dy } : { target: t, gap: gaps[0], dy: 0 };
      choose();
    };
    targetsEl.append(b);
    return [t, b];
  });
  const score = (c) => (c.outcome.objects.monster ? 9 : c.outcome.objects.freeship ? 8 : c.outcome.kind === 'nothing' ? 7 : Object.keys(c.outcome.objects).length === 1 ? 5 : 1);

  function renderAtlas() {
    const t = sel.target, gaps = Object.keys(t.rows).map(Number);
    atlas.textContent = '';
    const head = atlas.createTHead().insertRow();
    const th0 = document.createElement('th'); th0.textContent = 'offset'; th0.scope = 'col'; head.append(th0);
    for (const g of gaps) {
      const th = document.createElement('th'); th.scope = 'col';
      th.textContent = gaps.length > 1 ? (g % 2 ? 'odd gap' : 'even gap') : 'any gap';
      head.append(th);
    }
    const body = atlas.createTBody();
    for (let dy = t.dy[0]; dy <= t.dy[1]; dy++) {
      const tr = body.insertRow();
      const th = document.createElement('th'); th.scope = 'row'; th.textContent = signed(dy); tr.append(th);
      for (const g of gaps) {
        const oc = parseOutcome(t.rows[g][dy - t.dy[0]]);
        const td = tr.insertCell();
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = shortLabel(oc);
        b.className = oc.kind === 'explodes' ? 'boom' : 'clean';
        b.setAttribute('aria-pressed', String(g === sel.gap && dy === sel.dy));
        b.setAttribute('aria-label', `offset ${signed(dy)}${gaps.length > 1 ? `, ${g % 2 ? 'odd' : 'even'} gap` : ''}: ${shortLabel(oc)}`);
        b.onclick = () => { sel = { target: t, gap: g, dy }; choose(); };
        td.append(b);
      }
    }
  }

  function choose() {
    for (const [t, b] of tbtns) b.setAttribute('aria-pressed', String(t === sel.target));
    renderAtlas();
    start();
    clock.hold = 0;
    clock.setPlaying(true); // choosing a collision is a request to watch it
  }

  stage.onresize = () => { if (cur) layout(); };
  for (const [t, b] of tbtns) b.setAttribute('aria-pressed', String(t === sel.target));
  renderAtlas();
  start();
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
// Two dominoes: a map of every place a second domino can go near a first, drawn at
// its true position around the first (MAP in dominoes.js; every square is checked by
// tests/dominoes.test.mjs), and a stage that plays whichever square is chosen.
function dominoes() {
  const fig = $('#duel'), map = $('#dmap');
  if (!fig || !map) return;
  const { MAP, LAT, LON, DUEL, pairCells, outcomeAt } = D2;
  const fill = (cls, v) => { for (const el of document.querySelectorAll(cls)) el.textContent = v.toLocaleString('en'); };
  const kinds = { '#': 0, '.': 0, s: 0 };
  let total = 0;
  for (const row of MAP) for (const e of row) if (e) { total++; kinds[e === '#' || e === '.' ? e : 's']++; }
  fill('.n-dom', total); fill('.n-dom-boom', kinds['#']); fill('.n-dom-apart', kinds['.']);
  fill('.n-dom-settle', kinds.s - 1); fill('.n-dom-lat', LAT); fill('.n-dom-lon', LON);

  const read = (e) => e === '#' ? { kind: 'explodes', at: null, objects: {} }
    : e === '.' ? { kind: 'apart', at: 12, objects: { freeship: 4 } }
    : e === 'puffers' ? { kind: 'puffers', at: DUEL.first, objects: {} }
    : parseOutcome(e);
  const words = (o, dx) => o.kind === 'explodes' ? 'explodes'
    : o.kind === 'apart' ? 'they never touch: four free ships, each flying as if alone'
    : o.kind === 'puffers' ? `two puffers flying apart, laying a dot every ${DUEL.period} generations, forever`
    : o.kind === 'nothing' ? `nothing, gone by gen ${o.at}`
    : ships(o, dx) + `, by gen ${o.at}`;
  // (tests check: with two ships left, from 3 along they are the outer two; with four,
  // all four are whole)
  function ships(o, dx) {
    const { freeship, ...debris } = o.objects;
    const left = Object.keys(debris).length ? phrase(debris) : '';
    if (freeship === 2 && Math.abs(dx) >= 3) return left ? `the inner ships are destroyed, leaving ${left}; the outer two fly on` : 'the inner ships annihilate; the outer two fly on';
    if (freeship === 4) return left ? `all four ships fly on, leaving ${left}` : 'they touch, and all four ships fly on unchanged';
    return phrase(o.objects);
  }
  const rows = (n) => (n === 0 ? 'in line' : `${n} row${n === 1 ? '' : 's'} across`);
  const where = (dx, dy) => Math.abs(dx) === DUEL.dx && Math.abs(dy) === DUEL.dy ? 'dueling dominoes'
    : `${rows(Math.abs(dy))}, ${Math.abs(dx)} along`;

  // ----- the stage
  const canvas = fig.querySelector('canvas'), stage = new Stage(canvas);
  const genEl = fig.querySelector('.stage-gen b'), nameEl = $('#duel-name');
  const resEl = $('#duel-result'), statusEl = $('#duel-status'), openEl = $('#duel-open');
  let sel = { dx: DUEL.dx, dy: DUEL.dy }, o = null, cur = null, prev = null, cs = 8, ox = 0, oy = 0, end = 0, done = false;
  const still = () => reducedMotion.matches && !clock.playing;
  const inView = (p) => p.x0 * cs + ox >= 0 && (p.x0 + p.w) * cs + ox <= stage.W
    && p.y0 * cs + oy >= 0 && (p.y0 + p.h) * cs + oy <= stage.H;

  function start() {
    o = read(outcomeAt(sel.dx, sel.dy));
    cur = Pattern.fromCells(pairCells(sel.dx, sel.dy)); prev = null; done = false;
    statusEl.textContent = '';
    nameEl.textContent = where(sel.dx, sel.dy);
    resEl.textContent = words(o, sel.dx);
    canvas.setAttribute('aria-label', `Two dominoes, ${where(sel.dx, sel.dy)}, simulated exactly: ${words(o, sel.dx)}.`);
    openEl.href = encodeHash(Pattern.fromCells(pairCells(sel.dx, sel.dy)));
    layout();
    if (still()) { while (!finished()) { prev = cur; cur = cur.next(); } draw(); }
  }
  function layout() {
    const { W, H } = stage;
    // up to 96 cells across; fewer on a phone, so cells stay about 5 CSS px or more
    const want = Math.min(96, Math.max(56, Math.round(W / stage.dpr / 5)));
    cs = Math.max(2, Math.floor(Math.min(W / want, H / 34)));
    // centre on the point halfway between the dominoes (the whole pattern is symmetric about it)
    ox = Math.round(W / 2 - (sel.dx + 1) / 2 * cs);
    oy = Math.round(H / 2 - (sel.dy + 2) / 2 * cs);
    // clean runs last until anything flying has left the frame (ships move one cell per gen)
    end = Math.max(o.at ?? 0, Math.ceil(W / cs / 2 + Math.abs(sel.dx) / 2) + 10);
    draw();
  }
  function draw() {
    stage.draw(cur, prev, cs, ox, oy);
    genEl.textContent = cur.gen;
    fig.classList.toggle('done', o.at !== null && cur.gen >= o.at);
  }
  function finished() {
    if (o.kind === 'explodes') {
      if (cur.population > 400 && !inView(cur)) { statusEl.textContent = 'still growing; stopped at the edge of the frame'; return true; }
      return cur.gen > 2000;
    }
    if (o.kind === 'puffers') {
      // stop while the leading ships are still a step inside the frame
      const nx = cur.x0 - 1, nw = cur.w + 2;
      return nx * cs + ox < 0 || (nx + nw) * cs + ox > stage.W;
    }
    return cur.gen >= end;
  }
  const clock = new Clock(fig, 10, () => {
    if (done) { start(); clock.hold = 400; return; }
    prev = cur; cur = cur.next(); draw();
    if (finished()) { done = true; clock.hold = o.kind === 'explodes' ? 2600 : 2400; }
  });
  canvas.addEventListener('click', () => {
    const wasStill = still();
    clock.setPlaying(!clock.playing);
    if (wasStill) start();
  });
  stage.onresize = () => { if (cur) layout(); };

  // ----- the map: every place for the second domino's top cell, around the first
  const mctx = map.getContext('2d', { alpha: false });
  let q = 8, x0 = -LON, cols = 2 * LON + 1, mox = 0, hover = null;
  const nrows = 2 * LAT + 1;
  const hoverEl = $('#dmap-hover');
  const isFirst = (dx, dy) => dx === 0 && (dy === 0 || dy === 1);
  function mlayout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const W = Math.round(map.parentElement.clientWidth * dpr);
    // whole device pixels per square; on narrow screens show fewer columns to the left
    // (the map is symmetric), keeping squares big enough to tap and the first domino in view
    cols = Math.max(LON + 2, Math.min(2 * LON + 1, Math.floor(W / Math.round(9 * dpr))));
    x0 = LON - cols + 1;
    q = Math.max(3, Math.floor(W / cols));
    mox = Math.floor((W - cols * q) / 2);
    if (map.width !== W || map.height !== nrows * q) {
      map.width = W; map.height = nrows * q;
      map.style.height = `${nrows * q / dpr}px`;
    }
    mdraw();
  }
  function mdraw() {
    const g = Math.max(1, Math.round(q * 0.14)), h = g >> 1, s = q - g;
    const box = (X, Y, w, ht, color) => { mctx.fillStyle = color; mctx.fillRect(X, Y, w, ht); };
    box(0, 0, map.width, map.height, COLORS.paper);
    for (let r = 0; r < nrows; r++) for (let c = 0; c < cols; c++) {
      const dx = x0 + c, dy = r - LAT, X = mox + c * q, Y = r * q;
      const e = outcomeAt(dx, dy);
      if (isFirst(dx, dy)) {
        if (dy === 0) box(X + h, Y + h, s, q + s, COLORS.ink); // the first domino: two cells joined
      } else if (e === '#') box(X + h, Y + h, s, s, '#d7d2c7');
      else if (e === 'puffers') box(X + h, Y + h, s, s, COLORS.free);
      else if (e === '.') {
        const d = Math.max(1, Math.round(q / 7)), k = (q - d) >> 1;
        box(X + k, Y + k, d, d, '#c9c4b9');
      } else if (e) {
        const i = Math.max(2, Math.round(q * 0.24));
        box(X + i, Y + i, q - 2 * i, q - 2 * i, COLORS.ink);
      }
    }
    // a ring of width w just outside a square
    const ring = (p, color, w) => {
      const c = p.dx - x0, r = p.dy + LAT;
      if (c < 0 || c >= cols) return;
      const X = mox + c * q + h - w, Y = r * q + h - w, S = s + 2 * w;
      box(X, Y, S, w, color); box(X, Y + S - w, S, w, color);
      box(X, Y, w, S, color); box(X + S - w, Y, w, S, color);
    };
    if (hover && (hover.dx !== sel.dx || hover.dy !== sel.dy)) ring(hover, COLORS.ink, Math.max(1, Math.round(q / 10)));
    ring(sel, outcomeAt(sel.dx, sel.dy) === 'puffers' ? COLORS.ink : COLORS.free, Math.max(2, Math.round(q / 6)));
  }
  const at = (e) => {
    const r = map.getBoundingClientRect();
    const c = Math.floor(((e.clientX - r.left) * (map.width / r.width) - mox) / q);
    const row = Math.floor((e.clientY - r.top) * (map.height / r.height) / q);
    if (c < 0 || c >= cols || row < 0 || row >= nrows) return null;
    const dx = x0 + c, dy = row - LAT;
    return outcomeAt(dx, dy) ? { dx, dy } : null;
  };
  const describe = (p) => `${where(p.dx, p.dy)}: ${words(read(outcomeAt(p.dx, p.dy)), p.dx)}.`;
  function choose(p, user) {
    sel = p; hover = null;
    hoverEl.textContent = describe(p);
    mdraw(); start();
    if (user) {
      clock.hold = 0; clock.setPlaying(true);
      const r = fig.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) fig.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'nearest' });
    }
  }
  map.addEventListener('click', (e) => { const p = at(e); if (p) choose(p, true); });
  map.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const p = at(e);
    if (p?.dx === hover?.dx && p?.dy === hover?.dy) return;
    hover = p;
    hoverEl.textContent = describe(p || sel);
    mdraw();
  });
  map.addEventListener('pointerleave', () => { hover = null; hoverEl.textContent = describe(sel); mdraw(); });
  map.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d) return;
    e.preventDefault();
    let { dx, dy } = sel;
    do { dx += d[0]; dy += d[1]; } while (Math.abs(dy) <= LAT && dx >= x0 && dx <= LON && !outcomeAt(dx, dy));
    if (Math.abs(dy) <= LAT && dx >= x0 && dx <= LON) choose({ dx, dy }, false);
    clock.hold = 0; clock.setPlaying(true);
  });
  map.setAttribute('role', 'img');
  map.setAttribute('aria-label', `A map of all ${total} places for a second domino near a first, coloured by what happens. Use the arrow keys to choose one.`);
  // opening a placement in the hero: the hero listens for #rle= links
  openEl.addEventListener('click', (e) => {
    e.preventDefault();
    const h = openEl.getAttribute('href');
    if (location.hash === h) history.replaceState(null, '', location.pathname + location.search);
    location.hash = h;
    scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  });
  new ResizeObserver(mlayout).observe(map.parentElement);
  hoverEl.textContent = describe(sel);
  start();
}

// ---------------------------------------------------------------------------
// Side by side: a second free ship beside a first, flying the same way. The fleet flies
// every flotilla and puffer together as one exact pattern, the camera moving with it at
// the speed of light (like the Wakes); the map shows every placement (abreast.js, every
// square checked by tests/abreast.test.mjs) and the stage plays whichever is chosen.
const FLEET_RUN = 1500;
const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen'];

function abreast() {
  const fleetFig = $('#fleet'), fig = $('#sstage'), map = $('#smap');
  if (!fleetFig || !fig || !map) return;
  const { E, DY, SHIP, MAP, OUT, FLEET, shipPair, outcomeAt, fleetLanes, fleetCells } = SB;
  const fill = (cls, v) => { for (const el of document.querySelectorAll(cls)) el.textContent = typeof v === 'number' ? v.toLocaleString('en') : v; };

  // ----- counts for the prose, from the data
  const n = { ' ': 0, '.': 0, '#': 0, o: 0, flotilla: 0, puffer: 0 };
  for (const rows of MAP) for (const row of rows) for (const c of row) n[c]++;
  for (const v of Object.values(OUT)) { const k = v.split(':')[1]; if (k in n) n[k]++; }
  const total = n['.'] + n['#'] + n.o;
  fill('.n-sb', total); fill('.n-sb-apart', n['.']); fill('.n-sb-touch', n['#'] + n.o);
  fill('.n-sb-boom', n['#']); fill('.n-sb-one', n.o - n.flotilla - n.puffer);
  fill('.n-sb-e', E); fill('.n-sb-dy', DY);
  const flots = FLEET.filter((f) => f.kind === 'flotilla').length;
  fill('.n-sb-keep', NUM[FLEET.length]); fill('.n-sb-flot-k', NUM[flots]); fill('.n-sb-puff-k', NUM[FLEET.length - flots]);

  const ahead = (e) => (e === 0 ? 'level' : `${Math.abs(e)} ${e > 0 ? 'ahead' : 'behind'}`);
  const across = (dy) => `${Math.abs(dy)} row${Math.abs(dy) === 1 ? '' : 's'} across`;
  const phaseWords = (ph) => (ph === 0 ? 'in step' : `${ph} generation${ph === 1 ? '' : 's'} ahead in its cycle`);
  const wakeWords = (w) => phrase(w).replace(/^an? /, 'a ');
  const fleetIndex = (ph, e, dy) => FLEET.findIndex((f) => [[f.ph, f.e, f.dy], ...f.also].some((p) => p[0] === ph && p[1] === e && p[2] === Math.abs(dy)));
  // numbered within their kind: flotilla 1-4, puffer 1-5
  const numberOf = (f) => FLEET.filter((x) => x.kind === f.kind).indexOf(f) + 1;
  const placeWords = (f) => `${phaseWords(f.ph)}, ${ahead(f.e)}, ${across(f.dy)}`;

  // ----- the flotillas: one tile each, the camera flying with them
  const ftiles = FLEET.filter((f) => f.kind === 'flotilla').map((f) => {
    const el = document.createElement('figure');
    el.className = 'stage-flot';
    el.setAttribute('role', 'listitem');
    el.innerHTML = '<div class="stage"><canvas></canvas><span class="stage-gen">gen <b>0</b></span></div><figcaption><b></b> <span></span><br><i></i></figcaption>';
    el.querySelector('figcaption b').textContent = numberOf(f);
    el.querySelector('figcaption span').textContent = `exactly two free ships, ${NUM[f.clean.length]} generations in six`;
    el.querySelector('figcaption i').textContent = placeWords(f);
    const canvas = el.querySelector('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `Flotilla ${numberOf(f)}: two free ships flying together forever, ${placeWords(f)}, simulated exactly.`);
    $('#flotillas').append(el);
    el.addEventListener('click', () => choose({ ph: f.ph, e: f.e, dy: f.dy }, true));
    const t = { f, el, gen: el.querySelector('.stage-gen b'), stage: new Stage(canvas), cur: Pattern.fromCells(shipPair(f.ph, f.e, f.dy)), prev: null };
    t.stage.onresize = () => tdraw(t);
    return t;
  });
  function tdraw(t) {
    const { W, H } = t.stage, f = t.f;
    const cs = Math.max(2, Math.floor(Math.min(W, H) / 26));
    // the pair's paths run from column g - 6 to g + e + 8 (the bodies in the front nine
    // columns, a spark trailing behind now and then), rows f.rows: centre on the bodies
    const ox = Math.round(W / 2 - (t.cur.gen + 4 + f.e / 2) * cs);
    const oy = Math.round(H / 2 - ((f.rows[0] + f.rows[1] + 1) / 2) * cs);
    t.stage.draw(t.cur, t.prev, cs, ox, oy);
    t.gen.textContent = t.cur.gen;
  }
  const tclock = new Clock($('#flotillas'), 6, () => {
    for (const t of ftiles) { t.prev = t.cur; t.cur = t.cur.next(); tdraw(t); }
  });
  for (const t of ftiles) tdraw(t);

  // ----- the fleet: the puffers
  const lanes = fleetLanes();
  const rowsTotal = lanes.at(-1).bottom - lanes[0].top + 1;
  const fstage = new Stage(fleetFig.querySelector('canvas'));
  const labels = fleetFig.querySelector('.fleet-labels');
  const fgen = $('#fleet-gen'), key = $('#fleet-key');
  fleetFig.querySelector('canvas').setAttribute('aria-label', `${NUM[lanes.length]} puffers, each two free ships flying side by side at the speed of light, simulated exactly as one pattern, with their trails.`);
  lanes.forEach(({ f }) => {
    const b = document.createElement('b');
    b.textContent = numberOf(f);
    labels.append(b);
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = '<b></b><span></span>';
    btn.querySelector('b').textContent = numberOf(f);
    btn.querySelector('span').textContent = `lays ${wakeWords(f.wake)} every six generations · ${placeWords(f)}`;
    btn.addEventListener('click', () => choose({ ph: f.ph, e: f.e, dy: f.dy }, true));
    li.append(btn);
    key.append(li);
  });
  // the camera's leading column: no cell of any lane is ever further right than g + 8 + e
  const maxE = Math.max(0, ...lanes.map(({ f }) => f.e));
  let fcs = 4, foy = 0, fstart = null, fcur = null, fprev = null;
  const P0 = Pattern.fromCells(fleetCells());
  function flayout() {
    const { W, dpr } = fstage;
    const css = W / dpr >= 700 ? 3 : 2;
    fcs = Math.max(2, Math.round(css * dpr));
    const H = (rowsTotal + 2) * fcs;
    fleetFig.querySelector('.stage').style.height = `${H / dpr}px`;
    foy = (1 - lanes[0].top) * fcs;
    labels.style.height = `${H / dpr}px`;
    lanes.forEach(({ top, bottom }, i) => {
      labels.children[i].style.top = `${(foy + ((top + bottom + 1) / 2) * fcs) / dpr}px`;
    });
    if (!fstart) {
      // open with the trails already spanning the stage
      let p = P0, q = null;
      for (let g = 0, g0 = Math.ceil(W / fcs); g < g0; g++) { q = p; p = p.next(); }
      fstart = { cur: p, prev: q };
      fcur = p; fprev = q;
    }
    fdraw();
  }
  function fdraw() {
    if (!fcur) return;
    const ox = fstage.W - (AHEAD + 1) * fcs - (fcur.gen + 8 + maxE) * fcs;
    fstage.draw(fcur, fprev, fcs, ox, foy);
    fgen.textContent = fcur.gen;
  }
  fstage.onresize = flayout;
  const fclock = new Clock(fleetFig, 10, () => {
    if (!fstart) return;
    if (fcur.gen >= fstart.cur.gen + FLEET_RUN) { fcur = fstart.cur; fprev = fstart.prev; }
    else { fprev = fcur; fcur = fcur.next(); }
    fdraw();
  });
  fleetFig.addEventListener('click', () => fclock.setPlaying(!fclock.playing));
  flayout();

  // ----- the stage: a chosen placement, from generation 0, the camera moving with the ships
  const read = (ph, e, dy) => {
    const c = outcomeAt(ph, e, dy);
    if (c === '#') return { kind: 'explodes', at: null };
    if (c === '.') return { kind: 'apart', at: null };
    const [at, rest] = c.split(':');
    if (rest === 'flotilla' || rest === 'puffer') { const f = FLEET[fleetIndex(ph, e, dy)]; return { kind: rest, at: +at, f, n: numberOf(f) }; }
    return parseOutcome(c);
  };
  const words = (o) => {
    if (o.kind === 'explodes') return 'explodes';
    if (o.kind === 'apart') return 'they never touch: each flies on exactly as if alone';
    if (o.kind === 'flotilla') return `flotilla ${o.n}: together forever, from gen ${o.at}`;
    if (o.kind === 'puffer') return `puffer ${o.n}: ${wakeWords(o.f.wake)} every six generations, from gen ${o.at}`;
    if (o.kind === 'nothing') return `nothing, gone by gen ${o.at}`;
    return `${phrase(o.objects)}, by gen ${o.at}`;
  };
  const where = (p) => `phase ${p.ph}, ${ahead(p.e)}, ${across(p.dy)}`;

  const canvas = fig.querySelector('canvas'), stage = new Stage(canvas);
  const genEl = fig.querySelector('.stage-gen b'), nameEl = $('#sstage-name');
  const resEl = $('#sstage-result'), statusEl = $('#sstage-status'), openEl = $('#sstage-open');
  const first = FLEET[0];
  let sel = { ph: first.ph, e: first.e, dy: first.dy }, o = null, cur = null, prev = null, cs = 8, oy = 0, end = 0, done = false;
  const still = () => reducedMotion.matches && !clock.playing;
  // the pair's paths run from column g - 6 (the first ship's tail) to g + e + 8: centre that
  const ox = () => Math.round(stage.W * 0.58 - (cur.gen + 1 + sel.e / 2) * cs);
  const inView = (p) => p.x0 * cs + ox() >= 0 && p.y0 * cs + oy >= 0 && (p.y0 + p.h) * cs + oy <= stage.H;

  function start() {
    o = read(sel.ph, sel.e, sel.dy);
    cur = Pattern.fromCells(shipPair(sel.ph, sel.e, sel.dy)); prev = null; done = false;
    statusEl.textContent = '';
    nameEl.textContent = where(sel);
    resEl.textContent = words(o);
    canvas.setAttribute('aria-label', `Two free ships side by side, ${where(sel)}, simulated exactly: ${words(o)}.`);
    openEl.href = encodeHash(Pattern.fromCells(shipPair(sel.ph, sel.e, sel.dy)));
    layout();
    if (still()) { while (!finished()) { prev = cur; cur = cur.next(); } draw(); }
  }
  function layout() {
    const { W, H } = stage;
    const want = Math.min(110, Math.max(64, Math.round(W / stage.dpr / 5)));
    cs = Math.max(2, Math.floor(Math.min(W / want, H / 36)));
    // rows -2 .. dy + 7 are the two ships' lanes (dy may be negative)
    oy = Math.round(H / 2 - ((Math.min(0, sel.dy) - 2 + Math.max(0, sel.dy) + 8) / 2) * cs);
    // clean runs last until what is left behind has streamed out of the frame
    const cols = Math.ceil(W / cs);
    end = o.kind === 'apart' ? 36 : o.kind === 'flotilla' ? o.at + 60 : (o.at ?? 0) + Math.ceil(cols * 0.6) + 8;
    draw();
  }
  function draw() {
    stage.draw(cur, prev, cs, ox(), oy);
    genEl.textContent = cur.gen;
    fig.classList.toggle('done', o.at !== null && cur.gen >= o.at);
  }
  function finished() {
    if (o.kind === 'explodes') {
      if (cur.population > 300 && !inView(cur)) { statusEl.textContent = 'still growing; stopped at the edge of the frame'; return true; }
      return cur.gen > 1500;
    }
    return cur.gen >= end;
  }
  const clock = new Clock(fig, 10, () => {
    if (done) { start(); clock.hold = 400; return; }
    prev = cur; cur = cur.next(); draw();
    if (finished()) { done = true; clock.hold = o.kind === 'explodes' ? 2600 : 2000; }
  });
  canvas.addEventListener('click', () => {
    const wasStill = still();
    clock.setPlaying(!clock.playing);
    if (wasStill) start();
  });
  stage.onresize = () => { if (cur) layout(); };

  // ----- the phase buttons
  const phases = $('#sphases');
  const pbtn = SHIP.map((cells, ph) => {
    const b = document.createElement('button');
    b.type = 'button';
    const x0 = Math.min(...cells.map((c) => c[0])), y0 = Math.min(...cells.map((c) => c[1]));
    b.append(sglyph(cells.map(([x, y]) => [x - x0, y - y0])));
    const t = document.createElement('span');
    t.textContent = `phase ${ph}`;
    b.append(t);
    b.setAttribute('aria-label', `Second ship ${phaseWords(ph)}`);
    b.addEventListener('click', () => {
      if (sel.ph === ph) return;
      // open on this phase's first flotilla or puffer; with none, keep the place if it can be
      const f = FLEET.find((x) => x.ph === ph);
      let p = f ? { ph, e: f.e, dy: f.dy } : { ph, e: sel.e, dy: sel.dy };
      if (outcomeAt(ph, p.e, p.dy) === ' ') p = { ph, e: 0, dy: DY - 2 };
      choose(p, false);
    });
    phases.append(b);
    return b;
  });

  // ----- the map: every place for the second ship, for the chosen phase
  const mctx = map.getContext('2d', { alpha: false });
  const cols = 2 * E + 1, nrows = 2 * DY + 1;
  let q = 8, mox = 0, hover = null;
  const hoverEl = $('#smap-hover');
  function mlayout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const W = Math.round(map.parentElement.clientWidth * dpr);
    q = Math.max(3, Math.min(Math.floor(W / cols), Math.round(22 * dpr)));
    mox = Math.floor((W - cols * q) / 2);
    if (map.width !== W || map.height !== nrows * q) {
      map.width = W; map.height = nrows * q;
      map.style.height = `${nrows * q / dpr}px`;
    }
    mdraw();
  }
  function mdraw() {
    const g = Math.max(1, Math.round(q * 0.14)), h = g >> 1, s = q - g;
    const box = (X, Y, w, ht, color) => { mctx.fillStyle = color; mctx.fillRect(X, Y, w, ht); };
    box(0, 0, map.width, map.height, COLORS.paper);
    // a ring of width w just outside a square
    const ring = (e, dy, color, w) => {
      const X = mox + (e + E) * q + h - w, Y = (dy + DY) * q + h - w, S = s + 2 * w;
      box(X, Y, S, w, color); box(X, Y + S - w, S, w, color);
      box(X, Y, w, S, color); box(X + S - w, Y, w, S, color);
    };
    for (let r = 0; r < nrows; r++) for (let c = 0; c < cols; c++) {
      const e = c - E, dy = r - DY, X = mox + c * q, Y = r * q;
      const v = outcomeAt(sel.ph, e, dy);
      if (v === '#') box(X + h, Y + h, s, s, '#d7d2c7');
      else if (v === '.') {
        const d = Math.max(1, Math.round(q / 7)), k = (q - d) >> 1;
        box(X + k, Y + k, d, d, '#c9c4b9');
      } else if (v === ' ') continue;
      else if (v.endsWith(':puffer')) box(X + h, Y + h, s, s, COLORS.free);
      else if (v.endsWith(':flotilla')) {
        const w = Math.max(2, Math.round(q * 0.2));
        box(X + h, Y + h, s, s, COLORS.free); box(X + h + w, Y + h + w, s - 2 * w, s - 2 * w, COLORS.paper);
      } else {
        const i = Math.max(2, Math.round(q * 0.24));
        box(X + i, Y + i, q - 2 * i, q - 2 * i, COLORS.ink);
      }
    }
    ring(0, 0, '#c9c4b9', Math.max(1, Math.round(q / 12)));
    if (hover && (hover.e !== sel.e || hover.dy !== sel.dy)) ring(hover.e, hover.dy, COLORS.ink, Math.max(1, Math.round(q / 10)));
    ring(sel.e, sel.dy, /:(puffer|flotilla)$/.test(outcomeAt(sel.ph, sel.e, sel.dy)) ? COLORS.ink : COLORS.free, Math.max(2, Math.round(q / 6)));
  }
  const at = (ev) => {
    const r = map.getBoundingClientRect();
    const c = Math.floor(((ev.clientX - r.left) * (map.width / r.width) - mox) / q);
    const row = Math.floor((ev.clientY - r.top) * (map.height / r.height) / q);
    if (c < 0 || c >= cols || row < 0 || row >= nrows) return null;
    const e = c - E, dy = row - DY;
    return outcomeAt(sel.ph, e, dy) !== ' ' ? { ph: sel.ph, e, dy } : null;
  };
  const describe = (p) => `${where(p)}: ${words(read(p.ph, p.e, p.dy))}.`;
  function choose(p, user) {
    sel = p; hover = null;
    pbtn.forEach((b, i) => b.setAttribute('aria-pressed', i === p.ph));
    hoverEl.textContent = describe(p);
    map.setAttribute('aria-label', `A map of every place for a second free ship in phase ${p.ph} beside the first, coloured by what happens. Use the arrow keys to choose one.`);
    mdraw(); start();
    if (user) {
      clock.hold = 0; clock.setPlaying(true);
      const r = fig.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) fig.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'nearest' });
    }
  }
  map.addEventListener('click', (ev) => { const p = at(ev); if (p) choose(p, true); });
  map.addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    const p = at(ev);
    if (p?.e === hover?.e && p?.dy === hover?.dy) return;
    hover = p;
    hoverEl.textContent = describe(p || sel);
    mdraw();
  });
  map.addEventListener('pointerleave', () => { hover = null; hoverEl.textContent = describe(sel); mdraw(); });
  map.addEventListener('keydown', (ev) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
    if (!d) return;
    ev.preventDefault();
    let { e, dy } = sel;
    do { e += d[0]; dy += d[1]; } while (Math.abs(dy) <= DY && Math.abs(e) <= E && outcomeAt(sel.ph, e, dy) === ' ');
    if (Math.abs(dy) <= DY && Math.abs(e) <= E) choose({ ph: sel.ph, e, dy }, false);
    clock.hold = 0; clock.setPlaying(true);
  });
  map.setAttribute('role', 'img');
  openEl.addEventListener('click', (ev) => {
    ev.preventDefault();
    const hh = openEl.getAttribute('href');
    if (location.hash === hh) history.replaceState(null, '', location.pathname + location.search);
    location.hash = hh;
    scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  });
  new ResizeObserver(mlayout).observe(map.parentElement);
  choose(sel, false);
}

// ---------------------------------------------------------------------------
// Head-on: two free ships flying at each other. Tiles play the meetings they pass
// through untouched; the map shows every meeting (headon.js, every square checked by
// tests/headon.test.mjs) and the stage plays whichever is chosen. The camera is fixed
// on the point where the two cross, (X0 + t - ph) / 2: A's body is centred near column
// g + 4 and B's near X0 + t - (g + ph) - 4.
function headon() {
  const fig = $('#hstage'), map = $('#hmap'), tilesEl = $('#passings');
  if (!fig || !map || !tilesEl) return;
  const { X0, T, DY, MAP, headPair, mirror, outcomeAt } = HO;
  const fill = (cls, v) => { for (const el of document.querySelectorAll(cls)) el.textContent = typeof v === 'number' ? v.toLocaleString('en') : v; };
  const kindOf = (v) => v === '.' ? 'apart' : v === '#' ? 'explodes' : v.endsWith(':nothing') ? 'nothing'
    : v.includes('freeship') ? 'through' : 'debris';

  // ----- counts for the prose, from the data (mirror images once)
  const n = { apart: 0, explodes: 0, nothing: 0, debris: 0, through: 0 }, seen = new Set(), passes = [];
  let squares = 0, clean = 0;
  for (let dy = 0; dy <= DY; dy++) for (let ph = 0; ph < 6; ph++) for (let t = 0; t < T; t++) {
    squares++;
    const v = outcomeAt(ph, t, dy), k = kindOf(v), [p2, t2] = mirror(ph, t);
    const id = `${Math.min(ph * T + t, p2 * T + t2)},${dy}`;
    if (seen.has(id)) continue;
    seen.add(id); n[k]++;
    if (k === 'through') {
      // show the mirror pair's member with the lower phase
      const [P, Tt] = p2 < ph ? [p2, t2] : [ph, t];
      const o = parseOutcome(outcomeAt(P, Tt, dy));
      const { freeship, ...left } = o.objects;
      if (!Object.keys(left).length) clean++;
      passes.push({ ph: P, t: Tt, dy, at: o.at, left, size: Object.values(left).reduce((a, b) => a + b, 0) });
    }
  }
  passes.sort((a, b) => a.size - b.size || (b.left.dot ? 1 : 0) - (a.left.dot ? 1 : 0) || b.dy - a.dy || a.ph - b.ph);
  fill('.n-ho', seen.size); fill('.n-ho-boom', n.explodes); fill('.n-ho-through', NUM[n.through]);
  fill('.n-ho-gone', n.nothing); fill('.n-ho-debris', n.debris); fill('.n-ho-apart', n.apart);
  fill('.n-ho-sq', squares); fill('.n-ho-dy', DY);
  fill('.n-ho-clean-k', NUM[clean].replace(/^./, (c) => c.toUpperCase()));

  const across = (dy) => (dy === 0 ? 'exactly in line' : `${dy} row${dy === 1 ? '' : 's'} across`);
  const where = (p) => `${across(p.dy)}, phase ${p.ph}, timing ${p.t}`;
  const leaves = (left) => (Object.keys(left).length ? `leaving ${phrase(left)}` : 'leaving no trace');
  const centre = (p) => [(X0 + p.t - p.ph) / 2 + 0.5, (p.dy + 6) / 2];

  // ----- the tiles: every way they pass through each other
  const tiles = passes.map((p, i) => {
    const el = document.createElement('figure');
    el.className = 'stage-flot';
    el.setAttribute('role', 'listitem');
    el.innerHTML = '<div class="stage"><canvas></canvas><span class="stage-gen">gen <b>0</b></span></div><figcaption><b></b> <span></span><br><i></i></figcaption>';
    el.querySelector('figcaption b').textContent = i + 1;
    el.querySelector('figcaption span').textContent = `they pass, ${leaves(p.left)}`;
    el.querySelector('figcaption i').textContent = where(p);
    const canvas = el.querySelector('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `Two free ships meeting head-on, ${where(p)}, simulated exactly: they pass through each other, ${leaves(p.left)}.`);
    tilesEl.append(el);
    el.addEventListener('click', () => choose({ ph: p.ph, t: p.t, dy: p.dy }, true));
    const tile = { p, el, gen: el.querySelector('.stage-gen b'), stage: new Stage(canvas), cur: null, prev: null, cs: 4, end: 0 };
    tile.reset = () => {
      tile.cur = Pattern.fromCells(headPair(p.ph, p.t, p.dy)); tile.prev = null;
      // reduced motion: hold the frame just after they pass, both ships still in view
      if (reducedMotion.matches && !tile.clock?.playing) for (let g = 0; g < p.at + 2; g++) { tile.prev = tile.cur; tile.cur = tile.cur.next(); }
    };
    tile.draw = () => {
      const { W, H } = tile.stage;
      const cs = tile.cs = Math.max(2, Math.floor(Math.min(W / 44, H / 30)));
      const [cx, cy] = centre(p);
      // both ships are gone once A's tail (column >= g - 6) is past the right edge
      tile.end = Math.ceil(cx + W / cs / 2 + 7);
      tile.stage.draw(tile.cur, tile.prev, cs, Math.round(W / 2 - cx * cs), Math.round(H / 2 - cy * cs));
      tile.gen.textContent = tile.cur.gen;
    };
    tile.clock = new Clock(el, 10, () => {
      if (tile.cur.gen >= tile.end) { tile.reset(); tile.clock.hold = 900; }
      else { tile.prev = tile.cur; tile.cur = tile.cur.next(); }
      tile.draw();
    });
    tile.stage.onresize = () => tile.draw();
    tile.reset(); tile.draw();
    return tile;
  });
  const note = document.createElement('p');
  note.className = 'ho-note';
  note.textContent = 'Both, or neither. No meeting leaves one ship.';
  if (tiles.length % 4) tilesEl.append(note);

  // ----- the stage
  const read = (v) => v === '#' ? { kind: 'explodes', at: null } : v === '.' ? { kind: 'apart', at: null } : parseOutcome(v);
  const words = (o) => {
    if (o.kind === 'explodes') return 'explodes';
    if (o.kind === 'apart') return 'they never touch: each flies on exactly as if alone';
    if (o.kind === 'nothing') return `they annihilate: nothing is left, by gen ${o.at}`;
    const { freeship, ...left } = o.objects;
    if (freeship) return `they pass through each other untouched, ${leaves(left)}, by gen ${o.at}`;
    return `both ships destroyed, leaving ${phrase(o.objects)}, by gen ${o.at}`;
  };
  const canvas = fig.querySelector('canvas'), stage = new Stage(canvas);
  const genEl = fig.querySelector('.stage-gen b'), nameEl = $('#hstage-name');
  const resEl = $('#hstage-result'), statusEl = $('#hstage-status'), openEl = $('#hstage-open');
  const firstGone = (() => { for (let ph = 0; ph < 6; ph++) for (let t = 0; t < T; t++) if (kindOf(outcomeAt(ph, t, 0)) === 'nothing') return { ph, t, dy: 0 }; })();
  let sel = firstGone, o = null, cur = null, prev = null, cs = 8, ox = 0, oy = 0, end = 0, done = false;
  const still = () => reducedMotion.matches && !clock.playing;
  const inView = (q) => q.x0 * cs + ox >= 0 && (q.x0 + q.w) * cs + ox <= stage.W && q.y0 * cs + oy >= 0 && (q.y0 + q.h) * cs + oy <= stage.H;

  function start() {
    o = read(outcomeAt(sel.ph, sel.t, sel.dy));
    cur = Pattern.fromCells(headPair(sel.ph, sel.t, sel.dy)); prev = null; done = false;
    statusEl.textContent = '';
    nameEl.textContent = where(sel);
    resEl.textContent = words(o);
    canvas.setAttribute('aria-label', `Two free ships meeting head-on, ${where(sel)}, simulated exactly: ${words(o)}.`);
    openEl.href = encodeHash(Pattern.fromCells(headPair(sel.ph, sel.t, sel.dy)));
    layout();
    if (still()) { while (!finished()) { prev = cur; cur = cur.next(); } draw(); }
  }
  function layout() {
    const { W, H } = stage;
    const want = Math.min(110, Math.max(64, Math.round(W / stage.dpr / 5)));
    cs = Math.max(2, Math.floor(Math.min(W / want, H / 30)));
    const [cx, cy] = centre(sel);
    ox = Math.round(W / 2 - cx * cs); oy = Math.round(H / 2 - cy * cs);
    // clean runs last until anything moving has left the frame (ships fly one cell per
    // generation, from the centre), and debris has been seen for a while
    const out = Math.ceil(cx + W / cs / 2 + 7);
    end = o.kind === 'apart' || (o.kind === 'objects' && o.objects.freeship) ? Math.max(out, (o.at ?? 0) + 12)
      : (o.at ?? 0) + 30;
    draw();
  }
  function draw() {
    stage.draw(cur, prev, cs, ox, oy);
    genEl.textContent = cur.gen;
    fig.classList.toggle('done', o.at !== null && cur.gen >= o.at);
  }
  function finished() {
    if (o.kind === 'explodes') {
      if (cur.population > 300 && !inView(cur)) { statusEl.textContent = 'still growing; stopped at the edge of the frame'; return true; }
      return cur.gen > 1500;
    }
    return cur.gen >= end;
  }
  const clock = new Clock(fig, 10, () => {
    if (done) { start(); clock.hold = 400; return; }
    prev = cur; cur = cur.next(); draw();
    if (finished()) { done = true; clock.hold = o.kind === 'explodes' ? 2600 : 2000; }
  });
  canvas.addEventListener('click', () => {
    const wasStill = still();
    clock.setPlaying(!clock.playing);
    if (wasStill) start();
  });
  stage.onresize = () => { if (cur) layout(); };

  // ----- the map: one block of T timings by DY + 1 distances for each phase
  const mctx = map.getContext('2d', { alpha: false });
  const nrows = DY + 1;
  let q = 8, per = 6, mox = 0, top = 16, gap = 8, hover = null, dpr = 1;
  const hoverEl = $('#hmap-hover');
  // block origin for phase ph
  const bx = (ph) => mox + (ph % per) * (T * q + gap);
  const by = (ph) => Math.floor(ph / per) * (top + nrows * q + gap) + top;
  function mlayout() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    const W = Math.round(map.parentElement.clientWidth * dpr);
    // six blocks in a row if the squares can be 11 CSS px or more, else three, else two
    for (per of [6, 3, 2]) {
      gap = Math.round(14 * dpr);
      q = Math.min(Math.round(22 * dpr), Math.floor((W - (per - 1) * gap) / (per * T)));
      if (q >= 11 * dpr || per === 2) break;
    }
    top = Math.round(18 * dpr);
    mox = Math.floor((W - per * T * q - (per - 1) * gap) / 2);
    const H = (6 / per) * (top + nrows * q + gap) - gap;
    if (map.width !== W || map.height !== H) {
      map.width = W; map.height = H;
      map.style.height = `${H / dpr}px`;
    }
    mdraw();
  }
  function mdraw() {
    const g = Math.max(1, Math.round(q * 0.14)), h = g >> 1, s = q - g;
    const box = (X, Y, w, ht, color) => { mctx.fillStyle = color; mctx.fillRect(X, Y, w, ht); };
    const ring = (X, Y, S, w, color) => { box(X, Y, S, w, color); box(X, Y + S - w, S, w, color); box(X, Y, w, S, color); box(X + S - w, Y, w, S, color); };
    box(0, 0, map.width, map.height, COLORS.paper);
    mctx.font = `${Math.round(11 * dpr)}px ${getComputedStyle(document.body).getPropertyValue('--mono') || 'monospace'}`;
    mctx.textBaseline = 'alphabetic';
    for (let ph = 0; ph < 6; ph++) {
      const X0b = bx(ph), Y0b = by(ph);
      mctx.fillStyle = sel.ph === ph ? COLORS.ink : '#77736a';
      mctx.fillText(`phase ${ph}`, X0b + h, Y0b - Math.round(6 * dpr));
      for (let dy = 0; dy < nrows; dy++) for (let t = 0; t < T; t++) {
        const X = X0b + t * q, Y = Y0b + dy * q, v = outcomeAt(ph, t, dy), k = kindOf(v);
        if (k === 'explodes') box(X + h, Y + h, s, s, '#d7d2c7');
        else if (k === 'apart') { const d = Math.max(1, Math.round(q / 7)), c = (q - d) >> 1; box(X + c, Y + c, d, d, '#c9c4b9'); }
        else if (k === 'through') { box(X + h, Y + h, s, s, COLORS.free); const w = Math.max(2, Math.round(q * 0.2)); box(X + h + w, Y + h + w, s - 2 * w, s - 2 * w, COLORS.paper); }
        else if (k === 'nothing') { const i = Math.max(2, Math.round(q * 0.2)); ring(X + i, Y + i, q - 2 * i, Math.max(1, Math.round(q / 12)), COLORS.ink); }
        else { const i = Math.max(2, Math.round(q * 0.24)); box(X + i, Y + i, q - 2 * i, q - 2 * i, COLORS.ink); }
      }
    }
    const mark = (p, color, w) => ring(bx(p.ph) + p.t * q + h - w, by(p.ph) + p.dy * q + h - w, s + 2 * w, w, color);
    if (hover && (hover.ph !== sel.ph || hover.t !== sel.t || hover.dy !== sel.dy)) mark(hover, COLORS.ink, Math.max(1, Math.round(q / 10)));
    mark(sel, kindOf(outcomeAt(sel.ph, sel.t, sel.dy)) === 'through' ? COLORS.ink : COLORS.free, Math.max(2, Math.round(q / 6)));
  }
  const at = (ev) => {
    const r = map.getBoundingClientRect();
    const X = (ev.clientX - r.left) * (map.width / r.width), Y = (ev.clientY - r.top) * (map.height / r.height);
    for (let ph = 0; ph < 6; ph++) {
      const t = Math.floor((X - bx(ph)) / q), dy = Math.floor((Y - by(ph)) / q);
      if (t >= 0 && t < T && dy >= 0 && dy < nrows) return { ph, t, dy };
    }
    return null;
  };
  const describe = (p) => `${where(p)}: ${words(read(outcomeAt(p.ph, p.t, p.dy)))}.`;
  function choose(p, user) {
    sel = p; hover = null;
    hoverEl.textContent = describe(p);
    mdraw(); start();
    if (user) {
      clock.hold = 0; clock.setPlaying(true);
      const r = fig.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) fig.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'nearest' });
    }
  }
  map.addEventListener('click', (ev) => { const p = at(ev); if (p) choose(p, true); });
  map.addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    const p = at(ev);
    if (p?.ph === hover?.ph && p?.t === hover?.t && p?.dy === hover?.dy) return;
    hover = p;
    hoverEl.textContent = describe(p || sel);
    mdraw();
  });
  map.addEventListener('pointerleave', () => { hover = null; hoverEl.textContent = describe(sel); mdraw(); });
  map.addEventListener('keydown', (ev) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
    if (!d) return;
    ev.preventDefault();
    // left and right run on through the phases, as if the blocks were one long row
    const i = sel.ph * T + sel.t + d[0], dy = sel.dy + d[1];
    if (i < 0 || i >= 6 * T || dy < 0 || dy > DY) return;
    choose({ ph: Math.floor(i / T), t: i % T, dy }, false);
    clock.hold = 0; clock.setPlaying(true);
  });
  map.setAttribute('role', 'img');
  map.setAttribute('aria-label', `A map of all ${squares} ways two free ships can meet head-on, in six blocks, one for each phase of the second ship, coloured by what happens. Use the arrow keys to choose one.`);
  openEl.addEventListener('click', (ev) => {
    ev.preventDefault();
    const hh = openEl.getAttribute('href');
    if (location.hash === hh) history.replaceState(null, '', location.pathname + location.search);
    location.hash = hh;
    scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  });
  new ResizeObserver(mlayout).observe(map.parentElement);
  choose(sel, false);
}

// ---------------------------------------------------------------------------
// Crossing: two free ships at right angles. Tiles play the two crossings in which one
// ship erases the other without a trace; the map shows every crossing (crossing.js,
// every square checked by tests/crossing.test.mjs) and the stage plays whichever is
// chosen. The camera is fixed on the crossing: A's path is rows 0..5, B's columns
// bx..bx + 5 (bx = X + u). A's body is near column g + 4; B's near row by + g + 4.
function crossing() {
  const fig = $('#cstage'), map = $('#cmap'), tilesEl = $('#crossings');
  if (!fig || !map || !tilesEl) return;
  const { X, D, crossPair, mirror, outcomeAt } = CR;
  const fill = (cls, v) => { for (const el of document.querySelectorAll(cls)) el.textContent = typeof v === 'number' ? v.toLocaleString('en') : v; };
  const kindOf = (v) => v === '.' ? 'apart' : v === '#' ? 'explodes' : v.endsWith(':nothing') ? 'nothing'
    : /\((A|B)\)$/.test(v) ? (/:freeship \([AB]\)$/.test(v) ? 'clean' : 'one') : 'debris';
  const read = (v) => {
    if (v === '#') return { kind: 'explodes', at: null };
    if (v === '.') return { kind: 'apart', at: null };
    const who = v.match(/\((A|B)\)$/)?.[1] ?? null;
    return { ...parseOutcome(v.replace(/ \([AB]\)$/, '')), who };
  };

  // ----- counts for the prose, from the data (mirror images once)
  const n = { apart: 0, explodes: 0, nothing: 0, debris: 0, one: 0, clean: 0 }, seen = new Set(), cleans = [];
  let squares = 0, lagmin = Infinity;
  for (let ph = 0; ph < 6; ph++) for (let u = 0; u < 6; u++) for (let d = -D; d <= D; d++) {
    squares++;
    const v = outcomeAt(ph, u, d), k = kindOf(v);
    if (k === 'one' || k === 'clean') lagmin = Math.min(lagmin, Math.abs(d));
    const id = [[ph, u, d], mirror(ph, u, d)].map((a) => a.join()).sort()[0];
    if (seen.has(id)) continue;
    seen.add(id); n[k]++;
    if (k === 'clean') cleans.push({ ph, u, d });
  }
  const touch = seen.size - n.apart, ones = n.one + n.clean;
  fill('.n-cr', seen.size); fill('.n-cr-touch', touch); fill('.n-cr-boom', n.explodes);
  fill('.n-cr-one', NUM[ones] ?? ones); fill('.n-cr-apart', n.apart); fill('.n-cr-sq', squares);
  fill('.n-cr-d', D); fill('.n-cr-lagmin', lagmin);
  fill('.n-cr-clean-k', (NUM[n.clean] ?? String(n.clean)).replace(/^./, (c) => c.toUpperCase()));

  const lag = (d) => d === 0 ? 'both reach the crossing together'
    : `the ship flying ${d > 0 ? 'down' : 'right'} arrives ${Math.abs(d)} generation${Math.abs(d) === 1 ? '' : 's'} late`;
  const where = (p) => `phase ${p.ph}, timing ${p.u}: ${lag(p.d)}`;
  const ship = (who) => `the ship flying ${who === 'A' ? 'right' : 'down'}`;
  const words = (o) => {
    if (o.kind === 'explodes') return 'explodes';
    if (o.kind === 'apart') return 'they never touch: each flies on exactly as if alone';
    if (o.kind === 'nothing') return `they annihilate: nothing is left, by gen ${o.at}`;
    const { freeship, ...left } = o.objects;
    if (freeship) return `${ship(o.who)} flies on untouched; the other is gone, ${Object.keys(left).length ? `leaving ${phrase(left)}` : 'leaving no trace'}, by gen ${o.at}`;
    return `both ships destroyed, leaving ${phrase(o.objects)}, by gen ${o.at}`;
  };
  const centre = (p) => [X + p.u + 3, 3];
  // the two paths, faint, under the cells
  const paths = (p, cs, ox, oy, W, H) => (ctx) => {
    ctx.fillStyle = COLORS.path;
    ctx.fillRect(0, oy, W, 6 * cs);
    ctx.fillRect(ox + (X + p.u) * cs, 0, 6 * cs, H);
  };
  // the generation by which the ships still flying (`who`: 'A', 'B' or both) have left
  // a view of half-size (hw, hh) cells around the crossing: A's tail is at column
  // >= g - 6, B's at row >= by + g - 6
  const gone = (p, who, hw, hh) => {
    const [cx, cy] = centre(p), by = -(X + p.u) - p.d;
    return Math.ceil(Math.max(who.includes('A') ? cx + hw + 7 : 0, who.includes('B') ? cy + hh + 7 - by : 0));
  };

  // ----- the tiles: the crossings that leave nothing but the ship that came first. One
  // of each mirror pair is shown; show the first with the ship flying right surviving
  // and the second with the ship flying down, so both are seen.
  const shown = cleans.sort((a, b) => Math.abs(a.d) - Math.abs(b.d))
    .map((p, i) => { const m = mirror(p.ph, p.u, p.d); const q = { ph: m[0], u: m[1], d: m[2] }; return (i % 2 ? p.d < 0 : p.d > 0) ? p : q; });
  for (const [i, p] of shown.entries()) {
    const o = read(outcomeAt(p.ph, p.u, p.d));
    const el = document.createElement('figure');
    el.className = 'stage-flot';
    el.setAttribute('role', 'listitem');
    el.innerHTML = '<div class="stage"><canvas></canvas><span class="stage-gen">gen <b>0</b></span></div><figcaption><b></b> <span></span><br><i></i></figcaption>';
    el.querySelector('figcaption b').textContent = i + 1;
    el.querySelector('figcaption span').textContent = `${ship(o.who)} flies on; the other leaves no trace`;
    el.querySelector('figcaption i').textContent = where(p);
    const canvas = el.querySelector('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `Two free ships crossing at right angles, ${where(p)}, simulated exactly: ${words(o)}.`);
    tilesEl.append(el);
    el.addEventListener('click', () => choose(p, true));
    const tile = { stage: new Stage(canvas), gen: el.querySelector('.stage-gen b'), cur: null, prev: null, end: 0 };
    tile.reset = () => {
      tile.cur = Pattern.fromCells(crossPair(p.ph, p.u, p.d)); tile.prev = null;
      // reduced motion: hold the frame just after the meeting, the survivor in view
      if (reducedMotion.matches && !tile.clock?.playing) for (let g = 0; g < o.at + 2; g++) { tile.prev = tile.cur; tile.cur = tile.cur.next(); }
    };
    tile.draw = () => {
      const { W, H } = tile.stage;
      // about 60 cells across, fewer on small tiles so cells stay at least 5 CSS px
      const across = Math.max(30, Math.min(60, W / tile.stage.dpr / 5));
      const cs = Math.max(2, Math.floor(Math.min(W / across, H / (across * 0.75))));
      const [cx, cy] = centre(p);
      const ox = Math.round(W / 2 - cx * cs), oy = Math.round(H / 2 - cy * cs);
      tile.end = Math.max(gone(p, o.who, W / cs / 2, H / cs / 2), o.at + 12);
      tile.stage.draw(tile.cur, tile.prev, cs, ox, oy, { under: paths(p, cs, ox, oy, W, H) });
      tile.gen.textContent = tile.cur.gen;
    };
    tile.clock = new Clock(el, 10, () => {
      if (tile.cur.gen >= tile.end) { tile.reset(); tile.clock.hold = 900; }
      else { tile.prev = tile.cur; tile.cur = tile.cur.next(); }
      tile.draw();
    });
    tile.stage.onresize = () => tile.draw();
    tile.reset(); tile.draw();
  }
  const note = document.createElement('p');
  note.className = 'ho-note';
  note.textContent = 'One, or neither. No crossing lets both ships through.';
  tilesEl.append(note);

  // ----- the stage
  const canvas = fig.querySelector('canvas'), stage = new Stage(canvas);
  const genEl = fig.querySelector('.stage-gen b'), nameEl = $('#cstage-name');
  const resEl = $('#cstage-result'), statusEl = $('#cstage-status'), openEl = $('#cstage-open');
  let sel = shown[0] ?? { ph: 0, u: 0, d: 0 }, o = null, cur = null, prev = null, cs = 8, ox = 0, oy = 0, end = 0, done = false;
  const still = () => reducedMotion.matches && !clock.playing;
  const inView = (q) => q.x0 * cs + ox >= 0 && (q.x0 + q.w) * cs + ox <= stage.W && q.y0 * cs + oy >= 0 && (q.y0 + q.h) * cs + oy <= stage.H;

  function start() {
    o = read(outcomeAt(sel.ph, sel.u, sel.d));
    cur = Pattern.fromCells(crossPair(sel.ph, sel.u, sel.d)); prev = null; done = false;
    statusEl.textContent = '';
    nameEl.textContent = where(sel);
    resEl.textContent = words(o);
    canvas.setAttribute('aria-label', `Two free ships crossing at right angles, ${where(sel)}, simulated exactly: ${words(o)}.`);
    openEl.href = encodeHash(Pattern.fromCells(crossPair(sel.ph, sel.u, sel.d)));
    layout();
    if (still()) { while (!finished()) { prev = cur; cur = cur.next(); } draw(); }
  }
  function layout() {
    const { W, H } = stage;
    const want = Math.min(100, Math.max(56, Math.round(W / stage.dpr / 6)));
    cs = Math.max(2, Math.floor(Math.min(W / want, H / 44)));
    const [cx, cy] = centre(sel);
    ox = Math.round(W / 2 - cx * cs); oy = Math.round(H / 2 - cy * cs);
    // clean runs last until every ship has left the frame, and debris has been seen
    // for a while
    const out = gone(sel, o.who ?? 'AB', W / cs / 2, H / cs / 2);
    end = o.kind === 'apart' || o.who ? Math.max(out, (o.at ?? 0) + 12) : (o.at ?? 0) + 30;
    draw();
  }
  function draw() {
    stage.draw(cur, prev, cs, ox, oy, { under: paths(sel, cs, ox, oy, stage.W, stage.H) });
    genEl.textContent = cur.gen;
    fig.classList.toggle('done', o.at !== null && cur.gen >= o.at);
  }
  function finished() {
    if (o.kind === 'explodes') {
      if (cur.population > 300 && !inView(cur)) { statusEl.textContent = 'still growing; stopped at the edge of the frame'; return true; }
      return cur.gen > 1500;
    }
    return cur.gen >= end;
  }
  const clock = new Clock(fig, 10, () => {
    if (done) { start(); clock.hold = 400; return; }
    prev = cur; cur = cur.next(); draw();
    if (finished()) { done = true; clock.hold = o.kind === 'explodes' ? 2600 : 2000; }
  });
  canvas.addEventListener('click', () => {
    const wasStill = still();
    clock.setPlaying(!clock.playing);
    if (wasStill) start();
  });
  stage.onresize = () => { if (cur) layout(); };

  // ----- the map: one block of six timings (rows) for each phase; across, the lag d
  const mctx = map.getContext('2d', { alpha: false });
  const ncols = 2 * D + 1;
  let q = 8, gut = 40, top = 22, gap = 6, hover = null, dpr = 1, mox = 0;
  const hoverEl = $('#cmap-hover');
  const rowY = (ph, u) => top + ph * (6 * q + gap) + u * q;
  const colX = (d) => mox + gut + (d + D) * q;
  function mlayout() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    const W = Math.round(map.parentElement.clientWidth * dpr);
    gut = Math.round(46 * dpr);
    q = Math.max(4, Math.min(Math.round(14 * dpr), Math.floor((W - gut) / ncols)));
    if (W < 520 * dpr) { gut = Math.round(30 * dpr); q = Math.max(4, Math.min(Math.round(14 * dpr), Math.floor((W - gut) / ncols))); }
    gap = Math.max(3, Math.round(q * 0.6));
    top = Math.round(22 * dpr);
    mox = Math.floor((W - gut - ncols * q) / 2);
    const H = top + 6 * (6 * q + gap) - gap + 2;
    if (map.width !== W || map.height !== H) {
      map.width = W; map.height = H;
      map.style.height = `${H / dpr}px`;
    }
    mdraw();
  }
  function mdraw() {
    const g = Math.max(1, Math.round(q * 0.14)), h = g >> 1, s = q - g;
    const box = (X0, Y0, w, ht, color) => { mctx.fillStyle = color; mctx.fillRect(X0, Y0, w, ht); };
    const ring = (X0, Y0, S, w, color) => { box(X0, Y0, S, w, color); box(X0, Y0 + S - w, S, w, color); box(X0, Y0, w, S, color); box(X0 + S - w, Y0, w, S, color); };
    box(0, 0, map.width, map.height, COLORS.paper);
    const small = Math.round(11 * dpr);
    mctx.font = `${small}px ${getComputedStyle(document.body).getPropertyValue('--mono') || 'monospace'}`;
    mctx.textBaseline = 'alphabetic';
    // the line where both arrive together, and which side is which
    const mid = colX(0) + (q >> 1);
    box(mid, top - Math.round(6 * dpr), Math.max(1, Math.round(dpr)), map.height - top + Math.round(6 * dpr), '#c9c4b9');
    mctx.fillStyle = '#77736a';
    mctx.textAlign = 'right';
    mctx.fillText('← down first', mid - Math.round(6 * dpr), top - Math.round(8 * dpr));
    mctx.textAlign = 'left';
    mctx.fillText('right first →', mid + Math.round(6 * dpr), top - Math.round(8 * dpr));
    for (let ph = 0; ph < 6; ph++) {
      mctx.fillStyle = sel.ph === ph ? COLORS.ink : '#77736a';
      mctx.textAlign = 'right';
      mctx.fillText(gut > 40 * dpr ? `phase ${ph}` : `${ph}`, mox + gut - Math.round(8 * dpr), rowY(ph, 0) + Math.min(small, 6 * q) );
      for (let u = 0; u < 6; u++) for (let d = -D; d <= D; d++) {
        const X0 = colX(d), Y0 = rowY(ph, u), k = kindOf(outcomeAt(ph, u, d));
        if (k === 'explodes') box(X0 + h, Y0 + h, s, s, '#d7d2c7');
        else if (k === 'apart') { const dd = Math.max(1, Math.round(q / 7)), c = (q - dd) >> 1; box(X0 + c, Y0 + c, dd, dd, '#c9c4b9'); }
        else if (k === 'clean') box(X0 + h, Y0 + h, s, s, COLORS.free);
        else if (k === 'one') { box(X0 + h, Y0 + h, s, s, COLORS.free); const w = Math.max(1, Math.round(q * 0.2)); box(X0 + h + w, Y0 + h + w, s - 2 * w, s - 2 * w, COLORS.paper); }
        else if (k === 'nothing') { const i = Math.max(2, Math.round(q * 0.2)); ring(X0 + i, Y0 + i, q - 2 * i, Math.max(1, Math.round(q / 12)), COLORS.ink); }
        else { const i = Math.max(2, Math.round(q * 0.24)); box(X0 + i, Y0 + i, q - 2 * i, q - 2 * i, COLORS.ink); }
      }
    }
    mctx.textAlign = 'left';
    const mark = (p, color, w) => ring(colX(p.d) + h - w, rowY(p.ph, p.u) + h - w, s + 2 * w, w, color);
    const same = (a, b) => a && b && a.ph === b.ph && a.u === b.u && a.d === b.d;
    if (hover && !same(hover, sel)) mark(hover, COLORS.ink, Math.max(1, Math.round(q / 10)));
    mark(sel, /one|clean/.test(kindOf(outcomeAt(sel.ph, sel.u, sel.d))) ? COLORS.ink : COLORS.free, Math.max(2, Math.round(q / 6)));
  }
  const at = (ev) => {
    const r = map.getBoundingClientRect();
    const Xp = (ev.clientX - r.left) * (map.width / r.width), Yp = (ev.clientY - r.top) * (map.height / r.height);
    const d = Math.floor((Xp - colX(-D)) / q) - D;
    if (d < -D || d > D) return null;
    for (let ph = 0; ph < 6; ph++) {
      const u = Math.floor((Yp - rowY(ph, 0)) / q);
      if (u >= 0 && u < 6) return { ph, u, d };
    }
    return null;
  };
  const describe = (p) => `${where(p)}. ${words(read(outcomeAt(p.ph, p.u, p.d))).replace(/^./, (c) => c.toUpperCase())}.`;
  function choose(p, user) {
    sel = p; hover = null;
    hoverEl.textContent = describe(p);
    mdraw(); start();
    if (user) {
      clock.hold = 0; clock.setPlaying(true);
      const r = fig.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) fig.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'nearest' });
    }
  }
  map.addEventListener('click', (ev) => { const p = at(ev); if (p) choose(p, true); });
  map.addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    const p = at(ev);
    if (p?.ph === hover?.ph && p?.u === hover?.u && p?.d === hover?.d) return;
    hover = p;
    hoverEl.textContent = describe(p || sel);
    mdraw();
  });
  map.addEventListener('pointerleave', () => { hover = null; hoverEl.textContent = describe(sel); mdraw(); });
  map.addEventListener('keydown', (ev) => {
    const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
    if (!k) return;
    ev.preventDefault();
    // up and down run on through the phases, as if the blocks were one long column
    const d = sel.d + k[0], i = sel.ph * 6 + sel.u + k[1];
    if (d < -D || d > D || i < 0 || i >= 36) return;
    choose({ ph: Math.floor(i / 6), u: i % 6, d }, false);
    clock.hold = 0; clock.setPlaying(true);
  });
  map.setAttribute('role', 'img');
  map.setAttribute('aria-label', `A map of all ${squares.toLocaleString('en')} ways two free ships can cross at right angles, in six blocks, one for each phase of the ship flying down, coloured by what happens. Use the arrow keys to choose one.`);
  openEl.addEventListener('click', (ev) => {
    ev.preventDefault();
    const hh = openEl.getAttribute('href');
    if (location.hash === hh) history.replaceState(null, '', location.pathname + location.search);
    location.hash = hh;
    scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  });
  new ResizeObserver(mlayout).observe(map.parentElement);
  choose(sel, false);
}

// Every section heading gets a link to itself, so a study can be shared directly.
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
    el.innerHTML = '<div class="stage"><canvas role="img"></canvas><span class="stage-gen">gen <b>0</b></span></div><figcaption><span></span><br><i></i></figcaption>';
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
collisions();
wall(diamonds());
four();
fivePuffers();
fiveCensus();
dominoes();
abreast();
headon();
crossing();
slow();
anchors();
reducedMotion.addEventListener?.('change', wake);
