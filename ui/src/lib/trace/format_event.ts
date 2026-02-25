import type { TraceEvent, TraceObject } from './types'

type FormattedEvent = {
  title: string
  detailLines: string[]
}

const MAX_TRUNCATE_DEPTH = 3
const MAX_OBJECT_KEYS = 12
const MAX_ARRAY_ITEMS = 10
const MAX_STRING_LENGTH = 160
const MAX_JSON_CHARS = 2000

function isObject(value: unknown): value is TraceObject {
  return typeof value === 'object' && value !== null
}

function truncateString(value: string): string {
  if (value.length <= MAX_STRING_LENGTH) {
    return value
  }

  return `${value.slice(0, MAX_STRING_LENGTH)}...`
}

function truncateValue(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') {
    return truncateString(value)
  }

  if (typeof value !== 'object' || value === null) {
    return value
  }

  if (depth >= MAX_TRUNCATE_DEPTH) {
    if (Array.isArray(value)) {
      return `[Array(${value.length})]`
    }

    return '[Object]'
  }

  if (Array.isArray(value)) {
    const sliced = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => truncateValue(item, depth + 1))
    if (value.length > MAX_ARRAY_ITEMS) {
      sliced.push(`...(${value.length - MAX_ARRAY_ITEMS} more)`)
    }

    return sliced
  }

  const entries = Object.entries(value)
  const sorted = entries.sort(([a], [b]) => a.localeCompare(b))
  const sliced = sorted.slice(0, MAX_OBJECT_KEYS)
  const result: Record<string, unknown> = {}

  for (const [key, child] of sliced) {
    result[key] = truncateValue(child, depth + 1)
  }

  if (sorted.length > MAX_OBJECT_KEYS) {
    result.__truncated_keys__ = sorted.length - MAX_OBJECT_KEYS
  }

  return result
}

function compactJsonLines(data: unknown): string[] {
  const safe = truncateValue(data)
  const pretty = JSON.stringify(safe, null, 2) ?? 'null'
  const capped =
    pretty.length > MAX_JSON_CHARS
      ? `${pretty.slice(0, MAX_JSON_CHARS)}...`
      : pretty

  const lines = capped.split('\n')
  if (lines.length === 0) {
    return ['data=null']
  }

  return [`data=${lines[0]}`, ...lines.slice(1)]
}

function field(data: TraceObject, key: string): unknown {
  return data[key]
}

function formatFieldValue(value: unknown): string {
  if (value === undefined) {
    return '<missing>'
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (value === null) {
    return 'null'
  }

  return JSON.stringify(truncateValue(value)) ?? '<unserializable>'
}

function pushLine(
  lines: string[],
  data: TraceObject,
  key: string,
  opts?: { label?: string; optional?: boolean }
) {
  const value = field(data, key)
  if (value === undefined && opts?.optional) {
    return
  }

  const label = opts?.label ?? key
  lines.push(`${label}=${formatFieldValue(value)}`)
}

function knownFormatter(e: TraceEvent, data: TraceObject): FormattedEvent | null {
  const title = `${e.type} (τ=${e.tau})`
  const lines: string[] = []

  switch (e.type) {
    case 'WORD_START':
      pushLine(lines, data, 'wordText')
      pushLine(lines, data, 'focus')
      pushLine(lines, data, 'inboundFocus')
      pushLine(lines, data, 'segmentId', { optional: true })
      return { title, detailLines: lines }
    case 'alias':
      pushLine(lines, data, 'id')
      pushLine(lines, data, 'left')
      pushLine(lines, data, 'right')
      return { title, detailLines: lines }
    case 'boundary_close':
      pushLine(lines, data, 'id')
      pushLine(lines, data, 'inside')
      pushLine(lines, data, 'outside')
      pushLine(lines, data, 'anchor')
      return { title, detailLines: lines }
    case 'finalize':
      pushLine(lines, data, 'target')
      pushLine(lines, data, 'boundaryId')
      pushLine(lines, data, 'id', { label: 'artifactId(id)' })
      pushLine(lines, data, 'residueId')
      pushLine(lines, data, 'outside')
      return { title, detailLines: lines }
    case 'endpoint':
      pushLine(lines, data, 'id')
      pushLine(lines, data, 'boundaryId')
      pushLine(lines, data, 'domain')
      pushLine(lines, data, 'endpoint')
      return { title, detailLines: lines }
    case 'declare':
      pushLine(lines, data, 'id')
      pushLine(lines, data, 'target')
      pushLine(lines, data, 'mode', { optional: true })
      return { title, detailLines: lines }
    case 'shin':
      pushLine(lines, data, 'id')
      pushLine(lines, data, 'spine')
      pushLine(lines, data, 'left')
      pushLine(lines, data, 'right')
      pushLine(lines, data, 'focus')
      pushLine(lines, data, 'active', { optional: true })
      return { title, detailLines: lines }
    case 'align_final':
      pushLine(lines, data, 'id')
      pushLine(lines, data, 'focus')
      pushLine(lines, data, 'exemplar')
      return { title, detailLines: lines }
    case 'join_consume':
      pushLine(lines, data, 'id')
      pushLine(lines, data, 'left')
      pushLine(lines, data, 'strength', { optional: true })
      return { title, detailLines: lines }
    case 'BOUNDARY':
      pushLine(lines, data, 'mode')
      pushLine(lines, data, 'beforeFocus')
      pushLine(lines, data, 'afterFocus')
      pushLine(lines, data, 'segmentIdBefore', { optional: true })
      return { title, detailLines: lines }
    default:
      return null
  }
}

export function formatEvent(e: TraceEvent): FormattedEvent {
  const data = isObject(e.data) ? e.data : {}
  const known = knownFormatter(e, data)
  if (known) {
    return known
  }

  return {
    title: `${e.type} (τ=${e.tau})`,
    detailLines: compactJsonLines(e.data),
  }
}
