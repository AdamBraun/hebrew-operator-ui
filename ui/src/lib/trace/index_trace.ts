import { eventRefs } from './event_refs'
import type {
  TraceHandle,
  TraceIndex,
  TraceJson,
  TraceJsonState,
  TraceObject,
} from './types'

function isObject(value: unknown): value is TraceObject {
  return typeof value === 'object' && value !== null
}

function isTraceJsonState(value: unknown): value is TraceJsonState {
  if (!isObject(value)) {
    return false
  }

  const handles = value.handles
  const boundaries = value.boundaries
  const links = value.links
  const rules = value.rules
  const vm = value.vm

  if (
    !Array.isArray(handles) ||
    !Array.isArray(boundaries) ||
    !Array.isArray(links) ||
    !Array.isArray(rules) ||
    !isObject(vm)
  ) {
    return false
  }

  return Array.isArray(vm.H)
}

function resolveTraceState(trace: TraceJson): TraceJsonState {
  if (isTraceJsonState(trace)) {
    return trace
  }

  if (isObject(trace) && isTraceJsonState(trace.final_state)) {
    return trace.final_state
  }

  throw new Error('Trace JSON is missing a usable trace state (root or final_state).')
}

function appendRef(
  refsByHandleId: Map<string, number[]>,
  handleId: string,
  eventIndex: number
) {
  const existing = refsByHandleId.get(handleId)
  if (!existing) {
    refsByHandleId.set(handleId, [eventIndex])
    return
  }

  if (existing[existing.length - 1] !== eventIndex) {
    existing.push(eventIndex)
  }
}

export function buildTraceIndex(trace: TraceJson): TraceIndex {
  const state = resolveTraceState(trace)
  const handleById = new Map<string, TraceHandle>()

  for (const handle of state.handles) {
    if (!handleById.has(handle.id)) {
      handleById.set(handle.id, handle)
    }
  }

  const events = state.vm.H
  const refsByHandleId = new Map<string, number[]>()

  for (let eventIndex = 0; eventIndex < events.length; eventIndex += 1) {
    const refs = eventRefs(events[eventIndex])
    for (const handleId of refs) {
      appendRef(refsByHandleId, handleId, eventIndex)
    }
  }

  return {
    handleById,
    events,
    refsByHandleId,
  }
}
