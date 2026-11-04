// Periods: anchor tracks follow Rule 90, their periods follow from it, and every row of
// the table of periods really has the period and population the page shows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pattern, classify } from '../site/js/lfod.js';
import { byId as catalog } from '../site/js/catalog.js';
import { track, sord, trackPeriod, SITES, sitesOf, rule90, trackWith, SHOWN, TABLE, byId, patternOf } from '../site/js/periods.js';

const same = (a, b) => a.x0 === b.x0 && a.y0 === b.y0 && a.sameShape(b);

test('the two-slot track is the bestiary\'s, and each slot adds a pair of dots', () => {
  assert.ok(same(track(2), Pattern.fromRLE(catalog.anchortrack.rle)));
  assert.ok(same(track(2), Pattern.fromRLE('x = 6, y = 5, rule = B2/S0\nbo3bo$o2$o$bo3bo!')));
  for (let s = 1; s <= 20; s++) {
    const p = track(s);
    assert.equal(p.population, 2 * s + 2);
    assert.deepEqual([p.w, p.h], [4 * s - 2, 5]);
    assert.ok(same(trackWith(s, Uint8Array.from([1])), p));
  }
});

test('sord: the smallest k with 2^k one more or one less than a multiple of m', () => {
  assert.deepEqual([3, 5, 7, 9, 11, 13, 15, 19, 29, 2731].map(sord), [1, 2, 3, 3, 5, 6, 4, 9, 14, 13]);
  assert.equal(2 ** 9 % 19, 18); // 512 = 27 * 19 - 1
  assert.equal(2 ** 14 % 29, 28); // 16384 = 565 * 29 - 1
  assert.equal(2 ** 13 % 2731, 2730);
});

// Over a full period, at every even generation, the track is exactly its dots plus a
// pair at each site that Rule 90 says is on; so the period is Rule 90's, which with
// 2s sites and nothing beyond either end is 2 * (2^sord(2, 2s+1) - 1) steps of two
// generations: 4 * 2^k - 4.
for (let s = 1; s <= 17; s++) {
  test(`${s}-slot anchor track: period ${trackPeriod(s)}, ${2 * s + 2} cells at fewest, Rule 90 at every even generation`, () => {
    const P = trackPeriod(s);
    let a = new Uint8Array(SITES(s)); a[0] = 1;
    let p = track(s), lo = Infinity, hull = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
    for (let g = 0; g < P; g++) {
      if (g % 2 === 0) {
        assert.ok(same(p, trackWith(s, a)), `generation ${g}`);
        assert.deepEqual(sitesOf(p, s), a);
        a = rule90(a);
      }
      lo = Math.min(lo, p.population);
      hull.x0 = Math.min(hull.x0, p.x0); hull.x1 = Math.max(hull.x1, p.x0 + p.w - 1);
      hull.y0 = Math.min(hull.y0, p.y0); hull.y1 = Math.max(hull.y1, p.y0 + p.h - 1);
      // the state never repeats early
      p = p.next();
    }
    assert.ok(same(p, track(s)), 'back at the start after one period');
    assert.deepEqual(classify(track(s), { maxGen: P }), { kind: 'osc', period: P, dx: 0, dy: 0 });
    assert.equal(lo, 2 * s + 2);
    // over a period the track reaches one cell left of its first dots and two right of its last, never above or below
    assert.deepEqual(hull, { x0: -1, x1: 4 * s - 1, y0: 0, y1: 4 });
  });
}

test('the tracks shown, and their periods in the order the page gives them', () => {
  assert.deepEqual(SHOWN, [2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(SHOWN.map(trackPeriod), [12, 28, 28, 124, 252, 60, 60, 2044]);
  assert.deepEqual([10, 11, 12, 13, 14, 15, 16, 17].map(trackPeriod), [252, 8188, 4092, 2044, 65532, 124, 124, 16380]);
});

test('the table: one row per period, rising; every known period past 19 is an anchor track', () => {
  const periods = TABLE.map((e) => e.period);
  assert.deepEqual(periods, [...periods].sort((a, b) => a - b));
  assert.equal(new Set(periods).size, periods.length);
  assert.deepEqual(periods, [1, 2, 3, 4, 5, 6, 8, 12, 19, 28, 60, 124, 252, 508, 1020, 2044, 4092, 8188, 16380, 32764, 65532]);
  for (const e of TABLE) if (e.period > 19) assert.ok(e.slots, e.name);
  // each track in the table is the fewest slots that give its period
  for (const e of TABLE) if (e.slots) for (let s = 1; s < e.slots; s++) assert.notEqual(trackPeriod(s), e.period, `${s} slots also give ${e.period}`);
  assert.equal(TABLE.filter((e) => e.credit === 'Josh Ball').length, 4);
  assert.deepEqual(TABLE.filter((e) => e.credit === 'Josh Ball').map((e) => e.id), ['sandbar', 'starfish', 'ant', 'sparkler']);
});

for (const e of TABLE) {
  test(`${e.name}: period ${e.period}, ${e.cells} cells at fewest`, () => {
    const p0 = patternOf(e);
    let p = p0, lo = Infinity, found = 0;
    for (let g = 1; g <= e.period; g++) {
      lo = Math.min(lo, p.population);
      p = p.next();
      if (same(p, p0)) { found = g; break; }
    }
    assert.equal(found, e.period);
    assert.equal(lo, e.cells);
    assert.equal(p0.population, e.cells, 'shown in its sparsest phase');
  });
}

test('the three oscillators new to the page are the glossary\'s patterns, found by Josh Ball', () => {
  for (const id of ['sandbar', 'starfish', 'sparkler']) {
    const e = byId(id);
    assert.equal(e.credit, 'Josh Ball');
    assert.equal(e.source.url, `https://lukebradford.github.io/lfod/glossary.html#${id}`);
  }
  assert.deepEqual(['sandbar', 'starfish', 'sparkler'].map((id) => [byId(id).period, byId(id).cells]), [[3, 32], [5, 64], [8, 12]]);
});
