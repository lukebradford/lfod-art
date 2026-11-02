// Checks every claim in site/js/crossing.js and the Crossing section's prose by running
// every way two free ships can cross at right angles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pattern } from '../site/js/lfod.js';
import { SHIP } from '../site/js/abreast.js';
import { X, D, MAP, OUT, crossB, crossPair, mirror, outcomeAt } from '../site/js/crossing.js';
import { crossOutcome } from './objects.mjs';
import { parseOutcome, phrase } from '../site/js/collisions.js';

const key = (cells) => cells.map((c) => c.join()).sort().join(';');
const shape = (cells) => {
  const mx = Math.min(...cells.map((c) => c[0])), my = Math.min(...cells.map((c) => c[1]));
  return key(cells.map(([x, y]) => [x - mx, y - my]));
};
const run = (cells, n) => { const out = [Pattern.fromCells(cells)]; for (let g = 1; g <= n; g++) out.push(out[g - 1].next()); return out; };
const ALL = [];
for (let ph = 0; ph < 6; ph++) for (let u = 0; u < 6; u++) for (let d = -D; d <= D; d++) ALL.push([ph, u, d]);
const strip = (v) => v.replace(/^\d+:/, '');
const kindOf = (v) => v === '.' ? 'apart' : v === '#' ? 'explodes' : v.endsWith(':nothing') ? 'nothing'
  : v.includes('freeship') ? 'one' : 'debris';

test('ship B is the free ship turned to fly down, in columns bx - 2 .. bx + 7, rows by + g - 6 .. by + g + 8', () => {
  for (let ph = 0; ph < 6; ph++) for (const u of [0, 5]) for (const d of [-D, 0, D]) {
    const bx = X + u, by = -bx - d;
    run(crossB(ph, u, d), 30).forEach((p, g) => {
      assert.ok(p.x0 >= bx - 2 && p.x0 + p.w - 1 <= bx + 7, `${ph} ${u} ${d} ${g}`);
      assert.ok(p.y0 >= by + g - 6 && p.y0 + p.h - 1 <= by + g + 8, `${ph} ${u} ${d} ${g}`);
      // it is the lone ship at generation ph + g, turned a quarter (x and y swapped)
      const lone = run(SHIP[0], ph + g).at(-1).cells();
      assert.equal(shape(p.cells()), shape(lone.map(([x, y]) => [y, x])));
    });
  }
  // the reflection is a turn: every phase is its own mirror image about row 2.5
  for (const s of SHIP) assert.equal(key(s.map(([x, y]) => [x, 5 - y])), key(s));
});

test('d is the lag: A\'s nose reaches column bx at generation bx - 8, B\'s reaches row 0 at bx + d - 8', () => {
  for (let ph = 0; ph < 6; ph++) for (const u of [0, 3]) for (const d of [-9, 4]) {
    const bx = X + u;
    const A = run(SHIP[0], bx), B = run(crossB(ph, u, d), bx + d);
    const noseA = (g) => A[g].x0 + A[g].w - 1, noseB = (g) => B[g].y0 + B[g].h - 1;
    assert.equal(noseA(bx - 8), bx, `${ph} ${u} ${d}`);
    assert.equal(noseB(bx + d - 8), 0, `${ph} ${u} ${d}`);
    for (let g = 0; g < bx + d - 8; g++) assert.ok(noseB(g) < 0);
  }
});

test('nothing passes between the ships at generation 0, in any crossing', () => {
  for (const [ph, u, d] of ALL) {
    const next = Pattern.fromCells(crossPair(ph, u, d)).next().cells();
    const alone = [...Pattern.fromCells(SHIP[0]).next().cells(), ...Pattern.fromCells(crossB(ph, u, d)).next().cells()];
    assert.equal(key(next), key(alone), `${ph} ${u} ${d}`);
  }
});

test('every timing: B six columns left and six rows lower is the same crossing six generations later', () => {
  for (let ph = 0; ph < 6; ph++) for (let u = 0; u < 6; u++) for (const d of [-15, 0, 18]) {
    const moved = crossB(ph, u, d).map(([x, y]) => [x + 6, y - 6]);
    const later = run([...SHIP[0], ...moved], 6).at(-1).cells();
    assert.equal(key(later), key(crossPair(ph, u, d).map(([x, y]) => [x + 6, y])), `${ph} ${u} ${d}`);
  }
});

test('beyond D they never touch: run to 27, and from 28 on they are never within reach', () => {
  for (let ph = 0; ph < 6; ph++) for (let u = 0; u < 6; u++) for (let a = D + 1; a <= 27; a++) {
    assert.equal(crossOutcome(ph, u, a).kind, 'apart');
    assert.equal(crossOutcome(ph, u, -a).kind, 'apart');
  }
  // A is in rows -2..7 and columns g - 6..g + 8; B in columns bx - 2..bx + 7 and rows
  // by + g - 6..by + g + 8. A cell sees both only if, at one generation, the rows come
  // within two and so do the columns: g in [bx - 12, bx + 15] and [bx + d - 12, bx + d + 15].
  for (let d = -60; d <= 60; d++) {
    const lo = Math.max(-12, d - 12), hi = Math.min(15, d + 15);
    assert.equal(lo <= hi, Math.abs(d) <= 27, `${d}`);
  }
});

