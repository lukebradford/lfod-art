# Journal

The project's running memory: its vision, a backlog, and a log of each session.
Every "Continue" session reads this first and updates it last.

## Vision

**Live Free or Die is a universe about solitude.** A cell survives only if it is
alone; life appears only where exactly two cells meet. The site should feel like a
quiet sheet of warm paper on which this strange physics plays out exactly, with
nothing faked, and should slowly become an atlas of the universe: its objects, its
speeds, its collisions, its explosions, and the fragile structures that hold.

Design language (revised in session 15, at the owner's request; first set in session 1):
- Pure white `#ffffff`, near-black ink `#0c0c0e`, neutral cool grays, faint
  graph-paper dots at cell corners. Cells are drawn edge to edge, with no gap between
  neighbors, so shapes read as shapes.
- **Blue marks freedom** (`#1f4bff`): a cell drawn blue survived the previous
  generation, which in B2/S0 means it had no neighbors at all. Newborn cells are ink.
  Cells that just died leave a pale ghost for one generation. This color coding is the
  site's signature and should stay consistent everywhere. Blue is also the only accent
  in the interface (focus rings, selection, status).
- One sans family: the platform's own (San Francisco, Segoe UI, Roboto). No web fonts.
  Hierarchy comes from size and weight (600 headings with tight tracking), not from
  ornament. Tabular figures wherever a number changes. Monospace only for the
  rulestring and RLE.
- Counters read `GEN 12`, `CELLS 6`, `CELL 4 PX`: a small uppercase label, then the
  number in ink.
- Buttons are quiet filled chips (8px radius, no border); the hero's play/pause is
  solid ink. Pressed toggles turn ink.
- Avoid the look agents fall into by default: warm cream "paper", serif body with
  mono uppercase eyebrows, gradients, glass, shadows, pill badges.
- American spelling and usage (neighbor, center, color, backward, around).
- Don't make blanket claims about everything that exists ("the glossary knows four",
  "a puffer flies at c", "the only one that..."). Say what is shown, and say which
  source a claim comes from.
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

Session 8 found the eighth: **company at a distance**. Two dominoes far apart send out
four free ships, and the page maps every place the second can sit (a 2-D atlas drawn at
true position around the first, which turned out symmetric, banded and periodic: an
emblem of the rule). Most of it is explosion; twelve rows out is untouchable solitude,
proved by a ship's width. In one square, dueling dominoes, two ships fly side by side
forever, each exactly as if alone, and the only trace of their company is a dot laid
halfway between them every six generations. Solitude that leaves something behind.

Session 9 found the ninth: **company that costs nothing**. Two free ships flying the
same way never gain on each other, so whatever passes between them repeats forever. Of
every way to set one beside another, nearly all explode, and none part as strangers: they
explode, only one ship comes out, or they stay together forever. Four stay together as
flotillas whose sparks touch every six generations and leave no trace; five become
puffers whose touching leaves a dot or a checker behind. Dueling dominoes was one of
them all along. The motif is the formation: things that move together, shown with a
camera that flies with them.

Session 10 found the tenth: **both, or neither**. Turned to face each other, two free
ships close at twice the speed of light, and of every way they can meet (504, mirror
images once) the rule allows exactly two kinds of survival: none, or total. No meeting
leaves one ship. Seven times the two pass straight through each other, each exactly as if
the other had never been there, only at ten or eleven rows across, where nothing but their
sparks can reach; twice they leave no trace at all. Exactly in line, nine annihilate. The
page also got a front door: a numbered list of the ten studies, and every study a link.

Session 11 found the eleventh: **slowness**. Everything the site had shown moved at c,
because that is the easy speed here. The glossary's 21 slower ships (c/2, 2c/5, c/3, c/4,
c/5 and c/4 diagonal) are big, rare and built, and the piece races the smallest at each
speed from one starting line with the light front drawn as a shaded region ahead of them.
The motif is the limit: the light front, which the moon rides exactly, and the diagonal
limit from Diamonds (c/2), which the three diagonal ships reach only half of. And one
oddity, made visible: the decade ship's nose steps backwards, which no light-speed ship can do.

Session 12 found the twelfth: **right of way**. Turn one free ship a quarter and their
paths cross. Of 759 ways to cross that touch, 746 explode, and the rest let exactly one
ship through, never both. The one that goes on is always the one
that reached the crossing first, untouched, exactly as if alone; the other arrived 15 to
20 generations late and ran into its tail. Twice the late ship vanishes without a trace.
Head-on was "both or neither"; crossing is "one or neither". The motif is precedence, and
the site's first faint drawing of a path under the cells.

