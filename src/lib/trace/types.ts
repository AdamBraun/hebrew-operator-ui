export type TraceLocation = {
  kind: 'event' | 'snapshot' | 'word'
  index: number
  tau?: number
  wordIndex?: number
}

export type TraceIndex = {
  byId: Map<string, TraceLocation[]>
  byWordIndex?: Map<number, TraceLocation[]>
  byTau?: Map<number, TraceLocation[]>
  summary: {
    adapterId: string
    eventCount: number
    idCount: number
  }
}
