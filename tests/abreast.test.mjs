// Checks every claim in site/js/abreast.js and the Side by side section's prose by
// running every placement of a second free ship beside a first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pattern } from '../site/js/lfod.js';
import { byId } from '../site/js/catalog.js';
import { E, DY, SHIP, MAP, OUT, FLEET, GAP, shipPair, shipB, outcomeAt, fleetLanes, fleetCells } from '../site/js/abreast.js';
import { shipPairOutcome, shipPairCode } from './objects.mjs';

const key = (cells) => cells.map((c) => c.join()).sort().join(';');
const shape = (cells, flip = false) => {
  cells = cells.map(([x, y]) => [x, flip ? -y : y]);
  const mx = Math.min(...cells.map((c) => c[0])), my = Math.min(...cells.map((c) => c[1]));
  return key(cells.map(([x, y]) => [x - mx, y - my]));
};
const run = (cells, n) => { const out = [Pattern.fromCells(cells)]; for (let g = 1; g <= n; g++) out.push(out[g - 1].next()); return out; };

test('the ship: the glossary free ship, 12 cells in phase 0, period 6, speed c', () => {
  assert.equal(SHIP[0].length, 12);
  assert.deepEqual([Math.min(...SHIP[0].map((c) => c[0])), Math.max(...SHIP[0].map((c) => c[0]))], [0, 8]);
  assert.deepEqual([Math.min(...SHIP[0].map((c) => c[1])), Math.max(...SHIP[0].map((c) => c[1]))], [0, 5]);
  // the glossary's own RLE is this phase (up to translation), facing right
  const gl = Pattern.fromRLE('x = 9, y = 6, rule = s0/b2\no4bo$3b2obo$8bo$8bo$3b2obo$o4bo!');
  assert.equal(shape(gl.cells()), shape(SHIP[0]));
  for (let t = 0; t < 6; t++) {
    const next = Pattern.fromCells(SHIP[t]).next().cells();
    const want = t < 5 ? SHIP[t + 1] : SHIP[0].map(([x, y]) => [x + 6, y]);
    assert.equal(key(next), key(want), `phase ${t}`);
    // every phase is its own mirror image about row 2.5
    assert.equal(key(SHIP[t].map(([x, y]) => [x, 5 - y])), key(SHIP[t]), `mirror ${t}`);
  }
  assert.equal(byId.freeship.period, 6);
});

test('a lone ship stays in columns g - 6 .. g + 8 and rows -2 .. 7, and reaches all four', () => {
  const G = run(SHIP[0], 12);
  let lo = Infinity, hi = -Infinity, top = Infinity, bot = -Infinity;
  G.forEach((p, g) => {
    lo = Math.min(lo, p.x0 - g); hi = Math.max(hi, p.x0 + p.w - 1 - g);
    top = Math.min(top, p.y0); bot = Math.max(bot, p.y0 + p.h - 1);
  });
  assert.deepEqual([lo, hi, top, bot], [-6, 8, -2, 7]);
  // so with |e| >= 17 or |dy| >= 12 two empty columns or rows separate the ships forever
  assert.equal(E, 16); assert.equal(DY, 11);
  assert.ok(8 + 2 < -6 + (E + 1) && 7 + 2 < -2 + (DY + 1));
  // and indeed: just outside the map, every placement in every phase never touches
  for (let ph = 0; ph < 6; ph++) {
    for (let dy = 0; dy <= DY + 1; dy++) for (const e of [-E - 1, E + 1]) assert.equal(shipPairOutcome(ph, e, dy)?.kind, 'apart', `${ph} ${e} ${dy}`);
    for (let e = -E; e <= E; e++) assert.equal(shipPairOutcome(ph, e, DY + 1)?.kind, 'apart', `${ph} ${e} ${DY + 1}`);
  }
});

test('mirror images: (ph, e, -dy) is (ph, e, dy) reflected, so they share an entry', () => {
  for (let ph = 0; ph < 6; ph++) for (const [e, dy] of [[3, 9], [-14, 2], [0, 11], [5, 4]])
    assert.equal(key(shipPair(ph, e, -dy).map(([x, y]) => [x, 5 - y])), key(shipPair(ph, e, dy)));
  assert.equal(outcomeAt(0, 3, -9), outcomeAt(0, 3, 9));
});

