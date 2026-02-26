import type { TraceAdapter } from './TraceAdapter'

type UnknownRecord = Record<string, unknown>

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const COLON_NUMERIC_RE = /^[\p{L}\p{N}_+\-⊥Ω]+(?::\d+){1,}$/u
const ALPHA_NUM_RE = /^[A-Za-z]+[0-9]+$/

const ID_HINT_KEYS = new Set([
  'id',
  'from',
  'to',
  'inside',
  'outside',
  'target',
  'source',
  'focus',
  'inboundfocus',
  'activeconstruct',
  'beforefocus',
  'afterfocus',
  'anchor',
  'left',
  'right',
  'base',
  'domain',
  'endpoint',
  'child',
  'parent',
  'node',
  'zone',
  'zoneid',
  'boundaryid',
  'residueid',
  'segmentidbefore',
  'segmentidafter',
  'exemplar',
  'spine',
  'declaration',
  'pin',
  'compartmentid',
  'aliasid',
  'alignedid',
  'artifactid',
  'handleid',
  'c0',
  'f0',
  'f',
  'r',
])

const PRIMARY_EVENT_PATHS: ReadonlyArray<readonly string[]> = [
  ['final_state', 'vm', 'H'],
  ['vm', 'H'],
  ['events'],
  ['steps'],
  ['ops'],
]

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[_\-\s]/g, '')
}

function isIdLikeKey(key: string | undefined): boolean {
  if (!key) {
    return false
  }

  const normalized = normalizeKey(key)
  return normalized.endsWith('id') || ID_HINT_KEYS.has(normalized)
}

function isIdLikeValue(value: string): boolean {
  return UUID_RE.test(value) || COLON_NUMERIC_RE.test(value) || ALPHA_NUM_RE.test(value)
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value.trim())) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return undefined
}

function collectIdLikeValues(value: unknown, out: Set<string>, keyHint?: string): void {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      return
    }

    if (isIdLikeKey(keyHint) || isIdLikeValue(trimmed)) {
      out.add(trimmed)
    }
    return
  }

  if (typeof value === 'number') {
    if (isIdLikeKey(keyHint)) {
      out.add(String(value))
    }
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectIdLikeValues(item, out, keyHint)
    }
    return
  }

  if (!isRecord(value)) {
    return
  }

  for (const key of Object.keys(value).sort()) {
    collectIdLikeValues(value[key], out, key)
  }
}

function findFirstNumericByKey(
  value: unknown,
  matcher: (normalizedKey: string, rawKey: string) => boolean,
  keyHint?: string
): number | undefined {
  if (keyHint && matcher(normalizeKey(keyHint), keyHint)) {
    const parsed = toFiniteNumber(value)
    if (parsed !== undefined) {
      return parsed
    }
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findFirstNumericByKey(item, matcher)
      if (nested !== undefined) {
        return nested
      }
    }
    return undefined
  }

  if (!isRecord(value)) {
    return undefined
  }

  for (const key of Object.keys(value).sort()) {
    const nested = findFirstNumericByKey(value[key], matcher, key)
    if (nested !== undefined) {
      return nested
    }
  }

  return undefined
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

function sequenceAtPaths(
  root: unknown,
  candidatePaths: ReadonlyArray<readonly string[]>
): unknown[] | null {
  for (const path of candidatePaths) {
    const value = valueAtPath(root, path)
    if (Array.isArray(value) && value.length > 0) {
      return value
    }
  }

  return null
}

function flattenDeepTraceEvents(traceJson: unknown): unknown[] {
  const deepTrace = valueAtPath(traceJson, ['deep_trace'])
  if (!Array.isArray(deepTrace) || deepTrace.length === 0) {
    return []
  }

  const flattened: unknown[] = []
  for (const item of deepTrace) {
    if (!isRecord(item) || !Array.isArray(item.events)) {
      continue
    }
    flattened.push(...item.events)
  }

  if (flattened.length > 0) {
    return flattened
  }

  return deepTrace
}

export const V1_TRACE_ADAPTER: TraceAdapter = {
  id: 'v1',
  detect(traceJson: unknown): boolean {
    if (!isRecord(traceJson)) {
      return false
    }

    if (sequenceAtPaths(traceJson, PRIMARY_EVENT_PATHS)) {
      return true
    }

    const deepTrace = valueAtPath(traceJson, ['deep_trace'])
    return Array.isArray(deepTrace) && deepTrace.length > 0
  },
  getEventSequence(traceJson: unknown): unknown[] {
    const direct = sequenceAtPaths(traceJson, PRIMARY_EVENT_PATHS)
    if (direct) {
      return direct
    }

    return flattenDeepTraceEvents(traceJson)
  },
  extractIds(event: unknown): string[] {
    const ids = new Set<string>()
    collectIdLikeValues(event, ids)
    return [...ids].sort((left, right) => left.localeCompare(right))
  },
  extractTau(event: unknown): number | undefined {
    const exactTau = findFirstNumericByKey(
      event,
      (normalized, raw) => normalized === 'tau' || raw === 'τ'
    )
    if (exactTau !== undefined) {
      return exactTau
    }

    return findFirstNumericByKey(event, (normalized) => normalized.includes('tau'))
  },
  extractWordIndex(event: unknown): number | undefined {
    return findFirstNumericByKey(
      event,
      (normalized) =>
        normalized === 'wordindex' ||
        normalized === 'word' ||
        normalized === 'word_index'
    )
  },
}
