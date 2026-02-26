import type { TraceIndex, TraceLocation } from './types'

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

const SNAPSHOT_PATHS: ReadonlyArray<readonly string[]> = [['verse_snapshots'], ['snapshots']]
const WORD_PATHS: ReadonlyArray<readonly string[]> = [
  ['word_sections'],
  ['prepared_tokens'],
  ['words'],
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

function extractTau(value: unknown): number | undefined {
  const exactTau = findFirstNumericByKey(
    value,
    (normalized, raw) => normalized === 'tau' || raw === 'τ'
  )
  if (exactTau !== undefined) {
    return exactTau
  }

  return findFirstNumericByKey(value, (normalized) => normalized.includes('tau'))
}

function extractWordIndex(
  value: unknown,
  kind: TraceLocation['kind']
): number | undefined {
  const primary = findFirstNumericByKey(value, (normalized) =>
    normalized === 'wordindex' || normalized === 'word'
  )
  if (primary !== undefined) {
    return primary
  }

  if (kind !== 'word') {
    return undefined
  }

  return findFirstNumericByKey(
    value,
    (normalized) => normalized === 'index' || normalized === 'step' || normalized === 'i'
  )
}

function locationsEqual(a: TraceLocation, b: TraceLocation): boolean {
  return (
    a.kind === b.kind &&
    a.index === b.index &&
    a.tau === b.tau &&
    a.wordIndex === b.wordIndex
  )
}

function appendLocation<K>(map: Map<K, TraceLocation[]>, key: K, location: TraceLocation): void {
  const existing = map.get(key)
  if (!existing) {
    map.set(key, [location])
    return
  }

  if (existing.some((candidate) => locationsEqual(candidate, location))) {
    return
  }

  existing.push(location)
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

function selectPrimaryEvents(trace: unknown): unknown[] {
  const direct = sequenceAtPaths(trace, PRIMARY_EVENT_PATHS)
  if (direct) {
    return direct
  }

  const deepTrace = valueAtPath(trace, ['deep_trace'])
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

function indexSequence(
  values: unknown[],
  kind: TraceLocation['kind'],
  byId: Map<string, TraceLocation[]>,
  byTau: Map<number, TraceLocation[]>,
  byWordIndex: Map<number, TraceLocation[]>
): void {
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    const tau = extractTau(value)
    const wordIndex = extractWordIndex(value, kind)
    const location: TraceLocation = { kind, index }

    if (tau !== undefined) {
      location.tau = tau
      appendLocation(byTau, tau, location)
    }

    if (wordIndex !== undefined) {
      location.wordIndex = wordIndex
      appendLocation(byWordIndex, wordIndex, location)
    }

    const ids = new Set<string>()
    collectIdLikeValues(value, ids)
    for (const id of ids) {
      appendLocation(byId, id, location)
    }
  }
}

export function buildTraceIndex(trace: unknown): TraceIndex {
  const byId = new Map<string, TraceLocation[]>()
  const byTau = new Map<number, TraceLocation[]>()
  const byWordIndex = new Map<number, TraceLocation[]>()

  const events = selectPrimaryEvents(trace)
  const snapshots = sequenceAtPaths(trace, SNAPSHOT_PATHS) ?? []
  const words = sequenceAtPaths(trace, WORD_PATHS) ?? []

  indexSequence(events, 'event', byId, byTau, byWordIndex)
  indexSequence(snapshots, 'snapshot', byId, byTau, byWordIndex)
  indexSequence(words, 'word', byId, byTau, byWordIndex)

  return {
    byId,
    byTau: byTau.size > 0 ? byTau : undefined,
    byWordIndex: byWordIndex.size > 0 ? byWordIndex : undefined,
    summary: {
      eventCount: events.length,
      idCount: byId.size,
    },
  }
}
