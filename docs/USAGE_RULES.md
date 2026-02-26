# Usage Rules

This document defines strict usage rules for semantic color application.

## Core intent

- Keep large graphs calm by default.
- Preserve Hebrew readability under all interactions.
- Reserve saturation for meaning-critical cues only.

## Non-negotiable rules

1. Default fills stay neutral.
Components should use semantic color on borders, badges, outlines, and strokes first.

2. Filled semantic anchors are rare.
Only anchor entities may use semantic fills (for example scope anchors or `Ω`).

3. Trope edges are always muted and dashed.
Trope edges must use `text-muted`-family color and dashed stroke treatment.
Trope edges must not use accent colors.

4. Cut colors are marker-level only.
`seam.cut.*` colors are allowed for chips, badges, and local markers.
Cut colors are not allowed as full-panel or full-canvas backgrounds.

5. Selection is outline + glow.
Selection emphasis uses outline/ring plus glow.
Hebrew glyph color remains neutral text color during selection.

## Practical application guidance

- Prefer:
  - neutral `surface` fill + semantic border
  - neutral text + semantic badge
  - dashed muted stroke for trope
- Avoid:
  - full-node semantic fill for every node
  - full-panel tint based on cut levels
  - recoloring Hebrew text to indicate selection

## Legend reference

The visual rule demo is implemented in:

- `/Users/adambraun/projects/hebrew-operator-ui/src/components/GraphViewer/GraphUsageLegend.tsx`

It demonstrates:

- neutral default node fill with semantic border
- rare filled anchor sample
- dashed muted trope edge sample
- cut chips/markers only
- selection outline + glow with unchanged Hebrew text color

## Review checklist

- Large graph remains mostly neutral at first glance.
- Structural edges dominate; trope edges stay visually secondary.
- Selection is obvious without flooding the canvas with color.
- Hebrew text remains legible and stable in neutral text color.
