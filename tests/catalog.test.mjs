import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pattern, classify } from '../site/js/lfod.js';
import { CATALOG, byId, decodeApgcode } from '../site/js/catalog.js';

// measured once by this test; any engine change that alters it is a real change
const DOMINO_SPLIT_GEN = 12;

for (const e of CATALOG) {
  test(`${e.name}: ${e.kind}, period ${e.period}, displacement (${e.dx}, ${e.dy})`, () => {
    const p0 = Pattern.fromRLE(e.rle);
    const c = classify(p0, { maxGen: 400 });
    assert.equal(c.kind, e.kind);
    assert.equal(c.period, e.period);
    assert.equal(c.dx, e.dx);
    assert.equal(c.dy, e.dy);
    // population range over one full period, and hull for oscillators
    let p = p0, lo = Infinity, hi = 0;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let g = 0; g < e.period; g++) {
      lo = Math.min(lo, p.population); hi = Math.max(hi, p.population);
      minX = Math.min(minX, p.x0); minY = Math.min(minY, p.y0);
      maxX = Math.max(maxX, p.x0 + p.w - 1); maxY = Math.max(maxY, p.y0 + p.h - 1);
      p = p.next();
    }
    assert.deepEqual([lo, hi], e.pop);
    if (e.hull) assert.deepEqual([maxX - minX + 1, maxY - minY + 1], e.hull);
  });
}

test('every ship in the catalog travels at the speed of light (one cell per generation)', () => {
  for (const e of CATALOG.filter((e) => e.kind === 'ship'))
    assert.equal(Math.max(Math.abs(e.dx), Math.abs(e.dy)), e.period, e.name);
});

test('a domino splits into exactly two free ships flying apart', () => {
  const ship = Pattern.fromRLE(byId.freeship.rle);
  // find the first generation where the upper half is a free ship (in some phase)
  const phases = [ship];
  for (let i = 1; i < 6; i++) phases.push(phases[i - 1].next());
  let p = Pattern.fromCells([[0, 0], [1, 0]]);
  let g = 0;
  for (; g < 200; g++, p = p.next()) {
    const up = Pattern.fromCells(p.cells().filter(([, y]) => y < 0));
    const down = Pattern.fromCells(p.cells().filter(([, y]) => y >= 0));
    if (up.population + down.population !== p.population) continue;
    // the lower half must be the mirror image (y -> -1 - y) of the upper half
    const mirrored = Pattern.fromCells(down.cells().map(([x, y]) => [x, -1 - y]));
    if (up.population && phases.some((ph) => ph.sameShape(up)) && mirrored.sameShape(up)) break;
  }
  assert.ok(g < 200, 'domino never resolved into two free ships');
  assert.equal(g, DOMINO_SPLIT_GEN);
  // and it stays that way: 100 generations later it is still two ships and nothing else
  const later = p.run(100);
  const up = Pattern.fromCells(later.cells().filter(([, y]) => y < 0));
  const down = Pattern.fromCells(later.cells().filter(([, y]) => y >= 0));
  assert.ok(phases.some((ph) => ph.sameShape(up)));
  assert.ok(Pattern.fromCells(down.cells().map(([x, y]) => [x, -1 - y])).sameShape(up));
  assert.equal(up.population + down.population, later.population);
});


test('Pinwheel and Monster are symmetric under a half turn in every phase', () => {
  for (const id of ['pinwheel', 'monster']) {
    let p = Pattern.fromRLE(byId[id].rle);
    for (let g = 0; g < byId[id].period; g++, p = p.next()) {
      const turned = Pattern.fromCells(p.cells().map(([x, y]) => [-x, -y]));
      assert.ok(turned.sameShape(p), `${id} phase ${g}`);
    }
  }
});

// the eight symmetries of the square
const SYM = [
  ([x, y]) => [x, y], ([x, y]) => [-x, y], ([x, y]) => [x, -y], ([x, y]) => [-x, -y],
  ([x, y]) => [y, x], ([x, y]) => [-y, x], ([x, y]) => [y, -x], ([x, y]) => [-y, -x],
];

for (const e of CATALOG.filter((e) => e.apgcode)) {
  test(`${e.name} is the object Catagolue calls ${e.apgcode}`, () => {
    const pub = decodeApgcode(e.apgcode);
    const phases = [];
    let p = Pattern.fromRLE(e.rle);
    for (let g = 0; g < e.period; g++, p = p.next()) phases.push(p);
    const match = SYM.some((t) => {
      const q = Pattern.fromCells(pub.map(t));
      return phases.some((ph) => ph.sameShape(q));
    });
    assert.ok(match, `${e.apgcode} is not a phase of ${e.name}`);
  });
}

test('every name is either sourced or explicitly provisional', () => {
  for (const e of CATALOG) assert.ok(Boolean(e.source) !== Boolean(e.provisional), e.name);
});
