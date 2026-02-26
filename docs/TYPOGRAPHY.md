# Typography

This document defines the typography system for Hebrew verse rendering and trace scanning.

## Font stacks

Defined in `/Users/adambraun/projects/hebrew-operator-ui/src/design/typography.css`.

- UI: `--font-ui`
  - `'IBM Plex Sans', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`
- Hebrew verse: `--font-hebrew`
  - `'Noto Serif Hebrew', 'SBL Hebrew', 'Ezra SIL', 'Times New Roman', serif`
- Trace monospace: `--font-mono`
  - `'IBM Plex Mono', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace`

## Sizes and line-height

- Verse header metadata:
  - size: `--type-verse-header-size` (`0.94rem`)
  - line-height: `--leading-verse-header` (`1.35`)
- Verse text (Hebrew):
  - size: `--type-verse-text-size` (`1.85rem`)
  - line-height: `--leading-verse-text` (`1.75`)
- Trace and event fields:
  - text size: `--type-trace-size` (`0.82rem`)
  - line-number/index size: `--type-trace-line-number-size` (`0.79rem`)
  - line-height: `--leading-trace` (`1.45`)

## RTL and Hebrew rules

- Verse text uses:
  - `dir="rtl"`
  - `lang="he"`
  - `unicode-bidi: isolate`
- Hebrew shaping support is enabled through:
  - `font-feature-settings: 'kern' 1, 'mark' 1, 'mkmk' 1`
- Hebrew glyph color remains neutral during selection states.

## Trace alignment rules

- Trace line numbers, indices, and event fields use monospace and tabular digits:
  - `font-variant-numeric: tabular-nums lining-nums`
  - `font-feature-settings: 'tnum' 1, 'lnum' 1`
- This keeps line numbers and `tau`-related values visually aligned across cards and rows.

## Implementation references

- Typography tokens and shared rules:
  - `/Users/adambraun/projects/hebrew-operator-ui/src/design/typography.css`
- Verse components:
  - `/Users/adambraun/projects/hebrew-operator-ui/src/components/VerseText.tsx`
  - `/Users/adambraun/projects/hebrew-operator-ui/src/components/VerseHeader.tsx`
- Trace components:
  - `/Users/adambraun/projects/hebrew-operator-ui/src/components/TraceViewer.css`
  - `/Users/adambraun/projects/hebrew-operator-ui/src/components/TraceTextViewer.css`
  - `/Users/adambraun/projects/hebrew-operator-ui/src/components/TraceEventViewer.css`
