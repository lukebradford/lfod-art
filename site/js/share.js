// share.js: a beginning in the hero, as a URL fragment. The fragment holds nothing but
// cells: `#rle=<RLE body>`, e.g. `#rle=2o$bo!`. Position is not kept (the hero centres
// whatever it loads), so a link means "this shape, from generation 0".
import { Pattern } from './lfod.js';

// Links longer than this are refused rather than truncated.
export const MAX_LINK = 4000;

// The fragment for a pattern ('' when empty), or null if it would be too long to share.
export function encodeHash(p) {
  if (!p.population) return '';
  const body = p.toRLE().split('\n')[1]; // the line after the header
  const h = '#rle=' + body;
  return h.length > MAX_LINK ? null : h;
}

// The pattern a fragment describes, normalised to its own top-left at (0, 0),
// or null if the fragment is not a valid, non-empty, reasonably sized beginning.
export function decodeHash(hash) {
  let h;
  try { h = decodeURIComponent(hash || ''); } catch { return null; }
  const m = /^#?rle=([0-9bo$!]+)$/.exec(h);
  if (!m || m[1].length > MAX_LINK) return null;
  // refuse run lengths that would describe an absurdly large box
  if (m[1].match(/\d+/g)?.some((n) => +n > 4096)) return null;
  const p = Pattern.fromRLE(m[1].endsWith('!') ? m[1] : m[1] + '!');
  if (!p.population || p.w > 4096 || p.h > 4096) return null;
  return new Pattern(0, 0, p.w, p.h, p.data, 0);
}
