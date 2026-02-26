# TRACE Adapters

This project uses a schema-adapter layer so `buildTraceIndex` can support multiple `trace.json`
shapes without changing UI components.

## Interface

`src/lib/trace/adapters/TraceAdapter.ts`

```ts
type TraceAdapter = {
  id: string
  detect(traceJson: unknown): boolean
  getEventSequence(traceJson: unknown): unknown[]
  extractIds(event: unknown): string[]
  extractTau(event: unknown): number | undefined
  extractWordIndex(event: unknown): number | undefined
}
```

## Current adapter

- `src/lib/trace/adapters/v1.ts`
  - `id: "v1"`
  - targets the current corpus format (`final_state.vm.H`, `vm.H`, `deep_trace[].events`, etc.)

## Selection behavior

- Adapter list is ordered in `TRACE_INDEX_ADAPTERS` in `buildTraceIndex.ts`.
- Selection is deterministic: first adapter whose `detect(...)` returns `true` wins.
- `buildTraceIndex(...).summary.adapterId` records the selected adapter id.
- If none match, adapter id is `"none"` and event indexing is skipped.

## How to add `v2`

1. Create `src/lib/trace/adapters/v2.ts` exporting `V2_TRACE_ADAPTER`.
2. Implement all `TraceAdapter` methods for the new schema.
3. Add it before `v1` in `TRACE_INDEX_ADAPTERS`:
   - `const TRACE_INDEX_ADAPTERS = [V2_TRACE_ADAPTER, V1_TRACE_ADAPTER]`
4. Add/extend tests:
   - detection and first-match ordering
   - fixture coverage
   - golden linking tests if primary mappings differ
5. If linking behavior changes intentionally, update expectation JSON files in
   `src/fixtures/expectations/` explicitly.

## UI impact

No UI component changes are required when adding a new adapter.
UI code consumes `TraceIndex` only, and `buildTraceIndex` hides schema differences.
