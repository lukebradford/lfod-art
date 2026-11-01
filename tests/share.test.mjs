// The hero's shareable links: a beginning survives the round trip through a URL
// fragment exactly, and anything malformed or oversized is refused rather than guessed at.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pattern } from '../site/js/lfod.js';
import { encodeHash, decodeHash, MAX_LINK } from '../site/js/share.js';
import { byId } from '../site/js/catalog.js';

test('a beginning round-trips through the link exactly, positioned at (0, 0)', () => {
  const pats = [
    Pattern.fromRLE(byId.monster.rle),
    Pattern.fromCells([[5, -3], [7, -2]]), // evil eyes, anywhere
    Pattern.fromCells([[0, 0]]),
    Pattern.fromCells([[0, 0], [40, 0], [0, 30], [40, 30], [20, 15]]), // blank rows and runs
  ];
  for (const p of pats) {
    const h = encodeHash(p);
    assert.match(h, /^#rle=[0-9bo$]+!$/);
    const q = decodeHash(h);
    assert.ok(q.sameShape(p));
    assert.equal(q.x0, 0); assert.equal(q.y0, 0); assert.equal(q.gen, 0);
    // and it evolves identically
    let a = p, b = q;
    for (let g = 0; g < 40; g++) { a = a.next(); b = b.next(); }
    assert.ok(a.population === 0 ? b.population === 0 : a.sameShape(b));
  }
});

test('the empty pattern has no link; a huge one is refused, not truncated', () => {
  assert.equal(encodeHash(new Pattern()), '');
  const cells = [];
  for (let i = 0; i < 3000; i++) cells.push([i * 2, (i * 7) % 61]);
  assert.equal(encodeHash(Pattern.fromCells(cells)), null);
});

test('malformed or oversized fragments are refused', () => {
  for (const h of ['', '#', '#rle=', '#rle=!', '#rle=3b!', '#foo=o!', '#rle=o<script>', '#rle=%E0%A4%A',
    '#rle=99999o!', '#rle=o4097$o!', '#rle=' + 'o'.repeat(MAX_LINK + 1)]) {
    assert.equal(decodeHash(h), null, h);
  }
  assert.ok(decodeHash('rle=2o!').population === 2);
  assert.ok(decodeHash('#rle=bo%24o!').sameShape(Pattern.fromCells([[1, 0], [0, 1]])));
});
