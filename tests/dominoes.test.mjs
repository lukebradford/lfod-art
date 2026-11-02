// Checks every claim in site/js/dominoes.js and the Two dominoes section's prose by
// running every placement of a second domino near a first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pattern } from '../site/js/lfod.js';
import { MAP, LAT, LON, DUEL, pairCells, outcomeAt } from '../site/js/dominoes.js';
import { parseOutcome, phrase } from '../site/js/collisions.js';
import { DOMINO, dominoPair, dominoOutcome, canon } from './objects.mjs';

const memo = new Map();
const outcome = (dx, dy) => {
  const k = dx + ',' + dy;
  if (!memo.has(k)) memo.set(k, dominoOutcome(dx, dy));
  return memo.get(k);
};
const code = (o) => (o === 'explodes' ? '#' : o === 'apart' ? '.' : o === null ? 'puffers' : o);
const kindOf = (s) => (s === '' ? 'overlap' : s === '#' ? 'explodes' : s === '.' ? 'apart' : s === 'puffers' ? 'puffers' : 'settles');
const placements = [];
for (let dy = 0; dy <= LAT; dy++) for (let dx = 0; dx <= LON; dx++) if (!(dx === 0 && dy <= 1)) placements.push([dx, dy]);

test('the site and the tests build the same pair of dominoes', () => {
  assert.deepEqual(pairCells(5, 3), dominoPair(5, 3));
  assert.deepEqual(DOMINO, [[0, 0], [0, 1]]);
});

test('the map: 13 rows by 37 columns, blank exactly where the dominoes would overlap', () => {
  assert.equal(MAP.length, LAT + 1);
  for (const row of MAP) assert.equal(row.length, LON + 1);
  for (let dy = 0; dy <= LAT; dy++) for (let dx = 0; dx <= LON; dx++)
    assert.equal(MAP[dy][dx] === '', dx === 0 && dy <= 1, `${dx}, ${dy}`);
  assert.equal(placements.length, 479);
});

test('every entry on the map is what running that placement gives', () => {
  for (const [dx, dy] of placements) assert.equal(MAP[dy][dx], code(outcome(dx, dy)), `${dx}, ${dy}`);
});

test('the counts in the prose: 479 placements; 347 explode, 65 never touch, 66 settle, 1 grows', () => {
  const n = { explodes: 0, apart: 0, settles: 0, puffers: 0 };
  for (const [dx, dy] of placements) n[kindOf(MAP[dy][dx])]++;
  assert.deepEqual(n, { explodes: 347, apart: 65, settles: 66, puffers: 1 });
});

test('mirror images give the same outcome, at the same generation', () => {
  for (const [dx, dy] of placements) {
    if (dx > 14 || dy > 11) continue; // a generous sample; the reflections are exact symmetries
    for (const [sx, sy] of [[-1, 1], [1, -1], [-1, -1]])
      assert.equal(outcome(sx * dx, sy * dy), outcome(dx, dy), `${dx}, ${dy} vs ${sx * dx}, ${sy * dy}`);
    assert.equal(outcomeAt(-dx, -dy), MAP[dy][dx]);
  }
});

test('a lone domino never leaves rows -4 to 5, so dominoes 12 or more rows apart never touch', () => {
  let p = Pattern.fromCells(DOMINO);
  for (let g = 0; g <= 400; g++, p = p.next()) {
    assert.ok(p.y0 >= -4 && p.y0 + p.h - 1 <= 5, `gen ${g}`);
    if (g === 17) assert.deepEqual([p.y0, p.y0 + p.h - 1], [-4, 5], 'and it does reach both');
  }
  // at 12 rows apart (the second domino's cells in rows >= 8) rows 6 and 7 are always
  // empty, and no cell's neighbourhood reaches both row 5 and row 8
  for (let dx = 0; dx <= 60; dx += 3) assert.equal(outcome(dx, 12), 'apart');
});

test('beyond 24 columns the map repeats every 12: the same objects, 6 generations later (checked to 72)', () => {
  const at = (o) => (/^\d+:/.test(o) ? +o.split(':')[0] : null);
  const rest = (o) => (o || '').replace(/^\d+:/, '');
  for (let dy = 0; dy <= 11; dy++) for (let dx = 24; dx + 12 <= 72; dx++) {
    const a = outcome(dx, dy), b = outcome(dx + 12, dy);
    assert.equal(rest(b), rest(a), `${dx}, ${dy}`);
    if (at(a) !== null) assert.equal(at(b), at(a) + 6, `${dx}, ${dy}`);
  }
});

test('the prose: 6 to 8 rows apart always explodes; 9 rows apart only misses at 17 and 29', () => {
  for (let dy = 6; dy <= 8; dy++) assert.ok(MAP[dy].every((s) => s === '#'), `row ${dy}`);
  assert.deepEqual(MAP[9].flatMap((s, dx) => (s === '#' ? [] : [[dx, s]])), [[17, '.'], [29, '.']]);
});

