# UI ID Map Contract

This document defines the stable linking contract from graph selections to trace locations:

- Input: `GraphSelection` (from rendered DOT/SVG click)
- Output: `ResolveResult` (`primary` + ranked alternatives + confidence)

TypeScript source of truth: `src/lib/link/types.ts`.

## Scope

The contract is for UI linking only:

- Graph click (`node`/`edge`) -> trace position(s)
- Deterministic behavior with local fixtures and production data
- Backward-compatible fallback when deterministic id linking fails

## Terms

### GraphEntityId

A `GraphEntityId` is the exact DOT entity id for a node or edge endpoint token:

- Node examples: `A33`, `C:1:1`, `ש:1:4`
- Edge examples: resolver may use edge id token or parse endpoints from `from -> to`

Rules:

- Preserve exact id text from DOT (no mutation, no normalization that changes value)
- Do not depend on label text for identity
- Labels are advisory metadata only (`GraphSelection.label`)

### TraceLocation

`TraceLocation` points at one trace sequence element:

- `kind`: `"event" | "snapshot" | "word"`
- `index`: zero-based index inside that `kind` sequence
- optional `tau`
- optional `wordIndex`

`TraceLocation` is intentionally compact so it stays stable across UI refactors.

## Resolver Input/Output

Input type:

- `GraphSelection = { kind: "node"|"edge"; id: string; label?: string }`

Output type:

- `ResolveResult = { primary?: TraceLocation; alternatives: TraceLocation[]; confidence: "high"|"medium"|"low" }`

Output invariants:

- `alternatives` is always present (empty array allowed)
- `primary`, when present, should be one element from the ranked candidates
- candidates must be deterministic for the same input trace + selection

## Resolution Guarantees

The resolver must follow these guarantees:

1. Must resolve to 1 primary location when possible.
2. If multiple matches exist, rank them and expose the rest as `alternatives`.
3. If no deterministic id match exists, fall back to string search (Section 7 behavior).

## Recommended Resolution Algorithm

1. Collect deterministic matches by id from `TraceIndex.byId.get(selection.id)`.
2. If `selection.kind === "edge"` and no direct hit:
   - parse edge endpoints and try `byId` for each endpoint id.
3. Rank candidate `TraceLocation`s (highest first):
   - prefer `kind: "event"`
   - then lower absolute `tau` difference to current context (if available)
   - then lower `index`
4. Return:
   - `primary` = first ranked candidate
   - `alternatives` = remaining ranked candidates
5. If ranked candidate list is empty:
   - run Section 7 string-search fallback (id/label token search in trace text)
   - map fallback hits to `TraceLocation`s where possible
   - set lower confidence

## Confidence Policy

Use confidence to describe match quality:

- `high`: single direct id match from `byId`
- `medium`: multiple direct id matches (ranked) or edge-endpoint derived match
- `low`: fallback string-search resolution, or no `primary`

## UI Behavior Contract

When `primary` exists:

- jump/scroll trace to `primary`
- show `alternatives` in an inspectable list (debug/dev UI is acceptable)

When no `primary` exists:

- preserve current trace position
- show a non-blocking "no deterministic link" state
- still show fallback alternatives when available

## Determinism Requirements

For identical inputs (`trace`, `TraceIndex`, `GraphSelection`), resolver output must be identical:

- same `primary`
- same `alternatives` ordering
- same `confidence`

No randomization or time-dependent ranking is allowed.
