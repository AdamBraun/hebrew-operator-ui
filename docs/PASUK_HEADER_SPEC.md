# Pasuk Header Spec

Single source of truth for Epic 4 Task 0.

## Purpose

Define implementation-ready behavior for the Pasuk Header so all downstream tasks share one contract.

## Required User Outcomes

1. The pasuk is readable (RTL Hebrew with niqqud and teamim).
2. Word seams are visible in the header without opening trace detail.
3. Clicking a word drives synchronized trace and graph highlighting.

## Canonical Decisions

### D0.1 Render as word chips, not a single text line

- Decision: each word is a separate interactive chip.
- Justification: stable hit targets for click/hover, unambiguous per-word selection, consistent highlight behavior.

### D0.2 Seam indicator is between words

- Decision: render seam as a small marker after each word chip (in reading flow).
- Justification: boundaries are inter-word semantics; this avoids styling seams as if they are inside a word.

### D0.3 Seam color mapping matches global semantic tokens

- Decision: use existing seam semantic tokens across header/trace/navigation surfaces.
- Justification: one learned color language, lower cognitive load.

### D0.4 Two modes: Read and Inspect

- Decision: default mode is `read`; `inspect` reveals instrumentation (index + seam text/meta).
- Justification: progressive disclosure keeps default reading calm while preserving power-user detail.

### D0.5 Horizontal scroll, no wrapping

- Decision: chips never wrap; header is horizontally scrollable and auto-scrolls selected word into view.
- Justification: wrapping breaks adjacency and seam interpretation.

### D0.6 No hard dependency on `trace.json` schema

- Decision: MVP derives model from minimal `trace.txt` parsing; optional `trace.json` enrichment is best-effort.
- Justification: robust against schema drift and preserves baseline UX.

## Data Contract

```ts
export type SeamKind =
  | 'hard'
  | 'glue'
  | 'glue_maqqef'
  | 'cut_1'
  | 'cut_2'
  | 'cut_3'
  | 'unknown'

export type PasukHeaderModel = {
  ref: {
    book: string
    chapter3: string
    verse3: string
  }
  words: Array<{
    text: string
    index: number // 1-based
    seamAfter: SeamKind
    seamMeta?: Record<string, unknown>
  }>
  selection?: {
    wordIndex?: number
  }
}
```

### Invariants

- `words` must be ordered by ascending `index` and dense (`1..N`).
- `text` is render-ready Hebrew (do not strip niqqud/teamim).
- `seamAfter` is always present; unknown values must map to `"unknown"`.
- `selection.wordIndex` is optional; if present but out of range, treat as no selection.

## Model Derivation Rules

MVP source precedence:

1. Parse `trace.txt` `WORD` rows for `text`, `index`, and seam.
2. If `WORD` rows are missing, use `cleaned:` line split by spaces and set `seamAfter: "unknown"` for all words.
3. If both fail, return `words: []`.
4. `trace.json` may enrich `seamMeta` only; failure to parse/enrich must not block rendering.

Recommended `trace.txt` row parse shape:

- Row form: `WORD <index> │ <word> ... exit_kind=<kind> ... exit=□cut(n)|□glue|...`
- Mapping:
  - `exit_kind=hard` -> `hard`
  - `exit_kind=glue` -> `glue`
  - `exit_kind=glue_maqqef` -> `glue_maqqef`
  - `exit_kind=cut` with `cut(1|2|3)` -> `cut_1|cut_2|cut_3`
  - unrecognized/missing -> `unknown`

## Rendering Rules

### Container and text

- Root must use `dir="rtl"` and `lang="he"`.
- Preserve Hebrew shaping features from typography tokens.
- Chips must render in a single horizontal lane with `overflow-x: auto` and no wrapping.

### Word chip structure

- Each word is a focusable button-like chip.
- Each chip includes:
  - visible Hebrew word text
  - seam marker element immediately after the chip in reading flow
- Last word also shows seam marker (final boundary remains semantically meaningful).

### Mode behavior

- `read` mode:
  - show word text + seam marker only
  - hide index and seam label text
- `inspect` mode:
  - show index badge (`#<index>`)
  - show seam label text (`hard`, `glue`, `cut_2`, etc.)
  - optional `seamMeta` tooltip/badge if available

### Color and emphasis constraints

- Seam markers use semantic seam tokens only (table below).
- Hebrew glyph color remains neutral text during selection.
- Selected word uses `select.primary` outline/ring.
- Related linked words (if shown) use `select.related`.
- Unknown seam marker uses muted `dim.inactive`.

## Seam Mapping Table

| `SeamKind` | Visual marker (between words) | Semantic token | CSS var |
| --- | --- | --- | --- |
| `hard` | solid square marker (`H` fallback label in inspect) | `seam.hard` | `--seam-hard` |
| `glue` | filled dot marker (`G` fallback label in inspect) | `seam.glue` | `--seam-glue` |
| `glue_maqqef` | short horizontal bar marker (`GM` fallback label in inspect) | `seam.glue_maqqef` | `--seam-glue-maqqef` |
| `cut_1` | single vertical tick (`C1`) | `seam.cut.1` | `--seam-cut-1` |
| `cut_2` | double vertical tick (`C2`) | `seam.cut.2` | `--seam-cut-2` |
| `cut_3` | triple vertical tick (`C3`) | `seam.cut.3` | `--seam-cut-3` |
| `unknown` | hollow marker + `?` in inspect | `dim.inactive` | `--dim-inactive` |

## Interaction Rules

### Primary interactions

- Click on word chip:
  - set `selection.wordIndex`
  - emit selection event with word index
  - drive trace + graph highlighting from that selection
- Click on already-selected word:
  - no-op (no focus-mode toggle in MVP)
- Hover on word chip:
  - optional transient highlight in trace/graph
  - clear on pointer leave

### Keyboard interactions

- Word chips are keyboard reachable.
- `Enter`/`Space` selects focused word.
- Arrow navigation is RTL-aware:
  - `ArrowLeft` moves forward to next word index
  - `ArrowRight` moves backward to previous word index
- `Escape` clears selection.

### Scroll behavior

- On `selection.wordIndex` change, scroll selected chip into view with horizontal centering when possible.
- Use smooth scrolling for user-initiated selection, instant for initial mount restore.

## Integration Contract

Pasuk Header emits only word-level intent; page-level coordinator owns cross-pane linkage.

Recommended callback shape:

```ts
type PasukHeaderCallbacks = {
  onWordSelect?: (wordIndex: number, source: 'pointer' | 'keyboard') => void
  onWordHover?: (wordIndex?: number) => void
}
```

Coordinator responsibilities after `onWordSelect`:

1. Update header selection state.
2. Resolve trace highlight by `wordIndex` (`TraceIndex.byWordIndex` first, fallback strategy second).
3. Resolve graph highlight for the same word context.

## Accessibility Requirements

- Provide non-color cues for seam kinds (shape/label) so grayscale remains usable.
- Keep control contrast >= 4.5:1 and text contrast >= 7:1.
- Each chip must expose accessible name including word text; in inspect mode include index and seam in accessible description.
