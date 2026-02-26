# Seam Markers

Visual alphabet for Pasuk Header seam markers.

## Design Rules

- Use shape + color together; never color alone.
- Keep markers tiny and scannable in default Read mode.
- Show textual seam names in Inspect mode or tooltip, not inline by default.

## Seam Mapping

| SeamKind | Shape (default glyph) | Color token | Rationale |
| --- | --- | --- | --- |
| `hard` | `|` (thin vertical bar) | `--neutral-border` | Strong boundary that stays calm and stable in dense headers. |
| `glue` | `•` (link dot) | `--seam-glue` (`seam.glue`) | Soft continuation should read as connected flow. |
| `glue_maqqef` | `••` (double dot/chain) | `--seam-glue-maqqef` (`seam.glue_maqqef`) | Tighter join than plain glue, still in the glue family. |
| `cut_1` | `›` (light chevron) | `--seam-cut-1` (`seam.cut.1`) | Lowest cut strength in the cut progression. |
| `cut_2` | `»` (double chevron) | `--seam-cut-2` (`seam.cut.2`) | Mid cut strength; visually stronger than `cut_1`. |
| `cut_3` | `❯❯` (bold double chevron) | `--seam-cut-3` (`seam.cut.3`) | Strongest cut strength for maximum separation signal. |
| `unknown` | `·` (faint dot) | `--dim-inactive` (`dim.inactive`) | Neutral fallback when seam data is unavailable. |

## Inspect Tooltip Copy

Recommended tooltip text pattern:

- `Boundary after word: glue`
- `Boundary after word: glue_maqqef`
- `Boundary after word: cut(rank=2)`

## Accessibility Notes

- Distinction must remain visible in grayscale; shapes are the primary non-color cue.
- Maintain contrast targets from `docs/ACCESSIBILITY_RULES.md`:
  - text >= `7:1`
  - UI chrome/markers >= `4.5:1`
- Validate in both light and dark themes with achromatopsia/grayscale checks.
- If any seam pair is only distinguishable by hue, the design fails and must add stronger shape differences.

