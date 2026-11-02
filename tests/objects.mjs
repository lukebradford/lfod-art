// Shared by the tests (not itself a test file): identify debris as named objects.
// Used by the collisions, diamonds, four- and five-cell tests and tools/five.mjs.
import { Pattern, Field } from '../site/js/lfod.js';
import { byId, PUFFERS } from '../site/js/catalog.js';

// every phase, in all eight orientations, of the named objects debris can contain
export const orient = (cells, f, r) => cells.map(([x, y]) => {
  if (f) x = -x;
  for (let i = 0; i < r; i++) [x, y] = [-y, x];
  return [x, y];
});
export const NAMED = ['dot', 'checker', 'moon', 'freeship', 'monster', 'lever', 'radar', 'anchor', 'ant'];
const KNOWN = new Map();
for (const id of NAMED) {
  const e = byId[id];
  let p = Pattern.fromRLE(e.rle);
  for (let g = 0; g < e.period; g++, p = p.next())
    for (const f of [0, 1]) for (let r = 0; r < 4; r++)
      KNOWN.set(Pattern.fromCells(orient(p.cells(), f, r)).shapeKey(), id);
}
export const identify = (cells) => KNOWN.get(Pattern.fromCells(cells).shapeKey());

// cells grouped by Chebyshev distance <= r (cells 3 or more apart cannot interact in one step)
export function groups(cells, r) {
  const key = (x, y) => x + ',' + y;
  const at = new Map(cells.map((c) => [key(...c), c]));
  const seen = new Set(), out = [];
  for (const c of cells) {
    if (seen.has(key(...c))) continue;
    seen.add(key(...c));
    const g = [], stack = [c];
    while (stack.length) {
      const [x, y] = stack.pop();
      g.push([x, y]);
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const k = key(x + dx, y + dy);
        if (at.has(k) && !seen.has(k)) { seen.add(k); stack.push(at.get(k)); }
      }
    }
    out.push(g);
  }
  return out;
}

// Split p into named objects that never interact for the next `horizon` generations
// (checked by running each piece alone and comparing the union with the whole).
// Returns [{ name, cells }] or null.
export function decompose(p, horizon = 150) {
  const near = groups(p.cells(), 2);
  const unknown = near.filter((g) => !identify(g));
  // a free ship's spark can sit more than 2 cells from its body, alone, looking like a
  // dot: a lone cell within 6 of an unidentified piece goes with the pieces, not the dots
  const far = (g) => g.length > 1 || !unknown.some((u) => u.some(([x, y]) =>
    Math.max(Math.abs(x - g[0][0]), Math.abs(y - g[0][1])) <= 6));
  const named = near.filter((g) => identify(g) && far(g));
  const rest = near.filter((g) => !named.includes(g)).flat();
  const pieces = named.concat(rest.length ? groups(rest, 6) : []);
  if (!pieces.every((g) => identify(g))) return null;
  let whole = p, parts = pieces.map((g) => Pattern.fromCells(g));
  for (let k = 0; k < horizon; k++) { whole = whole.next(); parts = parts.map((q) => q.next()); }
  const union = new Set(parts.flatMap((q) => q.cells().map((c) => c.join())));
  const w = whole.cells().map((c) => c.join());
  if (w.length !== union.size || !w.every((c) => union.has(c))) return null;
  return pieces.map((cells) => ({ name: identify(cells), cells }));
}

export const tally = (pieces) => {
  const t = {};
  for (const { name } of pieces) t[name] = (t[name] || 0) + 1;
  return t;
};

// --- placements: every set of n cells, each within two of another, up to symmetry ---
const SYM = [
  ([x, y]) => [x, y], ([x, y]) => [-x, y], ([x, y]) => [x, -y], ([x, y]) => [-x, -y],
  ([x, y]) => [y, x], ([x, y]) => [-y, x], ([x, y]) => [y, -x], ([x, y]) => [-y, -x],
];
export const norm = (cells) => {
  const mx = Math.min(...cells.map((c) => c[0])), my = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
};
export const canon = (cells) => SYM.map((t) => JSON.stringify(norm(cells.map(t)))).sort()[0];
const near = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) <= 2;
function interacting(cells) {
  const seen = new Set([0]), stack = [0];
  while (stack.length) {
    const i = stack.pop();
    cells.forEach((c, j) => { if (!seen.has(j) && near(cells[i], c)) { seen.add(j); stack.push(j); } });
  }
  return seen.size === cells.length;
}
export function placements(n) {
  // brute force over a box big enough for any such set (span at most 2(n - 1))
  const S = 2 * (n - 1) + 1, out = new Map();
  const pick = (start, cells) => {
    if (cells.length === n) {
      if (cells.some((c) => c[0] === 0) && cells.some((c) => c[1] === 0) && interacting(cells)) {
        const k = canon(cells);
        if (!out.has(k)) out.set(k, JSON.parse(k));
      }
      return;
    }
    for (let i = start; i < S * S; i++) pick(i + 1, [...cells, [i % S, Math.floor(i / S)]]);
  };
  pick(0, []);
  return [...out.values()];
}

