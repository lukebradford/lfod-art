// Fleet: every ship flown is a spaceship of the period the table gives, moving dx cells
// right per period and returning to its shape at no earlier generation (anywhere), with
// the table's fewest cells, which is also where it starts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FLEET, ABSENT, patternOf } from '../site/js/fleet.js';

test('the fleet runs in order of period, one ship per period', () => {
  const ps = FLEET.map((e) => e.period);
  assert.deepEqual(ps, [...ps].sort((a, b) => a - b));
  assert.equal(new Set(ps).size, ps.length);
  for (const p of [...ABSENT.unavailable, ...ABSENT.wide]) assert.ok(!ps.includes(p));
});

for (const e of FLEET) {
  test(`${e.name}: period ${e.period}, ${e.dx} cells right a period, ${e.cells} cells at fewest`, () => {
    const start = patternOf(e);
    assert.equal(start.population, e.cells);
    let p = start, fewest = Infinity;
    for (let g = 1; g <= e.period; g++) {
      fewest = Math.min(fewest, p.population);
      p = p.next();
      if (g < e.period) assert.ok(!p.sameShape(start), `same shape again at ${g}`);
    }
    assert.ok(p.sameShape(start));
    assert.equal(p.x0 - start.x0, e.dx);
    assert.equal(p.y0, start.y0);
    assert.equal(fewest, e.cells);
  });
}

// What the page draws: a mark in the plane at the ship's nose each time it is itself
// again (the right edge of its box). Over four periods the marks are exactly dx apart.
test('the marks: one a period, dx apart', () => {
  for (const e of FLEET) {
    let p = patternOf(e);
    const marks = [];
    for (let g = 0; g <= 4 * e.period; g++, p = p.next()) if (g % e.period === 0) marks.push(p.x0 + p.w);
    for (let i = 1; i < marks.length; i++) assert.equal(marks[i] - marks[i - 1], e.dx, e.name);
  }
});
