// Slower than light: every claim the page makes about the glossary's slow ships.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pattern, classify, isLFoDRule } from '../site/js/lfod.js';
import { byId as catalog } from '../site/js/catalog.js';
import { SHIPS, RACE, DIAGONAL, byId, speed, extent } from '../site/js/slow.js';

const front = (p) => p.x0 + p.w - 1; // rightmost live column
const lead = (p) => { let m = -Infinity; for (const [x, y] of p.cells()) m = Math.max(m, x + y); return m; };

for (const e of SHIPS) {
  test(`${e.name}: period ${e.period}, displacement (${e.dx}, ${e.dy}), ${e.pop[0]}–${e.pop[1]} cells, speed ${speed(e)}`, () => {
    const p0 = Pattern.fromRLE(e.rle);
    assert.deepEqual(classify(p0, { maxGen: 64 }), { kind: 'ship', period: e.period, dx: e.dx, dy: e.dy });
    let p = p0, lo = Infinity, hi = 0;
    for (let g = 0; g < e.period; g++) { lo = Math.min(lo, p.population); hi = Math.max(hi, p.population); p = p.next(); }
    assert.deepEqual([lo, hi], e.pop);
    // slower than light, travelling right (and down, if diagonal)
    assert.ok(e.dx > 0 && e.dy >= 0 && Math.max(e.dx, e.dy) < e.period);
    assert.ok(e.dy === 0 || e.dy === e.dx);
  });
}

test('speeds are written in lowest terms', () => {
  assert.equal(speed(byId('dust-mite-ship')), 'c/2'); // 4 cells per 8 generations
  assert.equal(speed(byId('wasp-ship')), 'c/3'); // 2 per 6
  assert.equal(speed(byId('zirconium-ship')), '2c/5');
  assert.equal(speed(byId('ram-ship')), 'c/4 diagonal');
  assert.equal(speed(catalog.moon), 'c');
});

test('the speeds known: c/2, 2c/5, c/3, c/4, c/5 and c/4 diagonal; 2c/5, c/3 and c/4 have one ship each', () => {
  const by = {};
  for (const e of SHIPS) (by[speed(e)] ||= []).push(e.id);
  assert.deepEqual(Object.keys(by), ['c/2', '2c/5', 'c/3', 'c/4', 'c/4 diagonal', 'c/5']);
  assert.deepEqual(by['2c/5'], ['zirconium-ship']);
  assert.deepEqual(by['c/3'], ['wasp-ship']);
  assert.deepEqual(by['c/4'], ['beachcomber-ship']);
  assert.deepEqual(by['c/4 diagonal'], DIAGONAL);
  assert.equal(by['c/2'].length, 12);
  assert.equal(by['c/5'].length, 3);
  assert.equal(SHIPS.length, 21);
});

test('each lane of the race is the smallest ship at its speed; dust mite and fruit fly tie at 36', () => {
  assert.equal(new Set(RACE.map((id) => speed(byId(id)))).size, RACE.length);
  for (const id of RACE) {
    const e = byId(id);
    for (const o of SHIPS) if (speed(o) === speed(e)) assert.ok(o.pop[0] >= e.pop[0], `${o.id} vs ${id}`);
  }
  const fewest = Math.min(...SHIPS.map((e) => e.pop[0]));
  assert.equal(fewest, 36);
  assert.deepEqual(SHIPS.filter((e) => e.pop[0] === fewest).map((e) => e.id).sort(), ['dust-mite-ship', 'fruit-fly-ship']);
  // the dust mite's box is the smaller: 15 x 12 against 10 x 24
  const box = (id) => { const p = Pattern.fromRLE(byId(id).rle); return p.w * p.h; };
  assert.ok(box('dust-mite-ship') < box('fruit-fly-ship'));
  // ram ship: the smallest diagonal ship
  assert.deepEqual(DIAGONAL.map((id) => byId(id).pop[0]), [37, 135, 220]);
});

test('the race lanes are ordered fastest first, and the moon rides the light front exactly', () => {
  const v = (e) => e.dx / e.period;
  for (let i = 1; i < RACE.length; i++) assert.ok(v(byId(RACE[i - 1])) > v(byId(RACE[i])));
  let p = Pattern.fromRLE(catalog.moon.rle);
  const f0 = front(p);
  for (let g = 0; g <= 600; g++, p = p.next()) assert.equal(front(p), f0 + g);
});