// Every placement of n cells, from every placement of n - 1: any such set has a cell
// whose removal leaves the rest still within reach of each other (a leaf of a spanning
// tree), so adding one cell within two of an (n - 1)-placement, in every way, finds all.
export function extend(smaller) {
  const out = new Map();
  for (const c of smaller) {
    const have = new Set(c.map((x) => x.join()));
    for (const [x, y] of c) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (have.has(`${x + dx},${y + dy}`)) continue;
      const k = canon([...c, [x + dx, y + dy]]);
      if (!out.has(k)) out.set(k, JSON.parse(k));
    }
  }
  return [...out.values()];
}

// The same explosion standard as the Diamonds, Collisions and Four cells sections:
// more than 4000 cells at generation 150, and at least 80 cells wider and taller 50
// generations later. (`from` moves the measurement later, for a slow starter.)
export function explodes(cells, from = 150) {
  const f = Field.around(Pattern.fromCells(cells), from + 60);
  for (let g = 0; g < from; g++) f.step();
  const a = f.bounds(), pop = f.population;
  for (let g = 0; g < 50; g++) f.step();
  const b = f.bounds();
  return pop > 4000 && (b.x1 - b.x0) - (a.x1 - a.x0) >= 80 && (b.y1 - b.y0) - (a.y1 - a.y0) >= 80;
}

// Does this beginning become the double dot puffer (p4, c) flying right, or two of them
// flying left and right? From generation `at`, for PUFF_PERIODS consecutive periods:
// each front advances exactly 4 cells; its 6 leading columns reappear exactly, shifted,
// and are a phase of the glossary's double dot puffer (up to a vertical flip); and every
// other cell is unchanged (the wake is frozen). Returns { at, n } with the earliest such
// `at` (so it is not yet true at `at - 1`), or null.
export const PUFF_PERIODS = 50;
const LEN = 6, P4 = 4;
const BODIES = new Set();
{
  const e = PUFFERS.find((x) => x.id === 'doubledot');
  let p = Pattern.fromRLE(e.rle);
  for (let g = 0; g < 8; g++, p = p.next()) for (const f of [1, -1]) BODIES.add(body(p.cells(), 1, f));
}
// the leading LEN columns of the front facing direction d (+1 right, -1 left), as a key
// relative to the front column and the window's top row, flipped vertically if f = -1
function body(cells, d, f) {
  const fx = d > 0 ? Math.max(...cells.map((c) => c[0])) : Math.min(...cells.map((c) => c[0]));
  const w = cells.filter(([x]) => (fx - x) * d < LEN).map(([x, y]) => [(fx - x) * d, y * f]);
  const my = Math.min(...w.map((c) => c[1]));
  return w.map(([x, y]) => `${x},${y - my}`).sort().join(';');
}
export function puffer(cells, maxAt = 160) {
  const gens = [Pattern.fromCells(cells)];
  const N = maxAt + P4 * PUFF_PERIODS + 1;
  for (let g = 1; g <= N; g++) {
    gens.push(gens[g - 1].next());
    if (gens[g].population > 2000) return null;
  }
  const key = (cells) => cells.map((c) => c.join()).sort().join(';');
  for (const n of [1, 2]) {
    const holds = (S) => {
      for (let k = 0; k < PUFF_PERIODS; k++) {
        const A = gens[S + P4 * k], B = gens[S + P4 * (k + 1)];
        const ca = A.cells(), cb = B.cells();
        const ra = A.x0 + A.w - 1, rb = B.x0 + B.w - 1, la = A.x0, lb = B.x0;
        if (rb - ra !== P4) return false;
        if (n === 2 ? la - lb !== P4 : la !== lb) return false;
        const inR = (x, r) => x > r - LEN, inL = (x, l) => n === 2 && x < l + LEN;
        if (key(cb.filter(([x]) => inR(x, rb))) !== key(ca.filter(([x]) => inR(x, ra)).map(([x, y]) => [x + P4, y]))) return false;
        if (n === 2 && key(cb.filter(([x]) => inL(x, lb))) !== key(ca.filter(([x]) => inL(x, la)).map(([x, y]) => [x - P4, y]))) return false;
        const mid = (x) => !inR(x, ra) && !inL(x, la);
        if (key(cb.filter(([x]) => mid(x))) !== key(ca.filter(([x]) => mid(x)))) return false;
        if (!BODIES.has(body(ca, 1, 1))) return false;
        if (n === 2 && !BODIES.has(body(ca, -1, 1))) return false;
      }
      return true;
    };
    for (let S = 0; S <= maxAt; S++) if (holds(S)) return { at: S, n };
  }
  return null;
}