test('the prose: 0 to 5 rows apart, whatever doesn\'t explode loses two ships (or everything)', () => {
  for (let dy = 0; dy <= 5; dy++) for (let dx = 0; dx <= LON; dx++) {
    const s = MAP[dy][dx];
    if (kindOf(s) !== 'settles') continue;
    const o = parseOutcome(s);
    assert.ok(o.kind === 'nothing' || o.objects.freeship === 2, `${dx}, ${dy}: ${s}`);
  }
  assert.equal(MAP[2][0], '3:nothing', 'four in a line with no gap vanish');
  // in line (0 rows apart) the inner ships can annihilate and leave only the outer two
  assert.ok(MAP[0].includes('12:freeship×2'));
});

test('the page\'s words: from 3 along, when two ships are left they are the outer two, flying away', () => {
  for (let dy = 0; dy <= LAT; dy++) for (let dx = 3; dx <= LON; dx++) {
    const s = MAP[dy][dx];
    if (kindOf(s) !== 'settles' || parseOutcome(s).objects.freeship !== 2) continue;
    const at = parseOutcome(s).at;
    let j = Pattern.fromCells(pairCells(dx, dy)), a = Pattern.fromCells(DOMINO), b = Pattern.fromCells([[dx, dy], [dx, dy + 1]]);
    for (let g = 0; g < at; g++) { j = j.next(); a = a.next(); b = b.next(); }
    const outer = [...a.cells().filter((c) => c[0] < 0), ...b.cells().filter((c) => c[0] > dx)];
    for (const [x, y] of outer) assert.equal(j.get(x, y), 1, `${dx}, ${dy}`);
  }
});

test('the prose: 10 and 11 rows apart, whatever touches and doesn\'t explode keeps all four ships', () => {
  for (const dy of [10, 11]) for (let dx = 0; dx <= LON; dx++) {
    const s = MAP[dy][dx];
    if (kindOf(s) !== 'settles') continue;
    const o = parseOutcome(s);
    assert.equal(o.objects.freeship, 4, `${dx}, ${dy}: ${s}`);
    // and they are the original four, each exactly as if its domino were alone
    let j = Pattern.fromCells(pairCells(dx, dy)), a = Pattern.fromCells(DOMINO), b = Pattern.fromCells([[dx, dy], [dx, dy + 1]]);
    for (let g = 0; g < o.at; g++) { j = j.next(); a = a.next(); b = b.next(); }
    for (const [x, y] of [...a.cells(), ...b.cells()]) assert.equal(j.get(x, y), 1, `${dx}, ${dy}`);
  }
});

test('dueling dominoes is the glossary\'s pattern, the one placement that grows', () => {
  assert.deepEqual(MAP.flatMap((r, dy) => r.flatMap((s, dx) => (s === 'puffers' ? [[dx, dy]] : []))), [[DUEL.dx, DUEL.dy]]);
  const g = Pattern.fromRLE(DUEL.rle).cells();
  assert.equal(canon(g), canon(pairCells(DUEL.dx, DUEL.dy)));
});

test('dueling dominoes: each domino runs exactly as if alone, plus dots halfway between (700 generations)', () => {
  const { dx, dy, first, period } = DUEL;
  let j = Pattern.fromCells(pairCells(dx, dy)), a = Pattern.fromCells(DOMINO), b = Pattern.fromCells([[dx, dy], [dx, dy + 1]]);
  const mid = (dy + 1) / 2, cx = dx / 2; // the row halfway between them, and the centre
  assert.ok(Number.isInteger(mid) && Number.isInteger(cx));
  for (let g = 0; g <= 700; g++) {
    const lone = new Set([...a.cells(), ...b.cells()].map((c) => c.join()));
    const have = new Set(j.cells().map((c) => c.join()));
    for (const c of lone) assert.ok(have.has(c), `gen ${g}: lost ${c}`);
    const extra = j.cells().filter((c) => !lone.has(c.join()));
    // the expected dots: the middle from `first`, then a pair every `period`
    const want = [];
    if (g >= first) want.push(cx);
    for (let k = 0, t = first + 8; t <= g; k++, t += period) want.push(cx - 5 - period * k, cx + 5 + period * k);
    assert.deepEqual(extra.map((c) => c.join()).sort(), want.map((x) => `${x},${mid}`).sort(), `gen ${g}`);
    // and every one is alone, so it is a dot and lives forever
    for (const [x, y] of extra)
      for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++)
        if (u || v) assert.equal(j.get(x + u, y + v), 0, `gen ${g}: dot ${x},${y} has company`);
    j = j.next(); a = a.next(); b = b.next();
  }
});

test('dueling dominoes: the dots are evenly spaced, six apart, and both puffers have period 6 at c', () => {
  // the free ship (each half of a lone domino) moves 6 cells every 6 generations
  let p = Pattern.fromCells(DOMINO);
  for (let g = 0; g < 60; g++) p = p.next();
  let q = p;
  for (let g = 0; g < DUEL.period; g++) q = q.next();
  assert.equal(q.x0 + q.w - (p.x0 + p.w), DUEL.period);
  assert.equal(p.x0 - q.x0, DUEL.period);
});

test('phrase() reads the map\'s outcomes', () => {
  assert.equal(phrase(parseOutcome('18:freeship×4 dot').objects), 'four free ships and a dot');
  assert.equal(phrase(parseOutcome('12:freeship×2 checker×4').objects), 'two free ships and four checkers');
});