test('nothing in any lane is ever ahead of the light front (one column per generation)', () => {
  for (const id of RACE) {
    let p = Pattern.fromRLE(byId(id).rle);
    const f0 = front(p);
    for (let g = 0; g <= 600; g++, p = p.next()) assert.ok(front(p) <= f0 + g, `${id} at ${g}`);
  }
});

test('the extent of the first period bounds every later generation, moved by (dx, dy) per period', () => {
  for (const e of SHIPS) {
    const x = extent(e);
    let p = Pattern.fromRLE(e.rle);
    for (let g = 0; g < 6 * e.period; g++, p = p.next()) {
      const k = Math.floor(g / e.period);
      assert.ok(p.x0 >= x.x0 + k * e.dx && p.x0 + p.w - 1 <= x.x1 + k * e.dx, `${e.id} x at ${g}`);
      assert.ok(p.y0 >= x.y0 + k * e.dy && p.y0 + p.h - 1 <= x.y1 + k * e.dy, `${e.id} y at ${g}`);
    }
    // and is tight: the box is reached in the first period (else lanes are too tall)
    let q = Pattern.fromRLE(e.rle), y0 = Infinity, y1 = -Infinity;
    for (let g = 0; g < e.period; g++, q = q.next()) { y0 = Math.min(y0, q.y0); y1 = Math.max(y1, q.y0 + q.h - 1); }
    assert.deepEqual([y0, y1], [x.y0, x.y1]);
  }
});

test('only the decade ship and the quintessential ship ever fall back: two cells, every five generations, from gen 1 to 2', () => {
  // leading edge: rightmost column, or for diagonal ships the largest x + y
  const back = [];
  for (const e of SHIPS) {
    const edge = e.dy ? lead : front;
    let p = Pattern.fromRLE(e.rle), last = edge(p);
    for (let g = 1; g <= 2 * e.period; g++) {
      p = p.next();
      const now = edge(p);
      if (now < last) back.push(`${e.id} ${g - 1}->${g} ${now - last}`);
      last = now;
    }
  }
  // over two periods: the quintessential (p5) twice, the decade (p10) four times
  assert.deepEqual(back.sort(), [
    'decade-ship 1->2 -2', 'decade-ship 11->12 -2', 'decade-ship 16->17 -2', 'decade-ship 6->7 -2',
    'quintessential-ship 1->2 -2', 'quintessential-ship 6->7 -2',
  ]);
});

test('the decade ship’s nose: back two cells, then forward three, every five generations', () => {
  let p = Pattern.fromRLE(byId('decade-ship').rle);
  const f0 = front(p), fronts = [];
  for (let g = 0; g <= 20; g++, p = p.next()) fronts.push(front(p) - f0);
  assert.deepEqual(fronts.slice(0, 11), [0, 1, -1, -1, 0, 1, 2, 0, 0, 1, 2]);
  // from each fall (gen 2, 7, 12, ...) it climbs three in the next four generations
  for (let g = 2; g + 4 <= 20; g += 5) {
    assert.equal(fronts[g] - fronts[g - 1], -2);
    assert.equal(fronts[g + 4] - fronts[g], 3);
  }
});

test('diagonal ships: the leading edge (x + y) gains one every two generations, half the limit', () => {
  // Diamonds proves max(x + y) can grow by at most 1 per generation, for any pattern:
  // the fastest a diagonal ship could go is c/2. These go c/4.
  for (const id of DIAGONAL) {
    let p = Pattern.fromRLE(byId(id).rle);
    const s0 = lead(p);
    for (let g = 0; g <= 400; g++, p = p.next()) {
      const s = lead(p) - s0;
      assert.ok(s <= g, `${id} beyond the limit at ${g}`);
      assert.ok(s === Math.floor(g / 2) || s === Math.ceil(g / 2), `${id} at ${g}: ${s}`);
    }
  }
});

test('every glossary RLE here names the rule, in a spelling the engine accepts', () => {
  for (const e of SHIPS) {
    const rule = e.rle.match(/^x = \d+, y = \d+, rule = (\S+)\n/)[1];
    assert.ok(isLFoDRule(rule), `${e.id}: ${rule}`);
  }
});
