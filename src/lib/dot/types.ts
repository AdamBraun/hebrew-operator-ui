export type DotNode = {
  id: string
  label?: string
  attrs: Record<string, string>
}

export type DotEdge = {
  from: string
  to: string
  attrs: Record<string, string>
}

export type DotGraph = {
  nodes: DotNode[]
  edges: DotEdge[]
}

