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

export type SemanticTokenCssVarName = `--semantic-${string}`

export const SEMANTIC_TOKEN_CSS_VARS: Record<SemanticToken, SemanticTokenCssVarName> = {
  'seam.hard': '--semantic-seam-hard',
  'seam.glue': '--semantic-seam-glue',
  'seam.glue_maqqef': '--semantic-seam-glue-maqqef',
  'seam.cut.1': '--semantic-seam-cut-1',
  'seam.cut.2': '--semantic-seam-cut-2',
  'seam.cut.3': '--semantic-seam-cut-3',
  'node.scope': '--semantic-node-scope',
  'node.handle': '--semantic-node-handle',
  'node.boundary': '--semantic-node-boundary',
  'node.rule': '--semantic-node-rule',
  'edge.link': '--semantic-edge-link',
  'edge.carry': '--semantic-edge-carry',
  'edge.trope': '--semantic-edge-trope',
  'state.warning': '--semantic-state-warning',
  'state.error': '--semantic-state-error',
  'select.primary': '--semantic-select-primary',
  'select.related': '--semantic-select-related',
  'dim.inactive': '--semantic-dim-inactive',
}

export type SemanticTokenCssValue = `var(${SemanticTokenCssVarName})`

export const semanticTokenVar = (token: SemanticToken): SemanticTokenCssValue =>
  `var(${SEMANTIC_TOKEN_CSS_VARS[token]})`
