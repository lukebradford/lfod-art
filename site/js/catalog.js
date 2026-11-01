// The bestiary: Live Free or Die objects shown on the site.
// Every claim here (kind, period, displacement, population range, hull) is checked
// by tests/catalog.test.mjs against the real engine.
//
// Names: where the Life community has already named an object (LifeWiki's
// "OCA:Live Free or Die" page, the ConwayLife forum thread, Catagolue), we use that
// name and record where it comes from in `source`. When an object also has a
// Catagolue apgcode, `apgcode` is recorded and the tests decode it and check it is
// the same object. Names marked `provisional: true` are this site's own, used only
// until the established name can be confirmed for that exact pattern.
//
// All of these turned up in the exhaustive search in tools/search.mjs: every pattern
// in a 4x4 box, and up to 7 cells in a 5x5 box, run to its eventual cycle.

const LIFEWIKI = 'https://conwaylife.com/wiki/OCA:Live_Free_or_Die';

export const CATALOG = [
  {
    id: 'dot',
    name: 'Dot',
    source: { label: 'LifeWiki', url: LIFEWIKI },
    rle: 'x = 1, y = 1, rule = B2/S0\no!',
    kind: 'still', period: 1, dx: 0, dy: 0, pop: [1, 1], hull: [1, 1],
    note: 'One cell with no neighbours, and the only still life this rule has. The only way to survive here is to be alone, so a lone cell lives forever.',
  },
  {
    id: 'checker',
    name: 'Checker',
    aka: 'duoplet',
    source: { label: 'LifeWiki', url: LIFEWIKI },
    rle: 'x = 2, y = 2, rule = B2/S0\no$bo!',
    kind: 'osc', period: 2, dx: 0, dy: 0, pop: [2, 2], hull: [2, 2],
    note: 'Two cells touching at a corner. Each has a neighbour, so both die; the two empty corners each see exactly two, so both are born. It swaps diagonals forever.',
  },
  {
    id: 'bow',
    name: 'Bow',
    provisional: true,
    rle: 'x = 5, y = 2, rule = B2/S0\nbobo$o3bo!',
    kind: 'osc', period: 4, dx: 0, dy: 0, pop: [4, 7], hull: [5, 5],
    note: 'The period-4 oscillator that turned up most often in the search. An arrowhead fires downward, folds, and fires back.',
  },
  {
    id: 'pinwheel',
    name: 'Pinwheel',
    provisional: true,
    rle: 'x = 8, y = 4, rule = B2/S0\n4bobo$7bo$o$bobo!',
    kind: 'osc', period: 6, dx: 0, dy: 0, pop: [6, 12], hull: [8, 6],
    note: 'Two sparks chase each other around a centre, half a turn of symmetry apart.',
  },
  {
    id: 'rally',
    name: 'Rally',
    provisional: true,
    rle: 'x = 6, y = 5, rule = B2/S0\nbo3bo$o2$o$bo3bo!',
    kind: 'osc', period: 12, dx: 0, dy: 0, pop: [6, 14], hull: [9, 5],
    note: 'A pair of arrows volley a disturbance back and forth between them, period 12.',
  },
  {
    id: 'monster',
    name: 'Monster',
    source: { label: 'LifeWiki', url: LIFEWIKI },
    rle: 'x = 4, y = 3, rule = B2/S0\no2bo$o2bo$o2bo!',
    kind: 'osc', period: 19, dx: 0, dy: 0, pop: [6, 40], hull: [16, 13],
    note: 'Two short parallel lines open into a sixteen-cell-wide flower and close again every 19 generations.',
  },
  {
    id: 'moon',
    name: 'Moon',
    source: { label: 'LifeWiki', url: LIFEWIKI },
    apgcode: 'xq1_69',
    rle: 'x = 4, y = 2, rule = B2/S0\no2bo$b2o!',
    kind: 'ship', period: 1, dx: 0, dy: 1, pop: [4, 4],
    note: 'Four cells that move one cell per generation: the speed of light, the fastest anything can travel in this universe.',
  },
  {
    id: 'freeship',
    name: 'Free ship',
    source: { label: 'LifeWiki', url: 'https://conwaylife.com/wiki/OCA:Live_Free_or_Die/Free_ship' },
    apgcode: 'xq6_1owo1z128821',
    // the upper of the two ships a domino splits into (see tests)
    rle: 'x = 8, y = 13, rule = B2/S0\n3b2o2$2bo2bo$bo4bo$3b2o$bo4bo5$obo2bobo2$obo2bobo!',
    kind: 'ship', period: 6, dx: 0, dy: -6, pop: [12, 40],
    note: 'A light-speed ship that changes shape over six generations, trailing a large spark. A single domino (two side-by-side cells) splits into two of them flying apart.',
  },
];

export const byId = Object.fromEntries(CATALOG.map((e) => [e.id, e]));

// Decode a Catagolue apgcode (extended Wechsler format) into a list of [x, y] cells.
export function decodeApgcode(code) {
  const V = '0123456789abcdefghijklmnopqrstuv';
  const body = code.slice(code.indexOf('_') + 1);
  const cells = [];
  let x = 0, y0 = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === 'z') { x = 0; y0 += 5; }
    else if (c === 'w') x += 2;
    else if (c === 'x') x += 3;
    else if (c === 'y') x += 4 + V.indexOf(body[++i]);
    else {
      const v = V.indexOf(c);
      for (let b = 0; b < 5; b++) if (v & (1 << b)) cells.push([x, y0 + b]);
      x++;
    }
  }
  return cells;
}
