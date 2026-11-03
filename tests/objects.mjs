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
