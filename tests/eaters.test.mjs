// Eaters: the glossary's anchor eater flies on its own, longer tracks make ships of
// every power-of-two period from 16, the pairs on the flying track follow Rule 90, and
// the fate of every track from 3 to 40 slots is what eaters.js says.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pattern } from '../site/js/lfod.js';
import { eater, RLE, period, fate, cells, SHOWN, TESTED, pairAt, PAIR_ROWS } from '../site/js/eaters.js';
import { explodes } from './objects.mjs';

const same = (a, b) => a.x0 === b.x0 && a.y0 === b.y0 && a.sameShape(b);
const shifted = (a, b, dx) => b.x0 === a.x0 + dx && b.y0 === a.y0 && a.sameShape(b);

test('six slots is the glossary\'s anchor eater, and each slot adds a pair of dots', () => {
  assert.ok(same(eater(6), Pattern.fromRLE(RLE)));
  for (let s = 3; s <= 40; s++) {
    const p = eater(s);
    assert.equal(p.population, 2 * s + 50);
    // (below six slots the front, moved back, overlaps the trailer's box)
    if (s >= 6) assert.deepEqual([p.w, p.h], [4 * s + 8, 23]);
  }
});

test('period(s): twice the first power of two at or above s', () => {
  assert.deepEqual([6, 8, 9, 10, 16, 17, 18, 32, 33, 34, 40, 64, 66].map(period), [16, 16, 32, 32, 32, 64, 64, 64, 128, 128, 128, 128, 256]);
});

// Every even track from 6 to 40 slots is a ship: after exactly period(s) generations it
// is itself again, moved period(s) cells to the right (c), and at no earlier generation
// is it itself moved anywhere. Its fewest cells over the period are 2s + 50, at the start.
for (let s = 6; s <= TESTED[1]; s += 2) {
  test(`${s} slots: a ship of period ${period(s)} at c, ${cells(s)} cells at fewest`, () => {
    const P = period(s), start = eater(s);
    assert.deepEqual(fate(s), { kind: 'ship', period: P });
    let p = start, fewest = Infinity;
    for (let g = 1; g <= P; g++) {
      fewest = Math.min(fewest, p.population);
      p = p.next();
      if (g < P) assert.ok(!p.sameShape(start), `returns early at ${g}`);
    }
    assert.ok(shifted(start, p, P));
    assert.equal(fewest, cells(s));
    assert.equal(start.population, cells(s));
  });
}

// Every track three more than a multiple of four is a puffer whose trail is checkers:
// from generation 400 its front (the 4s + 16 rightmost columns) comes back exactly every
// period(s) generations, moved period(s) cells right, and never sooner; behind the front
// every live cell is half of a checker (one other cell diagonally next to it and no
// other neighbor), which blinks forever; the trail gains cells every period.
for (let s = 7; s <= TESTED[1]; s += 4) {
  test(`${s} slots: a puffer of period ${period(s)} at c, leaving checkers`, () => {
    const P = period(s), W = 4 * s + 16;
    assert.deepEqual(fate(s), { kind: 'puffer', period: P });
    const front = (p) => {
      const x1 = p.x0 + p.w;
      return Pattern.fromCells(p.cells().filter(([x]) => x >= x1 - W));
    };
    let p = eater(s).run(400);
    const f0 = front(p), pop0 = p.population;
    for (let g = 1; g <= P; g++) {
      p = p.next();
      if (g < P) assert.ok(!front(p).sameShape(f0), `front returns early at ${g}`);
    }
    assert.ok(shifted(f0, front(p), P));
    assert.equal(p.h, 23);
    assert.ok(p.population > pop0);
    const x1 = p.x0 + p.w - W;
    let behind = 0;
    for (const [x, y] of p.cells()) {
      if (x >= x1 - 2) continue;
      behind++;
      const n = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && p.get(x + dx, y + dy)) n.push([dx, dy]);
      assert.equal(n.length, 1, `cell ${x},${y} has ${n.length} neighbors`);
      assert.ok(n[0][0] !== 0 && n[0][1] !== 0, 'its one neighbor is diagonal');
      const [ox, oy] = [x + n[0][0], y + n[0][1]];
      let k = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && p.get(ox + dx, oy + dy)) k++;
      assert.equal(k, 1, 'and that neighbor has no other');
    }
    assert.ok(behind > 0);
  });
}

