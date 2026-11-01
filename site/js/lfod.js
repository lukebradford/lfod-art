// lfod.js: the single simulation core for Live Free or Die (B2/S0, Moore neighborhood).
// Shared verbatim by the website and the test suite. No dependencies.
//
// The rule, exactly:
//   a dead cell with exactly 2 live neighbours is born;
//   a live cell with exactly 0 live neighbours survives; every other live cell dies.

export const RULESTRING = 'B2/S0';

// True for any spelling of this rule in an RLE header: B2/S0, S0/B2, b2/s0 (the LFoD
// Universe collection writes s0/b2), or B/S-less "0/2" (survival/birth order).
export function isLFoDRule(s) {
  const t = s.trim().toUpperCase();
  let birth, survival, m;
  if ((m = t.match(/^B(\d*)\/S(\d*)$/))) [, birth, survival] = m;
  else if ((m = t.match(/^S(\d*)\/B(\d*)$/))) [, survival, birth] = m;
  else if ((m = t.match(/^(\d*)\/(\d*)$/))) [, survival, birth] = m;
  else return false;
  return birth === '2' && survival === '0';
}

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
    const rule = header.match(/rule\s*=\s*([^,\s]+)/i);
    if (rule && !isLFoDRule(rule[1])) throw new Error('RLE is not for rule B2/S0: ' + header);
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

// ---------------------------------------------------------------------------
// Field: a fast, bit-packed stepper for big patterns (explosions), 32 cells per word.
// It is exact on the infinite plane, not a torus or a clipped box: cells outside the
// box are dead, and step() refuses to run (returns false, state unchanged) once any
// live cell lies on the box's outermost ring. While that ring is empty, no cell
// outside the box has a live neighbour, so none can be born there, and the whole
// plane's next generation is exactly what is computed inside. Cross-tested against
// Pattern in tests/field.test.mjs.
//
// Layout: `w` (a multiple of 32) by `h` cells. Bit i of word k in a row is the cell at
// x = 32k + i. Buffers carry one zero word of padding on each side of every row and
// one zero row above and below, so the inner loop never bounds-checks.
// `cur` holds generation `gen`, `prev` generation gen - 1 (all dead at the start).
export class Field {
  constructor(w, h, x0 = 0, y0 = 0) {
    this.nw = Math.max(1, Math.ceil(w / 32));
    this.w = this.nw * 32; this.h = Math.max(1, h);
    this.x0 = x0; this.y0 = y0; // world coordinates of cell (0, 0)
    this.stride = this.nw + 2;
    this.cur = new Uint32Array(this.stride * (this.h + 2));
    this.prev = new Uint32Array(this.stride * (this.h + 2));
    this.gen = 0;
    // live region of cur (rows r0..r1, words k0..k1, inclusive; r1 < r0 when empty)
    this.r0 = 0; this.r1 = -1; this.k0 = 0; this.k1 = -1;
    // region of prev that may hold live cells (to clear it before reuse)
    this.pr0 = 0; this.pr1 = -1; this.pk0 = 0; this.pk1 = -1;
  }

  // A field holding `pattern`, with `margin` empty cells around it on every side.
  static around(pattern, margin) {
    const f = new Field(pattern.w + 2 * margin, pattern.h + 2 * margin, pattern.x0 - margin, pattern.y0 - margin);
    for (const [x, y] of pattern.cells()) f.set(x, y, 1);
    f.gen = pattern.gen;
    return f;
  }

  _index(x, y) {
    const lx = x - this.x0, ly = y - this.y0;
    if (lx < 0 || ly < 0 || lx >= this.w || ly >= this.h) return -1;
    return (ly + 1) * this.stride + (lx >>> 5) + 1;
  }

  get(x, y) {
    const i = this._index(x, y);
    return i < 0 ? 0 : (this.cur[i] >>> ((x - this.x0) & 31)) & 1;
  }

  getPrev(x, y) {
    const i = this._index(x, y);
    return i < 0 ? 0 : (this.prev[i] >>> ((x - this.x0) & 31)) & 1;
  }

  // Set a cell of the current generation. Clears the previous generation, since the
  // state no longer follows from it.
  set(x, y, v) {
    const i = this._index(x, y);
    if (i < 0) throw new RangeError(`cell (${x}, ${y}) is outside the field`);
    const bit = 1 << ((x - this.x0) & 31);
    if (v) this.cur[i] |= bit; else this.cur[i] &= ~bit;
    this.prev.fill(0); this.pr1 = -1;
    this._region();
  }

  // recompute the live region of cur from scratch
  _region() {
    const { cur, stride, nw, h } = this;
    let r0 = h, r1 = -1, k0 = nw, k1 = -1;
    for (let r = 0; r < h; r++) {
      const base = (r + 1) * stride + 1;
      for (let k = 0; k < nw; k++) if (cur[base + k]) {
        if (r < r0) r0 = r; r1 = r;
        if (k < k0) k0 = k; if (k > k1) k1 = k;
      }
    }
    if (r1 < 0) { this.r0 = 0; this.r1 = -1; this.k0 = 0; this.k1 = -1; }
    else { this.r0 = r0; this.r1 = r1; this.k0 = k0; this.k1 = k1; }
  }

