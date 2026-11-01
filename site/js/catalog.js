// The bestiary: Live Free or Die objects shown on the site.
// Every claim here (kind, period, displacement, population range, hull) is checked
// by tests/catalog.test.mjs against the real engine.
//
// Names: we use the established names. The primary source is the Live Free or
// Die Universe glossary (the rule's original pattern collection, restored at
// lukebradford.github.io/lfod), whose RLEs were matched to these patterns by
// simulation in every phase and orientation. `source` links to the entry. When an object also has a
// Catagolue apgcode, `apgcode` is recorded and the tests decode it and check it is
// the same object. Names marked `provisional: true` are this site's own, used only
// until the established name can be confirmed for that exact pattern.
//
// All of these turned up in the exhaustive search in tools/search.mjs: every pattern
// in a 4x4 box, and up to 7 cells in a 5x5 box, run to its eventual cycle.

const GLOSSARY = 'https://lukebradford.github.io/lfod/glossary.html#';
const src = (id) => ({ label: 'LFoD Universe glossary', url: GLOSSARY + id });

export const CATALOG = [
  {
    id: 'dot',
    name: 'Dot',
    source: src('dot'),
    rle: 'x = 1, y = 1, rule = B2/S0\no!',
    kind: 'still', period: 1, dx: 0, dy: 0, pop: [1, 1], hull: [1, 1],
    note: 'One cell with no neighbours, and the only still life this rule has. The only way to survive here is to be alone, so a lone cell lives forever.',
  },
  {
    id: 'checker',
    name: 'Checker',
    aka: 'duoplet',
    source: src('checker'),
    rle: 'x = 2, y = 2, rule = B2/S0\no$bo!',
    kind: 'osc', period: 2, dx: 0, dy: 0, pop: [2, 2], hull: [2, 2],
    note: 'Two cells touching at a corner. Each has a neighbour, so both die; the two empty corners each see exactly two, so both are born. It swaps diagonals forever.',
  },
  {
    id: 'lever',
    name: 'Lever',
    source: src('lever'),
    rle: 'x = 5, y = 3, rule = B2/S0\nbo$o3bo$3bo!',
    kind: 'osc', period: 4, dx: 0, dy: 0, pop: [4, 5], hull: [5, 3],
    note: 'The smallest period-4 oscillator by bounding box and by average population.',
  },
  {
    id: 'radar',
    name: 'Radar',
    source: src('radar'),
    rle: 'x = 4, y = 4, rule = B2/S0\nbo$o$3bo$2bo!',
    kind: 'osc', period: 4, dx: 0, dy: 0, pop: [4, 6], hull: [4, 4],
    note: 'Two pairs of cells in opposite corners fold into a square block, then open into the other two corners, sweeping round like a radar.',
  },
  {
    id: 'anchor',
    name: 'Anchor',
    source: src('anchor'),
    rle: 'x = 5, y = 2, rule = B2/S0\nbobo$o3bo!',
    kind: 'osc', period: 4, dx: 0, dy: 0, pop: [4, 7], hull: [5, 5],
    note: 'The period-4 oscillator that turned up most often in our search, a building block of many larger oscillators and a common puffer output. An arrowhead fires, folds, and fires back.',
  },
  {
    id: 'ant',
    name: 'Ant',
    source: src('ant'),
    credit: 'Josh Ball',
    rle: 'x = 8, y = 4, rule = B2/S0\n4bobo$7bo$o$bobo!',
    kind: 'osc', period: 6, dx: 0, dy: 0, pop: [6, 12], hull: [8, 6],
    note: 'The smallest known period-6 oscillator: two sparks chasing each other around a centre, half a turn apart. Found by Josh Ball.',
  },
  {
    id: 'anchortrack',
    name: 'Two-slot anchor track',
    source: src('anchor-track'),
    rle: 'x = 6, y = 5, rule = B2/S0\nbo3bo$o2$o$bo3bo!',
    kind: 'osc', period: 12, dx: 0, dy: 0, pop: [6, 14], hull: [9, 5],
    note: 'An anchor shuttling along a track of dots. Add more pairs of dots and the track, and its period, grows without limit.',
  },
  {
    id: 'monster',
    name: 'Monster',
    source: src('monster'),
    rle: 'x = 4, y = 3, rule = B2/S0\no2bo$o2bo$o2bo!',
    kind: 'osc', period: 19, dx: 0, dy: 0, pop: [6, 40], hull: [16, 13],
    note: 'Two short parallel lines open into a sixteen-cell-wide flower and close again every 19 generations. The largest oscillator here that cannot be split into smaller ones.',
  },
  {
    id: 'moon',
    name: 'Moon',
    source: src('moon'),
    apgcode: 'xq1_69',
    rle: 'x = 4, y = 2, rule = B2/S0\no2bo$b2o!',
    kind: 'ship', period: 1, dx: 0, dy: 1, pop: [4, 4],
    note: 'The smallest spaceship and the only one with period 1: four cells moving one cell per generation, the speed of light, the fastest anything can travel here.',
  },
  {
    id: 'freeship',
    name: 'Free ship',
    source: src('free-ship'),
    apgcode: 'xq6_1owo1z128821',
    // the upper of the two ships a domino splits into (see tests)
    rle: 'x = 8, y = 13, rule = B2/S0\n3b2o2$2bo2bo$bo4bo$3b2o$bo4bo5$obo2bobo2$obo2bobo!',
    kind: 'ship', period: 6, dx: 0, dy: -6, pop: [12, 40],
    note: 'The emblem of the Live Free or Die universe: a light-speed ship that changes shape over six generations, trailing a large spark. A single domino splits into two of them flying apart.',
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
