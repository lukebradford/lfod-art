# Journal

The project's running memory: its vision, a backlog, and a log of each session.
Every "Continue" session reads this first and updates it last.

## Vision

**Live Free or Die is a universe about solitude.** A cell survives only if it is
alone; life appears only where exactly two cells meet. The site should feel like a
quiet sheet of warm paper on which this strange physics plays out exactly, with
nothing faked, and should slowly become an atlas of the universe: its objects, its
speeds, its collisions, its explosions, and the fragile structures that hold.

Design language (established in session 1):
- Warm paper `#fbfaf6`, ink `#141414`, faint graph-paper dots at cell corners.
- **Red marks freedom**: a cell drawn red survived the previous generation, which in
  B2/S0 means it had no neighbours at all. Newborn cells are ink. Cells that just
  died leave a pale ghost for one generation. This colour coding is the site's
  signature and should stay consistent everywhere.
- Serif text (system Palatino/Iowan/Georgia), monospace for data. No web fonts.
- Every animation shows a generation counter; restarts are visible (counter → 0).
- Everything is simulated on an unbounded plane (`Pattern`), never a torus, unless a
  piece says otherwise. If something grows too big to follow, we stop and say so.

Session 2 found a second motif: **the wake**. Puffers fly at c and leave behind
almost nothing but dots, the universe's one still life, so their trails are rows of
red (free) cells: lattices of solitude, a different weave for every period. Wide
strips moving in lockstep at the speed of light became a new visual form for the site
alongside square cards.

Session 3 found a third: **the collision**. Light-speed things can't chase each
other, only meet, and every meeting either resolves into a handful of named objects
or explodes. Two moons can annihilate, fuse into a monster, or throw off two free
ships at right angles. The collider is the site's first piece where the visitor
chooses what happens, with every choice backed by a test.

Session 4 found the fourth: **the diamond**. Most beginnings explode, and every
explosion is the same shape for a reason that can be proved in a sentence: the tips
can run at the speed of light, but the diagonal edges can't, because a cell two
diagonal steps out has only one neighbour that could be alive, and birth needs two.
Every small explosion reaches both limits at once. The motif is scale: one exact
universe at 16 px per cell and at half a pixel per cell, and a wall of all 21
three-cell explosions, no two alike. A bit-packed engine (`Field`) now makes
million-cell fields cheap.

Where it could go: an explorer/atlas of LFoD objects (searching larger boxes in a
Web Worker, live, in the visitor's browser); collision studies (moons hitting
dots, free ships hitting oscillators); a gallery of explosion "diamonds" seeded by
tiny patterns; a shareable-URL sandbox; perhaps the page itself slowly becoming a
LFoD field over the site's lifetime.

## Backlog

- **Search in the browser**: a Web Worker that enumerates patterns in a box and
  reports new oscillators/ships live, with the results as new bestiary entries.
- **More collisions**: moon vs moon at right angles (two offsets, so a 2-D atlas);
  free ship vs dot / checker / moon; moon vs anchor, ant, monster; moon vs a wake
  (does a moon fired into a dot trail eat it, or explode?). The test harness in
  `tests/collisions.test.mjs` (decompose into named objects + independence check) is
  reusable; move `decompose` into a shared module if the site ever needs it live.
- **Collider sandbox**: let visitors pick any offset/gap, not just the atlas, and
  compute the outcome live in a Worker using the same decomposition.
- **Moon guns?** Two moons offset by ±1 make two free ships. Can a stationary
  reaction be fed moons to make a gun, or a pair of free ships be turned back into moons?
- **Hero on `Field`**: the hero still uses `Pattern` and halts at 1.5M cells of box.
  Moving it to `Field` (growing the box when the guard ring fills) would let a
  visitor's explosion run far longer. Same for the collider's explosions.
- **Diamond anatomy**: the straight double lines along some edges, and the red rays
  of dots some explosions throw out along the axes, are visible but unexplained. Find
  what they are (a diagonal "crystal" growing at the edge's speed? puffers riding the
  tips?) and test it before naming them on the site.
- **Glossary pass**: before naming anything new, search `glossary.json` (and its
  images, for entries without RLE) — evil eyes was there all along.
- **Four cells**: enumerate the four-cell placements (a few hundred) and find the
  rare ones that do *not* explode. Which still lives, oscillators and ships appear?
