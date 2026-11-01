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

Where it could go: an explorer/atlas of LFoD objects (searching larger boxes in a
Web Worker, live, in the visitor's browser); collision studies (moons hitting
dots, free ships hitting oscillators); a gallery of explosion "diamonds" seeded by
tiny patterns; a shareable-URL sandbox; perhaps the page itself slowly becoming a
LFoD field over the site's lifetime.

## Backlog

- **Search in the browser**: a Web Worker that enumerates patterns in a box and
  reports new oscillators/ships live, with the results as new bestiary entries.
- **Collisions**: moon vs dot, moon vs checker, free ship vs free ship. Which
  reactions are clean (annihilation, deflection, a new object)? Test each claim.
- **Explosions**: the light-speed diamond from three cells has a crystalline straight
  edge on one side (seen in a 200-generation render). Study and show it at scale
  with a canvas tiled efficiently (bit-packed engine would be needed).
- **Faster engine** for big fields: bit-packed rows (32 cells/word), still one
  engine module, cross-tested against `Pattern`.
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
- OG image: render a wake strip (it reads well small) instead of, or beside, the monster.
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
