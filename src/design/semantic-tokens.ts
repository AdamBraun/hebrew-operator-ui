export const SEMANTIC_TOKENS = [
  'seam.hard',
  'seam.glue',
  'seam.glue_maqqef',
  'seam.cut.1',
  'seam.cut.2',
  'seam.cut.3',
  'node.scope',
  'node.handle',
  'node.boundary',
  'node.rule',
  'edge.link',
  'edge.carry',
  'edge.trope',
  'state.warning',
  'state.error',
  'select.primary',
  'select.related',
  'dim.inactive',
] as const

export type SemanticToken = (typeof SEMANTIC_TOKENS)[number]

export type SemanticTokenCssVarName = `--${string}`

export const SEMANTIC_TOKEN_CSS_VARS: Record<SemanticToken, SemanticTokenCssVarName> = {
  'seam.hard': '--seam-hard',
  'seam.glue': '--seam-glue',
  'seam.glue_maqqef': '--seam-glue-maqqef',
  'seam.cut.1': '--seam-cut-1',
  'seam.cut.2': '--seam-cut-2',
  'seam.cut.3': '--seam-cut-3',
  'node.scope': '--node-scope',
  'node.handle': '--node-handle',
  'node.boundary': '--node-boundary',
  'node.rule': '--node-rule',
  'edge.link': '--edge-link',
  'edge.carry': '--edge-carry',
  'edge.trope': '--edge-trope',
  'state.warning': '--state-warning',
  'state.error': '--state-error',
  'select.primary': '--select-primary',
  'select.related': '--select-related',
  'dim.inactive': '--dim-inactive',
}

export type SemanticTokenCssValue = `var(${SemanticTokenCssVarName})`

export const semanticTokenVar = (token: SemanticToken): SemanticTokenCssValue =>
  `var(${SEMANTIC_TOKEN_CSS_VARS[token]})`