// Below six slots, and at every track one more than a multiple of four, it explodes by
// the standard of the Diamonds and Four cells sections, measured at generation 300
// rather than 150, since a longer track takes longer to break (25 slots: 82 generations
// before anything leaves the track's 23 rows).
const BOOM = [];
for (let s = TESTED[0]; s <= TESTED[1]; s++) if (s < 6 || s % 4 === 1) BOOM.push(s);
test(`${BOOM.join(', ')} slots: explode`, () => {
  for (const s of BOOM) {
    assert.deepEqual(fate(s), { kind: 'explodes' });
    assert.ok(explodes(eater(s).cells(), 300), `${s} slots`);
  }
});

test('fate covers every tested track, and the shown ships are the smallest of their period', () => {
  for (let s = TESTED[0]; s <= TESTED[1]; s++) assert.ok(['ship', 'puffer', 'explodes'].includes(fate(s).kind));
  for (const s of SHOWN) {
    assert.equal(fate(s).kind, 'ship');
    for (let r = 3; r < s; r++) if (fate(r).kind === 'ship') assert.ok(period(r) < period(s), `${r} slots`);
  }
  assert.deepEqual(SHOWN.map(period), [16, 32, 64, 128]);
  assert.deepEqual(SHOWN.map(cells), [62, 70, 86, 118]);
});

// The collection's table of the smallest known spaceship at each period lists the s-slot
// anchor eater ship for periods 16 to 256, with s = 2 * 2^n + 2, period 8 * 2^n, and
// 4 * 2^n + 54 cells. Those are the eater ships here, and cells(s) is that formula. (The
// table's 256 row says 180 cells; its formula and the engine both give 182.)
test('the table\'s anchor eater ships: period 8 * 2^n, 2 * 2^n + 2 slots, 4 * 2^n + 54 cells', () => {
  for (let n = 1; n <= 5; n++) {
    const s = 2 * 2 ** n + 2;
    assert.equal(period(s), 8 * 2 ** n);
    assert.equal(cells(s), 4 * 2 ** n + 54);
  }
  const s = 66, P = period(s), start = eater(s);
  let p = start, fewest = Infinity;
  for (let g = 0; g < P; g++) { fewest = Math.min(fewest, p.population); p = p.next(); }
  assert.ok(shifted(start, p, P));
  assert.equal(fewest, 182);
});

// The pairs on the flying track follow Rule 90, as on the standing anchor track: at
// every even generation over four periods, at every x from one cell behind the back of
// the track to the front, there is a pair at generation t + 2 exactly when there was one
// at x - 2 or at x + 2 at generation t, but not both. The only exceptions are at the
// very back (x - t = -1, where the eater takes pairs away) and at the front (x - t =
// 4s + 3 and 4s + 7, where the front sets new ones down). Pairs only ever sit at odd x,
// beside the dots, and nowhere outside 1 <= x - t <= 4s + 7.
for (const s of SHOWN) {
  test(`${s} slots: the pairs on the track follow Rule 90`, () => {
    const P = period(s), EDGE = new Set([-1, 4 * s + 3, 4 * s + 7]);
    let p = eater(s);
    for (let t = 0; t < 4 * P; t += 2) {
      const q = p.next().next();
      for (let x = p.x0 - 4; x < p.x0 + p.w + 6; x++) {
        const off = x - t;
        if (pairAt(q, x)) {
          assert.equal(Math.abs(x % 2), 1, `pair at even x, gen ${t + 2}`);
          assert.ok(off >= 1 && off <= 4 * s + 7);
        }
        if (EDGE.has(off)) continue;
        assert.equal(pairAt(q, x), pairAt(p, x - 2) ^ pairAt(p, x + 2), `gen ${t} offset ${off}`);
      }
      p = q;
    }
    assert.deepEqual(PAIR_ROWS, [10, 12]);
  });
}
