// stage.js: crisp canvas rendering of exact Live Free or Die patterns, and a shared
// animation clock that never skips or repeats a generation.

export const COLORS = {
  paper: '#ffffff',
  ink: '#0c0c0e',
  free: '#1f4bff', // a cell that survived the last generation (it had no neighbors)
  ghost: '#e9e9ee', // a cell that was alive one generation ago and is not now
  dot: '#dcdce2', // graph-paper dots at cell corners
  beyond: '#f2f2f5', // where nothing can be alive yet (past a light front or speed limit)
  path: '#f5f5f8', // a ship's path, drawn faintly under the cells
};

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// A canvas whose backing store matches its CSS box in device pixels.
export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.W = 0; this.H = 0; this.dpr = 1;
    this.onresize = null;
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(canvas);
    this.resize();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const W = Math.max(1, Math.round(r.width * dpr));
    const H = Math.max(1, Math.round(r.height * dpr));
    if (W === this.W && H === this.H && dpr === this.dpr) return;
    this.W = W; this.H = H; this.dpr = dpr;
    this.canvas.width = W; this.canvas.height = H;
    if (this.onresize) this.onresize();
  }

  // Draw `cur` (and the ghosts of `prev`) with integer cell size cs (device px) and
  // integer origin (ox, oy): world cell (x, y) covers [ox + x*cs, ox + (x+1)*cs).
  // under(ctx), if given, paints on the bare paper before anything else (cells always
  // land on top of it).
  draw(cur, prev, cs, ox, oy, { dots = true, under = null } = {}) {
    const { ctx, W, H } = this;
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, W, H);
    if (under) under(ctx);
    // visible world rectangle (inclusive)
    const vx0 = Math.floor(-ox / cs) - 1, vy0 = Math.floor(-oy / cs) - 1;
    const vx1 = Math.ceil((W - ox) / cs) + 1, vy1 = Math.ceil((H - oy) / cs) + 1;

    if (dots && cs >= 10) {
      const d = Math.max(1, Math.round(cs / 16));
      const h = d >> 1;
      ctx.fillStyle = COLORS.dot;
      for (let y = vy0; y <= vy1; y++)
        for (let x = vx0; x <= vx1; x++) ctx.fillRect(ox + x * cs - h, oy + y * cs - h, d, d);
    }

    // cells fill their squares edge to edge: neighbors touch, with no gap between them
    const size = cs;

    // ghosts: alive in prev, dead in cur
    if (prev && prev.w) {
      ctx.fillStyle = COLORS.ghost;
      eachVisible(prev, vx0, vy0, vx1, vy1, (x, y) => {
        if (!cur.get(x, y)) ctx.fillRect(ox + x * cs, oy + y * cs, size, size);
      });
    }
    if (!cur.w) return;
    // newborn cells in ink, survivors (the free) in red
    ctx.fillStyle = COLORS.ink;
    const free = [];
    eachVisible(cur, vx0, vy0, vx1, vy1, (x, y) => {
      if (prev && prev.get(x, y)) free.push(x, y);
      else ctx.fillRect(ox + x * cs, oy + y * cs, size, size);
    });
    if (free.length) {
      ctx.fillStyle = COLORS.free;
      for (let i = 0; i < free.length; i += 2)
        ctx.fillRect(ox + free[i] * cs, oy + free[i + 1] * cs, size, size);
    }
  }
}

function eachVisible(p, vx0, vy0, vx1, vy1, fn) {
  const x0 = Math.max(p.x0, vx0), x1 = Math.min(p.x0 + p.w - 1, vx1);
  const y0 = Math.max(p.y0, vy0), y1 = Math.min(p.y0 + p.h - 1, vy1);
  for (let y = y0; y <= y1; y++) {
    const row = (y - p.y0) * p.w - p.x0;
    for (let x = x0; x <= x1; x++) if (p.data[row + x]) fn(x, y);
  }
}

// ---------------------------------------------------------------------------
// One requestAnimationFrame loop drives every animation on the page. Each clock
// advances at most one generation per frame, so a slow device runs slower rather
// than skipping generations. Clocks pause when offscreen or when the tab is hidden.
const clocks = new Set();
let running = false;

function loop(t) {
  let any = false;
  for (const c of clocks) {
    // one failing animation must not freeze all the others: stop it, report, carry on
    try { if (c.tick(t)) any = true; } catch (err) { c.playing = false; console.error(err); }
  }
  if (any) requestAnimationFrame(loop);
  else running = false;
}

