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
- **Names**: LifeWiki also names p4 oscillators "lever", "anchor" and "radar", a p6
  "ant", p4 photons "key ship", "plus ship", "robot ship", "sun ship", a p8 "octopus
  ship", and a "short free ship" (Catagolue `xq6_4q11q4z4y04`). Patterns for the
  oscillator names were not findable (LifeWiki has no subpages for them; the
  forum thread mentions them without RLE). Bow, Pinwheel and Rally are provisional
  until matched. The rule's creator (credited on LifeWiki) may be able
  to settle these directly.
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
