// Checks every claim in site/js/headon.js and the Head-on section's prose by running
// every way two free ships can fly at each other.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pattern } from '../site/js/lfod.js';
import { SHIP } from '../site/js/abreast.js';
import { X0, T, DY, MAP, OUT, headB, headPair, mirror, outcomeAt } from '../site/js/headon.js';
import { headOnOutcome } from './objects.mjs';
import { parseOutcome, phrase } from '../site/js/collisions.js';

const key = (cells) => cells.map((c) => c.join()).sort().join(';');
const shape = (cells) => {
  const mx = Math.min(...cells.map((c) => c[0])), my = Math.min(...cells.map((c) => c[1]));
  return key(cells.map(([x, y]) => [x - mx, y - my]));
};
const run = (cells, n) => { const out = [Pattern.fromCells(cells)]; for (let g = 1; g <= n; g++) out.push(out[g - 1].next()); return out; };
const ALL = [];
for (let dy = 0; dy <= DY; dy++) for (let ph = 0; ph < 6; ph++) for (let t = 0; t < T; t++) ALL.push([ph, t, dy]);
const kindOf = (v) => v === '.' ? 'apart' : v === '#' ? 'explodes' : v.endsWith(':nothing') ? 'nothing'
  : v.includes('freeship') ? 'through' : 'debris';

test('ship B is the free ship reflected, flying -x, in columns X0 + t - (g + ph) - 8 .. X0 + t - (g + ph) + 6', () => {
  for (let ph = 0; ph < 6; ph++) for (const t of [0, 5, 11]) {
    const G = run(headB(ph, t, 0), 18);
    G.forEach((p, g) => {
      assert.ok(p.x0 >= X0 + t - (g + ph) - 8 && p.x0 + p.w - 1 <= X0 + t - (g + ph) + 6, `${ph} ${t} ${g}`);
      // it is the lone ship at generation ph + g, reflected
      const lone = run(SHIP[0], ph + g).at(-1).cells();
      assert.equal(shape(p.cells()), shape(lone.map(([x, y]) => [-x, y])));
    });
  }
  // the bound used by the 'apart' test: B's cells at generation g lie in columns
  // <= X0 + t - g + 6 whatever its phase
  for (let ph = 0; ph < 6; ph++) for (let t = 0; t < T; t++) {
    run(headB(ph, t, 0), 30).forEach((p, g) => assert.ok(p.x0 + p.w - 1 <= X0 + t - g + 6, `${ph} ${t} ${g}`));
  }
});

test('nothing passes between the ships at generation 0, in any meeting', () => {
  for (const [ph, t, dy] of ALL) {
    const next = Pattern.fromCells(headPair(ph, t, dy)).next().cells();
    const alone = [...Pattern.fromCells(SHIP[0]).next().cells(), ...Pattern.fromCells(headB(ph, t, dy)).next().cells()];
    assert.equal(key(next), key(alone), `${ph} ${t} ${dy}`);
  }
});

test('every timing: twelve columns further off is the same meeting six generations later', () => {
  for (let ph = 0; ph < 6; ph++) for (let t = 0; t < T; t++) for (const dy of [0, 1, 10]) {
    const far = headB(ph, t, dy).map(([x, y]) => [x + 12, y]);
    const later = run([...SHIP[0], ...far], 6).at(-1).cells();
    assert.equal(key(later), key(headPair(ph, t, dy).map(([x, y]) => [x + 6, y])), `${ph} ${t} ${dy}`);
  }
});

test('mirror images: dy and -dy, and (ph, t) and mirror(ph, t), are the same meeting reflected', () => {
  for (const [ph, t, dy] of ALL) {
    // flipping top to bottom (every phase of the ship is symmetric about row 2.5)
    assert.equal(key(headPair(ph, t, -dy).map(([x, y]) => [x, 5 - y])), key(headPair(ph, t, dy)));
    // a half turn: the turned pair appears in the other meeting's run (or vice versa)
    const [p2, t2] = mirror(ph, t);
    const turned = (cells) => shape(cells.map(([x, y]) => [-x, -y]));
    const A = run(headPair(ph, t, dy), 11).map((p) => shape(p.cells()));
    const B = run(headPair(p2, t2, dy), 11).map((p) => shape(p.cells()));
    assert.ok(B.includes(turned(headPair(ph, t, dy))) || A.includes(turned(headPair(p2, t2, dy))), `${ph} ${t} ${dy}`);
    // so the outcome is the same, up to when
    const strip = (v) => v.replace(/^\d+:/, '');
    assert.equal(strip(outcomeAt(p2, t2, dy)), strip(outcomeAt(ph, t, dy)), `${ph} ${t} ${dy}`);
  }
});

