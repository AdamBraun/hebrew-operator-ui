type UnknownRecord = Record<string, unknown>

export type EventSequenceResult = {
  events: unknown[] | null
  sourcePath: string | null
  topLevelKeys: string[]
}

type CandidatePath = {
  path: readonly string[]
  label: string
}

const PRIMARY_EVENT_PATHS: readonly CandidatePath[] = [
  { path: ['final_state', 'vm', 'H'], label: 'final_state.vm.H' },
  { path: ['vm', 'H'], label: 'vm.H' },
  { path: ['final_state', 'events'], label: 'final_state.events' },
  { path: ['events'], label: 'events' },
  { path: ['final_state', 'steps'], label: 'final_state.steps' },
  { path: ['steps'], label: 'steps' },
  { path: ['final_state', 'ops'], label: 'final_state.ops' },
  { path: ['ops'], label: 'ops' },
]

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function topLevelKeys(value: unknown): string[] {
  if (!isRecord(value)) {
    return []
  }

  return Object.keys(value).sort()
}

function valueAtPath(root: unknown, path: readonly string[]): unknown {
  let current: unknown = root
  for (const segment of path) {
    if (!isRecord(current)) {
      return undefined
    }

    current = current[segment]
  }

  return current
}

function flattenDeepTraceEvents(traceJson: unknown): unknown[] {
  if (!isRecord(traceJson) || !Array.isArray(traceJson.deep_trace)) {
    return []
  }

  const flattened: unknown[] = []
  for (const entry of traceJson.deep_trace) {
    if (!isRecord(entry) || !Array.isArray(entry.events)) {
      continue
    }

    flattened.push(...entry.events)
  }

  return flattened
}

export function getEventSequence(traceJson: unknown): EventSequenceResult {
  const keys = topLevelKeys(traceJson)

  for (const candidate of PRIMARY_EVENT_PATHS) {
    const value = valueAtPath(traceJson, candidate.path)
    if (!Array.isArray(value) || value.length === 0) {
      continue
    }

    return {
      events: value,
      sourcePath: candidate.label,
      topLevelKeys: keys,
    }
  }

  const deepTraceEvents = flattenDeepTraceEvents(traceJson)
  if (deepTraceEvents.length > 0) {
    return {
      events: deepTraceEvents,
      sourcePath: 'deep_trace[].events (flattened)',
      topLevelKeys: keys,
    }
  }

  return {
    events: null,
    sourcePath: null,
    topLevelKeys: keys,
  }
}
