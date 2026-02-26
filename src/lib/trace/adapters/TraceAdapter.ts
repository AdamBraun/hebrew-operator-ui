export type TraceAdapter = {
  id: string
  detect(traceJson: unknown): boolean
  getEventSequence(traceJson: unknown): unknown[]
  extractIds(event: unknown): string[]
  extractTau(event: unknown): number | undefined
  extractWordIndex(event: unknown): number | undefined
}
