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
    // shown travelling right (+x), like the puffers; this is also the glossary's RLE
    rle: 'x = 2, y = 4, rule = B2/S0\no$bo$bo$o!',
    kind: 'ship', period: 1, dx: 1, dy: 0, pop: [4, 4],
    note: 'The smallest spaceship and the only one with period 1: four cells moving one cell per generation, the speed of light, the fastest anything can travel here.',
  },
  {
    id: 'freeship',
    name: 'Free ship',
    source: src('free-ship'),
    apgcode: 'xq6_1owo1z128821',
    // shown travelling right (+x), like the puffers: the upper of the two ships a
    // horizontal domino splits into, turned a quarter turn clockwise (see tests)
    rle: 'x = 13, y = 8, rule = B2/S0\nobo$7bobo$obo7bo$8bo3bo$8bo3bo$obo7bo$7bobo$obo!',
    kind: 'ship', period: 6, dx: 6, dy: 0, pop: [12, 40],
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

// ---------------------------------------------------------------------------
// Puffers: travellers that leave a trail. Every one here moves at the speed of light
// in +x, and everything it leaves behind is a dot (or, for the zodiac, dots and
// checkers). RLEs are verbatim from the LFoD Universe glossary (which writes the rule
// as s0/b2). tests/puffers.test.mjs checks every field by simulation:
//   period, speed (+period cells in x per period), initial population,
//   `settle` and `length` (from gen `settle` on, the rightmost `length` columns repeat
//   exactly one period later, shifted by +period, and everything behind them is frozen),
//   `wake` (what is left per period), and `band` (the rows ever occupied, in RLE
//   coordinates, which the site uses to size each strip so nothing is cut off).
export const PUFFERS = [
  {
    id: 'tricycle',
    name: 'Tricycle puffer',
    source: src('tricycle-puffer'),
    credit: 'Josh Ball',
    rle: 'x = 7, y = 18, rule = s0/b2\n2bo$bobo$bo2bo$bo3bo$3bo2bo$2b2o2bo2$2o$2b2o2bo$2b2o2bo$2o2$2b2o2bo$3bo2bo$bo3bo$bo2bo$bobo$2bo!',
    period: 3, pop0: 34, settle: 0, length: 9, wake: { dot: 4 }, band: [-1, 18],
    note: 'One of very few known objects of period 3. Discovered by Josh Ball.',
  },
  {
    id: 'doubledot',
    name: 'Double dot puffer',
    source: src('double-dot-puffer'),
    rle: 'x = 4, y = 5, rule = s0/b2\n2bo$3bo$o2bo$bo$o!',
    period: 4, pop0: 6, settle: 0, length: 6, wake: { dot: 2 }, band: [-1, 5],
    note: 'Six cells: the smallest known puffer, and a common one.',
  },
  {
    id: 'revolver',
    name: 'Revolver puffer',
    source: src('revolver-puffer'),
    rle: 'x = 20, y = 14, rule = s0/b2\n14bo$10b4obo$16bo$17bo$13b2obo2bo$obo3bo3bo5bo2bo$17bo$17bo$obo3bo3bo5bo2bo$13b2obo2bo$17bo$16bo$10b4obo$14bo!',
    period: 6, pop0: 38, settle: 8, length: 20, wake: { dot: 2 }, band: [-1, 14],
    note: 'The only known period-6 puffer that cannot be split into smaller ones.',
  },
  {
    id: 'rakebake',
    name: 'Rake and bake puffer',
    source: src('rake-and-bake-puffer'),
    rle: 'x = 4, y = 10, rule = s0/b2\n2bo$3bo$o2bo$bo$o$o$bo$o2bo$3bo$2bo!',
    period: 7, pop0: 12, settle: 4, length: 13, wake: { dot: 4 }, band: [-1, 10],
    backwardMoon: true,
    note: 'The only known object of period 7. Every period it fires a moon backwards at the speed of light, which crashes into its own trail and rearranges it.',
  },
  {
    id: 'scale',
    name: 'Scale puffer',
    source: src('scale-puffer'),
    rle: 'x = 9, y = 15, rule = s0/b2\n3bo$4bo$5bo$6bo$8bo$2bo5bo$4bobo$o$4bobo$2bo5bo$8bo$6bo$5bo$4bo$3bo!',
    period: 8, pop0: 19, settle: 0, length: 9, wake: { dot: 5 }, band: [-1, 15],
    note: 'Named for its output, which lies in staggered rows like scales.',
  },
  {
    id: 'arrow',
    name: 'Arrow puffer',
    source: src('arrow-puffer'),
    rle: 'x = 8, y = 8, rule = s0/b2\n4bo$3bobo$4o2bo$7bo$7bo$4o2bo$3bobo$4bo!',
    period: 9, pop0: 18, settle: 0, length: 10, wake: { dot: 4 }, band: [-1, 8],
    note: 'One of only two known objects of period 9; the other, the long arrow puffer, works the same way.',
  },
  {
    id: 'zodiac',
    name: 'Zodiac puffer',
    source: src('zodiac-puffer'),
    credit: 'Josh Ball',
    rle: 'x = 6, y = 22, rule = s0/b2\nbobo$4bo$4bo$3bo2$2bo$b2o$o2bo$5bo$2b2obo$o2$3bobo$5bo$2b2o$b2o$2bo2$o2bo$bo2bo$4bo$3bo!',
    period: 12, pop0: 29, settle: 3, length: 12, wake: { dot: 4, checker: 2 }, band: [-1, 22],
    note: 'The highest period of any known puffer or spaceship that cannot be split into smaller ones. Its wake is the only one here with checkers among the dots, blinking forever. Discovered by Josh Ball.',
  },
];
