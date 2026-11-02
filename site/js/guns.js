// Guns: things that stand still and fire ships. Only two are known in Live Free or Die,
// and both fire moons, in both directions at once. RLEs are verbatim from the LFoD
// Universe glossary (moon laser, written s0/b2) and news page (p5 moon gun, B2/S0).
// tests/guns.test.mjs checks every field by simulation:
//   period, pop0 (the initial population), `settle` and `box` (from generation `settle`
//   on, the engine, every cell inside box = [x0, y0, x1, y1] inclusive, repeats exactly
//   one period later in the same place; everything outside it at those generations is
//   moons, which never touch the engine or each other again; a moon is born as two
//   cells just outside the box, one generation before it is a moon), `fires` (moons
//   leaving per period), `axis` ('x': one moon left and one right per period; 'y': one
//   up and one down), `barrel` (the first row, or column, of the four the moons fly
//   along: the gun's middle line), `found` (year).
const GLOSSARY = 'https://lukebradford.github.io/lfod/glossary.html#';
const NEWS = 'https://lukebradford.github.io/lfod/news.html#';

export const GUNS = [
  {
    id: 'p5',
    name: 'p5 moon gun',
    source: { label: 'news', url: NEWS + 'y2016' },
    forum: 'https://conwaylife.com/forums/viewtopic.php?p=34047#p34047',
    credit: 'Arie Paap',
    found: 2016,
    rle: 'x = 19, y = 46, rule = B2/S0\n7bo3bo$6b3ob3o$2bo2bo7bo2bo2$bo5bo3bo5bo$2o2bo2bobobo2bo2b2o$3bo4b3o4b\no$bobo4bobo4bobo$4bo9bo2$o17bo$2bo13bo$3b2o3bobo3b2o$4bo9bo$2bo2bo7bo2\nbo$b2o4b5o4b2o$2b3o9b3o2$7b5o$9bo2$4bo4bo4bo$3bo4b3o4bo$3bo4b3o4bo$4bo\n4bo4bo2$9bo$7b5o2$2b3o9b3o$b2o4b5o4b2o$2bo2bo7bo2bo$4bo9bo$3b2o3bobo3b\n2o$2bo13bo$o17bo2$4bo9bo$bobo4bobo4bobo$3bo4b3o4bo$2o2bo2bobobo2bo2b2o\n$bo5bo3bo5bo2$2bo2bo7bo2bo$6b3ob3o$7bo3bo!',
    period: 5, pop0: 166, settle: 5, box: [0, -1, 18, 46], fires: { moon: 2 }, axis: 'x', barrel: 21,
    note: 'Found by Arie Paap in August 2016, the second gun known and by far the smaller: 166 cells, a mirror image of itself both ways. Every fifth generation a moon leaves each side along its middle row, so it stands at the centre of a line of light that lengthens at the speed of light in both directions.',
  },
  {
    id: 'laser',
    name: 'Moon laser',
    source: { label: 'glossary', url: GLOSSARY + 'moon-laser' },
    forum: 'https://conwaylife.com/forums/viewtopic.php?p=6893#p6893',
    credit: 'Matthias Merzenich',
    found: 2012,
    rle: 'x = 170, y = 31, rule = s0/b2\n3bo2bo29bo3bo88bo3bo29bo2bo$24bo5bo6bo8bo12bo19bo10bo19bo12bo8bo6bo5bo$12bo3bo12bo20bo9bo17bo12bo17bo9bo20bo12bo3bo$8bo6bo13b3o3bobo12b2o12bo13bo12bo13bo12b2o12bobo3b3o13bo6bo$o3bo4bo9bo2bob2o3bob2o9bobo5bo9bo15bo2bo10bo2bo15bo9bo5bobo9b2obo3b2obo2bo9bo4bo3bo$bobo2bo4b2o2bo21bo2bo4bobob2o2bo6b2obo15b2o8b2o15bob2o6bo2b2obobo4bo2bo21bo2b2o4bo2bobo$6bo7bo4bo8bobo7bo12bo2bo4b4ob2o5bo8bo3b2o3bo8bo5b2ob4o4bo2bo12bo7bobo8bo4bo7bo$6bo13bo9bobobo12bobo6b2o2bo3bobo3bo3b2o7bo2bo7b2o3bo3bobo3bo2b2o6bobo12bobobo9bo13bo$16bo13bo11bo4b3o9bo14b3o3bo8bo3b3o14bo9b3o4bo11bo13bo$7bobo5bo18bo12bo4bo14bo2b2o3bo4bo8bo4bo3b2o2bo14bo4bo12bo18bo5bobo$8bo13bo3bo6bo3bo10bo9b2o2bo8bo6b2o4b2o4b2o6bo8bo2b2o9bo10bo3bo6bo3bo13bo$11bo11bobo34bobo3bo6bo3bo14bo3bo6bo3bobo34bobo11bo$5bo4bo42bobo2bobobo2bo3bo3bo3b2o4bo2bo4b2o3bo3bo3bo2bobobo2bobo42bo4bo$50bo3bo5bo5bobobo2bob3obo2bo4bo2bob3obo2bobobo5bo5bo3bo$49bo8b2o6b2o3b2o7b2o2b2o2b2o7b2o3b2o6b2o8bo$56b5o2bo42bo2b5o$49bo8b2o6b2o3b2o7b2o2b2o2b2o7b2o3b2o6b2o8bo$50bo3bo5bo5bobobo2bob3obo2bo4bo2bob3obo2bobobo5bo5bo3bo$5bo4bo42bobo2bobobo2bo3bo3bo3b2o4bo2bo4b2o3bo3bo3bo2bobobo2bobo42bo4bo$11bo11bobo34bobo3bo6bo3bo14bo3bo6bo3bobo34bobo11bo$8bo13bo3bo6bo3bo10bo9b2o2bo8bo6b2o4b2o4b2o6bo8bo2b2o9bo10bo3bo6bo3bo13bo$7bobo5bo18bo12bo4bo14bo2b2o3bo4bo8bo4bo3b2o2bo14bo4bo12bo18bo5bobo$16bo13bo11bo4b3o9bo14b3o3bo8bo3b3o14bo9b3o4bo11bo13bo$6bo13bo9bobobo12bobo6b2o2bo3bobo3bo3b2o7bo2bo7b2o3bo3bobo3bo2b2o6bobo12bobobo9bo13bo$6bo7bo4bo8bobo7bo12bo2bo4b4ob2o5bo8bo3b2o3bo8bo5b2ob4o4bo2bo12bo7bobo8bo4bo7bo$bobo2bo4b2o2bo21bo2bo4bobob2o2bo6b2obo15b2o8b2o15bob2o6bo2b2obobo4bo2bo21bo2b2o4bo2bobo$o3bo4bo9bo2bob2o3bob2o9bobo5bo9bo15bo2bo10bo2bo15bo9bo5bobo9b2obo3b2obo2bo9bo4bo3bo$8bo6bo13b3o3bobo12b2o12bo13bo12bo13bo12b2o12bobo3b3o13bo6bo$12bo3bo12bo20bo9bo17bo12bo17bo9bo20bo12bo3bo$24bo5bo6bo8bo12bo19bo10bo19bo12bo8bo6bo5bo$3bo2bo29bo3bo88bo3bo29bo2bo!',
    period: 4, pop0: 700, settle: 4, box: [0, 0, 169, 30], fires: { moon: 2 }, axis: 'y', barrel: 83,
    note: 'The first gun in this universe, found by Matthias Merzenich in August 2012: 700 cells, 170 wide, and the only one known for four years. Two barrels, both at its centre column: every fourth generation one moon leaves upwards and one downwards. The glossary calls it double-barreled; the name is the wiki’s.',
  },
];
export const byId = Object.fromEntries(GUNS.map((e) => [e.id, e]));

// Face to face: two p5 moon guns on one line, the second `d` columns to the right of the
// first (the gun is its own mirror image, so this is the second turned to face the
// first). Their inner streams meet halfway. Two moons exactly in line vanish when the
// distance between them is even and begin to fuse into a monster when it is odd
// (Collisions, offset 0); whether the pairs here meet at an even or odd distance is
// decided by the parity of d, so at an odd distance every pair vanishes, forever, and at
// an even one the first pair has not finished fusing when the next arrives, and
// everything explodes. tests/guns.test.mjs checks both, for every d from 40 to 61 and
// for the two shown.
export const FACE = { gun: 'p5', odd: 101, even: 100 };
// the cells of two guns face to face, given the cells of one at the origin
export const facing = (cells, d) => [...cells, ...cells.map(([x, y]) => [x + d, y])];
