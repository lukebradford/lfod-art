// Exhaustive small-pattern search for B2/S0 using the shipped engine.
// Usage: node tools/search.mjs W H maxPop maxGen
import { Pattern } from '../site/js/lfod.js';

const [W = 4, H = 4, maxPop = 16, maxGen = 120] = process.argv.slice(2).map(Number);

function canon(p) {
  // canonical key under the 8 symmetries of the square
  const cells = p.cells();
  const keys = [];
  const T = [
    ([x, y]) => [x, y], ([x, y]) => [-x, y], ([x, y]) => [x, -y], ([x, y]) => [-x, -y],
    ([x, y]) => [y, x], ([x, y]) => [-y, x], ([x, y]) => [y, -x], ([x, y]) => [-y, -x],
  ];
  for (const t of T) keys.push(Pattern.fromCells(cells.map(t)).shapeKey());
  keys.sort();
  return keys[0];
}

const found = new Map(); // canon -> {kind, period, dx, dy, pop, rle, seedCount}
const N = W * H;
let tested = 0;
for (let mask = 1; mask < 1 << N; mask++) {
  let pop = 0;
  for (let m = mask; m; m &= m - 1) pop++;
  if (pop > maxPop) continue;
  const cells = [];
  for (let i = 0; i < N; i++) if (mask & (1 << i)) cells.push([i % W, (i / W) | 0]);
  let p = Pattern.fromCells(cells);
  if (p.w !== W && p.h !== H) continue; // dedupe translations roughly: require touching far edge in one dim
  if (p.x0 !== 0 || p.y0 !== 0) continue;
  tested++;
  const seen = new Map();
  for (let g = 0; g <= maxGen; g++) {
    if (p.population === 0) break;
    if (p.w > 40 || p.h > 40) break;
    const k = p.shapeKey();
    const prev = seen.get(k);
    if (prev) {
      const period = g - prev.g, dx = p.x0 - prev.x, dy = p.y0 - prev.y;
      const kind = dx || dy ? 'ship' : period === 1 ? 'still' : 'osc';
      if (kind !== 'still' || p.population > 1) {
        const c = canon(p) + `|${period}`;
        const e = found.get(c);
        if (!e) found.set(c, { kind, period, dx, dy, pop: p.population, rle: p.toRLE(), n: 1, seed: cells });
        else e.n++;
      }
      break;
    }
    seen.set(k, { g, x: p.x0, y: p.y0 });
    p = p.next();
  }
}
console.log('tested', tested);
const list = [...found.values()].filter((e) => e.kind === "ship" || e.period > 2).sort((a, b) => a.kind.localeCompare(b.kind) || a.period - b.period || a.pop - b.pop);
for (const e of list.slice(0, 80)) console.log(e.kind, 'p' + e.period, `d=(${e.dx},${e.dy})`, 'pop', e.pop, 'seeds', e.n, '\n' + e.rle);
console.log('stills', [...found.values()].filter((e) => e.kind === 'still').length);