// --- two dominoes ---------------------------------------------------------------------
// A vertical domino at (0, 0), (0, 1) parts into two free ships flying left and right.
// Put a second one with its top cell at (dx, dy). Compare the pair with each domino run
// alone. Returns:
//   'apart'              for all `horizon` generations the pair is exactly the union of
//                        the two dominoes run alone: they never touch
//   'explodes'           by the standard above, measured from 150 generations after the
//                        dominoes first touch (far apart, their ships meet late)
//   'at:nothing'         every cell is dead at generation `at` (and not at at - 1)
//   'at:objects'         at generation `at` (>= 12, when a lone domino has parted) the
//                        pattern is exactly the lone dominoes' ships that are still whole
//                        plus debris made of named objects, and all of these run on for
//                        150 generations exactly as they would alone; not yet so at at - 1
//                        (or at 12)
//   null                 none of these by `settle` generations after they touch (the
//                        caller must explain it)
export const DOMINO = [[0, 0], [0, 1]];
export const dominoPair = (dx, dy) => [...DOMINO, [dx, dy], [dx, dy + 1]];
const run = (p, n) => { for (let i = 0; i < n; i++) p = p.next(); return p; };
const sameCells = (p, set) => p.population === set.size && p.cells().every((c) => set.has(c.join()));
const RANK = ['monster', 'freeship', 'moon', 'anchor', 'lever', 'radar', 'ant', 'checker', 'dot'];

export function dominoOutcome(dx, dy, { horizon = 200, settle = 100 } = {}) {
  const cells = dominoPair(dx, dy);
  const J = [Pattern.fromCells(cells)], A = [Pattern.fromCells(DOMINO)], B = [Pattern.fromCells([[dx, dy], [dx, dy + 1]])];
  const apart = (g) => sameCells(J[g], new Set([...A[g].cells(), ...B[g].cells()].map((c) => c.join())));
  let touch = -1, big = false;
  for (let g = 0; ; g++) {
    if (touch < 0 && !apart(g)) touch = g;
    if (J[g].population > 300) { big = true; break; }
    if (g >= (touch < 0 ? horizon : touch + settle + 150)) break;
    J.push(J[g].next()); A.push(A[g].next()); B.push(B[g].next());
  }
  if (touch < 0) return 'apart';
  if (big) {
    if (explodes(cells, touch + 150)) return 'explodes';
    throw new Error(`large but not explosive: ${dx}, ${dy}`);
  }
  const gone = J.findIndex((q) => !q.population);
  if (gone >= 0) return `${gone}:nothing`;
  // nothing before they touch can be the final result (the lone ships are about to meet)
  for (let g = Math.max(12, touch); g <= touch + settle; g++) {
    const have = new Set(J[g].cells().map((c) => c.join()));
    // each lone domino's two ships (left and right of its own column)
    const ships = [];
    for (const [q, x] of [[A[g], 0], [B[g], dx]]) {
      const cs = q.cells();
      ships.push(cs.filter((c) => c[0] < x), cs.filter((c) => c[0] > x));
    }
    if (ships.some((s) => !s.length)) throw new Error('a lone domino has not parted');
    const whole = ships.filter((s) => s.every((c) => have.has(c.join())));
    const taken = new Set(whole.flat().map((c) => c.join()));
    const rest = J[g].cells().filter((c) => !taken.has(c.join()));
    const debris = rest.length ? decompose(Pattern.fromCells(rest), 150) : [];
    if (!debris) continue;
    const parts = [...whole.map((s) => run(Pattern.fromCells(s), 150)), ...debris.map((d) => run(Pattern.fromCells(d.cells), 150))];
    if (!sameCells(J[g + 150], new Set(parts.flatMap((q) => q.cells().map((c) => c.join()))))) continue;
    const t = tally(debris);
    if (whole.length) t.freeship = (t.freeship || 0) + whole.length;
    const names = Object.keys(t).sort((p, q) => RANK.indexOf(p) - RANK.indexOf(q));
    return `${g}:` + names.map((n) => (t[n] > 1 ? `${n}×${t[n]}` : n)).join(' ');
  }
  return null;
}