  // Bounds of the live cells in world coordinates (inclusive), or null when empty.
  bounds() {
    const { cur, stride, r0, r1, k0, k1 } = this;
    if (r1 < r0) return null;
    let left = 0, right = 0;
    for (let r = r0; r <= r1; r++) {
      left |= cur[(r + 1) * stride + k0 + 1];
      right |= cur[(r + 1) * stride + k1 + 1];
    }
    const lo = 31 - Math.clz32(left & -left), hi = 31 - Math.clz32(right);
    return { x0: this.x0 + k0 * 32 + lo, x1: this.x0 + k1 * 32 + hi, y0: this.y0 + r0, y1: this.y0 + r1 };
  }

  // True while the outermost ring of the box is empty, i.e. step() is still exact.
  get exact() {
    const b = this.bounds();
    if (!b) return true;
    return b.x0 > this.x0 && b.y0 > this.y0 && b.x1 < this.x0 + this.w - 1 && b.y1 < this.y0 + this.h - 1;
  }

  get population() {
    let p = 0;
    const { cur, stride, r0, r1, k0, k1 } = this;
    for (let r = r0; r <= r1; r++)
      for (let i = (r + 1) * stride + k0 + 1, e = i + k1 - k0; i <= e; i++) {
        let v = cur[i];
        v -= (v >>> 1) & 0x55555555;
        v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
        p += Math.imul((v + (v >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24;
      }
    return p;
  }

  // Advance one generation. Returns false (and does nothing) if the result could
  // not be exact because live cells have reached the edge of the box.
  step() {
    if (!this.exact) return false;
    const { stride, h, nw } = this;
    const src = this.cur, dst = this.prev;
    // clear what dst last held
    for (let r = this.pr0; r <= this.pr1; r++) dst.fill(0, (r + 1) * stride + this.pk0 + 1, (r + 1) * stride + this.pk1 + 2);
    if (this.r1 < this.r0) { // empty stays empty
      this.prev = src; this.cur = dst; this.gen++;
      this.pr0 = 0; this.pr1 = -1; this.pk0 = 0; this.pk1 = -1;
      return true;
    }
    // births can only happen within one cell of the live region
    const R0 = Math.max(0, this.r0 - 1), R1 = Math.min(h - 1, this.r1 + 1);
    const K0 = Math.max(0, this.k0 - 1), K1 = Math.min(nw - 1, this.k1 + 1);
    let r0 = h, r1 = -1, k0 = nw, k1 = -1;
    for (let r = R0; r <= R1; r++) {
      const row = (r + 1) * stride + 1;
      const up = row - stride, dn = row + stride;
      // sliding window of words: left (L), this, right (R) for the rows above, here, below
      let aL = src[up + K0 - 1], a = src[up + K0];
      let bL = src[row + K0 - 1], b = src[row + K0];
      let cL = src[dn + K0 - 1], c = src[dn + K0];
      let rowAny = false;
      for (let k = K0; k <= K1; k++) {
        const aR = src[up + k + 1], bR = src[row + k + 1], cR = src[dn + k + 1];
        // the eight neighbour planes: west is x - 1, so shift toward higher bits
        const n1 = (a << 1) | (aL >>> 31), n2 = a, n3 = (a >>> 1) | (aR << 31);
        const n4 = (b << 1) | (bL >>> 31), n5 = (b >>> 1) | (bR << 31);
        const n6 = (c << 1) | (cL >>> 31), n7 = c, n8 = (c >>> 1) | (cR << 31);
        // bit-sliced counter: s0, s1 are the count's low bits; s2 is set once it reaches 4
        let s0 = n1, s1 = 0, s2 = 0, t;
        t = s0 & n2; s0 ^= n2; s1 = t;
        t = s0 & n3; s0 ^= n3; s2 |= s1 & t; s1 ^= t;
        t = s0 & n4; s0 ^= n4; s2 |= s1 & t; s1 ^= t;
        t = s0 & n5; s0 ^= n5; s2 |= s1 & t; s1 ^= t;
        t = s0 & n6; s0 ^= n6; s2 |= s1 & t; s1 ^= t;
        t = s0 & n7; s0 ^= n7; s2 |= s1 & t; s1 ^= t;
        t = s0 & n8; s0 ^= n8; s2 |= s1 & t; s1 ^= t;
        // B2: dead with exactly two; S0: alive with none
        const v = (b & ~(s0 | s1 | s2)) | (~b & s1 & ~s0 & ~s2);
        if (v) {
          dst[row + k] = v;
          rowAny = true;
          if (k < k0) k0 = k; if (k > k1) k1 = k;
        }
        aL = a; a = aR; bL = b; b = bR; cL = c; c = cR;
      }
      if (rowAny) { if (r < r0) r0 = r; r1 = r; }
    }
    this.pr0 = this.r0; this.pr1 = this.r1; this.pk0 = this.k0; this.pk1 = this.k1;
    if (r1 < 0) { this.r0 = 0; this.r1 = -1; this.k0 = 0; this.k1 = -1; }
    else { this.r0 = r0; this.r1 = r1; this.k0 = k0; this.k1 = k1; }
    this.prev = src; this.cur = dst; this.gen++;
    return true;
  }

  // The current generation as a Pattern (for tests and for handing back to Pattern code).
  toPattern() {
    const cells = [];
    const { cur, stride, r0, r1, k0, k1 } = this;
    for (let r = r0; r <= r1; r++)
      for (let k = k0; k <= k1; k++) {
        let v = cur[(r + 1) * stride + k + 1];
        while (v) {
          const i = 31 - Math.clz32(v & -v);
          cells.push([this.x0 + k * 32 + i, this.y0 + r]);
          v &= v - 1;
        }
      }
    const p = Pattern.fromCells(cells);
    p.gen = this.gen;
    return p;
  }
}
