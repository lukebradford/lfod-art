// Four cells: every way to place four cells close enough to meet (each within two of
// another, so they share a neighbour), counted once up to rotation and reflection,
// and what becomes of each. Every claim here is checked by tests/four.test.mjs, which
// enumerates the placements independently and runs every one.
//
// 430 placements. 360 explode into the diamond (same standard as the Diamonds
// section). The other 70 are listed here in full: 44 settle into named objects
// (SETTLE) and 26 vanish (VANISH).
//
// SETTLE entries are [cells, outcome], with the outcome in the collision atlas's
// notation, 'at:objects': at generation `at` the pattern is exactly those objects,
// far enough apart never to meet again (and it is not yet so at `at - 1`). At `at = 0`
// the four cells already are the object: the moon, an anchor, a lever or a radar.
// VANISH entries are [cells, the generation at which the last cell dies].
//
// Cells are placed with their top-left at (0, 0). Moving things travel where the
// physics sends them; nothing here is turned to face right.

export const QUADS = { placements: 430, explode: 360 };

export const SETTLE = [
  [[[0, 0], [1, 1], [1, 2], [0, 3]], '0:moon'],
  [[[0, 0], [1, 2], [1, 3], [0, 5]], '2:moon dot×2'],
  [[[0, 0], [1, 0], [0, 2], [1, 2]], '13:freeship×2'],
  [[[0, 0], [0, 2], [2, 2], [1, 3]], '16:freeship×2'],
  [[[0, 0], [2, 0], [0, 2], [2, 3]], '16:freeship×2'],
  [[[0, 0], [1, 1], [2, 3], [4, 4]], '16:freeship×2'],
  [[[0, 0], [2, 0], [0, 2], [2, 4]], '18:freeship×2'],
  [[[0, 0], [2, 2], [0, 4], [1, 5]], '19:freeship×2'],
  [[[0, 0], [2, 1], [0, 3], [2, 4]], '16:freeship×2 checker×4'],
  [[[0, 0], [1, 1], [1, 3], [0, 4]], '0:anchor'],
  [[[0, 0], [0, 2], [1, 2], [0, 4]], '1:anchor'],
  [[[1, 0], [0, 1], [2, 3], [1, 4]], '0:lever'],
  [[[0, 0], [0, 2], [2, 2], [2, 4]], '2:lever'],
  [[[1, 0], [0, 1], [3, 2], [2, 3]], '0:radar'],
  [[[0, 0], [2, 2], [3, 3], [5, 5]], '5:radar'],
  [[[0, 0], [1, 2], [1, 3], [3, 5]], '2:checker dot×3'],
  [[[0, 0], [1, 2], [0, 4], [2, 6]], '7:checker dot'],
  [[[0, 0], [0, 2], [2, 4], [4, 4]], '2:checker'],
  [[[0, 0], [1, 1], [3, 2], [0, 3]], '4:checker'],
  [[[0, 0], [3, 1], [2, 2], [1, 3]], '4:checker'],
  [[[0, 0], [1, 2], [3, 3], [0, 4]], '8:checker'],
  [[[0, 0], [0, 2], [2, 3], [4, 5]], '9:checker'],
  [[[0, 0], [1, 1], [0, 2], [3, 2]], '10:checker'],
  [[[0, 0], [0, 2], [0, 3], [0, 5]], '2:dot×4'],
  [[[0, 0], [2, 2], [2, 3], [4, 5]], '2:dot×4'],
  [[[0, 0], [0, 1], [0, 3], [0, 5]], '6:dot×4'],
  [[[0, 0], [0, 2], [0, 4], [2, 4]], '2:dot×2'],
  [[[0, 0], [0, 2], [2, 3], [0, 5]], '2:dot×2'],
  [[[0, 0], [0, 2], [3, 2], [1, 3]], '2:dot×2'],
  [[[0, 0], [0, 2], [2, 3], [2, 5]], '2:dot×2'],
  [[[0, 0], [2, 2], [0, 3], [2, 5]], '2:dot×2'],
  [[[0, 0], [0, 2], [0, 3], [2, 5]], '4:dot×2'],
  [[[0, 0], [0, 2], [0, 4], [1, 5]], '5:dot×2'],
  [[[0, 0], [1, 1], [0, 3], [1, 4]], '5:dot×2'],
  [[[0, 0], [2, 0], [3, 1], [1, 3]], '6:dot×2'],
  [[[0, 0], [0, 2], [3, 3], [2, 4]], '6:dot×2'],
  [[[0, 0], [0, 1], [0, 2], [1, 4]], '7:dot×2'],
  [[[0, 0], [1, 2], [3, 2], [1, 4]], '11:dot×2'],
  [[[0, 0], [2, 0], [0, 2], [1, 3]], '2:dot'],
  [[[0, 0], [0, 2], [1, 4], [3, 4]], '2:dot'],
  [[[0, 0], [0, 1], [0, 2], [1, 3]], '3:dot'],
  [[[0, 0], [0, 1], [1, 1], [0, 3]], '4:dot'],
  [[[0, 0], [1, 1], [3, 2], [1, 4]], '4:dot'],
  [[[0, 0], [2, 2], [0, 4], [4, 4]], '11:dot'],
];

export const VANISH = [
  [[[0, 0], [0, 2], [1, 3], [3, 3]], 2],
  [[[0, 0], [2, 0], [0, 2], [2, 2]], 2],
  [[[0, 0], [0, 1], [0, 2], [0, 3]], 3],
  [[[0, 0], [0, 1], [1, 1], [0, 2]], 3],
  [[[1, 0], [0, 1], [2, 1], [1, 2]], 3],
  [[[0, 0], [1, 1], [2, 2], [3, 3]], 4],
  [[[0, 0], [2, 2], [3, 2], [2, 3]], 4],
  [[[1, 0], [0, 2], [2, 2], [1, 4]], 4],
  [[[2, 0], [0, 2], [4, 2], [2, 4]], 4],
  [[[0, 0], [0, 1], [2, 1], [0, 2]], 6],
  [[[0, 0], [1, 1], [2, 1], [0, 2]], 6],
  [[[0, 0], [0, 2], [4, 2], [2, 4]], 6],
  [[[0, 0], [1, 1], [2, 1], [1, 2]], 6],
  [[[1, 0], [0, 1], [2, 1], [1, 3]], 6],
  [[[0, 0], [0, 2], [0, 4], [0, 6]], 7],
  [[[0, 0], [2, 0], [1, 2], [1, 4]], 7],
  [[[0, 0], [0, 2], [2, 3], [3, 4]], 7],
  [[[1, 0], [0, 1], [3, 1], [1, 3]], 7],
  [[[1, 0], [0, 2], [3, 2], [1, 4]], 7],
  [[[0, 0], [0, 1], [0, 2], [2, 2]], 8],
  [[[0, 0], [0, 2], [2, 2], [0, 4]], 8],
  [[[0, 0], [1, 1], [0, 2], [2, 2]], 8],
  [[[0, 0], [0, 2], [1, 3], [3, 5]], 8],
  [[[0, 0], [1, 2], [2, 2], [0, 4]], 8],
  [[[0, 0], [1, 1], [2, 2], [4, 4]], 9],
  [[[0, 0], [2, 2], [4, 4], [6, 6]], 9],
];