export function wake() {
  if (!running) { running = true; requestAnimationFrame(loop); }
}

export class Clock {
  // rate: generations per second; step(): advance one generation and redraw
  constructor(el, rate, step) {
    this.rate = rate;
    this.step = step;
    this.playing = !reducedMotion.matches;
    this.visible = false;
    this.last = null;
    this.hold = 0; // ms to wait before the next step (used for pauses between loops)
    clocks.add(this);
    new IntersectionObserver((es) => {
      this.visible = es[es.length - 1].isIntersecting;
      if (this.visible) wake();
    }, { rootMargin: '64px' }).observe(el);
  }

  setPlaying(v) { this.playing = v; this.last = null; if (v) wake(); }

  tick(t) {
    if (!this.playing || !this.visible || document.hidden) { this.last = null; return false; }
    if (this.last === null) { this.last = t; return true; }
    const interval = 1000 / this.rate + this.hold;
    if (t - this.last >= interval) {
      this.hold = 0;
      // carry over a little lateness for an even rhythm, but never step twice per frame
      this.last = t - this.last - interval < interval ? this.last + interval : t;
      this.step();
    }
    return true;
  }
}

document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });

// ---------------------------------------------------------------------------
// Paint a bit-packed Field (lfod.js) straight into the canvas's pixels, for patterns
// too big to draw cell by cell. Same conventions as Stage.draw: integer cell size cs
// (device px) and origin (ox, oy); survivors red, newborns ink, the just-dead as ghosts.
const LITTLE = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
const rgba = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return LITTLE ? ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0 : ((r << 24) | (g << 16) | (b << 8) | 255) >>> 0;
};
const PX = Object.fromEntries(Object.entries(COLORS).map(([k, v]) => [k, rgba(v)]));

export function paintField(stage, f, cs, ox, oy) {
  const { ctx, W, H } = stage;
  if (!stage.img || stage.img.width !== W || stage.img.height !== H) {
    stage.img = ctx.createImageData(W, H);
    stage.px = new Uint32Array(stage.img.data.buffer);
  }
  const px = stage.px;
  px.fill(PX.paper);
  if (cs >= 10) { // graph-paper dots at cell corners
    const d = Math.max(1, Math.round(cs / 16)), h = d >> 1;
    for (let Y = ((oy - h) % cs + cs) % cs; Y < H; Y += cs)
      for (let X = ((ox - h) % cs + cs) % cs; X < W; X += cs) fillRect(px, W, H, X, Y, d, d, PX.dot);
  }
  const size = cs; // edge to edge, as in Stage.draw
  const { cur, prev, stride } = f;
  // rows and words that can hold a live cell now or one generation ago
  const R0 = Math.min(f.r0, f.pr1 >= f.pr0 ? f.pr0 : f.r0), R1 = Math.max(f.r1, f.pr1);
  const K0 = Math.min(f.k0, f.pr1 >= f.pr0 ? f.pk0 : f.k0), K1 = Math.max(f.k1, f.pr1 >= f.pr0 ? f.pk1 : f.k1);
  // clip to the canvas
  const r0 = Math.max(R0, Math.floor((-oy / cs) - f.y0) - 1), r1 = Math.min(R1, Math.ceil((H - oy) / cs - f.y0) + 1);
  for (let r = r0; r <= r1; r++) {
    const Y = oy + (f.y0 + r) * cs;
    const base = (r + 1) * stride + 1;
    for (let k = K0; k <= K1; k++) {
      const c = cur[base + k], p = prev[base + k];
      let m = c | p;
      while (m) {
        const low = m & -m, i = 31 - Math.clz32(low);
        m ^= low;
        const X = ox + (f.x0 + k * 32 + i) * cs;
        if (X >= W || X + size <= 0) continue;
        const col = c & low ? (p & low ? PX.free : PX.ink) : PX.ghost;
        if (size === 1) { if (X >= 0 && Y >= 0 && Y < H) px[Y * W + X] = col; }
        else fillRect(px, W, H, X, Y, size, size, col);
      }
    }
  }
  ctx.putImageData(stage.img, 0, 0);
}

function fillRect(px, W, H, x, y, w, h, col) {
  const x0 = Math.max(0, x), x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let j = Math.max(0, y); j < y1; j++) px.fill(col, j * W + x0, j * W + x1);
}
