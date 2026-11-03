// Checks every claim in site/js/five.js and the Five cells section's prose, by running
// every placement of five cells, enumerated here independently of the site's list.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pattern } from '../site/js/lfod.js';
import { byId } from '../site/js/catalog.js';
import { FIVE, LATE, PUFF, SETTLE, VANISH, cellsOf } from '../site/js/five.js';
import { parseOutcome, phrase } from '../site/js/outcomes.js';
import { placements, extend, canon, norm, decompose, tally, explodes, puffer, orient } from './objects.mjs';

const P4 = placements(4);
const all = extend(P4);
const settle = SETTLE.map(([c, s]) => [cellsOf(c), parseOutcome(s)]);
const vanish = VANISH.map(([c, at]) => [cellsOf(c), at]);
const puffs = PUFF.map(([c, s]) => [cellsOf(c), parseOutcome(s)]);

test('extend() finds every placement: from three cells it gives exactly the brute-force four', () => {
  const four = extend(placements(3)).map(canon).sort();
  assert.deepEqual(four, P4.map(canon).sort());
});

test('five cells: 6634 placements; 6151 explode, and the other 483 are exactly the site\'s lists', () => {
  assert.equal(all.length, FIVE.placements);
  const listed = [...settle, ...vanish, ...puffs].map((x) => x[0]);
  for (const c of listed) assert.deepEqual(c, norm(c), 'top-left at (0, 0)');
  const keys = listed.map(canon);
  assert.equal(new Set(keys).size, listed.length, 'no placement listed twice');
  const calm = new Set(keys);
  assert.ok(keys.every((k) => all.some((c) => canon(c) === k)), 'every listed placement is a real one');
  let boom = 0;
  for (const c of all) {
    if (calm.has(canon(c))) continue;
    const late = LATE.includes(norm(c).map(([x, y]) => `${x}${y}`).join(''));
    // every other placement explodes (the late one only measured from generation 200)
    assert.ok(late ? !explodes(c) && explodes(c, 200) : explodes(c), JSON.stringify(c));
    boom++;
  }
  assert.equal(boom, FIVE.explode);
  assert.equal(listed.length, 483);
  assert.deepEqual([settle.length, vanish.length, puffs.length, LATE.length], [415, 59, 9, 1]);
});

test('none of the listed placements explodes', () => {
  for (const [c] of [...settle, ...vanish, ...puffs]) assert.ok(!explodes(c) && !explodes(c, 200), JSON.stringify(c));
});

for (const [cells, o] of settle) {
  test(`five cells ${JSON.stringify(cells)}: ${phrase(o.objects)} by gen ${o.at}`, () => {
    const before = o.at > 0 ? Pattern.fromCells(cells).run(o.at - 1) : null;
    const p = before ? before.next() : Pattern.fromCells(cells);
    const pieces = decompose(p);
    assert.ok(pieces, `separate named objects at gen ${o.at}`);
    assert.deepEqual(tally(pieces), o.objects);
    if (before) assert.equal(decompose(before), null, `not yet at gen ${o.at - 1}`);
  });
}

test('the 59 that vanish die exactly at the stated generation', () => {
  for (const [cells, at] of vanish) {
    const before = Pattern.fromCells(cells).run(at - 1);
    assert.ok(before.population > 0, JSON.stringify(cells));
    assert.equal(before.next().population, 0, JSON.stringify(cells));
  }
  assert.equal(Math.max(...vanish.map((v) => v[1])), 19);
});

test('nine become double dot puffers flying right at c (one, two flying apart), at the stated generation', () => {
  for (const [cells, o] of puffs) {
    const n = o.objects.puffer;
    assert.deepEqual(puffer(cells), { at: o.at, n }, JSON.stringify(cells));
    // and turned the other way round, it is not a right-flying puffer (so it was turned on purpose)
    if (n === 1) assert.equal(puffer(norm(orient(cells, 1, 0))), null);
  }
  assert.deepEqual(puffs.map(([, o]) => o.objects.puffer).sort(), [1, 1, 1, 1, 1, 1, 1, 1, 2]);
  assert.equal(Math.max(...puffs.map(([, o]) => o.at)), 9);
});

test('the puffers grow forever: one cell every two generations each, and nothing else changes', () => {
  for (const [cells, o] of puffs) {
    const n = o.objects.puffer;
    const a = Pattern.fromCells(cells).run(o.at + 40), b = a.run(400);
    assert.equal(b.population - a.population, 200 * n, JSON.stringify(cells));
    assert.equal(b.w - a.w, 400 * n);
  }
});