- **Anchor track periods**: the glossary lists the first iterations' periods as
  12, 28, 124, 124, 252, 60. Extending the two-slot track by adding dot pairs 4
  cells apart gives 12, 28, 28, 124, 252, 60, 60 in our engine, so the glossary's
  iterations are probably built differently. Find the right construction (the
  collection's "Anchor track periods" file) before claiming the sequence.
- **More wakes**: nickel puffer (p5) and radar puffer did not verify with the simple
  front-zone test within 40 columns / 96 generations of settling; find out why (longer
  transient? a rake, whose debris moves?) before showing them. Rakes (free rake,
  nickel rake, tricycle rake, flip-flop rake) need a test that tracks the emitted ships.
  Trailers (dot eater, anchor eater) that consume a wake would make a lovely strip.
- **Wakes on the hero?** A puffer crossing the hero diagonally would be dramatic, but
  the hero is the monster's place. Perhaps a second, wide hero mode.
- Use more of the LFoD Universe collection (~/Dropbox/Code/lfod, data/glossary.json
  has 190 named entries, 143 with RLE): puffers, rakes, the moon laser, the anchor
  and ant stacks, the mantis, the six shooter. Every claim still gets a test.
- Show the short free ship, the c/2…c/5 ships and the moon laser gun (LifeWiki).
- Shareable hero state: encode placed cells in the URL hash (no personal data).
- Larger search: 5x5 all populations, 6x6 low population; look for slower ships
  (anything not at speed c?), longer periods, guns or puffers.
- Hero: let a long press drag-place several cells; keyboard access for placing cells.
- Accessibility: describe current hero state in text for screen readers.
- Consider an RSS/“what grew this session” changelog page drawn from the journal.

## Log

### 2026-11-01: Genesis
- Set up the repo, GitHub Pages hosting (deploys `site/` through GitHub Actions on
  every push to `main`, with tests gating the deploy), and `CLAUDE.md` describing the
  Continue loop and the precision requirements.
- Published a completely blank page, as the spec asks.

### 2026-11-01: Session 1, first mark
- **Engine** `site/js/lfod.js`: exact B2/S0 on an unbounded plane (`Pattern`, a
  self-trimming bounding box) plus a toroidal stepper, RLE in/out, and `classify()`
  (dies / still / oscillator / spaceship by direct simulation). Cross-checked in
  tests against an independent brute-force reference on random soups.
- **Search** `tools/search.mjs`: every pattern in a 4x4 box, and up to 7 cells in a
  5x5 box, run to its cycle. Findings: the lone cell is a still life; the diagonal
  pair blinks (p2); oscillators of period 4, 6, 12 and 19; a 4-cell spaceship at
  speed c (p1); and a domino (two cells) splits after 12 generations into two
  18-cell-phase, period-6 spaceships at speed c, flying apart forever.
  Random soups explode at the speed of light into a chaotic diamond at about 22%
  density (checked on a 200x200 torus and in the unbounded plane).
- **Site**: hero with the period-19 monster live and centred; visitors tap to place
  cells (usually setting off an explosion), with pause/step/restore, gen and cell
  counters, and an honest halt if the pattern outgrows 1.5M cells of bounding box.
  Then: the rule as three computed diagrams; "Two cells, parting" (the domino split,
  looping with a visible counter); and a bestiary of 8 objects whose every stated
  fact (kind, period, displacement, population range, hull, symmetry) is tested.
- Red-for-freedom colour coding, graph-paper dots, crisp integer-pixel cells, DPR
  aware, reduced-motion (starts paused), offscreen/hidden-tab pausing, one rAF clock
  that never skips generations.
- OG image (`site/og.png`) rendered from the engine by `tools/og.mjs`; SVG favicon.
- Fixed: `node --test tests/` does not work on Node 22 (treats the directory as a
  module); CI and CLAUDE.md now use `node --test tests/*.test.mjs`.
- **Names (follow-up the same session, at the owner's request)**: objects now carry
  their established names where verifiable: dot, checker (duoplet), monster (p19),
  moon (Catagolue `xq1_69`), free ship (`xq6_1owo1z128821`). Each card cites the
  source; apgcodes are decoded in tests and matched to the shown pattern by
  simulation. My first-draft names (Hermit, Flicker, Bloom, Courier, Herald) are
  retired. Bow (p4), Pinwheel (p6) and Rally (p12) stay as marked provisional names.
  LifeWiki and the forum are behind Cloudflare, so they were read via the browser.
- Note: LifeWiki's free ship infobox says 4 cells; simulation of its own apgcode
  gives 12–40 cells over the period. We show the simulated figures.
- **Names, resolved (same day)**: the owner pointed to the original pattern
  collection (`lukebradford/lfod`, glossary live at
  lukebradford.github.io/lfod/glossary.html). Matching its RLEs by simulation:
  Bow = **anchor**, Pinwheel = **ant** (Josh Ball), Rally = **two-slot anchor
  track**. Added the **lever** and **radar**, the other 4-cell p4 oscillators.
  Every card now links to its glossary entry, and tests check that each glossary
  RLE is a phase of the pattern shown. No provisional names remain. The glossary
  also confirms the free ship's minimum of 12 cells (LifeWiki's infobox says 4).

### 2026-11-01: Session 2, wakes
- **Bug fixed**: `Pattern.fromRLE` threw on `rule = s0/b2`, which is how the LFoD Universe
  collection (the rule's canonical source) writes the rule. It now accepts any
  spelling of B2/S0 (`B2/S0`, `S0/B2`, `b2/s0`, `0/2`) and still rejects other rules
  (`B2/S`, `S2/B0`, `B23/S0`, ...), tested in both directions. Glossary RLEs are now
  stored verbatim.
- **New section, "Wakes"**: seven puffers from the glossary, one per period: tricycle
  (p3, Josh Ball), double dot (p4, the smallest known puffer), revolver (p6), rake and
  bake (p7, the only known p7 object), scale (p8), arrow (p9) and zodiac (p12, Josh
  Ball). Each is a full-width strip whose camera moves with its puffer at exactly one
  cell per generation; one clock steps every strip, so all the wakes stream past
  together at the speed of light. Strips open with a trail already spanning the strip
  (the counter shows the real generation), and restart at that state after 1800
  generations (the counter jumps back). The whole trail is simulated, including the
  part out of view. Gen counters sit in each strip's header so they never cover the puffer.
- **What the tests prove** (`tests/puffers.test.mjs`, 31 tests): starting population
  as the glossary states; for 50 consecutive periods the front advances exactly one
  period's worth of cells, the rightmost `length` columns repeat exactly (shifted), and
  everything behind is frozen; the wake contains exactly N new dots (and, for the
  zodiac, 2 checkers) per period and nothing else; the rows ever occupied (used to
  size each strip so nothing is cropped); and the rake and bake's backward moon (an
  isolated moon at one generation, the same isolated moon one cell back at the next,
  every period). Note for future sessions: a front-zone test with a tiny zone passes
  trivially, because the two-cell nose alone moves at c. The frozen-wake condition is
  what pins down the whole puffer.
- Discovery while probing (scratch script, not a test): of the 43 glossary puffers
  with RLEs, 41 passed a quick check (front shift plus a frozen wake for 30 periods, all
  moving +x); nickel and radar did not. Of the seven shown, every wake is pure dots
  except the zodiac's (dots and checkers).
- Small fix: the rule diagrams' captions were squeezed to about 100 px by the default
  `figure` margins; they now take the remaining width.
- **Bug found on the live site after deploying**: the browser kept its cached old
  `main.js` (GitHub Pages sends `max-age=600`) next to the new HTML, so the Wakes
  section rendered empty. Any returning visitor within ten minutes of a deploy would
  have got a mixed version. Fix without a build step: `index.html` loads every asset
  as `?v=dev`, with an import map that also versions the modules `main.js` imports,
  and the deploy job replaces `?v=dev` with the commit id (and fails if any is left).
  `tests/site.test.mjs` checks that every module in `site/js` is in the import map,
  so a new module can't silently skip cache busting. `wakes()` also returns early if
  its container is missing.
- **Ships face right (owner's suggestion)**: the moon and free ship cards now travel
  in +x, matching the puffers, so everything that moves on the page heads the same way.
  The moon's RLE is now exactly the glossary's; the domino test turns the free ship
  back a quarter turn to compare it with the upper ship a horizontal domino produces.
  Convention from here on: show moving objects travelling right unless a piece needs
  otherwise.

### 2026-11-01: Session 3, collisions
- **New section, "Collisions"**: a collider. Pick what a moon hits (another moon head-on,
  a dot, or a checker), then any offset and gap parity from an atlas listing every case
  where they touch; the stage plays it from generation 0, exactly. 48 collisions, 26
  of which explode. Clean ones run until the result has settled and anything moving has
  left the frame. Explosions stop at the edge of the frame and say so ("still growing").
  The result sentence is revealed at the generation it becomes true.
- **Findings** (all by simulation, all tested):
  - Two moons exactly head-on: with an even gap they **annihilate** (nothing left, gen 12);
    with an odd gap they **fuse into a monster**, the p19 oscillator, by gen 11.
  - Offset by one row with an odd gap, they make **two free ships flying up and down**,
    at right angles to the moons, plus four checkers.
  - Offsets ±2 leave 2 or 4 dots; ±3 leave two checkers; |offset| ≥ 6 is a clean miss.
  - Moon vs dot: only offsets −1 and +4 (mirror images) are clean (a checker and a dot);
    the other six explode. Timing can't matter, since a dot never changes.
  - Moon vs checker: in two cases the checker **swallows the moon** and is knocked
    exactly four rows across, same phase, same column.
- **What the tests prove** (`tests/collisions.test.mjs`, 54 tests): for each atlas entry,
  run exactly the site's setup; clean outcomes decompose at generation `at` (and not at
  `at − 1`) into dots, checkers, moons, free ships and monsters (matched in every phase
  and orientation) that evolve identically apart for 150 more generations; explosions have
  >4000 cells at gen 150 and grow ≥80 cells in each dimension in the next 50. Also:
  shifting the gap by 2 gives the same outcome (so parity is all that matters); offsets
  1–3 beyond each range are clean misses; the free ships fly (0, ±6) per period; the
  swallowing checker is displaced (0, ±4).
- Identification needs two-stage clustering: cells within 2 of each other first, then the
  unidentified remainder within 6, because a free ship's spark sits apart from its body.
- Counts in the prose (48 / 26) are filled in from the data, so they can't drift.

### 2026-11-01: Session 4, diamonds
- **Engine**: `Field` in `lfod.js`, a bit-packed stepper (32 cells per `Uint32` word, a
  bit-sliced neighbour counter, work limited to the live region). It is exact on the
  plane, not a torus: it refuses to step once a live cell touches its outermost ring,
  because until then nothing outside can be born. It's about 27x faster than `Pattern`
  on a 1400x1400 explosion (0.3 ms per generation). `tests/field.test.mjs` checks it
  cell for cell against `Pattern` on soups straddling word boundaries and negative
  coordinates, on ships and oscillators, its previous-generation buffer (used for the
  red/ghost colouring), and that it refuses to step at the edge.
- **Renderer**: `paintField` in `stage.js` writes straight into `ImageData`, with the same
  colours, insets and graph-paper dots as `Stage.draw`.
- **New section, "Diamonds"**:
  - A large stage plays the knight's-move explosion from gen 0, zooming out by halves
    (16 → 8 → … → 1 device px per cell, always whole pixels, with the scale shown) until
    the diamond fills the frame, then says it is still growing and starts over.
  - A wall of all 21 exploding three-cell placements grows in lockstep at one scale
    (7x3 on desktop, 3x7 on phones), each with a glyph of its seed. Tapping a tile plays
    it on the large stage.
  - Reduced motion shows the final frames (counters show the real generation) instead
    of three lonely dots (logic reviewed, not yet checked in a browser with reduced
    motion on).
- **Findings** (all in `tests/diamonds.test.mjs`, which enumerates placements
  independently of the site's list):
  - Two cells within reach of each other: 5 placements up to symmetry. Side by side:
    two free ships. Corner to corner: a checker. One apart (straight or diagonal):
    nothing. A knight's move: an explosion, the only pair that explodes.
  - Three cells: 31 placements, 21 explode, exactly the site's list. The other ten die
    or settle into still lifes/oscillators of at most 8 cells.
  - **Why diamonds**: max(x + y) over live cells can grow by at most 1 per generation
    for *any* pattern (proved in the prose, checked on soups), while the Moore light
    cone allows 2. All 22 seeds hit that limit on all four diagonals from gen ≤ 30, and
    grow their bounding box by exactly one cell per side per generation from gen ≤ 70
    (checked to gen 300 and 600 respectively). About a fifth of each diamond is alive
    (0.19–0.24 at gens 300 and 600).
  - Correction to my own first draft: "nothing is faster than light, so explosions are
    diamonds" is wrong in the Moore neighbourhood (the light cone is a square). The
    diamond comes from B2, not from c.
- **Name (owner's note, same session)**: two cells a knight's move apart are **evil
  eyes** in the LFoD Universe glossary ("the smallest pattern that exhibits infinite
  growth"; its word for this kind of pattern is *explosive*). The entry has no RLE, only
  a picture; decoding its pixels gives cells at (2, 0) and (0, 1), which is how
  `EVIL_EYES` is placed, and a test checks it is the one exploding pair. The stage now
  shows the name of what it is playing, with a "back to evil eyes" button after a tile
  is chosen.
- **OG image** is now evil eyes' diamond at gen 140 (`tools/og.mjs`), which reads well
  small and shows the red/ink colouring.
- Measured in Chrome at 1400 px wide: wall and stage both hold 120 fps (8.3 ms frames).
