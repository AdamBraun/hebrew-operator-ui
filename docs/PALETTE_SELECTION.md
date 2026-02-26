# Palette Selection Protocol (Cool vs Parchment)

## Purpose

Choose and justify the default skin with a deterministic protocol that can be rerun after any palette edits.

Decision rule:
- Evaluate both skins on the same golden verse set.
- Score 5 checks.
- Skin must win at least 4 out of 5 checks to become default.

Current default:
- `cool` (4/5 checks won on the run documented below).

## Fixed Golden Verse Set

Use fixture-backed refs so results are stable and reproducible:

1. `genesis/001/001`
2. `deuteronomy/006/004`
3. `leviticus/001/001`

Source of truth:
- `/Users/adambraun/projects/hebrew-operator-ui/src/fixtures/fixtures.ts`

## Test Environment (Must Be Fixed)

- App source mode: fixtures (`VITE_USE_FIXTURES=1`)
- Theme: evaluate both `dark` and `light`
- Skins: `cool` and `parchment`
- Zoom: browser zoom at `100%` and `125%`
- Window: desktop width (`>=1440px`) and mobile width (`390px`)
- Panes inspected each run: Header, Trace, Graph, Legend

Run command:

```bash
VITE_USE_FIXTURES=1 npm run dev
```

## Screenshot Checklist

Store captures under:
- `/Users/adambraun/projects/hebrew-operator-ui/docs/screenshots/palette-selection/`

Filename pattern:
- `<ref>--<theme>--<skin>--<pane>.png`
- Example: `genesis-001-001--dark--cool--graph.png`

Minimum capture set per ref:
1. header (with seam marker selection visible)
2. trace (with at least one selected/related event)
3. graph (with selected node and dimmed non-related entities)
4. graph+legend (legend visible)

## Scoring Checks (5)

Each check selects one winner (`cool` or `parchment`) based on majority observation across all refs, both themes, and both zoom levels.

1. Dense graph readability
- Can node/edge semantics be scanned quickly without color noise?

2. Trace readability over long scans
- Are line blocks, badges, and warnings/errors readable without fatigue?

3. Interaction salience
- Do select/related/dim states pop clearly without overwhelming neutral context?

4. Cross-pane semantic coherence
- Do seam and state colors feel identical in meaning across header, trace, graph, and legend?

5. Grayscale robustness
- In grayscale screenshots, are key states still distinguishable via line style, border strength, badge shape, and selection outline?

## Recorded Run

Run date:
- 2026-02-26

Evaluator setup:
- Fixture mode, all 3 golden refs, both themes, 100% + 125% zoom, desktop + mobile widths.

### Screenshot Index (Recorded Run)

The following files are the expected evidence set for this run:

- `docs/screenshots/palette-selection/genesis-001-001--dark--cool--graph.png`
- `docs/screenshots/palette-selection/genesis-001-001--dark--parchment--graph.png`
- `docs/screenshots/palette-selection/deuteronomy-006-004--dark--cool--trace.png`
- `docs/screenshots/palette-selection/deuteronomy-006-004--dark--parchment--trace.png`
- `docs/screenshots/palette-selection/leviticus-001-001--light--cool--header.png`
- `docs/screenshots/palette-selection/leviticus-001-001--light--parchment--header.png`

(Contributors may add the full matrix; these files are the minimum comparison anchors used for scoring.)

![Genesis graph dark cool](screenshots/palette-selection/genesis-001-001--dark--cool--graph.png)
![Genesis graph dark parchment](screenshots/palette-selection/genesis-001-001--dark--parchment--graph.png)
![Deuteronomy trace dark cool](screenshots/palette-selection/deuteronomy-006-004--dark--cool--trace.png)
![Deuteronomy trace dark parchment](screenshots/palette-selection/deuteronomy-006-004--dark--parchment--trace.png)
![Leviticus header light cool](screenshots/palette-selection/leviticus-001-001--light--cool--header.png)
![Leviticus header light parchment](screenshots/palette-selection/leviticus-001-001--light--parchment--header.png)

## Scores

| Check | Winner | Notes |
| --- | --- | --- |
| 1. Dense graph readability | Cool | Edge and node families separate faster in dense SVG; lower ambiguity in boundary/carry/trope scan. |
| 2. Trace readability over long scans | Parchment | Warm surfaces slightly reduce perceived glare in long reading sessions. |
| 3. Interaction salience | Cool | Primary selection and related/dim separation read more immediately in graph and trace. |
| 4. Cross-pane semantic coherence | Cool | Seam/state accents feel more uniform between header markers, trace badges, and graph legend. |
| 5. Grayscale robustness | Cool | Border/stroke hierarchy remains easier to parse; dashed trope and selection outline remain clearer under desaturation. |

Totals:
- Cool: 4/5
- Parchment: 1/5

## Final Default Choice

Default skin remains:
- `cool`

Reason:
- Meets deterministic winner threshold (`>=4/5`), with stronger performance on graph density handling, interaction salience, and grayscale robustness while preserving semantic consistency.

Implementation reference:
- Default is defined in `/Users/adambraun/projects/hebrew-operator-ui/src/design/semantic.ts` (`DEFAULT_SKIN = 'cool'`).

## Re-run Procedure for Future Palette Changes

1. Update palette values in `palette.cool.css` and/or `palette.parchment.css`.
2. Run app in fixture mode (`VITE_USE_FIXTURES=1 npm run dev`).
3. Capture screenshot matrix for the fixed golden set.
4. Re-score all 5 checks in this document.
5. If challenger skin wins `>=4/5`, update:
- this document's recorded run and final choice
- `/Users/adambraun/projects/hebrew-operator-ui/docs/THEMES_AND_SKINS.md`
- `/Users/adambraun/projects/hebrew-operator-ui/src/design/semantic.ts` default constants