test('the map: 6 phases, 12 rows, 33 columns, blank exactly where the ships overlap', () => {
  assert.equal(MAP.length, 6);
  for (let ph = 0; ph < 6; ph++) {
    assert.equal(MAP[ph].length, DY + 1);
    for (let dy = 0; dy <= DY; dy++) {
      assert.equal(MAP[ph][dy].length, 2 * E + 1);
      for (let e = -E; e <= E; e++) {
        const overlap = new Set(SHIP[0].map((c) => c.join()));
        const hits = shipB(ph, e, dy).some((c) => overlap.has(c.join()));
        assert.equal(MAP[ph][dy][e + E] === ' ', hits, `${ph} ${e} ${dy}`);
      }
    }
  }
});

for (let ph = 0; ph < 6; ph++) {
  test(`every entry in phase ${ph} is what running that placement gives`, () => {
    for (let dy = 0; dy <= DY; dy++) for (let e = -E; e <= E; e++) {
      const c = MAP[ph][dy][e + E];
      if (c === ' ') continue;
      const o = shipPairOutcome(ph, e, dy);
      const want = o.kind === 'apart' ? '.' : o.kind === 'explodes' ? '#' : 'o';
      assert.equal(c, want, `${ph} ${e} ${dy}`);
      if (c === 'o') assert.equal(OUT[`${ph},${e},${dy}`], shipPairCode(o), `${ph} ${e} ${dy}`);
    }
  });
}

test('OUT has an entry for every o and nothing else', () => {
  let n = 0;
  for (let ph = 0; ph < 6; ph++) for (let dy = 0; dy <= DY; dy++) for (let e = -E; e <= E; e++)
    if (MAP[ph][dy][e + E] === 'o') { n++; assert.ok(OUT[`${ph},${e},${dy}`], `${ph} ${e} ${dy}`); }
  assert.equal(Object.keys(OUT).length, n);
});

test('the counts in the prose', () => {
  const n = { ' ': 0, '.': 0, '#': 0, objects: 0, flotilla: 0, puffer: 0, nothing: 0, one: 0 };
  for (let ph = 0; ph < 6; ph++) for (let dy = 0; dy <= DY; dy++) for (let e = -E; e <= E; e++) {
    const c = MAP[ph][dy][e + E];
    if (c !== 'o') { n[c]++; continue; }
    const s = OUT[`${ph},${e},${dy}`];
    const kind = s.endsWith(':flotilla') ? 'flotilla' : s.endsWith(':puffer') ? 'puffer' : s.endsWith(':nothing') ? 'nothing' : 'objects';
    n[kind]++;
    if (kind === 'objects') { assert.match(s, /:freeship( |$)/, s); n.one++; }
  }
  // placements up to mirror image, ships not overlapping
  assert.equal(n['.'] + n['#'] + n.objects + n.flotilla + n.puffer + n.nothing, 1938);
  assert.deepEqual([n['.'], n['#'], n.objects, n.flotilla, n.puffer, n.nothing], [509, 1369, 45, 6, 9, 0]);
  // every placement that touches and leaves objects leaves exactly one free ship
  assert.equal(n.one, 45);
});

test('the fleet: every flotilla and puffer on the map, each exactly once', () => {
  const flot = FLEET.filter((f) => f.kind === 'flotilla'), puff = FLEET.filter((f) => f.kind === 'puffer');
  assert.equal(flot.length, 4); assert.equal(puff.length, 5);
  const listed = new Set(FLEET.flatMap((f) => [[f.ph, f.e, f.dy], ...f.also].map((p) => p.join())));
  const onMap = Object.entries(OUT).filter(([, s]) => /:(flotilla|puffer)$/.test(s)).map(([k]) => k);
  assert.deepEqual([...listed].sort(), onMap.sort());
  // the same object: the leading 20 columns agree in some phase, up to a flip; different
  // entries never agree
  const fronts = (p) => {
    let q = run(shipPair(...p), 120)[120];
    const out = new Set();
    for (let g = 0; g < 6; g++, q = q.next()) {
      const R = q.x0 + q.w - 1, f = q.cells().filter(([x]) => x > R - 20);
      out.add(shape(f)); out.add(shape(f, true));
    }
    return out;
  };
  const F = FLEET.map((f) => fronts([f.ph, f.e, f.dy]));
  for (let i = 0; i < FLEET.length; i++) {
    for (const p of FLEET[i].also) assert.ok([...fronts(p)].some((k) => F[i].has(k)), `${p} is entry ${i}`);
    for (let j = 0; j < i; j++) assert.ok(![...F[i]].some((k) => F[j].has(k)), `${i} differs from ${j}`);
  }
});

