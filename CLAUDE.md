# lfod-art

An experimental, agent-driven art website built around **Live Free or Die**, the
cellular automaton with rule **B2/S0** on the Moore neighborhood. `spec.txt` holds
the original brief. Read it.

- Live site: https://lukebradford.github.io/lfod-art/
- Repo: https://github.com/lukebradford/lfod-art (public)
- Hosting: GitHub Pages. Every push to `main` runs `.github/workflows/deploy.yml`,
  which runs the tests and then publishes the `site/` directory.

The site started out completely blank (an empty white page). Agent sessions grow it
one "Continue" at a time.

## The rule, exactly

Every cell has 8 Moore neighbors. All cells update at the same time, from generation t to t+1:

- A **dead** cell becomes alive only if it has **exactly 2** live neighbors.
- A **live** cell stays alive only if it has **exactly 0** live neighbors. Otherwise it dies.

Rulestring: `B2/S0` (RLE header: `rule = B2/S0`). Don't confuse it with Seeds (`B2/S`)
or any other rule.

## Precision is non-negotiable

The spec requires extremely precise renderings of Live Free or Die patterns in motion.
Concretely:

1. **Exact simulation.** Any frame presented as LFoD must be the exact B2/S0 evolution
   of its starting state. Don't approximate, don't take shortcuts, and don't hand-animate.
2. **Boundary honesty.** A named pattern is depicted in an unbounded plane. If the
   engine uses a finite or toroidal grid, nothing may reach the boundary within what is
   shown, or the boundary behavior has to be part of the piece on purpose and stated as such.
3. **Verify patterns by simulation, never from memory.** Check every claim about a
   pattern (period, displacement/speed, population, still life, oscillator,
   spaceship, etc.) with a test in `tests/*.test.mjs` that runs the real engine. If a
   pattern you remember doesn't pass its test, it's wrong. Fix it or drop it.
4. **Crisp cells.** Cells sit on the device-pixel grid (account for
   `devicePixelRatio`, use `image-rendering: pixelated` or integer scaling, and never
   blur cell state). Artistic effects such as trails, glow, or color by age are fine as
   long as the true live/dead state of every cell stays clearly readable underneath.
5. **No skipped or duplicated generations** in an animation that claims to show
   evolution, unless the skipping is explicit (for example, a visible generation counter
   or a step-size indicator).
6. **One engine.** Write the simulation core as a plain ES module, shared by the site
   and the tests, so whatever ships has been tested.

## Tech constraints

- Static site in `site/`. Prefer vanilla HTML/CSS/JS ES modules with **no build step**
  and **no third-party runtime dependencies or trackers** (better for reliability,
  security, and longevity). Add a tool only when it clearly earns its place.
- Tests: `node --test tests/*.test.mjs` (Node 22, built-in test runner, no npm deps needed). CI
  runs them before every deploy, and a failing test blocks the deploy.
- Local preview: `python3 -m http.server 8000 -d site`, then open http://localhost:8000/.
- Keep it fast on phones: a small payload, no layout jank, and
  `prefers-reduced-motion` respected.

## When the user types "Continue"

The user has durably authorized this loop: on "Continue", make the changes, then
commit and push to `main` without asking again. Pushing is how changes are published.

1. **Orient.** Read `journal.md` (vision and history), `git log --oneline -20`, and the
   current `site/` code.
2. **Examine the website as it actually is.** Serve it locally and look at it in a
   browser (Claude in Chrome tools if they're available) at desktop and mobile widths.
   Check the console for errors, and check the live URL too.
3. **Ask the spec's question:** "What can I do to make this website more beautiful,
   detailed, compelling, engaging, polished, unique, performant, subtle, surprising,
   mobile-friendly, reliable, secure, cohesive, outlandish, intriguing, well designed,
   and technically impressive? What are the bugs I can identify and fix? What would
   draw more people in to increase the reach of the site? What is my vision for the
   future of this project?"
4. **Choose one or more specific, contained sets of changes.** Fix real bugs first.
   Each change set should be coherent on its own and leave the site better and working.
   Don't rewrite everything; build on what's there unless there's a strong reason not to.
5. **Implement**, keeping Live Free or Die at the center of everything. Add or update
   tests for any pattern or engine claim.
6. **Verify.** Run `node --test tests/*.test.mjs`, look at the result in the browser (desktop and
   mobile), and confirm there are no console errors.
7. **Update `journal.md`.** Add a dated entry covering what changed and why, revise the
   vision section, and keep the backlog of future ideas current.
8. **Publish.** Commit with a clear message, `git push`, then `gh run watch` until the
   deploy finishes, and load the live URL to confirm the change is there.
9. **Report** to the user: what changed, the live URL, and what you'd do next.
