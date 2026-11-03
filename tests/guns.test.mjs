// Every claim the site makes about its guns, checked by simulation with the shipped engine.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pattern } from '../site/js/lfod.js';
import { GUNS, byId } from '../site/js/guns.js';
import { groups, identify } from './objects.mjs';

const PERIODS = 50; // consecutive periods checked after settling
const key = (cells) => cells.map((c) => c.join(',')).sort().join(';');
const shift = (cells, dx, dy) => cells.map(([x, y]) => [x + dx, y + dy]);
const inBox = ([x0, y0, x1, y1]) => ([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
const split = (box, P) => {
  const f = inBox(box), engine = [], rest = [];
  for (const c of P.cells()) (f(c) ? engine : rest).push(c);
  return { engine, rest };
};
const tally = (ps) => { const t = {}; for (const q of ps) { const id = identify(q) || `?${q.length}`; t[id] = (t[id] || 0) + 1; } return t; };
// which way a moon outside the box is flying: away from the gun, along the gun's axis
const away = (e, q) => {
  const [x0, y0, x1, y1] = e.box, [x, y] = q[0];
  return e.axis === 'x' ? [x < x0 ? -1 : 1, 0] : [0, y < y0 ? -1 : 1];
};

for (const e of GUNS) {
  const p = e.period;
  const P0 = Pattern.fromRLE(e.rle);

  test(`${e.name}: starts with ${e.pop0} cells`, () => assert.equal(P0.population, e.pop0));

  test(`${e.name}: a period-${p} engine that stays in its box, and nothing outside it but moons flying away at c`, () => {
    let A = P0.run(e.settle);
    for (let k = 0; k < PERIODS; k++) {
      const B = A.run(p);
      const a = split(e.box, A), b = split(e.box, B);
      assert.equal(key(a.engine), key(b.engine), `engine, period ${k}`);
      const ps = groups(a.rest, 2);
      for (const q of ps) assert.equal(identify(q), 'moon', `period ${k}: ${q.length} cells at ${JSON.stringify(q[0])} are not a moon`);
      // the whole is the engine run alone plus the moons run alone: nothing fired ever
      // touches the gun again, and the moons never touch each other
      const alone = [...Pattern.fromCells(a.engine).run(p).cells(), ...(a.rest.length ? Pattern.fromCells(a.rest).run(p).cells() : [])];
      assert.equal(key(alone), key(B.cells()), `independence, period ${k}`);
      for (const q of ps) {
        const [vx, vy] = away(e, q);
        assert.equal(key(Pattern.fromCells(q).run(p).cells()), key(shift(q, vx * p, vy * p)), `a moon, period ${k}`);
      }
      A = B;
    }
  });

  test(`${e.name}: fires ${e.fires.moon} moons every ${p} generations, one each way along ${e.axis === 'x' ? 'row' : 'column'} ${e.barrel}`, () => {
    const a = split(e.box, P0.run(e.settle + 10 * p)).rest, b = split(e.box, P0.run(e.settle + 30 * p)).rest;
    assert.deepEqual(Object.keys(tally(groups(a, 2))), ['moon']);
    assert.equal(groups(b, 2).length - groups(a, 2).length, 20 * e.fires.moon);
    const sides = { '-1': 0, 1: 0 };
    for (const q of groups(b, 2)) {
      const [vx, vy] = away(e, q);
      sides[vx + vy]++;
      // every moon is on the barrel line: its cells span barrel..barrel+3 across the axis
      const across = q.map(([x, y]) => (e.axis === 'x' ? y : x));
      assert.deepEqual([Math.min(...across), Math.max(...across)], [e.barrel, e.barrel + 3]);
    }
    assert.equal(sides[-1], sides[1]);
  });

  test(`${e.name}: a moon is born as two cells just outside the box; the gun is a mirror image of itself both ways`, () => {
    // at every generation, what is outside the box is moons, or two cells touching the
    // box that are a moon one generation later
    let P = P0.run(e.settle);
    for (let g = 0; g < p; g++, P = P.next()) {
      const Q = P.next();
      for (const q of groups(split(e.box, P).rest, 2)) {
        if (identify(q) === 'moon') continue;
        assert.equal(q.length, 2, `gen ${P.gen}: ${q.length} cells at ${q[0]}`);
        const [x0, y0, x1, y1] = e.box;
        assert.ok(q.every(([x, y]) => x >= x0 - 1 && x <= x1 + 1 && y >= y0 - 1 && y <= y1 + 1), 'touching the box');
        const born = groups(split(e.box, Q).rest, 2).find((r) => r.some(([x, y]) => q.some(([u, v]) => Math.abs(x - u) <= 1 && Math.abs(y - v) <= 1)));
        assert.equal(identify(born), 'moon', `gen ${Q.gen}`);
      }
    }
    // the given form is symmetric both ways (the moons leave along its middle line)
    const cells = P0.cells(), w = P0.w, h = P0.h;
    assert.equal(key(cells), key(cells.map(([x, y]) => [w - 1 - x, y])), 'left-right');
    assert.equal(key(cells), key(cells.map(([x, y]) => [x, h - 1 - y])), 'top-bottom');
    const mid = e.axis === 'x' ? (h - 4) / 2 : (w - 4) / 2;
    assert.equal(e.barrel, mid, 'the barrel is the middle line');
  });
}

test('the two guns shown, by period 5 then 4; the smaller is the later', () => {
  assert.deepEqual(GUNS.map((e) => e.period), [5, 4]);
  assert.ok(byId.p5.pop0 < byId.laser.pop0);
  assert.ok(byId.p5.found > byId.laser.found);
});
