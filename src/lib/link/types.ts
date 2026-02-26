import type { TraceLocation } from '../trace/types'

export type GraphEntityKind = 'node' | 'edge'

// DOT-derived identifier used by rendered graph entities.
export type GraphEntityId = string

export type GraphSelection = {
  kind: GraphEntityKind
  id: GraphEntityId
  label?: string
}

export type ResolveConfidence = 'high' | 'medium' | 'low'

export type ResolveResult = {
  primary?: TraceLocation
  alternatives: TraceLocation[]
  confidence: ResolveConfidence
}