Session 13 found the thirteenth: **the throw**. Nothing here can catch a moon, but a
rake can throw one: three of the glossary's four rakes fire moons backwards, and since the
rake flies at c too, a moon and the rake that threw it part at 2c, as fast as any two things
in this universe can separate. The fourth, the free rake, fires free ships sideways, and
because the camera flies with the rake its ships climb away at forty-five degrees: a
diagonal of ships, each exactly as if alone. The backflip closes the loop: a trailer behind
the flip-flop rake catches both moons every period and turns each into two checkers, a rake
made back into a puffer. The motif is the stream: things fired at c, in lines, forever.

Session 14 found the fourteenth: **standing still**. Everything that makes ships here
had flown to do it; a gun stands still and fires. Only two are known, both fire moons,
and both fire two ways at once from their middle line, so each is the centre of a line of
light growing at c from both ends: the moon laser (2012, 700 cells, p4, up and down) and
Arie Paap's p5 gun (2016, 166 cells, left and right). Two of the small guns face to face
turn the Collisions atlas into a machine: in line, two moons vanish at an even distance and
start to fuse at an odd one, so at an odd number of cells apart every pair meets halfway
and leaves nothing, forever, and at an even number the first pair has not finished fusing
when the next arrives, and everything explodes. Odd or even is all that matters. The motif
is the fixed camera: the first strips on the site where nothing moves but what is fired.

Where it could go: an explorer/atlas of LFoD objects (searching larger boxes in a
Web Worker, live, in the visitor's browser); collision studies (moons hitting
dots, free ships hitting oscillators); a gallery of explosion "diamonds" seeded by
tiny patterns; a shareable-URL sandbox; perhaps the page itself slowly becoming a
LFoD field over the site's lifetime.

