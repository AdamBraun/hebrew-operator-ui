# Accessibility Rules

This document defines required accessibility behavior for color usage across themes.

## Required Contrast

- Primary text on reading surfaces must be `>= 7:1` in both light and dark themes.
- UI chrome (borders, controls, badges, icons used as controls, subtle separators) must be `>= 4.5:1` in both themes.
- Contrast checks must use final rendered colors (after theme and opacity effects).

## Color-Blind Safety Requirements

- Do not rely on red vs green alone to communicate state.
- Every critical semantic distinction must have at least one non-color cue.
- Acceptable redundant cues:
  - shape difference
  - stroke pattern (solid/dashed/dotted)
  - icon
  - text label
  - line weight

## Grayscale Test Instructions (No-Color Test)

### Setup

1. Open a verse with dense graph structure and long trace.
2. Test in both light and dark themes.
3. Enable grayscale by either:
   - browser vision-deficiency emulation (`achromatopsia`), or
   - temporary CSS rule:

```css
html {
  filter: grayscale(1);
}
```

### Validation checklist

| Area | Must remain distinguishable in grayscale | Required redundant cue |
| --- | --- | --- |
| Header seams | `seam.hard`, `seam.glue`, `seam.glue_maqqef`, `seam.cut.1/2/3` | seam glyphs, stroke pattern, or labels |
| Graph nodes | `node.scope`, `node.handle`, `node.boundary`, `node.rule` | node shape and/or icon |
| Graph edges | `edge.link`, `edge.carry`, `edge.trope` | stroke style and/or arrow/marker shape |
| Status states | `state.warning`, `state.error` | icon and label text |
| Selection overlays | `select.primary`, `select.related`, `dim.inactive` | ring thickness, pattern, opacity, label |
| Trace rows/badges | selected/related/inactive rows and badges | left marker, icon, or text treatment |

### Pass criteria

- If any pair of critical semantics can only be told apart by hue, the test fails.
- If readability drops below comfortable scanning for dense traces/graphs, the test fails.
- Both themes must pass.

## Extended Session Readability Check

1. Run the grayscale test in light theme for at least 10 minutes with dense content.
2. Repeat in dark theme.
3. Switch back to full color and repeat spot checks for semantic distinction.
4. Record failures with screenshot and affected semantic token names.

## Enforcement

- Pull requests that introduce or modify semantic colors must include:
  - contrast verification for both themes
  - grayscale checklist results
  - noted redundant cues for each changed semantic

