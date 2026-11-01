// Collisions: a moon (the period-1, light-speed ship) sent at another moon, a dot or
// a checker, at every offset where they interact. Every outcome below is checked by
// tests/collisions.test.mjs, which runs exactly the setup that setup() builds here and
// takes the result apart into named objects (dot, checker, moon, free ship, monster),
// confirming that from generation `at` on the pieces never touch again.
//
// Geometry: the moon travels right (+x) with its top row at y = 0; its cells are
// rows 0..3. The target sits `gap` cells ahead with its top row at y = dy (the offset).
// For a moving or blinking target only the parity of the gap matters (shifting the
// gap by 2 is the same collision a generation or two later), so each target lists one
// row of outcomes per gap parity. A dot never changes, so it has one row.
//
// Outcome strings: 'explodes' (grows into the light-speed diamond; tests check it is
// still growing hundreds of generations later), 'nothing' (every cell dies), or a list
// of objects such as 'checker×4 freeship×2'.

export const MOON = [[0, 0], [1, 1], [1, 2], [0, 3]]; // RLE o$bo$bo$o, moving +x

export const TARGETS = [
  {
    id: 'moon',
    label: 'another moon',
    cells: MOON.map(([x, y]) => [1 - x, y]), // the mirror image, moving -x
    dy: [-5, 5],
    rows: {
      24: ['explodes', 'explodes', '12:checker×2', '12:dot×2', 'explodes', '12:nothing', 'explodes', '12:dot×2', '12:checker×2', 'explodes', 'explodes'],
      25: ['explodes', 'explodes', '13:checker×2', '19:dot×4', '26:checker×4 freeship×2', '11:monster', '26:checker×4 freeship×2', '19:dot×4', '13:checker×2', 'explodes', 'explodes'],
    },
  },
  {
    id: 'dot',
    label: 'a dot',
    cells: [[0, 0]],
    dy: [-2, 5],
    rows: {
      16: ['explodes', '15:checker dot', 'explodes', 'explodes', 'explodes', 'explodes', '15:checker dot', 'explodes'],
    },
  },
  {
    id: 'checker',
    label: 'a checker',
    cells: [[0, 0], [1, 1]],
    dy: [-3, 5],
    rows: {
      16: ['explodes', '15:checker dot×2', '15:checker dot×2', '17:checker dot', 'explodes', 'explodes', 'explodes', '18:checker', 'explodes'],
      17: ['explodes', '19:checker', 'explodes', 'explodes', 'explodes', '18:checker dot', '16:checker dot×2', '16:checker dot×2', 'explodes'],
    },
  },
];

export const targetById = Object.fromEntries(TARGETS.map((t) => [t.id, t]));

// The starting cells of one collision.
export function setup(target, dy, gap) {
  return MOON.map(([x, y]) => [x - gap, y]).concat(target.cells.map(([x, y]) => [x, y + dy]));
}

// '28:checker×4 freeship×2' -> { at: 28, kind: 'objects', objects: { checker: 4, freeship: 2 } }
export function parseOutcome(s) {
  if (s === 'explodes') return { at: null, kind: 'explodes', objects: {} };
  const [at, rest] = s.split(':');
  if (rest === 'nothing') return { at: +at, kind: 'nothing', objects: {} };
  const objects = {};
  for (const part of rest.split(' ')) {
    const [name, n] = part.split('×');
    objects[name] = n ? +n : 1;
  }
  return { at: +at, kind: 'objects', objects };
}

// Every collision as a flat list.
export function allCollisions() {
  const out = [];
  for (const t of TARGETS)
    for (const [gap, row] of Object.entries(t.rows))
      row.forEach((s, i) => out.push({ target: t, gap: +gap, dy: t.dy[0] + i, outcome: parseOutcome(s) }));
  return out;
}

const NAMES = {
  dot: ['dot', 'dots'], checker: ['checker', 'checkers'], moon: ['moon', 'moons'], freeship: ['free ship', 'free ships'],
  monster: ['monster', 'monsters'], anchor: ['anchor', 'anchors'], lever: ['lever', 'levers'], radar: ['radar', 'radars'],
  ant: ['ant', 'ants'], puffer: ['double dot puffer', 'double dot puffers'],
};
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];

// Short label for the atlas, e.g. "2 free ships, 4 checkers"
export function shortLabel(o) {
  if (o.kind === 'explodes') return 'explodes';
  if (o.kind === 'nothing') return 'nothing';
  return Object.entries(o.objects).sort((a, b) => order(a[0]) - order(b[0]))
    .map(([k, n]) => `${n} ${NAMES[k][n > 1 ? 1 : 0]}`).join(', ');
}

const order = (k) => ['puffer', 'monster', 'freeship', 'moon', 'anchor', 'lever', 'radar', 'ant', 'checker', 'dot'].indexOf(k);

// The objects in words, biggest first: "a moon and two dots"
export function phrase(objects) {
  const parts = Object.entries(objects).sort((a, b) => order(a[0]) - order(b[0]))
    .map(([k, n]) => `${n === 1 ? (/^[aeiou]/.test(NAMES[k][0]) ? 'an' : 'a') : WORDS[n]} ${NAMES[k][n > 1 ? 1 : 0]}`);
  return parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts.at(-1) : parts[0];
}

// A sentence describing the result. The special cases are tested facts: the monster
// is the period-19 oscillator; the free ships fly up and down, at right angles to the
// moons; a lone checker left over has been knocked exactly four rows across.
export function sentence(o, target) {
  if (o.kind === 'explodes') return 'It explodes into the light-speed diamond, still growing when it leaves the frame.';
  if (o.kind === 'nothing') return 'Both moons die on the spot. Nothing at all is left.';
  const ob = o.objects, keys = Object.keys(ob);
  if (keys.length === 1 && ob.monster === 1) return `The two moons fuse into a monster, the period-19 oscillator, by generation ${o.at}.`;
  if (ob.freeship === 2) return `Two free ships are born and fly off at right angles to the moons, up and down, leaving ${WORDS[ob.checker]} checkers behind. Separate by generation ${o.at}.`;
  if (target === 'checker' && keys.length === 1 && ob.checker === 1) return `The checker swallows the moon whole and is knocked four rows across. Done by generation ${o.at}.`;
  return `It settles into ${phrase(ob)} by generation ${o.at}.`;
}
