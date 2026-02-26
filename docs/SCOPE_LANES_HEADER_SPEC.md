# Scope Lanes Header Spec

Single source of truth for the Pasuk Header approach: unchanged verse text + stacked scope lanes.

## Purpose

Define the exact UI/UX, rendering behavior, and data contract for presenting verse structure with stacked lane spans under a visually normal Hebrew verse.

## Canonical Decisions

### 1) Keep verse text visually normal

- Decision: no inline seam glyphs and no per-word coloring by default.
- Justification: preserves familiar Masoretic appearance and reduces mental load.

### 2) Show structure as separate lanes

- Decision: stacked lane spans under the verse represent grouping.
- Justification: span/grouping metaphors are learned quickly and require less symbol training.

### 3) Default to 2 lanes, optional fine lane

- Decision: show coarse + medium lanes by default; allow a toggle for fine lane.
- Justification: avoids early clutter while preserving advanced detail on demand.

### 4) Monochrome by default, color on interaction

- Decision: lane strokes are neutral at rest; interaction states may use semantic color.
- Justification: keeps baseline calm and text-first while preserving discoverability.

### 5) SVG overlay for lanes

- Decision: lane rendering uses SVG, not CSS borders.
- Justification: precise alignment, crisp strokes, reliable hit-testing, and straightforward theming.

## Data Contract

```ts
export type ScopeLaneLevel = 3 | 2 | 1

export type ScopeLaneSpan = {
  id: string
  lane: ScopeLaneLevel
  startWordIndex: number // inclusive, 1-based
  endWordIndex: number // inclusive, 1-based
  kind?: 'group' | 'join' | 'cut' | 'unknown'
  rank?: 1 | 2 | 3
  label?: string
  meta?: Record<string, unknown> // trope, source ids, debug payload, etc.
}

export type ScopeLanesHeaderModel = {
  ref: { book: string; chapter3: string; verse3: string }
  words: Array<{ index: number; text: string }>
  spans: ScopeLaneSpan[]
  selection?: {
    wordIndex?: number
    spanId?: string
  }
}
```

### Invariants

- `words` are dense and ordered (`1..N`).
- `startWordIndex <= endWordIndex`.
- span indices are within `[1, words.length]`.
- lanes map to meaning:
  - lane `3` = coarse structure
  - lane `2` = medium structure
  - lane `1` = fine structure (optional visibility)

## Visual Layout

### Desktop

- Two-row header block:
  1. verse text row (RTL Hebrew; unchanged visual treatment)
  2. scope lanes row (SVG canvas aligned to word positions)
- Default visible lanes: `3`, `2`.
- Optional control toggles lane `1`.

### Tablet

- Same structure as desktop.
- Preserve horizontal continuity; no word wrapping introduced by lanes.
- Lane row height may increase slightly to keep hit targets usable.

### Phone

- Verse + lane block remains a single horizontal scroll context.
- Verse text remains readable; lane strokes remain tappable.
- Default remains two lanes; fine lane off by default.

## Lane Meanings

- Lane `3` (coarse): dominant phrase/group boundaries; lowest density, highest explanatory value.
- Lane `2` (medium): secondary grouping; balances readability and detail.
- Lane `1` (fine, optional): granular segmentation for expert analysis/debug.

## Span Style Rules (MVP)

- Rendering primitive: rounded polyline/bracket-like underline path per span.
- Stroke color at rest: neutral token (monochrome).
- Stroke widths:
  - lane `3`: `2.5px`
  - lane `2`: `2px`
  - lane `1`: `1.5px`
- Line cap/join: `round`.
- Corner radius target for turns: `4px` to `6px`.
- Vertical lane spacing: minimum `6px`.
- Lane-to-verse gap: minimum `8px`.
- Span endpoints snap to word box edges (logical RTL-aware edges).

## Interaction Rules

### Hover (pointer devices)

- Hovering a span or word previews related structure:
  - active span stroke weight +1px
  - optional semantic tint for active + related spans
  - non-related spans may dim slightly

### Selection

- Selecting a word or span sets persistent focus.
- Selected state must use non-color cues:
  - heavier stroke and/or dash pattern change
  - focus ring/halo on anchor word
- Default click behavior:
  - click word: select word and nearest/primary span(s)
  - click selected word again: no-op (MVP consistency with existing header interaction)

### Color usage

- Default state: monochrome lanes.
- Interaction state only:
  - selected/related may use semantic selection tokens (`select.primary`, `select.related`)
  - optional semantic seam/rank accents may appear only while active/hovered

## Tooltip Requirements

Tooltip is shown on span hover/focus and must include:

1. boundary/lane meaning:
   - `Scope lane: coarse (rank 3)` or `medium (rank 2)` or `fine (rank 1)`
2. span coverage:
   - `Words 4–7`
3. if available metadata:
   - `Kind: glue/cut/...`
   - `Trope: <name>`
   - `Rank: <n>`

Tooltip content must be concise and stable across themes.

## Accessibility Requirements

- Header root uses `dir="rtl"` and `lang="he"` for verse text context.
- Words remain keyboard reachable.
- SVG spans are keyboard reachable in inspect/interactive mode (`tabindex="0"` for active hit targets).
- Each interactive span has an accessible name, for example:
  - `Scope span lane 2, words 4 to 7`
- Selection state is announced (`aria-selected` or equivalent state on interactive container).
- Focus indicators are visible in both themes and do not rely on color alone.
- Screen reader path:
  - word selection announcement
  - associated span summary announcement

## Performance Constraints

- Word-to-pixel anchor measurement is cached.
- Lane path recalculation happens only on:
  - container resize
  - horizontal scroll sync changes
  - word content/model change
- Avoid per-frame recompute during passive hover.
- Use `ResizeObserver` for size changes; throttle/debounce expensive recompute work.
- SVG should avoid excessive DOM nodes:
  - one path per span, no per-character primitives.

## Non-Goals (MVP)

- No animated drawing of all paths on every state update.
- No per-word default color coding.
- No dependency on unstable VM internals beyond normalized header model input.

