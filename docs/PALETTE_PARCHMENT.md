# Palette: Parchment + Instrument

## Intended mood

- Torah-adjacent reading atmosphere with instrument precision
- Warm manuscript-adjacent accents for long reading sessions
- Preserves technical legibility while reducing clinical feel

## Shared palette variables (Skin B)

Defined in `/Users/adambraun/projects/hebrew-operator-ui/src/design/palette.parchment.css`.

| Variable | Light | Dark |
| --- | --- | --- |
| `--p-accent` | `#8c6b2b` | `#d5b981` |
| `--p-accent-2` | `#627a44` | `#a8c27b` |
| `--p-accent-3` | `#2f7d80` | `#7cc7c7` |
| `--p-accent-4` | `#9a512f` | `#e19b72` |
| `--p-accent-5` | `#6d5741` | `#baa48b` |
| `--p-accent-6` | `#8b7a4e` | `#cab57f` |
| `--p-accent-7` | `#4e6785` | `#97b5d6` |
| `--p-warning-1` | `#996515` | `#f0c980` |
| `--p-error-1` | `#9f3338` | `#f0a1a5` |
| `--p-select-primary` | `#1d6ac4` | `#7fb9ff` |
| `--p-select-primary-glow` | `rgba(29, 106, 196, 0.28)` | `rgba(127, 185, 255, 0.34)` |
| `--p-select-related` | `#5f7691` | `#bfd2f0` |
| `--p-dim-inactive` | `rgba(33, 24, 14, 0.3)` | `rgba(249, 233, 208, 0.35)` |
| `--p-tint-accent` | `#f6eedf` | `#332717` |
| `--p-tint-warning` | `#f9edcf` | `#3d311b` |
| `--p-tint-error` | `#f8e4e2` | `#402023` |

Notes:
- OKLCH-authored values are included in the CSS and automatically applied when supported.
- Hex values are the fallback contract.

## Known strengths

- Reading-heavy workflows:
  - warm tints reduce glare and perceived fatigue during long trace review
  - semantic highlights remain present without a cold lab tone
- Graph-heavy workflows:
  - still maintains enough hue separation for boundary/selection/state scanning
  - selection and warning/error signals stay instrument-like and explicit

## Semantic stability

- Semantic token mapping is not skin-specific and lives in:
  - `/Users/adambraun/projects/hebrew-operator-ui/src/design/tokens.semantic.css`
- Switching from Parchment to Cool changes hue set only; semantic assignment remains fixed.

