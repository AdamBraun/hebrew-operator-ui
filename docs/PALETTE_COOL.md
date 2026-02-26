# Palette: Cool Scientific Instrument

## Intended mood

- Clean laboratory instrumentation
- High signal separation for graph-heavy analysis
- Calm, low-fatigue neutral field with cool semantic accents

## Shared palette variables (Skin A)

Defined in `/Users/adambraun/projects/hebrew-operator-ui/src/design/palette.cool.css`.

| Variable | Light | Dark |
| --- | --- | --- |
| `--p-accent` | `#2c7de0` | `#78b7ff` |
| `--p-accent-2` | `#0f87c7` | `#63cbff` |
| `--p-accent-3` | `#0f8a86` | `#58d3c8` |
| `--p-accent-4` | `#4658d8` | `#a0a9ff` |
| `--p-accent-5` | `#2a5db7` | `#89b3ff` |
| `--p-accent-6` | `#2f8f7a` | `#74d4b5` |
| `--p-accent-7` | `#256f9c` | `#7bc3f5` |
| `--p-warning-1` | `#ad6c00` | `#f2ba69` |
| `--p-error-1` | `#b4233c` | `#ff96a3` |
| `--p-select-primary` | `#006dd6` | `#74ccff` |
| `--p-select-primary-glow` | `rgba(0, 109, 214, 0.28)` | `rgba(116, 204, 255, 0.34)` |
| `--p-select-related` | `#3f59ae` | `#b5bdfc` |
| `--p-dim-inactive` | `rgba(17, 26, 38, 0.35)` | `rgba(237, 242, 248, 0.38)` |
| `--p-tint-accent` | `#e8f2ff` | `#1f2e44` |
| `--p-tint-warning` | `#fff2d9` | `#3b2d18` |
| `--p-tint-error` | `#ffe7eb` | `#40202a` |

Notes:
- OKLCH-authored values are included in the CSS and automatically applied when supported.
- Hex values are the fallback contract.

## Known strengths

- Graph-heavy workflows:
  - edge and node accents separate cleanly against neutral surfaces
  - primary selection glow reads clearly in dense SVG
- Trace-heavy workflows:
  - highlighted rows remain visible without overpowering code-like text blocks

## Semantic stability

- Semantic token mapping is not skin-specific and lives in:
  - `/Users/adambraun/projects/hebrew-operator-ui/src/design/tokens.semantic.css`
- Switching from Cool to Parchment changes hue set only; semantic assignment remains fixed.

