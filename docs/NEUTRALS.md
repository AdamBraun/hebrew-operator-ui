# Neutrals

This document defines the neutral foundation for the UI instrument-panel baseline.

## Neutral ramp

The neutral ramp is defined in `/Users/adambraun/projects/hebrew-operator-ui/src/design/tokens.neutral.css` and includes:

- `--neutral-bg`
- `--neutral-surface-1`
- `--neutral-surface-2`
- `--neutral-border`
- `--neutral-text`
- `--neutral-text-muted`

Light and dark theme values are both provided, with:
- explicit `data-theme` support (`light`/`dark`)
- `prefers-color-scheme` dark fallback
- OKLCH values with hex fallback

## Rationale

- Dense graph + trace layouts create constant visual load.
- A calm neutral ladder lowers fatigue while preserving structure.
- High-contrast neutral text establishes trust and keeps long traces readable at 100% and 125% zoom.
- Panel boundaries should remain visible through layered surfaces and a single consistent border token, not heavy multi-weight borders.

## Usage examples

### Panels

```css
.panel {
  background: var(--neutral-surface-1);
  border: 1px solid var(--neutral-border);
  color: var(--neutral-text);
}
```

### Modals

```css
.modal {
  background: var(--neutral-surface-1);
  border: 1px solid var(--neutral-border);
  color: var(--neutral-text);
}

.modal__meta {
  color: var(--neutral-text-muted);
}
```

### Code blocks / trace blocks

```css
.code-block {
  background: var(--neutral-surface-2);
  border: 1px solid var(--neutral-border);
  color: var(--neutral-text);
}

.code-block__line-no {
  color: var(--neutral-text-muted);
}
```

## Practical guidance

- Use `surface-1` for primary containers and cards.
- Use `surface-2` for inset regions (trace scroll areas, code panes, inspectors).
- Use a single 1px `border` token for separators and panel outlines.
- Use `text` for primary content and `text-muted` for secondary labels and metadata.

## Validation checklist

- Trace text remains crisp at 100% and 125% zoom in both themes.
- Panel edges are distinguishable without increasing border weight above 1px.
- Neutral text and chrome still satisfy the constraints in:
  - `/Users/adambraun/projects/hebrew-operator-ui/docs/COLOR_SYSTEM.md`
  - `/Users/adambraun/projects/hebrew-operator-ui/docs/ACCESSIBILITY_RULES.md`

