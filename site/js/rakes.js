// Rakes: puffers whose trail is ships. Every one here flies right at the speed of light.
// RLEs are verbatim from the LFoD Universe glossary (which writes the rule as s0/b2).
// tests/rakes.test.mjs checks every field by simulation:
//   period, speed (+period cells in x per period), pop0 (the initial population),
//   `settle` and `length`: from generation `settle` on, the engine (the rightmost `length`
//   columns, and for the free rake only rows `top` and below, since its ships leave upward)
//   repeats exactly one period later, shifted by +period; and everything outside it is
//   made of named objects that never touch the engine or each other again,
//   `fires` (what leaves per period, and in which direction: moons fly back at c, so a
//   moon and the rake part at 2c; the free rake's ships fly up at c),
//   `wake` (what is left behind, frozen, per period),
//   `band` (the rows the engine and its moons ever occupy, in RLE coordinates; the free
//   rake's band is its engine only, its ships having no limit).
const GLOSSARY = 'https://lukebradford.github.io/lfod/glossary.html#';
const src = (id) => ({ label: 'LFoD Universe glossary', url: GLOSSARY + id });

export const BACK = [-1, 0], UP = [0, -1];

export const RAKES = [
  {
    id: 'tricycle',
    name: 'Tricycle rake',
    source: src('tricycle-rake'),
    credit: 'Josh Ball',
    rle: 'x = 21, y = 24, rule = s0/b2\n8bo$15bobo$3o4bo2bo7bo$2obo4bo2b2obo2bo2bo$2o5bo6bo2bo2bo$6bo4bo4bobo$b3obo3b2obobo2b2o$3b4o3bobo7bo$12bo7bo$6b2obo3bo2b3o$3bo4bo4bo2b3o$2bo3b2o4bo7bo$2bo3b2o4bo7bo$3bo4bo4bo2b3o$6b2obo3bo2b3o$12bo7bo$3b4o3bobo7bo$b3obo3b2obobo2b2o$6bo4bo4bobo$2o5bo6bo2bo2bo$2obo4bo2b2obo2bo2bo$3o4bo2bo7bo$15bobo$8bo!',
    period: 3, pop0: 130, settle: 0, length: 21, fires: { moon: 1 }, dir: BACK, wake: {}, band: [0, 23],
    note: 'Period 3, like the tricycle puffer, and one of very few known objects with that period. Every third generation a moon leaves its back, and nothing else ever does. Discovered by Josh Ball.',
  },
  {
    id: 'flipflop',
    name: 'Flip-flop rake',
    source: src('flip-flop-rake'),
    credit: 'Josh Ball',
    rle: 'x = 41, y = 21, rule = s0/b2\n39bo$27bo5bobo4bo$26bob2o6bo3bo$26bo11bo$bobo4bo7bo2bo4bobo3bo6bo$4bo2b3o2bo3bo19bo$bo3b2ob3obo23bo$4bo4bobo4bo3bo6b2o3bo2bo2bo$11bo24bobo$2bo7bobobo5bo2bo2bo9bo$b2o5bo3b3o9b3o8bo$obo3bobo5bo9bobo9bo$obob2o2bo2bo24bobo$b2o3bo3b2o4bo7bo2bo2bo5bobo$2bob2o4bo5bo7bo$10bo11bo4bo6b2o$17bo5b2obo2bo7bo$14bobo5b4o3bo2bo5bo$24b3obo7bo3bo$23bo3bo7bo4bo$39bo!',
    period: 4, pop0: 131, settle: 0, length: 41, fires: { moon: 2 }, dir: BACK, wake: {}, band: [0, 20],
    note: 'Two barrels: every fourth generation a moon leaves each, one above the other, and nothing else is left. Discovered by Josh Ball.',
  },
  {
    id: 'nickel',
    name: 'Nickel rake',
    source: src('nickel-rake'),
    credit: 'Josh Ball',
    rle: 'x = 30, y = 26, rule = s0/b2\n9bo$5bo2bobo$o8bobo$5bo2bo3bo$2bo10bo$7bo2b2o3bo$7bo2bo4bo12bo$8b2o16bo2bo$5bo3bo10bo4b2o2bo$21bo4bobo$13bo4bo2bo$5bo2bo2bo5b2o5bo$3b2o13b3o5bobo$3b2o13b3o5bobo$5bo2bo2bo5b2o5bo$13bo4bo2bo$21bo4bobo$5bo3bo10bo4b2o2bo$8b2o16bo2bo$7bo2bo4bo12bo$7bo2b2o3bo$2bo10bo$5bo2bo3bo$o8bobo$5bo2bobo$9bo!',
    period: 5, pop0: 98, settle: 5, length: 30, fires: { moon: 1 }, dir: BACK, wake: { dot: 2 }, band: [-1, 26],
    note: 'A rake and a puffer at once: every fifth generation a moon leaves its back, and a dot is left on each side, so its moons fly down a corridor of solitude. Discovered by Josh Ball.',
  },
  {
    id: 'free',
    name: 'Free rake',
    source: src('free-rake'),
    rle: 'x = 37, y = 18, rule = s0/b2\no$bo$bo32bo$o29bo4bo$31bo3bo$33bo$4bobo9bobo13bo$3bo3bo7bo3bo3bo3bo$22b3o3$28bo4bo$4b3o5bo18b2obo$11bobo22bo$15bo20bo$15bo15b2obo$11bobo14bo4bo$4b3o5bo!',
    period: 12, pop0: 50, settle: 15, length: 46, top: -4, fires: { freeship: 1 }, dir: UP, wake: { dot: 2, checker: 1 }, band: [-4, 19],
    note: 'The first known rake in this universe, by the glossary’s account. It fires free ships, which leave sideways, so a line of them climbs away from the rake at forty-five degrees. The glossary says it is one reaction held up by a flotilla of anchor tracks, and that other tracks give rakes of higher periods. Behind it, two dots and a checker are left every period.',
  },
];

