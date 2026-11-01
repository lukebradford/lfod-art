// lfod.js: the single simulation core for Live Free or Die (B2/S0, Moore neighborhood).
// Shared verbatim by the website and the test suite. No dependencies.
//
// The rule, exactly:
//   a dead cell with exactly 2 live neighbours is born;
//   a live cell with exactly 0 live neighbours survives; every other live cell dies.

export const RULESTRING = 'B2/S0';

// next state given current state (0/1) and live-neighbour count (0..8)
export function nextState(alive, n) {
  return alive ? (n === 0 ? 1 : 0) : (n === 2 ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Dense toroidal grid. src and dst are Uint8Array(w*h) of 0/1; dst is overwritten.
// The torus is a finite world: any piece that uses it either keeps patterns far from
// the seam or makes the wraparound part of the work on purpose and says so.
export function stepTorus(src, dst, w, h) {
  let pop = 0;
  for (let y = 0; y < h; y++) {
    const up = ((y + h - 1) % h) * w;
    const row = y * w;
    const dn = ((y + 1) % h) * w;
    for (let x = 0; x < w; x++) {
      const l = x === 0 ? w - 1 : x - 1;
      const r = x === w - 1 ? 0 : x + 1;
      const n =
        src[up + l] + src[up + x] + src[up + r] +
        src[row + l] + src[row + r] +
        src[dn + l] + src[dn + x] + src[dn + r];
      const v = src[row + x] ? (n === 0 ? 1 : 0) : (n === 2 ? 1 : 0);
      dst[row + x] = v;
      pop += v;
    }
  }
  return pop;
}

// ---------------------------------------------------------------------------
// Unbounded pattern: an exact representation of a finite pattern on the infinite
// plane. Stored as a tight bounding box (x0, y0, w, h) plus a dense Uint8Array.
// step() grows the box by one cell on every side (the only place births can occur),
// computes the next generation exactly, then trims back to the live cells.
export class Pattern {
  constructor(x0 = 0, y0 = 0, w = 0, h = 0, data = new Uint8Array(0), gen = 0) {
    this.x0 = x0; this.y0 = y0; this.w = w; this.h = h; this.data = data; this.gen = gen;
  }

  static fromCells(cells) {
    if (cells.length === 0) return new Pattern();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of cells) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    const w = maxX - minX + 1, h = maxY - minY + 1;
    const data = new Uint8Array(w * h);
    for (const [x, y] of cells) data[(y - minY) * w + (x - minX)] = 1;
    return new Pattern(minX, minY, w, h, data);
  }

  // rows of '.' (dead) and 'o' / '*' / '#' / 'O' (alive); top-left cell at (0,0)
  static fromPicture(pic) {
    const rows = pic.trim().split('\n').map((r) => r.trim());
    const cells = [];
    rows.forEach((r, y) => [...r].forEach((c, x) => { if ('o*#O'.includes(c)) cells.push([x, y]); }));
    return Pattern.fromCells(cells);
  }

  static fromRLE(rle) {
    const lines = rle.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
    const header = lines[0].startsWith('x') ? lines.shift() : '';
    if (header && !/rule\s*=\s*B2\/S0\b/i.test(header) && /rule/i.test(header)) {
      throw new Error('RLE is not for rule B2/S0: ' + header);
    }
    const body = lines.join('');
    const cells = [];
    let x = 0, y = 0, run = '';
    for (const ch of body) {
      if (ch >= '0' && ch <= '9') { run += ch; continue; }
      const n = run ? parseInt(run, 10) : 1;
      run = '';
      if (ch === 'b' || ch === '.') x += n;
      else if (ch === 'o' || ch === 'A') { for (let i = 0; i < n; i++) cells.push([x++, y]); }
      else if (ch === '$') { y += n; x = 0; }
      else if (ch === '!') break;
    }
    return Pattern.fromCells(cells);
  }

  get population() {
    let p = 0;
    for (let i = 0; i < this.data.length; i++) p += this.data[i];
    return p;
  }

  get(x, y) {
    const lx = x - this.x0, ly = y - this.y0;
    if (lx < 0 || ly < 0 || lx >= this.w || ly >= this.h) return 0;
    return this.data[ly * this.w + lx];
  }

  cells() {
    const out = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (this.data[y * this.w + x]) out.push([this.x0 + x, this.y0 + y]);
    return out;
  }

  clone() {
    return new Pattern(this.x0, this.y0, this.w, this.h, this.data.slice(), this.gen);
  }

  // the next generation, as a new Pattern (exact on the infinite plane)
  next() {
    const { w, h, data } = this;
    if (w === 0) return new Pattern(0, 0, 0, 0, new Uint8Array(0), this.gen + 1);
    // Output box is the old box grown by 1 on every side (W x H). To read neighbours
    // without bounds checks, copy the old cells into a buffer padded by 2 (PW x PH);
    // output cell (X, Y) is padded cell (X + 1, Y + 1).
    const W = w + 2, H = h + 2;
    const PW = w + 4, PH = h + 4;
    const pad = new Uint8Array(PW * PH);
    for (let y = 0; y < h; y++) pad.set(data.subarray(y * w, y * w + w), (y + 2) * PW + 2);
    const out = new Uint8Array(W * H);
    let minX = W, minY = H, maxX = -1, maxY = -1;
    for (let Y = 0; Y < H; Y++) {
      let i = (Y + 1) * PW + 1;
      for (let X = 0; X < W; X++, i++) {
        const n =
          pad[i - PW - 1] + pad[i - PW] + pad[i - PW + 1] +
          pad[i - 1] + pad[i + 1] +
          pad[i + PW - 1] + pad[i + PW] + pad[i + PW + 1];
        const v = pad[i] ? (n === 0 ? 1 : 0) : (n === 2 ? 1 : 0);
        if (v) {
          out[Y * W + X] = 1;
          if (X < minX) minX = X; if (X > maxX) maxX = X;
          if (Y < minY) minY = Y; if (Y > maxY) maxY = Y;
        }
      }
    }
    if (maxX < 0) return new Pattern(0, 0, 0, 0, new Uint8Array(0), this.gen + 1);
    const nw = maxX - minX + 1, nh = maxY - minY + 1;
    const trimmed = new Uint8Array(nw * nh);
    for (let y = 0; y < nh; y++)
      trimmed.set(out.subarray((y + minY) * W + minX, (y + minY) * W + minX + nw), y * nw);
    return new Pattern(this.x0 - 1 + minX, this.y0 - 1 + minY, nw, nh, trimmed, this.gen + 1);
  }

  // a copy with the cell at (x, y) set to v (0 or 1)
  withCell(x, y, v) {
    const cells = this.cells().filter(([cx, cy]) => cx !== x || cy !== y);
    if (v) cells.push([x, y]);
    const p = Pattern.fromCells(cells);
    p.gen = this.gen;
    return p;
  }

  run(n) {
    let p = this;
    for (let i = 0; i < n; i++) p = p.next();
    return p;
  }

  // shape key independent of position
  shapeKey() {
    let s = this.w + 'x' + this.h + ':';
    for (let i = 0; i < this.data.length; i++) s += this.data[i];
    return s;
  }

  sameShape(other) {
    if (this.w !== other.w || this.h !== other.h) return false;
    for (let i = 0; i < this.data.length; i++) if (this.data[i] !== other.data[i]) return false;
    return true;
  }

  toRLE(name) {
    let s = (name ? `#N ${name}\n` : '') + `x = ${this.w}, y = ${this.h}, rule = ${RULESTRING}\n`;
    let line = '';
    const push = (n, c) => { line += (n > 1 ? n : '') + c; };
    let pendingRows = 0;
    for (let y = 0; y < this.h; y++) {
      let x = 0, rowStr = '';
      const saved = line; line = '';
      let last = this.w - 1;
      while (last >= 0 && !this.data[y * this.w + last]) last--;
      while (x <= last) {
        const c = this.data[y * this.w + x];
        let n = 1;
        while (x + n <= last && this.data[y * this.w + x + n] === c) n++;
        push(n, c ? 'o' : 'b');
        x += n;
      }
      rowStr = line; line = saved;
      if (rowStr) {
        if (pendingRows) push(pendingRows, '$');
        line += rowStr;
        pendingRows = 1;
      } else pendingRows++;
    }
    return s + line + '!\n';
  }
}

// ---------------------------------------------------------------------------
// Classify a pattern by direct simulation on the infinite plane.
// Returns { kind, period, dx, dy } where kind is one of
//   'dies'     – becomes empty (period = generation of death)
//   'still'    – unchanged after one generation
//   'osc'      – returns to the same cells after `period` > 1 generations
//   'ship'     – returns to the same shape displaced by (dx, dy) after `period`
//   'unknown'  – none of the above within maxGen
// Pattern recognition starts after an optional transient: `settle` generations.
export function classify(pattern, { maxGen = 256, settle = 0 } = {}) {
  let p = pattern.run(settle);
  if (p.population === 0) return { kind: 'dies', period: settle, dx: 0, dy: 0 };
  const start = p;
  for (let g = 1; g <= maxGen; g++) {
    p = p.next();
    if (p.population === 0) return { kind: 'dies', period: settle + g, dx: 0, dy: 0 };
    if (p.sameShape(start)) {
      const dx = p.x0 - start.x0, dy = p.y0 - start.y0;
      if (dx === 0 && dy === 0) return { kind: g === 1 ? 'still' : 'osc', period: g, dx, dy };
      return { kind: 'ship', period: g, dx, dy };
    }
  }
  return { kind: 'unknown', period: 0, dx: 0, dy: 0 };
}
