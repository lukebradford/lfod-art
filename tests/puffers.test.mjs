// Every claim the site makes about its puffers, checked by simulation with the shipped engine.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pattern, isLFoDRule } from '../site/js/lfod.js';
import { PUFFERS, byId } from '../site/js/catalog.js';

const PERIODS = 50; // consecutive periods checked after settling
const front = (P) => P.x0 + P.w - 1;
const key = (cells) => cells.map((c) => c.join(',')).sort().join(';');
const right = (P, cut, shift = 0) => key(P.cells().filter(([x]) => x > cut).map(([x, y]) => [x + shift, y]));
const left = (P, cut) => key(P.cells().filter(([x]) => x <= cut));

// pieces of the frozen wake (cells at or left of `cut`), grouped by 8-connectivity
function wakePieces(P, cut) {
  const cells = P.cells().filter(([x]) => x <= cut);
  const live = new Set(cells.map((c) => c.join(',')));
  const seen = new Set();
  const count = {};
  for (const c of cells) {
    if (seen.has(c.join(','))) continue;
    const stack = [c], piece = [];
    seen.add(c.join(','));
    while (stack.length) {
      const [x, y] = stack.pop();
      piece.push([x, y]);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const k = `${x + dx},${y + dy}`;
        if (live.has(k) && !seen.has(k)) { seen.add(k); stack.push([x + dx, y + dy]); }
      }
    }
    const kind = piece.length === 1 ? 'dot'
      : piece.length === 2 && Math.abs(piece[0][0] - piece[1][0]) === 1 && Math.abs(piece[0][1] - piece[1][1]) === 1 ? 'checker'
      : `other${piece.length}`;
    count[kind] = (count[kind] || 0) + 1;
  }
  return count;
}

test('RLE headers in any spelling of B2/S0 are accepted; other rules are not', () => {
  for (const r of ['B2/S0', 'b2/s0', 's0/b2', 'S0/B2', '0/2']) assert.ok(isLFoDRule(r), r);
  for (const r of ['B2/S', 'B3/S23', 'S2/B0', '2/0', 'B2/S01', 'B23/S0']) assert.ok(!isLFoDRule(r), r);
  assert.equal(Pattern.fromRLE('x = 2, y = 1, rule = s0/b2\n2o!').population, 2);
  assert.throws(() => Pattern.fromRLE('x = 2, y = 1, rule = B2/S\n2o!'));
});

for (const e of PUFFERS) {
  const p = e.period;
  const P0 = Pattern.fromRLE(e.rle);

  test(`${e.name}: starts with ${e.pop0} cells`, () => assert.equal(P0.population, e.pop0));

  test(`${e.name}: a period-${p} puffer moving at c, ${e.length} columns long`, () => {
    // From gen `settle` on, for PERIODS consecutive periods: the front advances exactly p
    // cells in +x; the rightmost `length` columns reappear exactly, shifted by p; and every
    // cell behind them is unchanged (the wake is frozen, period dividing p).
    let A = P0.run(e.settle);
    for (let k = 0; k < PERIODS; k++) {
      const B = A.run(p);
      const fa = front(A), fb = front(B);
      assert.equal(fb - fa, p, `front advance in period ${k}`);
      assert.equal(right(B, fb - e.length), right(A, fa - e.length, p), `puffer body, period ${k}`);
      assert.equal(left(B, fa - e.length), left(A, fa - e.length), `frozen wake, period ${k}`);
      A = B;
    }
    // and it really leaves something: population grows
    assert.ok(A.population > P0.run(e.settle).population);
  });

  test(`${e.name}: leaves ${Object.entries(e.wake).map(([k, v]) => `${v} ${k}${v > 1 ? 's' : ''}`).join(' and ')} per period, nothing else`, () => {
    // Count wake pieces at two times 20 periods apart. Both cuts sit at the same place
    // relative to the (exactly repeating) puffer, so edge effects cancel.
    const a = P0.run(e.settle + 10 * p), b = P0.run(e.settle + 30 * p);
    const ca = wakePieces(a, front(a) - e.length), cb = wakePieces(b, front(b) - e.length);
    const kinds = new Set([...Object.keys(ca), ...Object.keys(cb)]);
    for (const k of kinds) assert.ok(k in e.wake, `unexpected wake piece ${k}`);
    for (const [k, v] of Object.entries(e.wake)) assert.equal((cb[k] || 0) - (ca[k] || 0), 20 * v, k);
  });

  test(`${e.name}: never leaves rows ${e.band[0]}..${e.band[1]}`, () => {
    let P = P0, lo = Infinity, hi = -Infinity;
    for (let g = 0; g <= e.settle + PERIODS * p; g++, P = P.next()) {
      lo = Math.min(lo, P.y0); hi = Math.max(hi, P.y0 + P.h - 1);
    }
    assert.deepEqual([lo, hi], e.band);
  });
}

test('Rake and bake puffer: every period a moon flies backwards at c', () => {
  const e = PUFFERS.find((x) => x.backwardMoon);
  const moon = Pattern.fromRLE(byId.moon.rle).cells();
  // the moon in all eight orientations, as offsets from its top-left
  const T = [([x, y]) => [x, y], ([x, y]) => [-x, y], ([x, y]) => [x, -y], ([x, y]) => [-x, -y],
    ([x, y]) => [y, x], ([x, y]) => [-y, x], ([x, y]) => [y, -x], ([x, y]) => [-y, -x]];
  const shapes = T.map((t) => Pattern.fromCells(moon.map(t)));
  // gen g has an isolated moon (no other cell within 2) whose cells at g+1 are the same
  // shape shifted one cell in -x
  const hasBackwardMoon = (P, Q) => {
    for (const s of shapes) for (let y = P.y0 - 1; y <= P.y0 + P.h; y++) for (let x = P.x0 - 1; x <= P.x0 + P.w; x++) {
      const cells = s.cells().map(([cx, cy]) => [cx + x, cy + y]);
      if (!cells.every(([cx, cy]) => P.get(cx, cy))) continue;
      let others = 0;
      for (let j = y - 2; j < y + s.h + 2; j++) for (let i = x - 2; i < x + s.w + 2; i++) others += P.get(i, j);
      if (others !== 4) continue;
      if (!cells.every(([cx, cy]) => Q.get(cx - 1, cy))) continue;
      let after = 0;
      for (let j = y - 1; j < y + s.h + 1; j++) for (let i = x - 2; i < x + s.w; i++) after += Q.get(i, j);
      if (after === 4) return true;
    }
    return false;
  };
  let P = Pattern.fromRLE(e.rle).run(e.settle);
  for (let k = 0; k < 10; k++) {
    let found = false;
    for (let g = 0; g < e.period; g++) { const Q = P.next(); if (hasBackwardMoon(P, Q)) found = true; P = Q; }
    assert.ok(found, `period ${k}`);
  }
});

test('the puffers span periods 3, 4, 6, 7, 8, 9 and 12, in order', () => {
  assert.deepEqual(PUFFERS.map((e) => e.period), [3, 4, 6, 7, 8, 9, 12]);
});