// --- two free ships abreast -----------------------------------------------------------
// The ships and placements are defined in site/js/abreast.js (shared with the page).
export { SHIP, SHIP_E, SHIP_DY, shipB, shipPair } from '../site/js/abreast.js';
import { SHIP, shipB, shipPair } from '../site/js/abreast.js';
const shiftKey = (p, sx) => p.cells().map(([x, y]) => `${x + sx},${y}`).sort().join(';');
const keyOf = (p) => shiftKey(p, 0);

// What two free ships abreast become. Returns null if their cells overlap, else one of
//   { kind: 'apart' }        for 7 generations the pair is exactly the two ships run
//                            alone, so (both being back where they started, 6 cells on)
//                            they never touch
//   { kind: 'explodes' }     the standard above
//   { kind: 'nothing', at }  every cell dead at `at`, not at at - 1
//   { kind: 'flotilla', at } from `at` (not at - 1) the whole pattern repeats every 6
//                            generations, 6 cells further on, which (the rule being
//                            deterministic) means forever; and it is not the two halves
//                            flying independently (`bound`)
//   { kind: 'objects', at, objects } at `at` (not at - 1) the pattern decomposes into
//                            named objects that run on for 150 generations as if alone
//   { kind: 'puffer', at, wake } from `at` (not at - 1), for PUFF_PERIODS periods of 6:
//                            the leading 20 columns reappear exactly 6 cells on, every
//                            other cell is unchanged; `wake` tallies what is laid down
//                            per period (each piece a dot or checker)
// or throws if none of these holds (the caller must explain it).
export function shipPairOutcome(ph, e, dy, { horizon = 400 } = {}) {
  const cells = shipPair(ph, e, dy);
  const p0 = Pattern.fromCells(cells);
  if (p0.population !== SHIP[0].length + SHIP[ph].length) return null;
  {
    let J = p0, A = Pattern.fromCells(SHIP[0]), B = Pattern.fromCells(shipB(ph, e, dy));
    let touch = false;
    for (let g = 0; g <= 6 && !touch; g++) {
      if (!sameCells(J, new Set([...A.cells(), ...B.cells()].map((c) => c.join())))) touch = true;
      J = J.next(); A = A.next(); B = B.next();
    }
    if (!touch) return { kind: 'apart' };
  }
  const G = [p0];
  for (let g = 1; g <= horizon + 6 * PUFF_PERIODS + 6; g++) {
    G.push(G[g - 1].next());
    if (G[g].population > 600) {
      if (explodes(cells)) return { kind: 'explodes' };
      throw new Error(`large but not explosive: ${ph} ${e} ${dy}`);
    }
  }
  const gone = G.findIndex((q) => !q.population);
  if (gone >= 0) return { kind: 'nothing', at: gone };
  // named objects, each running on as if alone
  if (decompose(G[horizon], 150)) {
    for (let g = 1; g <= horizon; g++) {
      const d = decompose(G[g], 150);
      if (d) return { kind: 'objects', at: g, objects: tally(d) };
    }
  }
  // a flotilla: periodic with displacement (6, 0); find the first generation it holds
  const per = (g) => G[g + 6].population === G[g].population && keyOf(G[g + 6]) === shiftKey(G[g], 6);
  if (per(horizon)) {
    let at = horizon;
    while (at > 0 && per(at - 1)) at--;
    return { kind: 'flotilla', at, bound: bound(G[at]) };
  }
  // a puffer
  const LEN = 20;
  const pufAt = (S) => {
    for (let k = 0; k < PUFF_PERIODS; k++) {
      const a = G[S + 6 * k], b = G[S + 6 * k + 6];
      const ra = a.x0 + a.w - 1, rb = b.x0 + b.w - 1;
      if (rb - ra !== 6) return false;
      const ca = a.cells(), cb = b.cells();
      const k1 = (cs) => cs.map((c) => c.join()).sort().join(';');
      if (k1(cb.filter(([x]) => x > rb - LEN)) !== k1(ca.filter(([x]) => x > ra - LEN).map(([x, y]) => [x + 6, y]))) return false;
      if (k1(cb.filter(([x]) => x <= ra - LEN)) !== k1(ca.filter(([x]) => x <= ra - LEN))) return false;
    }
    return true;
  };
  if (pufAt(horizon)) {
    let at = horizon;
    while (at > 0 && pufAt(at - 1)) at--;
    // what is laid down in one period, well behind the front
    const a = G[horizon], b = G[horizon + 6], ra = a.x0 + a.w - 1;
    const band = (q, lo) => q.cells().filter(([x]) => x > lo - 6 && x <= lo);
    const laid = band(b, ra - LEN), before = new Set(band(a, ra - LEN - 6).map((c) => `${c[0] + 6},${c[1]}`));
    // the wake repeats every 6 columns? record the cells of one 6-column band
    const wake = tally(groups(laid, 1).map((c) => ({ name: identify(c) || '?' })));
    return { kind: 'puffer', at, wake, repeats: laid.every((c) => before.has(c.join())) && laid.length === before.size };
  }
  throw new Error(`unclassified: ${ph} ${e} ${dy}`);
}
// a flotilla is bound if splitting it into its upper and lower halves (by the empty row
// between them) and running each alone does not give the same next 6 generations
function bound(p) {
  const rows = new Set(p.cells().map((c) => c[1]));
  let cut = null;
  for (let y = p.y0 + 1; y < p.y0 + p.h - 1; y++) if (!rows.has(y)) { cut = y; break; }
  if (cut === null) return true;
  let J = p, U = Pattern.fromCells(p.cells().filter((c) => c[1] < cut)), L = Pattern.fromCells(p.cells().filter((c) => c[1] > cut));
  for (let g = 0; g < 6; g++) {
    J = J.next(); U = U.next(); L = L.next();
    if (!sameCells(J, new Set([...U.cells(), ...L.cells()].map((c) => c.join())))) return true;
  }
  return false;
}