test('each flotilla and puffer: when it forms, what it lays, and that neither ship is changed for good', () => {
  for (const f of FLEET) {
    const o = shipPairOutcome(f.ph, f.e, f.dy);
    assert.equal(o.kind, f.kind); assert.equal(o.at, f.at);
    if (f.kind === 'flotilla') assert.equal(o.bound, true);
    else { assert.deepEqual(o.wake, f.wake); assert.equal(o.repeats, true); }
    // clean generations: exactly the two ships as they would be alone, plus cells that are
    // still there 6 and 12 generations later (none, for a flotilla, which moves on whole)
    const G = run(shipPair(f.ph, f.e, f.dy), 400), A = run(SHIP[0], 400), B = run(shipB(f.ph, f.e, f.dy), 400);
    const has = (p) => { const s = new Set(p.cells().map((c) => c.join())); return (c) => s.has(c.join()); };
    for (let g = 120; g < 380; g++) {
      const now = has(G[g]), l6 = has(G[g + 6]), l12 = has(G[g + 12]);
      const ships = [...A[g].cells(), ...B[g].cells()], u = new Set(ships.map((c) => c.join()));
      const clean = ships.every(now) && G[g].cells().every((c) => u.has(c.join()) || (l6(c) && l12(c)));
      assert.equal(clean, f.clean.includes(g % 6), `${f.ph} ${f.e} ${f.dy} at ${g}`);
      if (f.kind === 'flotilla' && clean) assert.equal(G[g].population, u.size);
    }
    assert.ok(f.clean.length >= 3);
    if (f.kind === 'flotilla') assert.ok(f.clean.length <= 5);
    // the rows it occupies (the flotilla repeats and the puffer's trail is frozen, so
    // 400 generations show every row it will ever reach)
    const lo = Math.min(...G.map((p) => p.y0)), hi = Math.max(...G.map((p) => p.y0 + p.h - 1));
    assert.deepEqual([lo, hi], f.rows);
  }
  // the prose: the first flotilla is exactly the two ships alone five generations in six
  assert.deepEqual([FLEET[0].kind, FLEET[0].clean.length], ['flotilla', 5]);
});

test('dueling dominoes makes the dot-laying puffer at 11 rows across, 2 along', () => {
  const f = FLEET.find((x) => x.kind === 'puffer' && x.dy === 11);
  assert.deepEqual([f.ph, f.e, f.wake], [0, 2, { dot: 1 }]);
  assert.equal(FLEET.filter((x) => x.kind === 'puffer').indexOf(f), 1); // 'the second'
  const puff = new Set();
  let q = run(shipPair(f.ph, f.e, f.dy), 120)[120];
  for (let g = 0; g < 6; g++, q = q.next()) {
    const R = q.x0 + q.w - 1;
    puff.add(shape(q.cells().filter(([x]) => x > R - 20)));
  }
  // the glossary's dueling dominoes (horizontal dominoes): turn so its ships fly
  // left and right, then compare the right-hand front, in either vertical orientation
  let d = Pattern.fromRLE('x = 13, y = 3, rule = s0/b2\n11b2o2$2o!');
  d = Pattern.fromCells(d.cells().map(([x, y]) => [-y, x]));
  d = run(d.cells(), 120)[120];
  let found = false;
  for (let g = 0; g < 6 && !found; g++, d = d.next()) {
    const R = d.x0 + d.w - 1, front = d.cells().filter(([x]) => x > R - 20);
    found = puff.has(shape(front)) || puff.has(shape(front, true));
  }
  assert.ok(found);
});

test('the fleet flies as one pattern exactly as each lane would alone', () => {
  for (const list of [undefined, FLEET]) {
    const lanes = fleetLanes(list);
    assert.equal(lanes.length, list ? FLEET.length : 5);
    for (let i = 1; i < lanes.length; i++) assert.ok(lanes[i].top - lanes[i - 1].bottom - 1 >= 2 && GAP >= 2);
    let J = Pattern.fromCells(fleetCells(list));
    let parts = lanes.map(({ f, y }) => Pattern.fromCells(shipPair(f.ph, f.e, f.dy).map(([x, c]) => [x, c + y])));
    for (let g = 0; g < 300; g++) {
      J = J.next(); parts = parts.map((p) => p.next());
      if (g % 50 === 49) assert.equal(key(J.cells()), key(parts.flatMap((p) => p.cells())), `gen ${g + 1}`);
    }
  }
});
