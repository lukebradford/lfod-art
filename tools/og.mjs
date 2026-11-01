// Renders site/og.png (1200x630 social preview): the monster (p19) at its fullest phase,
// simulated by the shipped engine. Usage: node tools/og.mjs
import zlib from 'node:zlib';
import fs from 'node:fs';
import { Pattern } from '../site/js/lfod.js';
import { byId } from '../site/js/catalog.js';

const W = 1200, H = 630;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const PAPER = hex('#fbfaf6'), INK = hex('#141414'), GHOST = hex('#e8e5dc'), DOT = hex('#dedad0');

// pick the phase with the largest population
let p = Pattern.fromRLE(byId.monster.rle), best = p, prevBest = null, prev = null;
for (let g = 0; g < byId.monster.period; g++) {
  if (p.population > best.population) { best = p; prevBest = prev; }
  prev = p; p = p.next();
}
const img = new Uint8Array(W * H * 3);
const fill = (x, y, w, h, c) => {
  for (let j = Math.max(0, y); j < Math.min(H, y + h); j++)
    for (let i = Math.max(0, x); i < Math.min(W, x + w); i++) img.set(c, (j * W + i) * 3);
};
fill(0, 0, W, H, PAPER);
const cs = 30, inset = 2;
// hull of the monster is centred on the seed's centre (1.5, 1) + half a cell
const ox = Math.round(W / 2 - 2 * cs), oy = Math.round(H / 2 - 1.5 * cs);
for (let y = -12; y < 14; y++) for (let x = -22; x < 24; x++) fill(ox + x * cs - 1, oy + y * cs - 1, 2, 2, DOT);
if (prevBest) for (const [x, y] of prevBest.cells()) if (!best.get(x, y)) fill(ox + x * cs + inset, oy + y * cs + inset, cs - 2 * inset, cs - 2 * inset, GHOST);
for (const [x, y] of best.cells()) fill(ox + x * cs + inset, oy + y * cs + inset, cs - 2 * inset, cs - 2 * inset, INK);

// encode PNG (RGB, no filter)
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; Buffer.from(img.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1); }
const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2;
fs.writeFileSync(new URL('../site/og.png', import.meta.url), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
console.log('wrote site/og.png, monster phase gen', best.gen, 'pop', best.population);
