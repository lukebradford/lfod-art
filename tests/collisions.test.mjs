// Every collision outcome shown on the site, checked by direct simulation of exactly
// the setup the site runs (setup() in site/js/collisions.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pattern, classify } from '../site/js/lfod.js';
import { byId } from '../site/js/catalog.js';
import { TARGETS, MOON, setup, allCollisions, parseOutcome, shortLabel, sentence } from '../site/js/collisions.js';

// --- identifying debris ------------------------------------------------------
// every phase, in all eight orientations, of the objects collisions can leave behind
const orient = (cells, f, r) => cells.map(([x, y]) => {
  if (f) x = -x;
  for (let i = 0; i < r; i++) [x, y] = [-y, x];
  return [x, y];
});
const KNOWN = new Map();
for (const id of ['dot', 'checker', 'moon', 'freeship', 'monster']) {
  const e = byId[id];
  let p = Pattern.fromRLE(e.rle);
  for (let g = 0; g < e.period; g++, p = p.next())
    for (const f of [0, 1]) for (let r = 0; r < 4; r++)
      KNOWN.set(Pattern.fromCells(orient(p.cells(), f, r)).shapeKey(), id);
}
const identify = (cells) => KNOWN.get(Pattern.fromCells(cells).shapeKey());

// cells grouped by Chebyshev distance <= r (cells 3 or more apart cannot interact in one step)
function groups(cells, r) {
  const key = (x, y) => x + ',' + y;
  const at = new Map(cells.map((c) => [key(...c), c]));
  const seen = new Set(), out = [];
  for (const c of cells) {
    if (seen.has(key(...c))) continue;
    seen.add(key(...c));
    const g = [], stack = [c];
    while (stack.length) {
      const [x, y] = stack.pop();
      g.push([x, y]);
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const k = key(x + dx, y + dy);
        if (at.has(k) && !seen.has(k)) { seen.add(k); stack.push(at.get(k)); }
      }
    }
    out.push(g);
  }
  return out;
}

// Split p into named objects that never interact for the next `horizon` generations
// (checked by running each piece alone and comparing the union with the whole).
// Returns [{ name, cells }] or null.
function decompose(p, horizon = 150) {
  const near = groups(p.cells(), 2);
  const named = near.filter((g) => identify(g));
  const rest = near.filter((g) => !identify(g)).flat();
  // a free ship's spark can sit more than 2 cells from its body
  const pieces = named.concat(rest.length ? groups(rest, 6) : []);
  if (!pieces.every((g) => identify(g))) return null;
  let whole = p, parts = pieces.map((g) => Pattern.fromCells(g));
  for (let k = 0; k < horizon; k++) { whole = whole.next(); parts = parts.map((q) => q.next()); }
  const union = new Set(parts.flatMap((q) => q.cells().map((c) => c.join())));
  const w = whole.cells().map((c) => c.join());
  if (w.length !== union.size || !w.every((c) => union.has(c))) return null;
  return pieces.map((cells) => ({ name: identify(cells), cells }));
}

const tally = (pieces) => {
  const t = {};
  for (const { name } of pieces) t[name] = (t[name] || 0) + 1;
  return t;
};

// --- the table ---------------------------------------------------------------
test('every target lists one outcome per offset in its range', () => {
  for (const t of TARGETS)
    for (const row of Object.values(t.rows)) assert.equal(row.length, t.dy[1] - t.dy[0] + 1, t.id);
});

for (const c of allCollisions()) {
  const name = `moon vs ${c.target.id}, offset ${c.dy}, gap ${c.gap}: ${shortLabel(c.outcome)}`;
  test(name, () => {
    const p0 = Pattern.fromCells(setup(c.target, c.dy, c.gap));
    if (c.outcome.kind === 'explodes') {
      const a = p0.run(150), b = a.run(50);
      assert.ok(a.population > 4000, `population ${a.population} at gen 150`);
      // still growing at close to the speed of light in both directions
      assert.ok(b.w - a.w >= 80 && b.h - a.h >= 80, `box ${a.w}x${a.h} -> ${b.w}x${b.h}`);
      assert.ok(b.population > a.population);
      return;
    }
    const at = c.outcome.at;
    const before = p0.run(at - 1), p = before.next();
    if (c.outcome.kind === 'nothing') {
      assert.equal(p.population, 0);
      assert.ok(before.population > 0, 'dies exactly at the stated generation');
      return;
    }
    const pieces = decompose(p);
    assert.ok(pieces, `settled into known, separate objects by gen ${at}`);
    assert.deepEqual(tally(pieces), c.outcome.objects);
    assert.equal(decompose(before), null, `not yet settled at gen ${at - 1}`);
  });
}

