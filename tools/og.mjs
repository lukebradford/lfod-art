// Renders site/og.png (1200x630 social preview): two cells a knight's move apart,
// 140 generations into their explosion, simulated by the shipped engine and drawn in
// the site's colours (red: survived; ink: newborn; pale: just died).
// Usage: node tools/og.mjs
import zlib from 'node:zlib';
import fs from 'node:fs';
import { Pattern, Field } from '../site/js/lfod.js';
import { KNIGHT } from '../site/js/diamonds.js';

const W = 1200, H = 630, GEN = 140, cs = 2;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const PAPER = hex('#fbfaf6'), INK = hex('#141414'), FREE = hex('#c0391f'), GHOST = hex('#e8e5dc');

const f = Field.around(Pattern.fromCells(KNIGHT), GEN + 4);
for (let g = 0; g < GEN; g++) f.step();
const img = new Uint8Array(W * H * 3);
const fill = (x, y, w, h, c) => {
  for (let j = Math.max(0, y); j < Math.min(H, y + h); j++)
    for (let i = Math.max(0, x); i < Math.min(W, x + w); i++) img.set(c, (j * W + i) * 3);
};
fill(0, 0, W, H, PAPER);
const b = f.bounds();
const ox = Math.round(W / 2 - ((b.x0 + b.x1 + 1) / 2) * cs), oy = Math.round(H / 2 - ((b.y0 + b.y1 + 1) / 2) * cs);
for (let y = b.y0 - 1; y <= b.y1 + 1; y++)
  for (let x = b.x0 - 1; x <= b.x1 + 1; x++) {
    const c = f.get(x, y), p = f.getPrev(x, y);
    if (c || p) fill(ox + x * cs, oy + y * cs, cs, cs, c ? (p ? FREE : INK) : GHOST);
  }

// encode PNG (RGB, no filter)
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; Buffer.from(img.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1); }
const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2;
fs.writeFileSync(new URL('../site/og.png', import.meta.url), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
console.log('wrote site/og.png: knight explosion, gen', f.gen, 'pop', f.population);
