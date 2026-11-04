// periods.js: anchor tracks, and the smallest known oscillator at every known period.
// Every claim here is checked by tests/periods.test.mjs against the engine.
//
// An anchor track is an anchor (here, a pair of cells one above the other with a gap
// between) shuttling along a track of two rows of dots. The Live Free or Die Universe
// collection's anchor track page says a track of s slots repeats after 4 * 2^k - 4
// generations, where k is the smallest number for which 2^k is one more or one less
// than a multiple of 2s + 1, because the pairs on the track follow Wolfram's Rule 90:
// every two generations each pair becomes two, one two cells to the left and one two
// cells to the right, and two that land on the same spot cancel. The tests confirm
// both, cell for cell, over a full period, for every track from one to seventeen slots.
import { Pattern } from './lfod.js';

export const GLOSSARY = 'https://lukebradford.github.io/lfod/glossary.html#';
export const SOURCE = { label: 'LFoD Universe table of periods', url: 'https://lukebradford.github.io/lfod/periods.html' };

// The s-slot track, in the glossary's form: dots at x = 1 + 4i on rows 0 and 4 for
// each slot i, and the pair at x = 0 on rows 1 and 3. Two slots is the glossary's RLE
// (bo3bo$o2$o$bo3bo!); each further slot adds a pair of dots four cells to the right.
export function track(s) {
  const cells = [[0, 1], [0, 3]];
  for (let i = 0; i < s; i++) cells.push([1 + 4 * i, 0], [1 + 4 * i, 4]);
  return Pattern.fromCells(cells);
}

// the smallest k with 2^k = 1 or -1 modulo m (the multiplicative suborder of 2 mod m)
export function sord(m) {
  for (let k = 1, v = 2 % m; ; k++, v = (v * 2) % m) if (v === 1 % m || v === m - 1) return k;
}
export const trackPeriod = (s) => 4 * 2 ** sord(2 * s + 1) - 4;

// Where the pairs can sit: 2s sites at x = 0, 2, 4, ..., 4s - 2 (left and right of each
// column of dots). At even generations the track is exactly its dots plus a pair at
// each occupied site, and the sites step by Rule 90 (one step every two generations).
export const SITES = (s) => 2 * s;
export function sitesOf(p, s) {
  const a = new Uint8Array(SITES(s));
  for (let i = 0; i < a.length; i++) a[i] = p.get(2 * i, 1) && p.get(2 * i, 3) ? 1 : 0;
  return a;
}
export function rule90(a) {
  const n = a.length, b = new Uint8Array(n);
  for (let i = 0; i < n; i++) b[i] = (i > 0 ? a[i - 1] : 0) ^ (i + 1 < n ? a[i + 1] : 0);
  return b;
}
// what the s-slot track looks like with pairs at the given sites
export function trackWith(s, sites) {
  const cells = [];
  for (let i = 0; i < s; i++) cells.push([1 + 4 * i, 0], [1 + 4 * i, 4]);
  for (let i = 0; i < sites.length; i++) if (sites[i]) cells.push([2 * i, 1], [2 * i, 3]);
  return Pattern.fromCells(cells);
}

// the tracks shown live, with their looms
export const SHOWN = [2, 3, 4, 5, 6, 7, 8, 9];

// The collection's table of the smallest known oscillator at each period (as of
// November 2026), every row a pattern the tests run for a full period. `cells` is the
// fewest live cells over the period. Uncredited rows are the collection's own finds,
// which its table attributes to Luke Bradford.
const osc = (period, id, name, cells, rle, credit = 'Luke Bradford') => ({ period, id, name, cells, rle, credit, source: { label: 'glossary', url: GLOSSARY + id } });
const at = (slots, credit = 'Luke Bradford') => ({ period: trackPeriod(slots), id: `anchor-track-${slots}`, slots, name: `${slots}-slot anchor track`, cells: 2 * slots + 2, credit, source: { label: 'glossary', url: GLOSSARY + 'anchor-track' } });
export const TABLE = [
  osc(1, 'dot', 'dot', 1, 'x = 1, y = 1, rule = B2/S0\no!'),
  osc(2, 'checker', 'checker', 2, 'x = 2, y = 2, rule = B2/S0\no$bo!'),
  osc(3, 'sandbar', 'sandbar', 32, 'x = 17, y = 13, rule = B2/S0\nbo10bo$7bo$4bo7b2o$o5bo6bobo$2bo7b2o$o9b2o2$5b2o9bo$5b2o7bo$bobo6bo5bo$3b2o7bo$9bo$4bo10bo!', 'Josh Ball'),
  osc(4, 'lever', 'lever', 4, 'x = 5, y = 3, rule = B2/S0\nbo$o3bo$3bo!'),
  osc(5, 'starfish', 'starfish', 64, 'x = 28, y = 16, rule = B2/S0\n12bo2bo2$12b4o$11b2o2b2o$11bo4bo$ob2o5bob2o2b2obo5b2obo$3bo3bo4b4o4bo3bo3$3bo3bo4b4o4bo3bo$ob2o5bob2o2b2obo5b2obo$11bo4bo$11b2o2b2o$12b4o2$12bo2bo!', 'Josh Ball'),
  osc(6, 'ant', 'ant', 6, 'x = 8, y = 4, rule = B2/S0\nbobo$o$7bo$4bobo!', 'Josh Ball'),
  osc(8, 'sparkler', 'sparkler', 12, 'x = 10, y = 10, rule = B2/S0\n2bo$bo$o$4bo$3bobo$4bo$9bo$8bo$7b2o$6bo!', 'Josh Ball'),
  at(2),
  osc(19, 'monster', 'monster', 6, 'x = 4, y = 3, rule = B2/S0\no2bo$o2bo$o2bo!'),
  at(3),
  at(7),
  at(5),
  at(6),
  at(21),
  at(25),
  at(9),
  at(12),
  at(11),
  at(17),
  at(1365),
  at(14),
];
export const byId = (id) => TABLE.find((e) => e.id === id);
export const patternOf = (e) => (e.slots ? track(e.slots) : Pattern.fromRLE(e.rle));
