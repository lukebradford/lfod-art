// The bit-packed Field must agree with Pattern (itself checked against a brute-force
// reference in engine.test.mjs) cell for cell, generation by generation, and must refuse
// to step once live cells reach the edge of its box.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pattern, Field } from '../site/js/lfod.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
}

function soup(seed, n, density, ox = 0, oy = 0) {
  const r = rng(seed), cells = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (r() < density) cells.push([x + ox, y + oy]);
  return Pattern.fromCells(cells);
}

function same(f, p, msg) {
  const q = f.toPattern();
  assert.equal(q.population, p.population, msg + ' population');
  if (p.population) {
    assert.ok(q.sameShape(p), msg + ' shape');
    assert.equal(q.x0, p.x0, msg + ' x0');
    assert.equal(q.y0, p.y0, msg + ' y0');
  }
  assert.equal(f.population, p.population, msg + ' popcount');
}

test('Field agrees with Pattern on random soups, every generation', () => {
  // offsets put the soups across word boundaries (x = 31|32, 63|64) and at negative coordinates
  const cases = [[1, 8, 0.4, 0, 0], [2, 12, 0.3, 27, -5], [3, 6, 0.5, -40, 60], [4, 16, 0.2, 61, 3], [5, 10, 0.35, -33, -33]];
  for (const [seed, n, d, ox, oy] of cases) {
    let p = soup(seed, n, d, ox, oy);
    const f = Field.around(p, 140);
    for (let g = 1; g <= 130; g++) {
      p = p.next();
      assert.equal(f.step(), true);
      assert.equal(f.gen, g);
      same(f, p, `soup ${seed} gen ${g}`);
    }
  }
});

test('Field keeps the previous generation for colouring', () => {
  let p = soup(9, 10, 0.4);
  const f = Field.around(p, 40);
  for (let g = 0; g < 30; g++) {
    const q = p.next();
    f.step();
    for (let y = q.y0 - 2; y < q.y0 + q.h + 2; y++)
      for (let x = q.x0 - 2; x < q.x0 + q.w + 2; x++) {
        assert.equal(f.get(x, y), q.get(x, y));
        assert.equal(f.getPrev(x, y), p.get(x, y));
      }
    p = q;
  }
});

test('Field stays exact with ships, oscillators and a dying pattern', () => {
  const pics = [
    'o$bo$bo$o!', // moon, flying +x
    'o2bo$o2bo$o2bo!', // monster seed
    'o$o!', // domino: two free ships
    'obo!', // dies
  ];
  for (const rle of pics) {
    let p = Pattern.fromRLE(rle);
    const f = Field.around(p, 70);
    for (let g = 1; g <= 60; g++) { p = p.next(); f.step(); same(f, p, `${rle} gen ${g}`); }
  }
});

test('Field refuses to step once a cell reaches its edge, and is exact until then', () => {
  let p = Pattern.fromRLE('o$bo$bo$o!'); // moon, 2 wide, flying +x
  const f = Field.around(p, 5); // box 12 wide (rounded up to 32), moon starts at x = 0
  let steps = 0;
  while (f.step()) { p = p.next(); steps++; same(f, p, `moon step ${steps}`); }
  // the moon's front reaches x = 31 - 5 = 26 (box spans x in [-5, 26]) and stops there
  const b = f.bounds();
  assert.equal(b.x1, f.x0 + f.w - 1);
  assert.equal(f.exact, false);
  const before = f.toPattern();
  assert.equal(f.step(), false);
  assert.ok(f.toPattern().sameShape(before));
  assert.equal(f.gen, steps);
});

test('Field.set and bounds', () => {
  const f = new Field(64, 10, -10, -3);
  assert.equal(f.bounds(), null);
  f.set(-9, -2, 1); f.set(40, 5, 1);
  assert.deepEqual(f.bounds(), { x0: -9, x1: 40, y0: -2, y1: 5 });
  assert.equal(f.population, 2);
  f.set(40, 5, 0);
  assert.deepEqual(f.bounds(), { x0: -9, x1: -9, y0: -2, y1: -2 });
  assert.throws(() => f.set(100, 0, 1), RangeError);
});

test('an empty Field stays empty', () => {
  const f = new Field(32, 4);
  assert.equal(f.step(), true);
  assert.equal(f.population, 0);
  assert.equal(f.gen, 1);
});
