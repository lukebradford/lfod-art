import { Pattern, Field, nextState } from './lfod.js';
import { CATALOG, PUFFERS, byId } from './catalog.js';
import { Stage, Clock, reducedMotion, wake, paintField, COLORS } from './stage.js';
import { encodeHash, decodeHash } from './share.js';
import { TARGETS, targetById, setup, parseOutcome, allCollisions, shortLabel, sentence, phrase } from './collisions.js';
import { PAIRS, TRIPLES, EVIL_EYES, THREE } from './diamonds.js';
import { QUADS, SETTLE, VANISH } from './four.js';

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
  const canvas = $('#parting');
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
  vhead.textContent = `And the ${VANISH.length} that vanish:`;
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

hero();
laws();
parting();
for (const e of CATALOG) card(e);
wakes();
collisions();
wall(diamonds());
four();
reducedMotion.addEventListener?.('change', wake);
