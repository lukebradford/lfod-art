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

Session 5 found the fifth: **the census**. With four cells there are few enough
beginnings to show every one that doesn't explode, so the page can say not just "most
things explode" but exactly which don't, and what they become. Peace is rare and
getting rarer: 4 of 5 pairs, 10 of 31 triples, 70 of 430 quadruples. What survives is
almost all solitude (dots) and the smallest company (checkers), plus the moon, the
three four-cell p4 oscillators and seven pairs of free ships.

Session 6 turned the hero from a toy into an **instrument**. It used to stop
at a fixed zoom, so a tap gave you a screen of big black squares. Now it pulls back by
halves as an explosion grows and shows the whole diamond at one pixel per cell, more
than a million live cells, exact. Every beginning you make is a link. The motif is
the gift: the site's first piece made to be passed on.

Session 7 found the seventh: **growth without explosion**. Five cells close together
are the first size at which a placement can grow forever without exploding: nine of
6,634 become the double dot puffer, and one of those makes two flying apart. The census
became a mosaic, every non-exploding placement drawn as a glyph you can play, and it
started using the glossary's smallest named things (plus, snake eyes, T-tetromino) as
landmarks.

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
- **Collider on `Field`**: the hero now grows its field and zooms out by halves; the
  collider's explosions could do the same instead of stopping at the frame edge.
- **Named beginnings in links**: `#rle=` links could carry an optional name, and the
  bestiary/four-cell tiles could offer "open in the field above" links.
- **Diamond anatomy**: the straight double lines along some edges, and the red rays
  of dots some explosions throw out along the axes, are visible but unexplained. Find
  what they are (a diagonal "crystal" growing at the edge's speed? puffers riding the
  tips?) and test it before naming them on the site.
- **Glossary pass**: before naming anything new, search `glossary.json` (and its
  images, for entries without RLE) — evil eyes was there all along.
- **Six cells**: about 100,000 placements by extension (`extend()` in
  `tests/objects.mjs`). The explosion check costs ~6 ms each, so a full census is ~10
  minutes: too slow for CI as is. Options: a much cheaper exact explosion criterion
  (e.g. a box that has grown to 60x60 by generation 40 with >400 cells, if it can be
  shown never to misfire on the five-cell list), or test a fixed random sample plus
  every survivor. What's new at six: the monster? other puffers? a c/2 ship?
- **Glyph to hero**: the census glyphs (and four-cell tiles) could offer "open in the
  field above" using the hero's `#rle=` links.
- **Dueling dominoes**: the glossary's four-cell reaction (two dominoes far apart)
  whose ships meet and make p6 puffers, "the smallest pattern that exhibits infinite
  linear growth". It sits naturally next to the five-cell puffers; verify and show it.
- **Four-cell tiles, larger**: tapping a four-cell tile could play it large, as the
  three-cell wall does with the Diamonds stage.
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
- Larger search: 5x5 all populations, 6x6 low population; look for slower ships
  (anything not at speed c?), longer periods, guns or puffers.
- Hero: let a long press or drag place several cells (keyboard placement is done).
- Accessibility: describe the hero's current state in text for screen readers (the
  status line is now `aria-live`, but population and zoom changes are not announced).
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

### 2026-11-01: Session 5, four cells
- **New section, "Four cells"**: every way to place four cells close enough to meet
  (430, up to symmetry). 360 explode. The other 70 are all on the page: the 44 that
  settle play together from generation 0 in a wall of small tiles (11 across on
  desktop, 4 on phones), each captioned with what it becomes and when, the caption
  darkening at the generation it becomes true; the 26 that vanish are listed as seed
  glyphs, grouped by the generation they are gone (all within nine).
- **Findings** (all in `tests/four.test.mjs`, which enumerates independently):
  - Four placements are already what they will be: the moon (the only four cells that
    already fly), anchor, lever and radar. Each oscillator also has one other placement
    that settles into it.
  - One placement gives birth to a moon by generation 2, shedding two dots.
  - Seven part into two free ships flying in opposite directions at c (one also
    leaves four checkers, the same debris as two moons meeting one row off-centre).
  - The other 29 become only dots and checkers. The latest to settle does so at gen 19.
- **Shared test helper** `tests/objects.mjs`: the collision test's decomposition into
  named objects (now also knowing anchor, lever, radar and ant) and the placement
  enumeration, used by the collisions, diamonds and four-cell tests.
- `phrase()` in `collisions.js` puts a tally into words ("a moon and two dots",
  "an anchor"); first draft said "a anchor", caught in the browser and now tested.
- Glossary check before naming anything: no four-cell placement here has its own
  glossary name except the T-tetromino, which vanishes (consistent with its entry);
  left unnamed until its picture is decoded.

