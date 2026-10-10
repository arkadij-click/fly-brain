---
name: calibrate-surfaces
description: Visually calibrate the fly-brain surface map against the kitchen photograph. Use when adding a new kitchen photo, when surface polygons stop matching the real objects, or after any change to the room layout.
---

# Calibrating the surface map against the kitchen photo

Surfaces (where flies walk and food can be placed) are polygons in normalized
image coordinates (fractions of width/height, 0..1) in the `surfaces` array of
`simulation.js`. They must hug the real objects in `kitchen.jpg`. This skill
is the repeatable calibration loop.

## The tool

    python tools/overlay_surfaces.py C:/tmp/surfs.png [photo.jpg]

Renders the photo at 1600x900 with a red 0.05-step coordinate grid, every
surface polygon in green with its name, and the photographed food positions.
`Read` the PNG after every change. One pixel = 0.000625 in normalized coords.

## Per-surface checklist (what each polygon must hug)

- **Counter** - the white countertop (stove, pots, board). Back edge on the
  wall joint, front edge on the white lip above the open shelves, right end
  at the freezer.
- **Window ledge** - the white sill under the big window. Thin band ON the
  sill. The 'Apple skin' ellipse (room-details.js, x .688 y .453) must stay
  fully inside it.
- **Radiator top** - the thin sloped top board of the radiator. Food allowed.
- **Radiator** (food:false) - the vertical front face below that board. Food
  placement must be REJECTED here; flies may still stand and walk.
- **Top shelf** - the upper wall shelf; the band sits on the board at the
  bases of the jars, not among their bodies.
- **Freezer top** - the lid strip of the white freezer; not the front face
  with the magnets, not the plastic bag on the counter.
- **Trolley** - the middle wire tier of the cart, under the white pot.
- **Table** - follows the round tabletop edge including the right side.

Rules: flies may stand on ANY surface (including vertical faces); food
placement only where `food` is not false; eggs hatch where they were laid.

## The loop (up to ~8 rounds)

1. `python tools/overlay_surfaces.py C:/tmp/surfs.png`
2. Read the PNG. List polygons that float in air, cover the wrong object, or
   miss their board.
3. Edit the `poly` vertices in `simulation.js`.
4. Re-run the overlay, re-check. Continue until every surface is logical.

## Aftercare (mandatory)

1. `verify_room.js` placement probes must match reality: rejected points sit
   on walls / vertical faces (food:false), accepted points sit on real
   horizontal boards. Move probes if polygons moved.
2. Bump the cache version: `simulation.js?v=<new-tag>` in index.html.
3. `npm test` must exit 0.
4. Commit and push (deploys to GitHub Pages).

## Running it as a subagent

Feed a general-purpose agent a prompt with: the repo path, the tool command,
the per-surface checklist above, the loop with a round limit (~8), the
CRLF warning (edit JS files with exact single-line replacements or
newline='' IO), the aftercare steps, a ban on git commands, and a request
for a final per-surface report (old vs new vertices, probe changes, test
status). Then review the diff, run `npm test`, and commit+push yourself.
