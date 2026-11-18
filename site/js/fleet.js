// fleet.js: the smallest known spaceship at each period, from the collection's table
// of periods (November 2026), for every row whose pattern is to hand. Every period,
// displacement and population here is checked by tests/fleet.test.mjs against the
// engine. All fly to the right; `dx` is how far in one period (c is dx = period).
import { Pattern } from './lfod.js';
import { eater } from './eaters.js';

export const GLOSSARY = 'https://lukebradford.github.io/lfod/glossary.html#';
export const SOURCE = { label: 'LFoD Universe table of periods', url: 'https://lukebradford.github.io/lfod/periods.html' };

// Uncredited rows are the collection's own finds, which its table attributes to Luke
// Bradford. `cells` is the fewest live cells over a period (each starts at its fewest).
const ship = (period, dx, id, name, cells, rle, extra = {}) => ({ period, dx, id, name, cells, rle, credit: 'Luke Bradford', link: GLOSSARY + id, ...extra });
const eat = (period, s) => ({ period, dx: period, id: `eater-${s}`, name: `${s}-slot anchor eater ship`, short: `${s}-slot eater`, cells: 2 * s + 50, slots: s, credit: 'Luke Bradford', link: GLOSSARY + 'anchor-eater' });

export const FLEET = [
  ship(1, 1, 'moon', 'moon', 4, 'x = 2, y = 4, rule = B2/S0\no$bo$bo$o!'),
  ship(2, 2, 'flicker-ship', 'flicker ship', 54, 'x = 10, y = 28, rule = B2/S0\n6bo$7bo$2bo4bo$6bo$4b2o$3bo2bobo$2bo6bo$6bo2bo$bo6bo$2o4bo$b2o$2bo2bo$4b2o$4bobo$4bobo$4b2o$2bo2bo$b2o$2o4bo$bo6bo$6bo2bo$2bo6bo$3bo2bobo$4b2o$6bo$2bo4bo$7bo$6bo!'),
  ship(4, 4, 'key-ship', 'key ship', 8, 'x = 6, y = 5, rule = B2/S0\n4bo$o4bo$bo3bo$3bo$obo!'),
  ship(5, 5, 'nickel-ship', 'nickel ship', 98, 'x = 38, y = 28, rule = B2/S0\n21bo$22bo$22bo$21bo6bo$29bo$17bo11bo$bo3bo20bobo$9bo15b2o9bo$8b2o4bo8bo13bo$obo5bo10bo3b2o5bo3bo2bo$15bobo10b2o6bo$obo6b3o12bo$25b3obo3bo$25bobo8bo$25bobo8bo$25b3obo3bo$obo6b3o12bo$15bobo10b2o6bo$obo5bo10bo3b2o5bo3bo2bo$8b2o4bo8bo13bo$9bo15b2o9bo$bo3bo20bobo$17bo11bo$29bo$21bo6bo$22bo$22bo$21bo!'),
  ship(6, 6, 'free-ship', 'free ship', 12, 'x = 9, y = 6, rule = B2/S0\no4bo$3b2obo$8bo$8bo$3b2obo$o4bo!'),
  ship(8, 8, 'squid-ship', 'squid ship', 20, 'x = 8, y = 13, rule = B2/S0\n6bo$7bo$4bo2bo$3bo2bo$o$5bo$bob3o$5bo$o$3bo2bo$4bo2bo$7bo$6bo!'),
  ship(10, 2, 'decade-ship', 'decade ship', 114, 'x = 49, y = 18, rule = B2/S0\n34bo$35bo$23bo23bo$3bo9bo15bobo16bo$6bo9bo7bob2obo6bo$obo6bo3bo9bo3bo3bo13bo2bo$4b2o3bo3b2o5bo2b2o7b2o2b2o6b2obo$3bo2bo3b3obob3o8bobo6bo6bo$2bo24bo3bo7bo$2bo24bo3bo7bo$3bo2bo3b3obob3o8bobo6bo6bo$4b2o3bo3b2o5bo2b2o7b2o2b2o6b2obo$obo6bo3bo9bo3bo3bo13bo2bo$6bo9bo7bob2obo6bo$3bo9bo15bobo16bo$23bo23bo$35bo$34bo!', { credit: 'Paul Tooke' }),
  // the table's "unnamed spaceship" of period 12, from the collection's period examples
  // (2008); the glossary has no entry for it
  ship(12, 12, 'p12', 'unnamed', 22, 'x = 11, y = 14, rule = B2/S0\n7bo$bobo4bo$o3bo3bo$6bo$o4bo4$3bo4bo$6b2obo$10bo$10bo$6b2obo$3bo4bo!', { link: SOURCE.url }),
  eat(16, 6),
  eat(32, 10),
  eat(64, 18),
  eat(128, 34),
];

// The table's rows not flown here, and why (the page says so).
export const ABSENT = {
  unavailable: [3, 20, 24, 30, 40, 48, 96, 120, 192, 240], // no pattern in the collection's data
  wide: [256], // the 66-slot eater, 272 cells long: checked in tests/eaters.test.mjs
};

export const patternOf = (e) => (e.slots ? eater(e.slots) : Pattern.fromRLE(e.rle));
