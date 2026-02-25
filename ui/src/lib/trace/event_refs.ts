import type { TraceEvent, TraceObject } from './types'

const EVENT_REF_FIELDS = {
  WORD_START: ['activeConstruct', 'focus', 'inboundFocus', 'C0', 'F0'],
  alias: ['id', 'left', 'right'],
  boundary_close: ['id', 'inside', 'outside'],
  finalize: ['boundaryId', 'id', 'residueId', 'target', 'outside'],
  endpoint: ['boundaryId', 'id', 'domain', 'endpoint'],
  declare: ['id', 'target'],
  shin: ['id', 'spine', 'left', 'right', 'focus'],
  align_final: ['id', 'focus', 'exemplar'],
  join_consume: ['id', 'left'],
  BOUNDARY: ['beforeFocus', 'afterFocus'],
  align: ['id', 'focus', 'exemplar'],
  approx: ['id', 'left', 'right'],
  bestow: ['from', 'to'],
  compartment: ['boundaryId', 'id', 'inside', 'outside'],
  covert: ['id', 'target'],
  declare_breath: ['target'],
  declare_pin: ['declaration', 'pin'],
  fall: ['child', 'parent'],
  gate: ['id', 'target'],
  mem_spill: ['node', 'parent', 'zone'],
  mem_zone_flush: ['anchor', 'zoneId'],
  support: ['child', 'parent'],
  support_debt: ['node', 'parent', 'child'],
  utter: ['id', 'source', 'target'],
  utter_close: ['id'],
} as const satisfies Record<string, readonly string[]>

function isObject(value: unknown): value is TraceObject {
  return typeof value === 'object' && value !== null
}

function stringField(data: TraceObject, key: string): string | null {
  const value = data[key]
  if (typeof value !== 'string' || value.length === 0) {
    return null
  }

  return value
}

export function eventRefs(e: TraceEvent): string[] {
  const fields = EVENT_REF_FIELDS[e.type]
  if (!fields || !isObject(e.data)) {
    return []
  }

  const refs: string[] = []
  const seen = new Set<string>()

  for (const field of fields) {
    const ref = stringField(e.data, field)
    if (!ref || seen.has(ref)) {
      continue
    }

    refs.push(ref)
    seen.add(ref)
  }

  return refs
}
