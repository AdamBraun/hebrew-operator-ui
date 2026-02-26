# Semantic Vocabulary

This document defines the meaning-first color vocabulary for the UI.

Rules:
- Components must consume semantic tokens only.
- Components must not invent new color names.
- Every new color requires:
  1. a new token in `/Users/adambraun/projects/hebrew-operator-ui/src/design/semantic-tokens.ts`
  2. a matching entry in this document

## Seams / Boundaries (header + trace)

| Token | Definition | Where used | Examples |
| --- | --- | --- | --- |
| `seam.hard` | Hard lexical seam with strongest boundary semantics. | Header seam markers, trace seam indicators. | Hard boundary glyph, hard seam badge, hard seam line accent. |
| `seam.glue` | Soft join seam where adjacent forms remain connected. | Header seam markers, trace seam indicators. | Glue marker, soft-join span border, glue chip. |
| `seam.glue_maqqef` | Glue seam specifically driven by maqqef behavior. | Header seam markers, trace seam indicators. | Maqqef glue marker, maqqef-specific badge, maqqef-linked seam line. |
| `seam.cut.1` | Lowest cut intensity boundary in cut scale. | Header seam markers, trace segmentation overlays. | Cut level 1 divider, low-priority cut badge, shallow segmentation tick. |
| `seam.cut.2` | Medium cut intensity boundary in cut scale. | Header seam markers, trace segmentation overlays. | Cut level 2 divider, medium-priority cut badge, mid segmentation tick. |
| `seam.cut.3` | Highest cut intensity boundary in cut scale. | Header seam markers, trace segmentation overlays. | Cut level 3 divider, high-priority cut badge, strong segmentation tick. |

## Graph Objects (graph + trace badges)

| Token | Definition | Where used | Examples |
| --- | --- | --- | --- |
| `node.scope` | Scope node identity and scope-related badges. | Graph nodes, trace node badges, legend. | Scope node fill/stroke, scope badge chip, scope legend swatch. |
| `node.handle` | Handle node identity and handle-related badges. | Graph nodes, trace node badges, legend. | Handle node fill/stroke, handle badge chip, handle legend swatch. |
| `node.boundary` | Boundary node identity and boundary-related badges. | Graph nodes, trace node badges, legend. | Boundary node fill/stroke, boundary badge chip, boundary legend swatch. |
| `node.rule` | Rule node identity and rule-related badges. | Graph nodes, trace node badges, legend. | Rule node fill/stroke, rule badge chip, rule legend swatch. |
| `edge.link` | Standard link edge identity. | Graph edges, trace link badges, legend. | Link edge stroke, link badge accent, link legend swatch. |
| `edge.carry` | Carry/propagation edge identity. | Graph edges, trace carry badges, legend. | Carry edge stroke, carry badge accent, carry legend swatch. |
| `edge.trope` | Trope-labeled or trope-driven edge identity. | Graph edges, trace trope badges, legend. | Trope edge stroke, trope badge accent, trope legend swatch. |
| `state.warning` | Non-fatal warning state. | Graph/trace warnings, validation badges, alert accents. | Warning outline, warning badge, warning callout accent. |
| `state.error` | Error/failure state. | Graph/trace errors, validation badges, alert accents. | Error outline, error badge, error panel accent. |

## Interaction Overlays (all panes)

| Token | Definition | Where used | Examples |
| --- | --- | --- | --- |
| `select.primary` | Primary active selection. | Header, trace, graph, legend overlays. | Selected token highlight, selected node ring, selected row background. |
| `select.related` | Secondary/related selection linked to primary. | Header, trace, graph, legend overlays. | Related node ring, related trace row tint, related marker highlight. |
| `dim.inactive` | De-emphasis overlay for context not currently active. | Header, trace, graph, legend overlays. | Inactive row dim, muted node/edge tint, inactive legend swatch. |

## Mapping Contract

- Semantic token names are canonical and stable.
- CSS variables are the implementation layer (for example, `seam.hard` -> `--semantic-seam-hard`).
- Components should consume semantic values through the token utilities in `/Users/adambraun/projects/hebrew-operator-ui/src/design/semantic-tokens.ts`.
