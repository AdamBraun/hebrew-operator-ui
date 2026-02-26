# Color System

This document defines how colors are authored and constrained across the UI.

## Scope

- Applies to all panes: header, trace, graph, and legend.
- Semantic meaning is defined in `/Users/adambraun/projects/hebrew-operator-ui/docs/SEMANTIC_VOCABULARY.md`.
- Components consume semantic tokens only.

## Method (Decision A)

1. Author color values in OKLCH for perceptual consistency.
2. Bind OKLCH values to semantic CSS variables.
3. Compile and ship with hex fallback for environments that do not support OKLCH.

Example pattern:

```css
:root {
  --semantic-node-scope: oklch(0.72 0.08 95);
}

@supports not (color: oklch(0.7 0.1 120)) {
  :root {
    --semantic-node-scope: #b8a36b;
  }
}
```

## Theme Stability Rules

- Keep semantic identity stable across themes by preserving hue family per token.
- Theme changes should primarily adjust lightness, then chroma only if needed for contrast.
- Dark/light token variants must still map to the same semantic name.

Recommended chroma discipline:

| Class | Intended use | Chroma guidance |
| --- | --- | --- |
| Neutral | Surfaces, dividers, inactive text/chrome | low (`C` roughly `0.00` to `0.03`) |
| Accent | Semantic nodes/edges/seams/states | medium (`C` roughly `0.05` to `0.16`) |
| Glow | Active selection emphasis only | high allowed (`C` above `0.16`) |

## Non-Negotiable Constraints (Decision B)

### 1) Contrast

- Primary text contrast must be `>= 7:1` on all reading surfaces in both themes.
- UI chrome contrast (borders, controls, glyph accents, badges) must be `>= 4.5:1` in both themes.

### 2) Saturation discipline

- Neutrals must remain low saturation.
- Accents must remain medium saturation.
- Only selection glow may use high saturation.

### 3) Color-blind safety

- Never encode meaning using red vs green alone.
- Every critical distinction must include a redundant cue:
  - shape
  - stroke style
  - icon
  - or label text

## Dense UI Readability Rules

- SVG graph edges and trace highlights must remain distinguishable at typical zoom levels.
- Thin strokes must not be differentiated by hue alone.
- Selected vs related vs inactive states must remain distinguishable using non-color signals.

## Governance

- New color meaning requires:
  1. new semantic token in `/Users/adambraun/projects/hebrew-operator-ui/src/design/semantic-tokens.ts`
  2. new entry in `/Users/adambraun/projects/hebrew-operator-ui/docs/SEMANTIC_VOCABULARY.md`
  3. contrast and grayscale validation against this document

