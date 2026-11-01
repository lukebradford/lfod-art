import { Pattern, nextState } from './lfod.js';
import { CATALOG, byId } from './catalog.js';
import { Stage, Clock, reducedMotion, wake } from './stage.js';

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

hero();
laws();
parting();
for (const e of CATALOG) card(e);
reducedMotion.addEventListener?.('change', wake);
