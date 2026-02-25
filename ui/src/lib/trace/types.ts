export type TraceObject = Record<string, unknown>

export type TraceHandle = {
  id: string
  kind: string
  meta?: TraceObject
} & TraceObject

export type TraceBoundary = {
  id?: string
  inside?: string
  outside?: string
  members?: string[]
} & TraceObject

export type TraceLink = {
  from?: string
  to?: string
  label?: string
} & TraceObject

export type TraceRule = {
  id?: string
  target?: string
  patch?: TraceObject
  priority?: number
} & TraceObject

export type TraceEvent = {
  type: string
  tau: number
  data: TraceObject
} & TraceObject

export type TraceVm = {
  H: TraceEvent[]
} & TraceObject

export type TraceJsonState = {
  handles: TraceHandle[]
  boundaries: TraceBoundary[]
  links: TraceLink[]
  rules: TraceRule[]
  vm: TraceVm
} & TraceObject

export type TraceJson =
  | TraceJsonState
  | ({
      final_state: TraceJsonState
      post_reset_state?: TraceJsonState
      final_dump_state?: TraceJsonState
    } & TraceObject)

export type TraceIndex = {
  handleById: Map<string, TraceHandle>
  events: TraceEvent[]
  refsByHandleId: Map<string, number[]>
}
