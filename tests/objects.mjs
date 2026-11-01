// Shared by the tests (not itself a test file): identify debris as named objects.
// Used by collisions.test.mjs and four.test.mjs.
import { Pattern } from '../site/js/lfod.js';
import { byId } from '../site/js/catalog.js';

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
  const named = near.filter((g) => identify(g));
  const rest = near.filter((g) => !identify(g)).flat();
  // a free ship's spark can sit more than 2 cells from its body
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
