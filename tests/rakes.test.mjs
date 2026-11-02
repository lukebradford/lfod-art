// Every claim the site makes about its rakes, checked by simulation with the shipped engine.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pattern, classify } from '../site/js/lfod.js';
import { RAKES, BACKFLIP, ALL, byId, BACK, UP } from '../site/js/rakes.js';
import { byId as catalog } from '../site/js/catalog.js';
import { groups, identify } from './objects.mjs';

const PERIODS = 50; // consecutive periods checked after settling
const front = (P) => P.x0 + P.w - 1;
const key = (cells) => cells.map((c) => c.join(',')).sort().join(';');
const shift = (cells, dx, dy) => cells.map(([x, y]) => [x + dx, y + dy]);
// the engine: the rightmost `length` columns, and for a sideways rake only rows top..
const inEngine = (e, P) => ([x, y]) => x > front(P) - e.length && (e.top === undefined || y >= e.top);
const split = (e, P) => {
  const f = inEngine(e, P), engine = [], rest = [];
  for (const c of P.cells()) (f(c) ? engine : rest).push(c);
  return { engine, rest };
};
// Pieces of what lies outside the engine. Dots, checkers and moons are compact, so cells
// within 2 of each other are one piece; a free ship's spark can trail 3 or 4 rows behind
// its body, so whatever is left unidentified is regrouped within 4 (ships in a stream are
// 12 apart, so this never joins two).
function pieces(cells) {
  const out = [], rest = [];
  for (const q of groups(cells, 2)) { if (identify(q)) out.push(q); else rest.push(...q); }
  for (const q of groups(rest, 4)) out.push(q);
  return out;
}
const tally = (ps) => { const t = {}; for (const q of ps) { const id = identify(q) || `?${q.length}`; t[id] = (t[id] || 0) + 1; } return t; };
const velocity = (e, id) => (id in e.fires ? e.dir : [0, 0]);

for (const e of ALL) {
  const p = e.period;
  const P0 = Pattern.fromRLE(e.rle);
  const expected = { ...e.fires };
  for (const [k, v] of Object.entries(e.wake)) expected[k] = (expected[k] || 0) + v;

  test(`${e.name}: starts with ${e.pop0} cells`, () => assert.equal(P0.population, e.pop0));

  test(`${e.name}: a period-${p} engine moving at c, ${e.length} columns long, and nothing outside it but named objects`, () => {
    let A = P0.run(e.settle);
    for (let k = 0; k < PERIODS; k++) {
      const B = A.run(p);
      assert.equal(front(B) - front(A), p, `front advance in period ${k}`);
      const a = split(e, A), b = split(e, B);
      assert.equal(key(shift(a.engine, p, 0)), key(b.engine), `engine, period ${k}`);
      // what is outside the engine is exactly named objects, which never touch the engine
      // again: the whole is the engine run alone plus the rest run alone, cell for cell
      const ps = pieces(a.rest);
      for (const q of ps) assert.ok(identify(q), `period ${k}: ${q.length} unidentified cells at ${JSON.stringify(q[0])}`);
      const alone = [...Pattern.fromCells(a.engine).run(p).cells(), ...(a.rest.length ? Pattern.fromCells(a.rest).run(p).cells() : [])];
      assert.equal(key(alone), key(B.cells()), `independence, period ${k}`);
      // and the pieces never touch each other: each goes on alone at its own speed
      for (const q of ps) {
        const [vx, vy] = velocity(e, identify(q));
        assert.equal(key(Pattern.fromCells(q).run(p).cells()), key(shift(q, vx * p, vy * p)), `piece ${identify(q)}, period ${k}`);
      }
      A = B;
    }
  });

  test(`${e.name}: per period ${Object.entries(expected).map(([k, v]) => `${v} ${k}${v > 1 ? 's' : ''}`).join(' and ') || 'nothing'} leaves the engine, nothing else`, () => {
    // Count the pieces outside the engine at two times 20 periods apart. Both cuts sit at
    // the same place relative to the (exactly repeating) engine, so edge effects cancel.
    const a = tally(pieces(split(e, P0.run(e.settle + 10 * p)).rest));
    const b = tally(pieces(split(e, P0.run(e.settle + 30 * p)).rest));
    for (const k of new Set([...Object.keys(a), ...Object.keys(b), ...Object.keys(expected)])) assert.equal((b[k] || 0) - (a[k] || 0), 20 * (expected[k] || 0), k);
    // the fired objects move; the wake is frozen
    for (const k of Object.keys(e.fires)) assert.notDeepEqual(e.dir, [0, 0], k);
  });

  test(`${e.name}: ${e.top === undefined ? 'the engine and what it fires never leave' : 'the engine never leaves'} rows ${e.band[0]}..${e.band[1]}`, () => {
    let P = P0, lo = Infinity, hi = -Infinity;
    for (let g = 0; g <= e.settle + PERIODS * p; g++, P = P.next()) {
      for (const [, y] of P.cells()) {
        if (e.top !== undefined && y < e.top) continue; // a free ship on its way up
        lo = Math.min(lo, y); hi = Math.max(hi, y);
      }
    }
    assert.deepEqual([lo, hi], e.band);
  });
}

test('the rakes fire moons backwards and free ships upwards, each at the speed of light', () => {
  for (const e of RAKES) {
    for (const id of Object.keys(e.fires)) {
      const o = catalog[id];
      assert.ok(o, id);
      const c = classify(Pattern.fromRLE(o.rle));
      assert.equal(c.kind, 'ship');
      assert.equal(Math.abs(c.dx) + Math.abs(c.dy), c.period, `${id} flies at c`);
    }
    assert.ok(e.dir === BACK || e.dir === UP);
    if (e.dir === UP) assert.ok('top' in e, 'a sideways rake needs a top row for its engine');
  }
});

test('the rakes are listed by period: 3, 4, 5, 12', () => {
  assert.deepEqual(RAKES.map((e) => e.period), [3, 4, 5, 12]);
  assert.equal(RAKES.filter((e) => 'moon' in e.fires).length, 3);
  assert.equal(RAKES.filter((e) => 'freeship' in e.fires).length, 1);
});

test('the backflip is the flip-flop rake with 33 more cells in its 13 rearmost columns', () => {
  const rake = Pattern.fromRLE(byId[BACKFLIP.rake].rle), both = Pattern.fromRLE(BACKFLIP.rle);
  const d = both.w - rake.w;
  const rakeCells = new Set(rake.cells().map(([x, y]) => `${x + d},${y}`));
  const extra = both.cells().filter(([x, y]) => !rakeCells.has(`${x},${y}`));
  assert.equal(both.population - extra.length, rake.population, 'the rake is all there');
  assert.equal(extra.length, 33);
  assert.equal(Math.max(...extra.map(([x]) => x)) - Math.min(...extra.map(([x]) => x)) + 1, 13);
  assert.ok(Math.max(...extra.map(([x]) => x)) < d, 'the trailer is wholly behind the rake');
  assert.deepEqual(BACKFLIP.wake, { checker: 4 });
  assert.deepEqual(byId[BACKFLIP.rake].fires, { moon: 2 });
});