### 2026-11-01: Session 6, the instrument
- **Hero on `Field`**: the hero now runs on the bit-packed engine. `Field.expanded()`
  (new) copies both generations word for word into a larger box, so the colouring
  carries over. The hero grows its field by half again whenever live cells come within
  4 cells of its edge, which keeps it exact on the plane. The view pulls back by halves
  (whole device pixels per cell, recentring on the live cells) to keep every cell in
  frame, and shows the scale ("cell 4 px") once it has zoomed. At one device pixel per
  cell it continues while the pattern still fits one way, and stops once it overflows
  both: "still growing; it has filled the frame". On a 1728 px wide display (DPR 2),
  evil eyes runs to gen 1731 with 1.3M live cells, about 2.3 ms per generation in Node
  at the end. The old hero stopped at a 1.5M-cell bounding box (about gen 600), showing
  only noise at a fixed zoom.
- **Every beginning is a link**: an edit is now a new beginning. The counter restarts at
  0, and the address bar becomes `#rle=<RLE body>` (via `history.replaceState`, so it
  adds no history entries). Loading such a link starts that pattern at generation 0,
  centred. A share button (native share sheet on touch devices, otherwise the
  clipboard) appears once there is something to share. Links over 4000 characters are
  refused, not truncated. `site/js/share.js`, tested in `tests/share.test.mjs`: patterns
  round-trip exactly and evolve identically, and malformed or oversized fragments
  (bad escapes, runs over 4096, unknown keys) are rejected. Only cells go in the URL.
- **Keyboard**: the hero canvas is focusable. Arrow keys move a red cursor (Shift moves
  8), and Enter or Space toggles the cell under it.
- **Reliability bug fixed**: one exception inside any animation's step stopped the
  shared requestAnimationFrame loop, which froze every animation on the page. Found
  when a stale cached module threw in the hero. Each clock's tick is now isolated:
  the failing one stops and logs, and the rest carry on.
- `Field.around` now writes bits directly instead of calling `set()` per cell (each
  call cleared the whole previous buffer and rescanned the field).
- Tests: `Field.expanded` against `Pattern` through repeated, uneven growth over 220
  generations of a soup; previous generation preserved across growth; `around` exact.
- Phone layout: the hero's meta line wraps with the status on its own line.
- Local preview note: `python3 -m http.server` lets Chrome heuristically cache modules
  across edits (the `?v=dev` stamp doesn't change locally). Serve with
  `Cache-Control: no-store` when testing, or the page mixes old and new modules.

### 2026-11-01: Session 7, five cells
- **New section, "Five cells"**: all 6,634 placements of five cells close enough to meet.
  6,151 explode, 59 vanish, 415 settle, and **9 become double dot puffers** (the
  glossary's smallest known puffer, six cells). One makes two flying apart. Nine strips
  play them together from generation 0 on a fixed plane until the last single puffer
  reaches the right edge. Below, all 483 that don't explode are drawn as glyphs (one DOM
  element each, cells as box-shadows), grouped by fate. Tapping one plays it in a sticky
  player whose caption darkens when its outcome becomes true. It opens on the ant.
- **Findings** (`tests/five.test.mjs`, which enumerates independently and runs all 6,634):
  - Firsts at five cells: the ant (1 placement, gen 9), a lone free ship with a checker
    and a dot (gen 15; with fewer cells free ships only come in pairs, which is tested on
    every non-exploding placement of 2–4 cells), and puffers (by gen 4–9). 35 make two
    free ships, 5 a moon, 22 an anchor, 4 a lever, 1 a radar, and 346 only dots and checkers.
  - Every cell a puffer lays down is a dot, one per two generations, checked over 400
    generations past settling. Nothing else changes (front repeats, wake frozen, body a
    phase of the glossary's double dot puffer, for 50 periods).
  - The plus (decoded from the glossary picture) is the only five-cell placement gone
    after one generation. Snake eyes → plus → nothing, and T-tetromino → snake eyes, all
    tested and now named in the Diamonds and Four cells text.
  - One slow explosion: still 25 cells at gen 40; it fails the standard explosion check
    measured from gen 150 (3,748 cells there, under the 4,000 bar), and passes it measured from gen 200. It is
    listed in `LATE`.
  - Peace keeps getting rarer: 4/5, 10/31, 70/430, 483/6,634.
- **Decomposer bug fixed** (`tests/objects.mjs`): in two of its six phases a free ship's
  spark sits alone. Stage one took it for a dot, so the split failed. A lone cell within 6
  of an unidentified piece now goes with the pieces. Effect on the site: every free-ship
  "by gen N" was 2 generations late. Four-cell values move 13→11, 16→14, 18→16, 19→17,
  and moon vs moon at offset ±1 moves 28→26. The domino now splits at gen 12, which
  matches "Two cells, parting". A regression test checks a free ship in all 6 phases and 8
  orientations.
- `tools/five.mjs` generates `site/js/five.js` (about 40 s). The test is the authority. The
  shared `explodes(cells, from)` now lives in `tests/objects.mjs`; passing it directly
  to `filter` would make the index the `from` argument, so the diamonds test wraps it.
- `phrase()` knows ants and puffers.
- Glossary check: the double dot puffer is the smallest *known* puffer (six cells).
  These five-cell placements are predecessors, not smaller puffers. The page says so,
  and only claims "no smaller *placement* (cells close enough to meet)" because the
  glossary's dueling dominoes (four cells, far apart) also grow linearly.

