# Semantic Colors

Authoritative mapping of semantic meaning to palette variables.

Single source of truth:
- Runtime mapping: `/Users/adambraun/projects/hebrew-operator-ui/src/design/tokens.semantic.css`
- Token names: `/Users/adambraun/projects/hebrew-operator-ui/src/design/semantic-tokens.ts`
- Palette values: `/Users/adambraun/projects/hebrew-operator-ui/src/design/palette.cool.css`, `/Users/adambraun/projects/hebrew-operator-ui/src/design/palette.parchment.css`

## Truth table

| Token | Semantic CSS var | Palette var | Where used | Why |
| --- | --- | --- | --- | --- |
| `seam.hard` | `--seam-hard` | `--p-accent-4` | Header seam markers, trace seam markers | Strongest seam boundary should be visually distinct and stable. |
| `seam.glue` | `--seam-glue` | `--p-accent-2` | Header and trace glue markers | Marks soft continuity without collapsing into neutral text. |
| `seam.glue_maqqef` | `--seam-glue-maqqef` | `--p-accent-3` | Header and trace maqqef glue markers | Preserves maqqef-specific semantics with a distinct but related cue. |
| `seam.cut.1` | `--seam-cut-1` | `--p-accent` | Header/trace cut scale | Lowest cut intensity in the cut hierarchy. |
| `seam.cut.2` | `--seam-cut-2` | `--p-accent-5` | Header/trace cut scale | Mid cut intensity, differentiated from cut 1 and cut 3. |
| `seam.cut.3` | `--seam-cut-3` | `--p-accent-6` | Header/trace cut scale | Highest cut intensity in the cut hierarchy. |
| `node.scope` | `--node-scope` | `--p-accent` | Graph node styles, trace node badges, legend | Scope identity should remain immediately recognizable across panes. |
| `node.handle` | `--node-handle` | `--p-accent-2` | Graph node styles, trace node badges, legend | Handle identity remains consistent in graph + trace education surfaces. |
| `node.boundary` | `--node-boundary` | `--p-accent-5` | Graph node styles, trace node badges, legend | Boundary objects require stable visual distinction from scope/handle/rule. |
| `node.rule` | `--node-rule` | `--p-accent-7` | Graph node styles, trace node badges, legend | Rule objects need stable, non-warning/non-error identity. |
| `edge.link` | `--edge-link` | `--p-accent-3` | Graph edges, trace edge badges, legend | Baseline edge relation color for common links. |
| `edge.carry` | `--edge-carry` | `--p-accent-4` | Graph edges, trace edge badges, legend | Carry relation must remain distinguishable from link/trope. |
| `edge.trope` | `--edge-trope` | `--p-accent-6` | Graph edges, trace edge badges, legend | Trope-specific edge semantics require stable identity in dense graphs. |
| `state.warning` | `--state-warning` | `--p-warning-1` | Warning badges, warning panels, warning accents | Non-fatal caution state with consistent warning semantics. |
| `state.error` | `--state-error` | `--p-error-1` | Error badges/panels, failure states | Fatal/problem state with immediate recognizability. |
| `select.primary` | `--select-primary` | `--p-select-primary` | Active selection ring, active row/badge accents | Primary focus target across panes. |
| `select.related` | `--select-related` | `--p-select-related` | Related selection highlights | Secondary linked context without overriding primary focus. |
| `dim.inactive` | `--dim-inactive` | `--p-dim-inactive` | Inactive/dim overlays | De-emphasizes non-active context while preserving readability. |

## Governance

- Do not apply direct colors in components.
- If semantic meaning changes, change this mapping table intentionally in `tokens.semantic.css`.
- If a new meaning is needed, add:
  1. token name in `semantic-tokens.ts`
  2. row in this document
  3. mapping in `tokens.semantic.css`
  4. palette variable values in both skin files
