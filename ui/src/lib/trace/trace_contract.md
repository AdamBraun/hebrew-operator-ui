# Trace JSON Contract (UI Subset)

This document defines the stable subset of `trace.json` that the UI consumes.

## Scope

The UI depends only on these fields from a trace state object:

- `handles`
- `boundaries`
- `links`
- `rules`
- `vm` (specifically `vm.H`)

All other fields are optional/opaque for UI purposes.

## Normalization

Current corpus payloads may expose the trace state in one of two ways:

1. Directly on the root object (`handles`, `boundaries`, `links`, `rules`, `vm`)
2. Under a wrapper field such as `final_state` (with the same state shape)

UI code should normalize incoming payloads to a single trace state before rendering.  
After normalization, the selected state object is the `TraceJson` shape below.

## Schemas

### `TraceJson`

```json
{
  "handles": [TraceHandle],
  "boundaries": [TraceBoundary],
  "links": [TraceLink],
  "rules": [TraceRule],
  "vm": {
    "H": [TraceEvent]
  }
}
```

### `TraceHandle`

```json
{
  "id": "string",
  "kind": "string",
  "meta": {}
}
```

`meta` is optional and should be treated as an opaque object.

### `TraceEvent` (`vm.H[]`)

```json
{
  "type": "string",
  "tau": 0,
  "data": {}
}
```

`data` is an event-specific object and should be treated as opaque by default.

### `TraceBoundary`, `TraceLink`, `TraceRule`

These are consumed as object arrays, with forward-compatible unknown fields.

- `TraceBoundary` objects commonly include handle references like `id`, `inside`, `outside`, `members`.
- `TraceLink` objects commonly include handle references like `from`, `to`, `label`.
- `TraceRule` objects commonly include fields like `id`, `target`, `patch`, `priority`.

## Stability Rules

- Required collection fields: `handles`, `boundaries`, `links`, `rules`, `vm.H`.
- Required handle fields: `id`, `kind`.
- Required event fields: `type`, `tau`, `data`.
- Extra fields must be ignored unless explicitly adopted by the UI contract.
