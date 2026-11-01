// Diamonds: the smallest explosions. Every claim here is checked by
// tests/diamonds.test.mjs, which enumerates every way to place two or three cells near
// enough to interact (each cell within two of another, so they share a neighbour),
// counted once up to rotation and reflection, and runs each one.
//
// Two cells: 5 placements. Side by side they part into two free ships; touching at a
// corner they are a checker, blinking forever; one cell apart, in a row or on a
// diagonal, they vanish; a knight's move apart they explode, the only pair that does.
//
// Three cells: 31 placements, 21 of which explode. THREE lists those 21, each placed
// with its top-left at (0, 0).
//
// Every explosion is a diamond: no cell can be born two diagonal steps beyond the
// edge (it could have only one live neighbour, and birth needs two), so along the
// diagonals the edge advances at most one step of x + y per generation, while the tips
// can advance at the speed of light, one cell per generation. Every seed here reaches
// both limits early and holds them (tested through generation 600).

export const PAIRS = { placements: 5, explode: 1 };
export const TRIPLES = { placements: 31, explode: 21 };

export const KNIGHT = [[0, 0], [2, 1]];

export const THREE = [
  [[0, 0], [1, 2], [3, 4]], [[0, 0], [0, 2], [2, 4]], [[0, 0], [2, 2], [1, 4]],
  [[0, 0], [1, 1], [3, 3]], [[0, 0], [0, 1], [2, 3]], [[0, 0], [2, 2], [1, 3]],
  [[0, 0], [2, 1], [0, 3]], [[0, 0], [0, 1], [2, 2]], [[0, 0], [1, 2], [3, 3]],
  [[0, 0], [0, 2], [2, 3]], [[0, 0], [2, 1], [1, 3]], [[0, 0], [1, 2], [2, 4]],
  [[0, 0], [1, 1], [2, 3]], [[0, 0], [2, 1], [1, 2]], [[0, 0], [2, 0], [1, 2]],
  [[0, 0], [0, 1], [1, 3]], [[0, 0], [0, 1], [1, 2]], [[0, 0], [0, 1], [2, 1]],
  [[0, 0], [0, 2], [1, 3]], [[0, 0], [1, 1], [0, 2]], [[0, 0], [0, 1], [1, 1]],
];

// The fraction of the diamond (the area |x| + |y| ≤ r inside the growing box) that is
// alive stays between these bounds for every seed (tested at generations 300 and 600).
export const DENSITY = [0.19, 0.24];