test('the plus vanishes in one generation; snake eyes become a plus; the T-tetromino becomes snake eyes', () => {
  // decoded from the LFoD Universe glossary's pictures (no RLE given there)
  const PLUS = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]];
  const SNAKE_EYES = [[0, 0], [2, 0]];
  const T = [[0, 0], [1, 0], [2, 0], [1, 1]];
  const shape = (p) => canon(p.cells());
  assert.ok(vanish.some(([c, at]) => canon(c) === canon(PLUS) && at === 1));
  assert.equal(vanish.filter(([, at]) => at === 1).length, 1, 'the only five-cell placement gone after one generation');
  assert.equal(Pattern.fromCells(PLUS).next().population, 0);
  assert.equal(shape(Pattern.fromCells(SNAKE_EYES).next()), canon(PLUS));
  assert.equal(shape(Pattern.fromCells(T).next()), canon(SNAKE_EYES));
});

test('prose: what appears for the first time with five cells', () => {
  const count = (pred) => settle.filter(([, o]) => pred(o.objects)).length;
  assert.equal(count((ob) => ob.ant), 1);
  assert.equal(settle.find(([, o]) => o.objects.ant)[1].at, 9);
  assert.equal(count((ob) => ob.freeship === 1), 1);
  assert.equal(count((ob) => ob.freeship === 2), 35);
  assert.equal(count((ob) => ob.moon), 5);
  assert.equal(count((ob) => ob.anchor), 22);
  assert.equal(count((ob) => ob.lever), 4);
  assert.equal(count((ob) => ob.radar), 1);
  assert.equal(count((ob) => Object.keys(ob).every((k) => k === 'dot' || k === 'checker')), 346);
  // with fewer cells there is no ant, no puffer and no lone free ship: placements of two,
  // three and four cells that don't explode are all named objects or nothing by gen 60
  for (const n of [2, 3, 4]) {
    for (const c of (n === 4 ? P4 : placements(n)).filter((x) => !explodes(x))) {
      const pieces = decompose(Pattern.fromCells(c).run(60));
      assert.ok(pieces, JSON.stringify(c));
      const t = tally(pieces);
      assert.ok(!t.ant && t.freeship !== 1, JSON.stringify(c));
    }
  }
});

test('decompose() knows a free ship in every phase and orientation, even when its spark sits alone', () => {
  let p = Pattern.fromRLE(byId.freeship.rle);
  for (let g = 0; g < 6; g++, p = p.next())
    for (const f of [0, 1]) for (let r = 0; r < 4; r++) {
      const pieces = decompose(Pattern.fromCells(orient(p.cells(), f, r)));
      assert.deepEqual(pieces && tally(pieces), { freeship: 1 }, `phase ${g}`);
    }
  // the domino parts into two free ships at generation 12 (as "Two cells, parting" says), not 11
  const dom = Pattern.fromCells([[0, 0], [1, 0]]);
  assert.equal(decompose(dom.run(11)), null);
  assert.deepEqual(tally(decompose(dom.run(12))), { freeship: 2 });
});

test('every cell a puffer leaves behind is a dot, one every two generations', () => {
  for (const [cells, o] of puffs) {
    const sides = o.objects.puffer === 2 ? [1, -1] : [1];
    const A = Pattern.fromCells(cells).run(o.at + 200), B = A.run(400);
    const after = B.next();
    for (const d of sides) {
      const edge = (P) => (d > 0 ? P.x0 + P.w - 1 : P.x0);
      // the stretch of plane the puffer crossed in those 400 generations, minus its body
      const lo = Math.min(edge(A) - 8 * d, edge(B) - 8 * d), hi = Math.max(edge(A) - 8 * d, edge(B) - 8 * d);
      const laid = B.cells().filter(([x]) => x > lo && x <= hi);
      assert.equal(laid.length, 200, JSON.stringify(cells));
      for (const [x, y] of laid) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) n += B.get(x + dx, y + dy);
        assert.equal(n, 0, `a lone cell at ${x},${y}`);
        assert.equal(after.get(x, y), 1, 'and it survives');
      }
    }
  }
});

test('the late explosion is still only 25 cells at generation 40', () => {
  const [late] = LATE.map(cellsOf);
  assert.equal(Pattern.fromCells(late).run(40).population, 25);
});

test('the T-tetromino is one of the four-cell placements that vanish, gone by generation 3', async () => {
  const { VANISH: V4 } = await import('../site/js/four.js');
  const T = [[0, 0], [1, 0], [2, 0], [1, 1]];
  assert.ok(V4.some(([c, at]) => canon(c) === canon(T) && at === 3));
});