Session 15 (owner's edits) pruned the site back to its core: the rule, two cells
parting, the bestiary, wakes, rakes, guns, diamonds, four and five cells, and slower than
light. The owner removed Collisions, Two dominoes, Side by side, Head-on, Crossing and
the guns' Face to face. Don't bring them back unless asked; the history above, and
backlog items that build on them, are kept only for the record. Where earlier entries
say "red", read "blue".

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
  field above" using the hero's `#rle=` links, as Two dominoes now does.
- **Perpendicular dominoes**: the Two dominoes map covers parallel dominoes only. One
  horizontal and one vertical send ships at right angles, so they can only cross; a
  second map (and does anything there grow?). Also domino vs moon, and a domino fired
  into a dot wake.
- **Three ships abreast**: Side by side covers two free ships. A third beside any of the
  four flotillas or five puffers (or two flotillas side by side) could give rakes,
  wider dot lattices, or puffers whose trails interact. Same harness
  (`shipPairOutcome` generalised), same map, more phases.
- **Ship into wake**: a free ship fired head-on into each of the wakes (Wakes, the five
  side-by-side puffers). Does a ship eat a dot trail, or explode on the first dot? (Head-on
  ships pass only where sparks graze, so probably explode; test it.)
- **Ship vs moon**: head-on and crossing (the moon is c too, so the same harnesses apply
  with a different second body: `crossOutcome`/`headOnOutcome` generalised over B's cells).
- **Three ships through one point**: a third ship sent through a crossing that lets one
  survive. Can a chain of crossings act as a logic gate (A passes iff B absent)? This is
  what "one or neither" suggests: the late ship is an inhibitor. Test before claiming.
- **Head-on, three bodies**: a ship passing through a flotilla, or through dueling
  dominoes' puffers.
- **Other ships side by side**: moons beside free ships (three of the side-by-side
  results throw off a moon flying with the surviving ship), the glossary's p4 ships
  (dot ship, dotset ship) side by side.
- **Name check**: the four flotillas and three of the puffers matched nothing in the
  glossary's RLEs (a scratch scan of every entry's leading 14 columns, all orientations,
  200 generations); entries with only pictures were not checked. Ask the owner whether
  they have names before giving them any.
- **Four-cell tiles, larger**: tapping a four-cell tile could play it large, as the
  three-cell wall does with the Diamonds stage.
- **Anchor track periods**: the glossary lists the first iterations' periods as
  12, 28, 124, 124, 252, 60. Extending the two-slot track by adding dot pairs 4
  cells apart gives 12, 28, 28, 124, 252, 60, 60 in our engine, so the glossary's
  iterations are probably built differently. Find the right construction (the
  collection's "Anchor track periods" file) before claiming the sequence.
- **More wakes**: nickel puffer (p5) and radar puffer did not verify with the simple
  front-zone test within 40 columns / 96 generations of settling; find out why (longer
  transient? a rake, whose debris moves?) before showing them. The fake rake puffer (p8,
  24 cells, 4 dots a period in our scratch run) could join Wakes. Trailers (dot eater,
  anchor eater) that consume a wake would make a lovely strip beside the backflip.
- **Streams as inputs**: the rakes make endless lines of moons and free ships at exact
  spacings. A moon stream fired into a dot wake (does the first moon clear a path for the
  rest?), two tricycle rakes nose to nose (moon streams meeting head-on: the collisions
  atlas says what one pair does; a stream is that pair every 6 cells), a free rake's
  diagonal of ships crossing a second rake's (every crossing in Crossing, in sequence).
  The rake harness in `tests/rakes.test.mjs` (engine cut + named pieces + independence)
  generalises: add a second body and look for the first period at which the pieces differ.
- **Rakes of other periods**: the glossary says the free rake's reaction on other anchor
  tracks gives higher periods (the two-slot anchor track's periods are 12, 28, ... per the
  bestiary); build one and see whether the ships come out at every period. Also the
  glossary's c/2 and c/5 rakes (quintessential rake, horned rake), untouched.
- **Wakes on the hero?** A puffer crossing the hero diagonally would be dramatic, but
  the hero is the monster's place. Perhaps a second, wide hero mode.
- Use more of the LFoD Universe collection (~/Dropbox/Code/lfod, data/glossary.json
  has 190 named entries, 143 with RLE): puffers, rakes, the moon laser, the anchor
  and ant stacks, the mantis, the six shooter. Every claim still gets a test.
- Show the short free ship and the moon laser gun (LifeWiki). (The slow ships are done: session 11.)
- Larger search: 5x5 all populations, 6x6 low population; look for slower ships
  (anything not at speed c?), longer periods, guns or puffers.
- Hero: let a long press or drag place several cells (keyboard placement is done).
- Accessibility: describe the hero's current state in text for screen readers (the
  status line is now `aria-live`, but population and zoom changes are not announced).
- Consider an RSS/“what grew this session” changelog page drawn from the journal.
- **Guns as inputs**: the p5 gun's stream is moons 5 apart on one row, the laser's 4 apart
  on one column. A dot or checker in the stream (Collisions says a lone moon on a dot leaves
  a checker and a dot at two offsets, and explodes at the rest; what does the *next* moon
  do to that?); a gun firing into a rake's wake; a gun's stream crossing another's at
  right angles (two offsets and a timing, so a 3-D atlas: find whether any crossing is
  clean); the laser face to face with itself (stacked, moons meeting vertically: the same
  parity rule should hold, test it). The glossary's "Logic gates.rle" and "Moon
  reactions.rle" files are untouched.
- **Face to face, every distance**: the page shows 100 and 101 and tests 40..61. A map of
  distances (and of the second gun's phase, 0..4, which shifts parity: calm iff d + phase
  is odd, seen in a scratch run) would make it an atlas like the others; also two guns side
  by side (streams parallel, never meeting, unless offset by a row or two: the Collisions
  atlas has moon-on-moon at offsets up to 5).
- **What is the p5 gun made of?** It looks like two copies of a p5 oscillator (Paap's bow
  tie, found the same day) held nose to nose, with the moons born in the gap. Check by
  running the halves alone before saying so on the page.

- **Slow ships, more**: the glossary's families (quintessential, unicorn, horned, buffalo
  and hippo ships) have more members than the smallest shown, and the buffalo bird tagalong
  is untouched. A slow rake (see Rakes of other periods) would make a strip whose stream
  moves at an odd relative speed. `tools/slow.mjs` skips entries
  without a ship RLE; the iterations/supplement files in the collection may hold more.
- **Slow meets fast**: a free ship or moon overtaking a slow ship (the only way two
  things here can *catch up* with each other). Head-on with a c/2 ship. Same harness.