test('mirror images: (ph, u, d) and mirror(ph, u, d) are the same crossing reflected', () => {
  for (const [ph, u, d] of ALL) {
    const m = mirror(ph, u, d);
    assert.deepEqual(mirror(...m), [ph, u, d]);
    const flip = (cells) => shape(cells.map(([x, y]) => [y, x]));
    const A = run(crossPair(ph, u, d), 40).map((p) => shape(p.cells()));
    const B = run(crossPair(...m), 40).map((p) => shape(p.cells()));
    assert.ok(B.includes(flip(crossPair(ph, u, d))) || A.includes(flip(crossPair(...m))), `${ph} ${u} ${d}`);
    // so the outcome is the same, up to when, with the ships' roles swapped
    const swap = (v) => strip(v).replace(/\((A|B)\)/, (_, s) => `(${s === 'A' ? 'B' : 'A'})`);
    assert.equal(swap(outcomeAt(...m)), strip(outcomeAt(ph, u, d)), `${ph} ${u} ${d}`);
  }
});

test('every crossing in the map is what the data says (run independently)', () => {
  assert.equal(MAP.length, 36);
  for (const row of MAP) assert.equal(row.length, 2 * D + 1);
  let entries = 0;
  for (const [ph, u, d] of ALL) {
    const o = crossOutcome(ph, u, d);
    const c = MAP[ph * 6 + u][d + D], k = `${ph},${u},${d}`;
    if (o.kind === 'apart') assert.equal(c, '.', k);
    else if (o.kind === 'explodes') assert.equal(c, '#', k);
    else {
      assert.equal(c, 'o', k);
      entries++;
      if (o.kind === 'nothing') assert.equal(OUT[k], `${o.at}:nothing`, k);
      else {
        const order = ['freeship', 'moon', 'checker', 'dot'];
        const names = Object.keys(o.objects).sort((a, b) => order.indexOf(a) - order.indexOf(b));
        const sv = o.survivors.length ? ` (${o.survivors.join('')})` : '';
        assert.equal(OUT[k], `${o.at}:` + names.map((n) => (o.objects[n] > 1 ? `${n}×${o.objects[n]}` : n)).join(' ') + sv, k);
        // every ship that comes out is one that went in, untouched
        assert.equal(o.objects.freeship || 0, o.survivors.length, k);
      }
    }
  }
  assert.equal(Object.keys(OUT).length, entries);
});

test('the prose: counts, up to mirror image; never both; the first to arrive goes on', () => {
  const n = { apart: 0, explodes: 0, nothing: 0, debris: 0, one: 0 }, raw = { ...n }, seen = new Set();
  let clean = 0;
  const lags = new Set();
  for (const [ph, u, d] of ALL) {
    const v = outcomeAt(ph, u, d), k = kindOf(v);
    raw[k]++;
    if (k === 'one') {
      // the survivor is whichever reached the crossing first
      assert.ok(v.endsWith(d > 0 ? '(A)' : '(B)'), `${ph} ${u} ${d}`);
      assert.ok(!v.includes('freeship×'), v);
      lags.add(Math.abs(d));
    }
    const m = mirror(ph, u, d), id = [[ph, u, d], m].map((a) => a.join()).sort()[0];
    if (seen.has(id)) continue;
    seen.add(id); n[k]++;
    if (k === 'one' && /:freeship \([AB]\)$/.test(v)) clean++;
  }
  assert.equal(ALL.length, 1548);
  assert.equal(seen.size, 777);
  assert.deepEqual(raw, { apart: 36, explodes: 1486, nothing: 0, debris: 0, one: 26 });
  assert.deepEqual(n, { apart: 18, explodes: 746, nothing: 0, debris: 0, one: 13 });
  // only a ship that arrives at least 15 generations late is the one destroyed
  assert.deepEqual([...lags].sort((a, b) => a - b), [15, 16, 18, 19, 20]);
  // two erase the late ship and leave no trace at all
  assert.equal(clean, 2);
  for (const v of Object.values(OUT)) {
    for (const part of strip(v).replace(/ \([AB]+\)$/, '').split(' ')) assert.match(part, /^(freeship|checker|dot)(×\d+)?$/, v);
  }
});

test('the survivor flies on exactly as if it had never met the other', () => {
  for (const [k, v] of Object.entries(OUT)) {
    const [ph, u, d] = k.split(',').map(Number), at = +v.split(':')[0];
    const J = run(crossPair(ph, u, d), at + 120);
    const S = run(v.endsWith('(A)') ? SHIP[0] : crossB(ph, u, d), at + 120);
    const lone = (g) => new Set(S[g].cells().map((c) => c.join()));
    const rest = (g) => key(J[g].cells().filter((c) => !lone(g).has(c.join())));
    for (let g = at; g <= at + 120; g++) {
      assert.ok([...lone(g)].every((c) => J[g].get(...c.split(',').map(Number))), `${k} ship at ${g}`);
      assert.equal(rest(g), rest(at + ((g - at) % 2)), `${k} debris at ${g}`);
    }
    assert.equal(rest(at) === '', /:freeship \([AB]\)$/.test(v), k);
  }
});

test('phrase() can put every crossing outcome into words', () => {
  for (const v of Object.values(OUT)) {
    const o = parseOutcome(v.replace(/ \([AB]+\)$/, ''));
    assert.doesNotMatch(phrase(o.objects), /undefined/, v);
  }
});