// The backflip: the flip-flop rake with a trailer behind it (33 more cells in its 13
// rearmost columns, checked) that catches every moon the rake fires and turns it into
// two checkers. Together they are a puffer with a frozen wake, tested like one.
export const BACKFLIP = {
  id: 'backflip',
  name: 'Backflip',
  source: src('backflip'),
  credit: 'Josh Ball',
  rake: 'flipflop',
  rle: 'x = 56, y = 21, rule = s0/b2\n54bo$7bo34bo5bobo4bo$8bo32bob2o6bo3bo$10bo30bo11bo$8bobo5bobo4bo7bo2bo4bobo3bo6bo$5bo13bo2b3o2bo3bo19bo$4bo11bo3b2ob3obo23bo$5b2o5bo6bo4bobo4bo3bo6b2o3bo2bo2bo$2bo8bo14bo24bobo$3bo7bo5bo7bobobo5bo2bo2bo9bo$8bo3bo3b2o5bo3b3o9b3o8bo$6bo8bobo3bobo5bo9bobo9bo$7bo7bobob2o2bo2bo24bobo$o3bo3bo7b2o3bo3b2o4bo7bo2bo2bo5bobo$3bo4bo8bob2o4bo5bo7bo$2bo3bobo16bo11bo4bo6b2o$10bo21bo5b2obo2bo7bo$4bo5bo18bobo5b4o3bo2bo5bo$4bo3bo30b3obo7bo3bo$5bobo30bo3bo7bo4bo$54bo!',
  period: 4, pop0: 164, settle: 2, length: 56, fires: {}, dir: BACK, wake: { checker: 4 }, band: [0, 20],
  note: 'Nothing can catch a moon, but something can be put in its way. This is the flip-flop rake with a trailer of 33 cells behind it that takes both moons every period and turns each into two checkers, blinking forever: a rake made back into a puffer. Discovered by Josh Ball.',
};

export const ALL = [...RAKES, BACKFLIP];
export const byId = Object.fromEntries(ALL.map((e) => [e.id, e]));
