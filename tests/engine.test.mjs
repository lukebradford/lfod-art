import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pattern, stepTorus, nextState, classify, RULESTRING } from '../site/js/lfod.js';

// Independent reference: the rule written out as plainly as possible on a Set of "x,y".
function referenceStep(cells) {
  const live = new Set(cells.map(([x, y]) => `${x},${y}`));
  const counts = new Map();
  for (const [x, y] of cells)
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const k = `${x + dx},${y + dy}`;
        counts.set(k, (counts.get(k) || 0) + 1);
      }
  const out = [];
  // survivors: live cells with exactly 0 live neighbours
  for (const k of live) if (!counts.has(k)) out.push(k.split(',').map(Number));
  // births: dead cells with exactly 2 live neighbours
  for (const [k, n] of counts) if (n === 2 && !live.has(k)) out.push(k.split(',').map(Number));
  return out;
}
const key = (cells) => cells.map(([x, y]) => `${x},${y}`).sort().join(' ');

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

test('rulestring is B2/S0', () => assert.equal(RULESTRING, 'B2/S0'));

test('nextState encodes B2/S0 exactly', () => {
  for (let n = 0; n <= 8; n++) {
    assert.equal(nextState(0, n), n === 2 ? 1 : 0, `dead with ${n}`);
    assert.equal(nextState(1, n), n === 0 ? 1 : 0, `live with ${n}`);
  }
});

test('Pattern.next matches the reference on random soups for 40 generations', () => {
  const r = rng(12345);
  for (let t = 0; t < 30; t++) {
    const cells = [];
    const size = 3 + Math.floor(r() * 10);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (r() < 0.35) cells.push([x - 4, y + 7]);
    let p = Pattern.fromCells(cells);
    let ref = cells;
    for (let g = 0; g < 40; g++) {
      p = p.next();
      ref = referenceStep(ref);
      assert.equal(key(p.cells()), key(ref), `soup ${t} gen ${g + 1}`);
    }
  }
});

test('stepTorus matches the unbounded engine while nothing reaches the edge', () => {
  const w = 64, h = 48;
  let a = new Uint8Array(w * h), b = new Uint8Array(w * h);
  const seed = [[0, 0], [1, 0], [0, 1]]; // explodes at light speed
  for (const [x, y] of seed) a[(y + 24) * w + (x + 32)] = 1;
  let p = Pattern.fromCells(seed);
  for (let g = 0; g < 20; g++) {
    stepTorus(a, b, w, h); [a, b] = [b, a];
    p = p.next();
    const torus = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[y * w + x]) torus.push([x - 32, y - 24]);
    assert.equal(key(torus), key(p.cells()), `gen ${g + 1}`);
  }
});

test('stepTorus wraps around the seam', () => {
  const w = 5, h = 5;
  const a = new Uint8Array(w * h), b = new Uint8Array(w * h);
  a[0] = 1; a[w * h - 1] = 1; // (0,0) and (4,4) are diagonal neighbours on the torus
  stepTorus(a, b, w, h);
  assert.equal(b[0], 0); assert.equal(b[w * h - 1], 0);
  assert.equal(b[4], 1); assert.equal(b[(h - 1) * w], 1); // (4,0) and (0,4) are born
});

test('RLE round trip', () => {
  const r = rng(7);
  for (let t = 0; t < 20; t++) {
    const cells = [];
    for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) if (r() < 0.3) cells.push([x, y]);
    if (!cells.length) continue;
    const p = Pattern.fromCells(cells);
    const q = Pattern.fromRLE(p.toRLE());
    assert.ok(q.sameShape(p));
  }
});

test('RLE for another rule is rejected', () => {
  assert.throws(() => Pattern.fromRLE('x = 1, y = 1, rule = B3/S23\no!'));
});

test('a lone cell survives; two orthogonal neighbours die', () => {
  assert.equal(classify(Pattern.fromCells([[0, 0]])).kind, 'still');
  assert.equal(Pattern.fromCells([[0, 0], [5, 5]]).next().population, 2);
  const line = Pattern.fromCells([[0, 0], [1, 0], [2, 0]]);
  assert.equal(classify(line).kind, 'dies');
});
