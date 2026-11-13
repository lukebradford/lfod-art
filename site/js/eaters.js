// eaters.js: anchor eater ships, an anchor track that flies. Every claim here is
// checked by tests/eaters.test.mjs against the engine.
//
// The glossary's anchor eater (its RLE below, 62 cells) is a spaceship by itself: a
// front that flies at c setting down a track of dots, a pair of cells (an anchor) on
// the track, and at the back a trailer that eats the track again. The glossary calls
// it a 6-slot anchor eater and says it is extended by inserting four more pairs of dots
// before the trailer. Inserting them means moving the front, and the anchor with it,
// four cells further from the back per pair of dots; that is `eater(s)` below. The
// tests find which s give ships (every even s from 6), at what period, and that the
// pairs on the flying track follow Rule 90 exactly, as they do on the anchor track.
import { Pattern } from './lfod.js';

export const GLOSSARY = 'https://lukebradford.github.io/lfod/glossary.html#anchor-eater';
export const RLE = 'x = 32, y = 23, rule = B2/S0\n15bo4bo$14bobo4bo$15bobo3bo$4bo11bo2bo$8bo9bo$5bo3bo2bo15bo$4bo24bo$o29bo$31bo$o3bo3bo3bo3bo3bo3bo6bo$21bo2$21bo$o3bo3bo3bo3bo3bo3bo6bo$31bo$o29bo$4bo24bo$5bo3bo2bo15bo$8bo9bo$4bo11bo2bo$15bobo3bo$14bobo4bo$15bo4bo!';

// The track: two rows of dots (rows 9 and 13, x = 0, 4, ..., 4s), with pairs sitting
// on rows 10 and 12 between them. The 6-slot glossary form has dots at x = 0..24; its
// front is everything from x = 28 on, and its anchor is the pair at x = 21.
export const TOP = 9, BOTTOM = 13, PAIR_ROWS = [10, 12];
const BASE = Pattern.fromRLE(RLE).cells();
const isTrackDot = ([x, y]) => (y === TOP || y === BOTTOM) && x <= 24 && x % 4 === 0;
const isFront = ([x, y]) => x >= 28 || (x === 21 && (y === 10 || y === 12));

export function eater(s) {
  if (!Number.isInteger(s) || s < 1) throw new RangeError('slots must be a positive integer');
  const d = 4 * (s - 6), out = [];
  for (const c of BASE) {
    if (isTrackDot(c)) continue;
    out.push(isFront(c) ? [c[0] + d, c[1]] : c);
  }
  for (let x = 0; x <= 24 + d; x += 4) out.push([x, TOP], [x, BOTTOM]);
  return Pattern.fromCells(out);
}

// What an s-slot eater becomes, as the tests find for every s from 3 to 40: below 6
// slots, and at every s one more than a multiple of four, it explodes; at every even s
// from 6 it is a spaceship; at every s three more than a multiple of four it is a
// puffer whose trail is checkers. Ship or puffer, the period is twice the first power
// of two at or above s, and it flies at c (one cell a generation, to the right).
export const TESTED = [3, 40];
export const period = (s) => 2 * 2 ** Math.ceil(Math.log2(s));
export function fate(s) {
  if (s < 6 || s % 4 === 1) return { kind: 'explodes' };
  if (s % 2 === 0) return { kind: 'ship', period: period(s) };
  return { kind: 'puffer', period: period(s) };
}
// fewest live cells over a period, for the ships (the starting phase is the smallest)
export const cells = (s) => 2 * s + 50;

// the ships shown live: the smallest track for each period, 16 to 128
export const SHOWN = [6, 10, 18, 34];

// Is there a pair (two cells one above the other, a gap between) at x?
export const pairAt = (p, x) => (p.get(x, PAIR_ROWS[0]) && p.get(x, PAIR_ROWS[1]) ? 1 : 0);
