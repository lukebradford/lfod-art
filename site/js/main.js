import { Pattern, nextState } from './lfod.js';
import { CATALOG, PUFFERS, byId } from './catalog.js';
import { Stage, Clock, reducedMotion, wake } from './stage.js';
import { TARGETS, targetById, setup, parseOutcome, allCollisions, shortLabel, sentence } from './collisions.js';

const $ = (s) => document.querySelector(s);

// ---------------------------------------------------------------------------
// Hero: the monster (p19), live, on an unbounded plane. Tapping toggles a cell.
// The whole pattern is always simulated exactly, including any part off screen.
// If an explosion grows past MAX_AREA cells of bounding box, the simulation stops
// and says so, rather than approximating.
const MAX_AREA = 1_500_000;

function hero() {
  const canvas = $('#field');
  const stage = new Stage(canvas);
  const genEl = $('#gen'), popEl = $('#pop'), statusEl = $('#status');
  const playBtn = $('#play'), hint = $('#hint');

  const seed = () => {
    const p = Pattern.fromRLE(byId.monster.rle);
    // centre the monster's 16x13 hull on the origin
    return new Pattern(p.x0 - 2, p.y0 - 1, p.w, p.h, p.data, 0);
  };
  let cur = seed(), prev = null, halted = false;
  let cs = 1, ox = 0, oy = 0;

  function layout() {
    const { W, H } = stage;
    const narrow = W / stage.dpr < 600;
    const frac = narrow ? 0.66 : 0.5;
    cs = Math.max(2, Math.floor(Math.min((W * frac) / 16, (H * frac) / 13)));
    // hull spans x in [-8, 8), y in [-6, 7): centre it, slightly above middle
    ox = Math.round(W / 2 - 0 * cs);
    oy = Math.round(H * 0.47 - 0.5 * cs);
    draw();
  }
  function draw() {
    stage.draw(cur, prev, cs, ox, oy);
    genEl.textContent = cur.gen;
    popEl.textContent = cur.population;
  }
  function setStatus(s) { statusEl.textContent = s; }

  function step() {
    if (halted) return;
    if ((cur.w + 2) * (cur.h + 2) > MAX_AREA) {
      halted = true;
      clock.setPlaying(false);
      syncButton();
      setStatus('too large to follow exactly; stopped');
      return;
    }
    prev = cur;
    cur = cur.next();
    if (cur.population === 0 && prev.population > 0) setStatus('blank again');
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
    cur = seed(); prev = null; halted = false; setStatus('');
    clock.setPlaying(!reducedMotion.matches); syncButton(); draw();
  };

  // 'click' rather than 'pointerdown' so that swiping to scroll on a phone never places cells
  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    const px = (e.clientX - r.left) * (stage.W / r.width);
    const py = (e.clientY - r.top) * (stage.H / r.height);
    const x = Math.floor((px - ox) / cs), y = Math.floor((py - oy) / cs);
    cur = cur.withCell(x, y, cur.get(x, y) ? 0 : 1);
    prev = null;
    halted = false;
    setStatus('');
    hint.classList.add('gone');
    draw();
  });

  stage.onresize = layout;
  layout();
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

hero();
laws();
parting();
for (const e of CATALOG) card(e);
wakes();
collisions();
reducedMotion.addEventListener?.('change', wake);