// The OUT notation for a ship pair outcome: 'at:objects' (as in the collision atlas, free
// ships first), 'at:nothing', 'at:flotilla' or 'at:puffer'.
export function shipPairCode(o) {
  if (o.kind === 'nothing' || o.kind === 'flotilla' || o.kind === 'puffer') return `${o.at}:${o.kind}`;
  const order = ['freeship', 'moon', 'checker', 'dot'];
  const names = Object.keys(o.objects).sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return `${o.at}:` + names.map((n) => (o.objects[n] > 1 ? `${n}×${o.objects[n]}` : n)).join(' ');
}

// --- two free ships head-on -----------------------------------------------------------
// The placements are defined in site/js/headon.js (shared with the page).
export { X0, T, headB, headPair } from '../site/js/headon.js';
import { headB, headPair } from '../site/js/headon.js';

// What two free ships flying at each other become. One of
//   { kind: 'apart' }        through generation 26 the pair is exactly the two ships run
//                            alone; by then they have passed (A's cells are in columns
//                            >= g - 6, B's <= X0 + 11 - g + 6, two or more empty
//                            columns apart), so they never touch
//   { kind: 'explodes' }     the standard above, measured from 150 generations after
//                            they first touch
//   { kind: 'nothing', at }  every cell dead at `at`, not at at - 1
//   { kind: 'objects', at, objects, through } at `at` (not at - 1) the pattern decomposes
//                            into named objects that run on for 150 generations as if
//                            alone. `through`: both ships are still there at `at`,
//                            exactly where and as they would be had they never met
// or throws (the caller must explain it). `touch` is the first generation the pair
// differs from the two ships run alone.
export function headOnOutcome(ph, t, dy, { settle = 200 } = {}) {
  const cells = headPair(ph, t, dy);
  const J = [Pattern.fromCells(cells)], A = [Pattern.fromCells(SHIP[0])], B = [Pattern.fromCells(headB(ph, t, dy))];
  let touch = -1;
  for (let g = 0; ; g++) {
    if (touch < 0 && !sameCells(J[g], new Set([...A[g].cells(), ...B[g].cells()].map((c) => c.join())))) touch = g;
    if (touch < 0 && g >= 26) return { kind: 'apart' };
    if (J[g].population > 600) {
      if (explodes(cells, touch + 150)) return { kind: 'explodes', touch };
      throw new Error(`large but not explosive: ${ph} ${t} ${dy}`);
    }
    if (touch >= 0 && g >= touch + settle + 150) break;
    J.push(J[g].next()); A.push(A[g].next()); B.push(B[g].next());
  }
  const gone = J.findIndex((q) => !q.population);
  if (gone >= 0) return { kind: 'nothing', at: gone, touch };
  for (let g = touch; g <= touch + settle; g++) {
    const d = decompose(J[g], 150);
    if (!d) continue;
    const have = new Set(J[g].cells().map((c) => c.join()));
    const through = [A[g], B[g]].every((q) => q.cells().every((c) => have.has(c.join())));
    return { kind: 'objects', at: g, objects: tally(d), through, touch };
  }
  throw new Error(`unclassified: ${ph} ${t} ${dy}`);
}