test('beyond 11 rows across they never touch', () => {
  // lone ships stay in rows -2..7 (abreast.test.mjs), so at dy = 12 rows 8 and 9 are empty
  for (let ph = 0; ph < 6; ph++) for (let t = 0; t < T; t++) assert.equal(headOnOutcome(ph, t, DY + 1).kind, 'apart');
});

test('every meeting in the map is what the data says (run independently)', () => {
  assert.equal(MAP.length, DY + 1);
  for (const row of MAP) assert.equal(row.length, 6 * T);
  let entries = 0;
  for (const [ph, t, dy] of ALL) {
    const o = headOnOutcome(ph, t, dy);
    const c = MAP[dy][ph * T + t], k = `${ph},${t},${dy}`;
    if (o.kind === 'apart') assert.equal(c, '.', k);
    else if (o.kind === 'explodes') assert.equal(c, '#', k);
    else {
      assert.equal(c, 'o', k);
      entries++;
      if (o.kind === 'nothing') assert.equal(OUT[k], `${o.at}:nothing`, k);
      else {
        const order = ['freeship', 'moon', 'checker', 'dot'];
        const names = Object.keys(o.objects).sort((a, b) => order.indexOf(a) - order.indexOf(b));
        assert.equal(OUT[k], `${o.at}:` + names.map((n) => (o.objects[n] > 1 ? `${n}×${o.objects[n]}` : n)).join(' '), k);
        // wherever ships come out, they are both of the ones that met, untouched
        if (o.objects.freeship) assert.ok(o.objects.freeship === 2 && o.through, k);
      }
    }
  }
  assert.equal(Object.keys(OUT).length, entries);
});

test('the prose: counts, up to mirror image', () => {
  const n = { apart: 0, explodes: 0, nothing: 0, debris: 0, through: 0 }, seen = new Set();
  const raw = { ...n };
  const where = { nothing: new Set(), through: new Set() };
  let clean = 0;
  for (const [ph, t, dy] of ALL) {
    const v = outcomeAt(ph, t, dy), k = kindOf(v);
    raw[k]++;
    if (where[k]) where[k].add(dy);
    const [p2, t2] = mirror(ph, t), id = `${Math.min(ph * T + t, p2 * T + t2)},${dy}`;
    if (seen.has(id)) continue;
    seen.add(id); n[k]++;
    if (k === 'through' && v.endsWith('freeship×2')) clean++;
  }
  assert.equal(ALL.length, 864);
  assert.equal(seen.size, 504);
  assert.deepEqual(n, { apart: 63, explodes: 390, nothing: 9, debris: 35, through: 7 });
  assert.deepEqual(raw, { apart: 116, explodes: 672, nothing: 13, debris: 55, through: 8 });
  // annihilation only exactly in line; passing through only 10 or 11 rows across
  assert.deepEqual([...where.nothing], [0]);
  assert.deepEqual([...where.through].sort(), [10, 11]);
  // two of the seven pass leaving nothing at all
  assert.equal(clean, 2);
  // no meeting leaves one ship, or anything but ships, dots and checkers
  for (const v of Object.values(OUT)) {
    const objs = v.split(':')[1];
    if (objs === 'nothing') continue;
    for (const part of objs.split(' ')) assert.match(part, /^(freeship×2|checker|dot)(×\d+)?$/, v);
  }
});

test('passing through: both ships fly on exactly as if they had never met', () => {
  for (const [k, v] of Object.entries(OUT)) {
    if (!v.includes('freeship')) continue;
    const [ph, t, dy] = k.split(',').map(Number), at = +v.split(':')[0];
    const J = run(headPair(ph, t, dy), at + 120), A = run(SHIP[0], at + 120), B = run(headB(ph, t, dy), at + 120);
    // from `at` on, the whole pattern is the two lone ships plus debris that only
    // repeats with period 2 (dots stay, checkers blink)
    const lone = (g) => new Set([...A[g].cells(), ...B[g].cells()].map((c) => c.join()));
    const rest = (g) => key(J[g].cells().filter((c) => !lone(g).has(c.join())));
    for (let g = at; g <= at + 120; g++) {
      assert.ok([...lone(g)].every((c) => J[g].get(...c.split(',').map(Number))), `${k} ships at ${g}`);
      assert.equal(rest(g), rest(at + ((g - at) % 2)), `${k} debris at ${g}`);
    }
    assert.equal(rest(at) === '', v.endsWith('freeship×2'), k);
  }
});

test('phrase() can put every head-on outcome into words', () => {
  for (const v of Object.values(OUT)) {
    const o = parseOutcome(v);
    if (o.kind === 'nothing') continue;
    assert.doesNotMatch(phrase(o.objects), /undefined/, v);
  }
  assert.equal(phrase(parseOutcome('12:dot×8').objects), 'eight dots');
});