test('only the parity of the gap matters: two cells further back gives the same outcome', () => {
  for (const c of allCollisions()) {
    const p = Pattern.fromCells(setup(c.target, c.dy, c.gap + 2));
    if (c.outcome.kind === 'explodes') { assert.ok(p.run(120).population > 1500); continue; }
    // a moving target meets the moon one generation later; a still or period-2 one, two
    const delay = c.target.id === 'moon' ? 1 : 2;
    const q = p.run(c.outcome.at + delay);
    if (c.outcome.kind === 'nothing') { assert.equal(q.population, 0); continue; }
    assert.deepEqual(tally(decompose(q)), c.outcome.objects, `${c.target.id} ${c.dy} ${c.gap}`);
  }
});

test('outside the listed offsets the moon misses: both carry on untouched', () => {
  for (const t of TARGETS) for (const gap of Object.keys(t.rows).map(Number))
    for (const dy of [t.dy[0] - 3, t.dy[0] - 2, t.dy[0] - 1, t.dy[1] + 1, t.dy[1] + 2, t.dy[1] + 3]) {
      const g = gap + 40;
      const both = Pattern.fromCells(setup(t, dy, gap)).run(g);
      const moon = Pattern.fromCells(MOON.map(([x, y]) => [x - gap + g, y]));
      const alone = Pattern.fromCells(t.cells.map(([x, y]) => [x, y + dy])).run(g);
      const expect = new Set([...moon.cells(), ...alone.cells()].map((c) => c.join()));
      const got = both.cells().map((c) => c.join());
      assert.equal(got.length, expect.size, `${t.id} offset ${dy}`);
      assert.ok(got.every((c) => expect.has(c)), `${t.id} offset ${dy}`);
    }
});

test('the two free ships born from offset moons fly up and down, at right angles', () => {
  const cs = allCollisions().filter((c) => c.outcome.objects.freeship);
  assert.equal(cs.length, 2);
  for (const c of cs) {
    const p = Pattern.fromCells(setup(c.target, c.dy, c.gap)).run(c.outcome.at);
    const ships = decompose(p).filter((x) => x.name === 'freeship')
      .map((x) => classify(Pattern.fromCells(x.cells)));
    assert.deepEqual(ships.map((s) => [s.kind, s.period, s.dx, s.dy]).sort(),
      [['ship', 6, 0, -6], ['ship', 6, 0, 6]]);
  }
});

test('a checker that swallows the moon is knocked exactly four rows across', () => {
  const cs = allCollisions().filter((c) => c.target.id === 'checker' && c.outcome.kind === 'objects'
    && Object.keys(c.outcome.objects).join() === 'checker');
  assert.equal(cs.length, 2);
  for (const c of cs) {
    const p = Pattern.fromCells(setup(c.target, c.dy, c.gap)).run(c.outcome.at);
    const undisturbed = Pattern.fromCells(c.target.cells.map(([x, y]) => [x, y + c.dy])).run(c.outcome.at);
    assert.ok(p.sameShape(undisturbed), 'same phase');
    assert.equal(p.x0, undisturbed.x0);
    assert.equal(Math.abs(p.y0 - undisturbed.y0), 4);
  }
});

test('outcome strings parse and read correctly', () => {
  assert.deepEqual(parseOutcome('28:checker×4 freeship×2'), { at: 28, kind: 'objects', objects: { checker: 4, freeship: 2 } });
  assert.equal(shortLabel(parseOutcome('28:checker×4 freeship×2')), '2 free ships, 4 checkers');
  assert.equal(shortLabel(parseOutcome('15:checker dot×2')), '1 checker, 2 dots');
  assert.match(sentence(parseOutcome('15:checker dot×2'), 'checker'), /a checker and two dots by generation 15/);
  assert.match(sentence(parseOutcome('11:monster'), 'moon'), /monster/);
});