- **Light fronts elsewhere**: the shaded "beyond light" region is new in session 11
  (`COLORS.beyond`, `Stage.draw`'s `under` hook). Wakes and Two cells, parting could show
  it too, and the hero could show the light cone of a fresh beginning.

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

### 2026-11-02: Session 8, two dominoes
- **New section, "Two dominoes"** (after Five cells): a map of every place a second
  vertical domino can sit near a first (13 x 37 offsets up to symmetry, 479 placements,
  drawn as the full symmetric 25 x 73 plane with the first domino in the middle), and a
  wide stage that plays whichever square is tapped (or chosen with arrow keys) from
  generation 0, exactly. Grey explodes, a small ink square touches and settles, a faint
  dot never touches, red grows forever. It opens on **dueling dominoes** (glossary). An
  "Open this one in the field at the top" link sends the placement to the hero via
  `#rle=`; dueling dominoes there runs out to one pixel per cell.
- **Findings** (all in `tests/dominoes.test.mjs`, 15 tests, which run every placement):
  - 347 explode, 65 never touch, 66 touch and settle, 1 grows forever.
  - A lone domino's cells never leave rows -4..5, at any generation, so from 12 rows
    across two dominoes can never touch (rows 6 and 7 always empty; no cell sees both).
  - 6 to 8 rows across: every placement explodes. 9 rows: all but two (17 and 29 along).
  - 0 to 5 rows: whatever doesn't explode loses two ships; from 3 along the survivors are
    exactly the outer two (tested), the inner pair annihilating or leaving dots/checkers.
    One empty column apart (2 along, in line) they act as one four-cell shape, making
    two new ships.
  - 10 and 11 rows: whatever touches and doesn't explode keeps all four original ships,
    each exactly as if alone, sometimes plus a dot or checker(s).
  - From 24 along the map repeats every 12 columns: same objects, 6 generations later
    (checked to 72; to 96 in a scratch run). Reason: the inner ships meet 6 generations
    later in the same phase, and same-way pairs are too far apart to touch.
  - **Dueling dominoes** (11 across, 2 along; the glossary's RLE matches up to symmetry)
    is the only one that grows. Neither domino is disturbed at all: for 700 generations
    the pattern is exactly the two run alone plus dots on the middle row, one in the
    centre at gen 10, then one more each side every 6 generations, 6 cells further out
    each time. Two p6 puffers at c, each just two free ships abreast.
- **Shared helper** `dominoOutcome(dx, dy)` in `tests/objects.mjs`: compares the pair with
  each domino run alone (so close-flying ships aren't misread, which the generic
  `decompose` does when two ships are within 6 cells: my first scan reported a dozen
  false "puffers"). Explosions are measured 150 generations after the dominoes first
  touch (far apart, their ships only meet late; the fixed gen-150 standard missed some).
  `tools/dominoes.mjs` writes `site/js/dominoes.js` (about 5 s).
- The Five cells text now points down to Two dominoes (four cells can grow forever, but
  only if they start too far apart to meet; the four-cell census already proves the
  "only").
- Phone: the stage shows fewer columns (cells stay about 5 CSS px); the map shows the
  right-hand half plus the first domino when 73 columns would be under 9 px each.

### 2026-11-02: Session 9, side by side
- **New section, "Side by side"** (after Two dominoes): every way to set a second free
  ship beside a first, flying the same way. The first is in its 12-cell phase (the
  glossary's form); the second in any of its six phases, its path `e` cells ahead and
  `dy` rows across. A lone free ship's cells stay in columns g-6..g+8 and rows -2..7
  (tested), so beyond 16 along or 11 across two empty rows or columns always separate
  them: the map (6 x 33 x 23) is complete. Shown as: four flotilla tiles, each with a
  camera flying with it; a "fleet" stage of the five puffers flying together as one exact
  pattern, camera moving at c, trails streaming out behind (lanes separated so they can
  never meet, tested); and an explorer (phase buttons, a map of every placement, a
  moving-camera stage, and "open in the field at the top").
- **Findings** (`tests/abreast.test.mjs`, 16 tests, which run every placement):
  - 1,938 placements up to mirror image: 509 never touch; of the 1,429 that do, 1,369
    explode, 45 leave a single free ship (sometimes with dots, checkers or a moon), 6
    become flotillas and 9 puffers. None vanish, and two ships never come out of a
    meeting both free and apart.
  - **4 distinct flotillas** (periodic, p6, c; bound, i.e. not two independent halves).
    At 1, 2 or 3 generations of every 6 something passes between them; at the rest the
    pattern is exactly the two ships run alone. The first (in step, 3 ahead, 9 across) is
    exactly two free ships 5 generations in 6: at the heavy phase the sparks meet and the
    population is 82 instead of 80, then nothing.
  - **5 distinct puffers**: a checker every 6 (in step, 3 ahead, 10 across); a dot every 6
    (in step, 2 ahead, 11 across: the puffer dueling dominoes makes, matched to the
    glossary's RLE by simulation); and three with the second ship 3 phases ahead, 9 across,
    laying one or two dots every 6. In all nine, at least 3 generations in 6 the pattern is
    exactly the two ships alone plus a frozen trail.
- **Classifier** `shipPairOutcome` in `tests/objects.mjs`: 'apart' is decided exactly
  (identical to the lone ships for 7 generations means both are back where they started,
  6 cells on, so forever); a flotilla by exact periodicity with displacement (6, 0), which
  is a proof; puffers by the 50-period front-and-frozen-wake test. Ship geometry
  (`SHIP`, `shipPair`) lives in `site/js/abreast.js`, shared by page and tests.
  `tools/abreast.mjs` writes the data (about 17 s).
- **My own mistakes, caught**: (1) I first assumed swapping the two ships was a symmetry.
  It isn't for ph ≠ 0 (it needs a time shift, and they may interact during it), so the
  census uses the vertical flip only. (2) The first classifier ran the flotilla and
  puffer checks before decomposition, so a lone surviving ship counted as a flotilla, and
  a ship leaving dots as a puffer with an empty wake; decomposition now comes first.
  (3) A "clean generation" test that allowed extra cells behind the ships let a moving
  spark through; extra cells must now be frozen (there 6 and 12 generations later).
- Two dominoes now points down to Side by side.

### 2026-11-02: Session 10, head-on
- **New section, "Head-on"** (after Side by side): every way two free ships can fly straight
  at each other. Ship A is the glossary's 12-cell phase flying +x; ship B its mirror image,
  `ph` generations into its own flight, its path starting `t` columns further off, `dy` rows
  across (`site/js/headon.js`, shared with the tests). Twelve columns further is the same
  meeting six generations later (tested), so 6 phases x 12 timings is every approach; beyond
  11 rows they never touch. Shown as: tiles of the seven ways they pass through each other
  (fixed camera on the crossing point, looping until both ships have left), and an explorer
  (a map of all 864 squares in six blocks, one per phase, that wraps to 3 or 2 blocks per row
  on narrow screens; a stage; "open in the field at the top").
- **Findings** (`tests/headon.test.mjs`, 9 tests, which run every meeting):
  - 864 squares, 504 meetings up to mirror image (two symmetries: top-bottom flip keeps the
    square; a half turn maps phase k, timing t to phase 6 - k, timing t + 6, found by turning
    every meeting round and finding it in another's run). 63 never touch, 390 explode, 9
    annihilate, 35 leave only dots and checkers, 7 pass through.
  - **Both or neither**: no meeting leaves one ship, or anything but dots and checkers (no
    moon, monster or third ship). Where ships come out, both are the originals, exactly where
    and as they would be alone, from the meeting on (checked cell for cell for 120
    generations; the debris repeats with period 2 because checkers blink).
  - Annihilation happens only exactly in line; passing through only at 10 or 11 rows. Two
    passings leave nothing at all (10 across, phase 1, timing 11; 11 across, phase 0, timing 2).
- **Classifier** `headOnOutcome` in `tests/objects.mjs`. 'apart' is exact: by generation 26
  the ships' column ranges are at least two apart, forever. `tools/headon.mjs` writes the data
  (about 4 s).
- **Contents and links**: a numbered "Studies" list after The rule (two columns of five on
  desktop), an `id` on every section, and a `#` self-link on each heading (hover). A link to a
  section used to land in the wrong place, because the sections above it are built by script
  after the browser has scrolled; the page now scrolls to it again once laid out (and at
  load, unless the reader has scrolled). `tests/site.test.mjs` checks ids are unique, every
  in-page link has a target, and the contents list matches the sections in order.
- **Bug caught before shipping**: the first section id, `parting`, clashed with the parting
  canvas's id and broke that animation (renamed `parting-canvas`; the new test catches it).
- `phrase()` knew numbers only up to six; one head-on meeting leaves eight dots ("undefined
  dots"). It now counts to twelve, and a test runs it over every head-on outcome.
- My own mistakes, caught: (1) a first mirror key taken mid-collision gave false matches
  (debris converges); the key must come from before they touch. (2) I assumed passing
  debris never changes; checkers blink, so it repeats every 2 generations instead. (3) I
  first counted three no-trace passings; up to mirror image there are two.

### 2026-11-02: Session 11, slower than light
- **New section, "Slower than light"** (after Head-on; 11th in the contents, which now has
  rows of six): every ship in the LFoD Universe glossary that is slower than c. Three parts:
  - **The race**: six lanes, one per orthogonal speed, the smallest ship at each (moon c,
    dust mite c/2, zirconium 2c/5, wasp c/3, beachcomber c/4, decade c/5), noses on one
    column at gen 0, fixed camera, one clock. The region beyond the light front (more than
    `g` columns past the start) is shaded; the moon rides its edge. Restarts when the moon
    reaches the end of the track. On narrow screens the longest tails start cropped (said
    on the page) so cells stay readable.
  - **Diagonal**: ram, slanted and giraffe ships in three tiles at one scale, the region
    `x + y > s0 + g` shaded: the diagonal limit proved in Diamonds (c/2).
  - **Every slow ship**: a table of all 21 (speed, period, fewest cells, discoverer) and a
    viewer whose camera moves with the chosen ship, a whole cell at a time at its average
    speed. Opens on the decade ship.
- **Source**: the glossary *page* (`~/Dropbox/Code/lfod/docs/glossary.html`, the live
  glossary) is newer than `data/glossary.json` and has many more ships (fruit fly, mouse,
  unicorn, fox, buffalo, horned, hippo, wasp, beachcomber, decade, hammerhead). Future
  sessions should read the page, not the JSON. `tools/slow.mjs` parses it and writes
  `site/js/slow.js` (RLEs verbatim, one in `B2/S0` spelling, the rest `s0/b2`).
- **Findings** (`tests/slow.test.mjs`, 31 tests): every period, displacement and population
  range matches the glossary. Speeds known: c/2 (12 ships), 2c/5, c/3, c/4 (one each), c/5
  (3), c/4 diagonal (3). Dust mite and fruit fly tie at 36 cells (dust mite's box is
  smaller); ram is the smallest diagonal ship (37). Leading edges: only the decade and
  quintessential ships ever fall back, by 2 cells every 5 generations (the glossary says
  "from generation 1 to 2"; the decade, being p10, also does it from 6 to 7), then gain 3.
  Diagonal ships measured by max(x + y) are monotonic, gaining one every two generations.
  A light-speed ship can never fall back (its nose must gain every generation: `front(g) ≤
  front(0) + g` and `front(g + p) = front(0) + g + p` force equality), so the check over
  the slow ships covers every ship.
- **Engine-adjacent**: `Stage.draw(..., { under })` paints on the bare paper before the
  cells, and `COLORS.beyond` is the shade for "nothing can be alive here".
- **Bugs caught before shipping**: (1) the table overflowed a 390 px screen by 13 px (the
  period column is hidden on phones; names wrap). (2) My first expectation that the decade
  ship falls back once a period was wrong (twice: it is p10 at c/5).

### 2026-11-02: Session 12, crossing
- **New section, "Crossing"** (after Head-on; 12th in the contents, two columns of six):
  every way two free ships can meet at right angles. Ship A is the glossary's 12-cell phase
  flying right; ship B the same ship turned to fly down (SHIP[ph] reflected in the diagonal,
  a turn because every phase is symmetric), `ph` generations into its flight, its path in
  columns bx..bx+5 (bx = 18 + u), arriving `d` generations after A (`site/js/crossing.js`).
  d is defined by noses: A's reaches column bx at bx - 8, B's reaches row 0 at bx + d - 8.
  B six columns left and six rows lower is the same crossing six generations later, so
  6 phases x 6 timings x lags -21..21 is every crossing (1,548 squares). Shown as: two
  tiles of the clean erasures (one with each ship surviving), a stage, and a map (six
  blocks of six rows, lag across with a centre line, "down first / right first").
  The ships' paths are drawn faintly under the cells (`COLORS.path`), the first time the
  site draws anything but cells and light fronts on a stage.
- **Findings** (`tests/crossing.test.mjs`, 10 tests, which run every crossing):
  - 777 crossings up to mirror image (reflection in the diagonal swaps the ships' roles:
    (ph, u, d) -> (6 - ph, u + ph + d, -d) mod 6, an involution, found by reflecting every
    crossing and finding it in another's run). 18 never touch; of the 759 that do, 746
    explode and 13 leave exactly one ship. None annihilate; none leave only debris; none
    make anything but dots and checkers; **no crossing lets both ships through**.
  - The survivor is always the one that arrived first (d > 0: A; d < 0: B), untouched (cell
    for cell for 120 generations; debris repeats with period 2), and the lag is always 15,
    16, 18, 19 or 20: the late ship runs into the first one's tail.
  - Two (up to mirror) leave nothing at all but the survivor: (1, 0, 15) and (1, 3, 18).
  - Beyond |d| = 21 they never touch: run to 27; from 28 on, the bounding ranges (A rows
    -2..7, columns g-6..g+8; B columns bx-2..bx+7, rows by+g-6..by+g+8) never come within
    reach at the same generation (an algebraic test).
- **Classifier** `crossOutcome` in `tests/objects.mjs`: 'apart' is exact (no touch through
  generation min(bx + 16, 16 - by), when three empty columns or rows separate them and the
  gap only grows). `tools/crossing.mjs` writes the data (about 8 s).
- **Bug fixed: reload landed wrong.** Reloading a `#section` link put back the browser's old
  scroll position, and a warm-cache reload could fire `load` before the first frame, so the
  "re-scroll at load" ran before the maps sized themselves (ended 30 px off). Now
  `history.scrollRestoration = 'manual'` when the hash names a section, and a
  ResizeObserver on the body keeps the section at the top whenever the page changes size,
  until the reader touches anything (wheel, touch, key, pointer) or 1.5 s after load.
  Checked: fresh visit and reload both land at exactly 0 px.
- `NUM` now counts to thirteen.
- My own mistakes, caught: (1) a placeholder `MAP` left above the generated block broke
  the module (duplicate export); the generator now appends below whatever head it finds.
  (2) I guessed the census counts in the test before running it; the run corrected them
  (apart counts depend on the box and are not used in the prose except as "never touch").
  (3) On a phone-width tile I thought I saw a second object after a clean erasure; the
  engine says gen 35 is A alone (x 29..43), clipped by the tile edge.

### 2026-11-02: Session 13, rakes
- **New section, "Rakes"** (after Wakes; 3rd in the contents, which now has thirteen):
  puffers whose trail is ships. Five strips in the Wakes style (`site/js/rakes.js`, the
  `rakes()` block in `main.js`), each camera flying with its rake at c, all stepping on one
  clock, each opening with its stream already spanning the strip and starting over after 900
  generations:
  - Tricycle rake (p3, 130 cells): one moon backwards every period, nothing else. Flip-flop
    rake (p4, 131): two moons a period, one above the other, nothing else. Nickel rake (p5,
    98): a moon backwards and a dot on each side every period, so the moons fly down a
    corridor of dots. Against a camera moving with the rake the moons pass at 2c.
  - Free rake (p12, 50 cells): one free ship *upwards* every period, plus two dots and a
    checker behind. Its strip is tall (engine band + 48 rows) and the ships climb away at
    45° because the camera moves; on a phone they leave by the left edge instead.
  - Backflip (p4, 164 cells): the flip-flop rake with a 33-cell trailer in its 13 rearmost
    columns (checked cell for cell) that turns both moons into four checkers a period, a
    frozen wake again.
- **Harness** (`tests/rakes.test.mjs`, 23 tests, 50 periods each): the *engine* is the
  rightmost `length` columns (and, for the free rake, rows `top` and below, since its ships
  leave upward). From `settle` on, every period: the front advances exactly p; the engine
  repeats exactly, shifted p; everything outside it splits into named objects (groups within
  2, then whatever is unidentified regrouped within 4, because a free ship's spark can trail
  3 or 4 rows behind its body and ships in the stream are 12 apart); the whole at t + p is
  exactly the engine run alone plus the rest run alone (nothing fired ever touches the rake
  again); and each piece run alone for p is itself shifted by its velocity (moons back at c,
  ships up at c, wake still). Counts per period are measured 20 periods apart.
- **Found by the harness, not by me**: the glossary's "initial" phase is not the settled one
  for three of the five. The nickel rake needs 5 generations, the backflip 2, and the free
  rake 15 (its ships must also be in a phase whose spark is within 4 rows of the body for
  the grouping to work: generation 3 mod 6; 3 itself still carried start-up debris in the
  engine). The free rake's 40-cell ship phase splits into 16 + 24 cells at radius 2, which
  first looked like two objects per period; run alone, the 24-cell piece dies in one
  generation, and together they are one free ship (the tests count one a period).
- **Mobile check** was done through a 390 px iframe (the Chrome window would not shrink);
  the strips, facts lines and notes wrap as Wakes does.
- The old page's cached modules hid the new section at first (python's server sends no
  cache headers); a `cache: 'reload'` fetch fixed it locally, and the deploy's commit stamp
  handles it live.

### 2026-11-02: Session 14, guns
- **New section, "Guns"** (after Rakes; 5th in the contents, which now has fourteen in two
  columns of seven): things that stand still and fire. Three strips in the Wakes style with a
  *fixed* camera (`site/js/guns.js`, the `guns()` block in `main.js`), all on one clock:
  - **p5 moon gun** (Arie Paap, August 2016, 166 cells, from the LFoD Universe news page):
    every fifth generation a moon leaves each side along its middle row. The strip opens with
    both streams already spanning it.
  - **Moon laser** (Matthias Merzenich, August 2012, 700 cells, 170 wide, from the glossary):
    every fourth generation one moon leaves upwards and one downwards from its centre column.
    Its strip shrinks its cells to fit the gun across (whole device pixels, never below 2; 6 px
    on desktop, 2 px on a 390 px phone) and says so by the counter ("cell 2 px"), through a
    `--cs-fit` variable the strip's height follows.
  - **Face to face**: two p5 guns on one line, 101 apart (every pair of moons meets halfway
    and vanishes, forever) or, by a button, 100 apart (explodes; stopped where the diamond
    reaches the strip's edge, held, then started over). Both open at generation 0 so the
    streams are seen to meet.
  - Links open either gun in the hero field (`encodeHash`).
- **Findings** (`tests/guns.test.mjs`, 13 tests): each gun is an engine that repeats exactly
  every period inside its box (p5: the given 19 columns plus one spark row above and below;
  laser: exactly its 170 x 31), and everything outside the box at those generations is moons
  flying away at c that never touch the engine or each other again (the whole at t + p is the
  engine run alone plus the moons run alone, cell for cell, 50 periods). A moon is born as two
  cells just outside the box one generation before it is a moon. Each gun is a mirror image of
  itself both ways and fires along its middle line (row 21..24; column 83..86). Face to face:
  calm (periodic, moons only between the guns except at the meeting point, population there
  constant) at every odd distance 41..61 and at 101; explodes at every even one 40..60 and at
  100. Why: the Collisions atlas's in-line rows (even gap `12:nothing`, odd gap `11:monster`).
- **Not shown, seen in a scratch run**: the second gun's phase shifts the parity (calm iff
  d + phase is odd), as it must, since a phase is a moon one cell further along.
- **Bug caught before shipping**: the laser strip stayed black. Its fitted cell size equalled
  the default, so setting `--cs-fit` changed no height, no resize fired, and the early
  "wait for the resize" return never came back. Layout now always draws; a height change
  brings it back through the observer.
- **Test-harness lessons**: the period cut must be at the engine's own phase (settle mod
  period), or a half-born moon straddles the box; and a moon straddles any box edge it was
  born on, so the engine box must end where the moon's first two cells begin, not include them.
- Mobile check through a 390 px iframe again (the window stops at 500).

### 2026-11-03: Session 15, a cleaner page

Changes asked for by the site's owner, one by one:

- **Blue for the free.** Survivor cells (and wakes) are blue `#1f4bff` instead of red,
  in `stage.js`, the CSS, the rule diagrams, the footer swatch and the favicon.
- **Restyle.** White page, neutral grays, the system sans, 600-weight headings with
  tight tracking, quiet filled buttons, tabular counters, numbered contents. The cream
  paper, serif body and mono uppercase labels are gone (see the design language above).
- **No gaps between cells**, on every canvas (`Stage.draw` and `paintField` now fill
  whole cells), in the rule diagrams and in every glyph.
- **`GEN` and `CELLS`** in caps wherever a counter sits on or beside a running pattern.
- **Two cells, parting**: the ships now fly on out of the frame, the counter still
  running, and the piece starts over only once both are 24 cells past the edge.
- **Removed**: the Bestiary's opening paragraph; the Collisions, Two dominoes, Side by
  side, Head-on and Crossing sections; and Face to face under Guns. Their modules
  (`dominoes.js`, `abreast.js`, `headon.js`, `crossing.js`), tests and CSS went with
  them, and so did the parts of `tests/objects.mjs` that only they used.
  `collisions.js` stays, since Four and Five cells use its outcome parser; its test
  stays too.
- **Claims corrected.** "A puffer flies at the speed of light" now says these seven do;
  "the glossary knows four" rakes is now "here are four" (the glossary has many more,
  at c/2 and c/5 too); "a rake flies at the speed of light" now says these four do; the
  free rake is no longer "the only one that fires free ships" (the glossary's freedom
  collider fires short free ships, and anchor-track flotillas make them too); the
  flip-flop rake's "no other rake of period 4" is gone (the glossary itself says it is
  out of date); "only two guns are known" is now "here are two"; and the plus is no
  longer called "the smallest object that dies in one generation".
- **American usage** throughout: neighbor, center, backward, sweeping around, travelers.


Follow-up, same day: `site/og.png` (the link preview) is re-rendered by `tools/og.mjs` in
the new palette (white, ink, blue). `collisions.js` is now `outcomes.js`: only the outcome
parser and `phrase`, which Four and Five cells use, with a small test of its own; the
collision atlas data and its test are gone, as are the four tools (`abreast`, `crossing`,
`dominoes`, `headon`) that generated data for the removed sections.
