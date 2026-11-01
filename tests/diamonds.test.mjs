// Checks every claim in site/js/diamonds.js and the Diamonds section's prose.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pattern, Field, classify } from '../site/js/lfod.js';
import { placements, canon, norm } from './objects.mjs';
import { PAIRS, TRIPLES, EVIL_EYES, THREE, DENSITY } from '../site/js/diamonds.js';

// enumeration, independent of the site's list (tests/objects.mjs)

// The same standard as the collisions: more than 4000 cells at generation 150, and the
// bounding box still growing by at least 80 cells each way over the next 50.
function explodes(cells) {
  const f = Field.around(Pattern.fromCells(cells), 210);
  for (let g = 0; g < 150; g++) f.step();
  const a = f.bounds(), pop = f.population;
  for (let g = 0; g < 50; g++) f.step();
  const b = f.bounds();
  return pop > 4000 && (b.x1 - b.x0) - (a.x1 - a.x0) >= 80 && (b.y1 - b.y0) - (a.y1 - a.y0) >= 80;
}

test('two cells: five placements, and only evil eyes (a knight\'s move apart) explodes', () => {
  const all = placements(2);
  assert.equal(all.length, PAIRS.placements);
  const boom = all.filter(explodes);
  assert.equal(boom.length, PAIRS.explode);
  assert.equal(canon(boom[0]), canon(EVIL_EYES));
  // a knight's move: one apart one way, two the other
  const [[ax, ay], [bx, by]] = EVIL_EYES;
  assert.deepEqual([Math.abs(ax - bx), Math.abs(ay - by)].sort(), [1, 2]);
});

test('two cells: the fates of the other four', () => {
  // side by side: two free ships (period 6, speed c) flying apart, from generation 12;
  // a vertical domino sends them left and right
  const dom = Pattern.fromCells([[0, 0], [0, 1]]).run(12);
  const left = Pattern.fromCells(dom.cells().filter(([x]) => x < 0));
  const right = Pattern.fromCells(dom.cells().filter(([x]) => x > 0));
  assert.equal(left.population + right.population, dom.population);
  for (const [ship, dir] of [[left, -1], [right, 1]]) {
    const c = classify(ship);
    assert.equal(c.kind, 'ship');
    assert.equal(c.period, 6);
    assert.deepEqual([c.dx, c.dy], [6 * dir, 0]);
  }
  // touching at a corner: a checker, period 2
  const ch = classify(Pattern.fromCells([[0, 0], [1, 1]]));
  assert.deepEqual([ch.kind, ch.period], ['osc', 2]);
  // one apart, straight or diagonal: nothing left
  for (const cells of [[[0, 0], [2, 0]], [[0, 0], [2, 2]]]) {
    assert.equal(Pattern.fromCells(cells).run(20).population, 0);
  }
});

test('three cells: 31 placements, 21 explode, and they are exactly the site\'s list', () => {
  const all = placements(3);
  assert.equal(all.length, TRIPLES.placements);
  const boom = all.filter(explodes).map(canon).sort();
  assert.equal(boom.length, TRIPLES.explode);
  assert.equal(THREE.length, TRIPLES.explode);
  assert.deepEqual(THREE.map(canon).sort(), boom);
  // each listed seed is placed with its top-left at (0, 0)
  for (const s of THREE) assert.deepEqual(s, norm(s));
});

test('three cells: the other ten die out or settle into a few small objects', () => {
  const rest = placements(3).filter((c) => !explodes(c));
  assert.equal(rest.length, TRIPLES.placements - TRIPLES.explode);
  for (const cells of rest) {
    const p = Pattern.fromCells(cells).run(100);
    if (p.population === 0) continue;
    // a still life or oscillator of at most 8 cells, in at most an 8 x 8 box
    const c = classify(p);
    assert.ok(c.kind === 'still' || c.kind === 'osc', JSON.stringify(cells) + ' ' + c.kind);
    assert.ok(p.population <= 8 && p.w <= 8 && p.h <= 8, JSON.stringify(cells));
  }
});

// Growth: from an early generation on, every side of the bounding box moves out by
// exactly one cell per generation (the speed of light), and every diagonal front, the
// greatest x + y, x - y, -x + y, -x - y over live cells, by exactly one.
function fronts(f) {
  const out = [-Infinity, -Infinity, -Infinity, -Infinity];
  for (const [x, y] of f.toPattern().cells()) {
    if (x + y > out[0]) out[0] = x + y;
    if (x - y > out[1]) out[1] = x - y;
    if (y - x > out[2]) out[2] = y - x;
    if (-x - y > out[3]) out[3] = -x - y;
  }
  return out;
}

for (const [i, seed] of [EVIL_EYES, ...THREE].entries()) {
  const name = i === 0 ? 'evil eyes' : `three-cell seed ${i}`;
  test(`${name}: grows at c straight out and as fast as birth allows on the diagonals`, () => {
    const f = Field.around(Pattern.fromCells(seed), 610);
    let box = null, fr = null;
    for (let g = 1; g <= 600; g++) {
      assert.ok(f.step());
      const b = f.bounds();
      if (g > 70) {
        assert.deepEqual([b.x0, b.y0, b.x1, b.y1], [box.x0 - 1, box.y0 - 1, box.x1 + 1, box.y1 + 1], `box at gen ${g}`);
      }
      box = b;
      if (g <= 300 && (g > 30 || g === 30)) {
        const now = fronts(f);
        if (g > 30) assert.deepEqual(now, fr.map((v) => v + 1), `diagonal fronts at gen ${g}`);
        fr = now;
      }
      if (g === 300 || g === 600) {
        // the diamond inscribed in the box covers half of it
        const d = f.population / ((b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1) / 2);
        assert.ok(d > DENSITY[0] && d < DENSITY[1], `density ${d.toFixed(3)} at gen ${g}`);
      }
    }
  });
}

test('the diagonal limit holds for any pattern: x + y grows by at most one per generation', () => {
  // random soups, which mostly explode
  let s = 7;
  const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  for (let k = 0; k < 6; k++) {
    const cells = [];
    for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) if (r() < 0.3) cells.push([x, y]);
    const f = Field.around(Pattern.fromCells(cells), 100);
    let fr = fronts(f);
    for (let g = 0; g < 80; g++) {
      f.step();
      if (!f.population) break;
      const now = fronts(f);
      for (let j = 0; j < 4; j++) assert.ok(now[j] <= fr[j] + 1);
      fr = now;
    }
  }
});
