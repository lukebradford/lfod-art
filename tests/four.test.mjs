// Checks every claim in site/js/four.js and the Four cells section's prose.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pattern, Field, classify } from '../site/js/lfod.js';
import { QUADS, SETTLE, VANISH } from '../site/js/four.js';
import { parseOutcome, phrase } from '../site/js/outcomes.js';
import { placements, canon, norm, decompose, tally, explodes } from './objects.mjs';

const all = placements(4);
const calm = all.filter((c) => !explodes(c));

test('four cells: 430 placements, 360 explode, and the other 70 are exactly the site\'s lists', () => {
  assert.equal(all.length, QUADS.placements);
  assert.equal(all.length - calm.length, QUADS.explode);
  const listed = [...SETTLE.map((s) => s[0]), ...VANISH.map((v) => v[0])];
  assert.equal(listed.length, calm.length);
  assert.deepEqual(listed.map(canon).sort(), calm.map(canon).sort());
  assert.equal(new Set(listed.map(canon)).size, listed.length, 'no placement listed twice');
  // each placed with its top-left at (0, 0)
  for (const c of listed) assert.deepEqual(c, norm(c));
  assert.equal(SETTLE.length, 44);
  assert.equal(VANISH.length, 26);
});

for (const [cells, s] of SETTLE) {
  const o = parseOutcome(s);
  test(`four cells ${JSON.stringify(cells)}: ${phrase(o.objects)} by gen ${o.at}`, () => {
    const before = o.at > 0 ? Pattern.fromCells(cells).run(o.at - 1) : null;
    const p = before ? before.next() : Pattern.fromCells(cells);
    const pieces = decompose(p);
    assert.ok(pieces, `separate named objects at gen ${o.at}`);
    assert.deepEqual(tally(pieces), o.objects);
    if (before) assert.equal(decompose(before), null, `not yet at gen ${o.at - 1}`);
  });
}

test('the ones that vanish die exactly at the stated generation, all within nine', () => {
  for (const [cells, at] of VANISH) {
    const before = Pattern.fromCells(cells).run(at - 1);
    assert.ok(before.population > 0, JSON.stringify(cells));
    assert.equal(before.next().population, 0, JSON.stringify(cells));
  }
  assert.equal(Math.max(...VANISH.map((v) => v[1])), 9);
});

test('prose: four are already what they will be; the last to settle does so at gen 17', () => {
  const now = SETTLE.filter((s) => parseOutcome(s[1]).at === 0).map((s) => Object.keys(parseOutcome(s[1]).objects)[0]).sort();
  assert.deepEqual(now, ['anchor', 'lever', 'moon', 'radar']);
  assert.equal(Math.max(...SETTLE.map((s) => parseOutcome(s[1]).at)), 17);
  // tallies quoted in the prose
  const count = (pred) => SETTLE.filter((s) => pred(parseOutcome(s[1]).objects)).length;
  assert.equal(count((ob) => ob.moon), 2);
  assert.equal(count((ob) => ob.freeship), 7);
  assert.equal(count((ob) => ob.anchor || ob.lever || ob.radar), 6);
  assert.equal(count((ob) => Object.keys(ob).every((k) => k === 'dot' || k === 'checker')), 29);
});

test('one placement is the moon; one other gives birth to a moon, which flies off at c', () => {
  const [cells] = SETTLE.find((s) => s[1] === '2:moon dot×2');
  const p = Pattern.fromCells(cells).run(2);
  const moon = decompose(p).find((x) => x.name === 'moon');
  const c = classify(Pattern.fromCells(moon.cells));
  assert.deepEqual([c.kind, c.period, Math.abs(c.dx) + Math.abs(c.dy)], ['ship', 1, 1]);
});

test('every pair of free ships flies apart, in opposite directions, at c', () => {
  for (const [cells, s] of SETTLE.filter((x) => x[1].includes('freeship'))) {
    const o = parseOutcome(s);
    const ships = decompose(Pattern.fromCells(cells).run(o.at)).filter((x) => x.name === 'freeship')
      .map((x) => classify(Pattern.fromCells(x.cells)));
    assert.equal(ships.length, 2);
    for (const sh of ships) assert.deepEqual([sh.kind, sh.period, Math.abs(sh.dx) + Math.abs(sh.dy)], ['ship', 6, 6]);
    assert.deepEqual([ships[0].dx + ships[1].dx, ships[0].dy + ships[1].dy], [0, 0], JSON.stringify(cells));
  }
});

test('phrase() reads the objects biggest first', () => {
  assert.equal(phrase(parseOutcome('2:moon dot×2').objects), 'a moon and two dots');
  assert.equal(phrase(parseOutcome('16:freeship×2 checker×4').objects), 'two free ships and four checkers');
  assert.equal(phrase(parseOutcome('0:radar').objects), 'a radar');
  assert.equal(phrase(parseOutcome('0:anchor').objects), 'an anchor');
});
