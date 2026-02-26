import type { TraceIndex, TraceLocation } from '../trace/types'
import type { GraphSelection, ResolveConfidence, ResolveResult } from './types'

const PREFIXED_COLON_NUMERIC_RE = /^[\p{L}\p{N}_+\-⊥Ω]+:(\d+(?::\d+)*)$/u
const EDGE_SEPARATOR = '->'

function emptyLowResult(): ResolveResult {
  return { alternatives: [], confidence: 'low' }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isQuoted(value: string): boolean {
  return (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  )
}

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim()
  if (!isQuoted(trimmed) || trimmed.length < 2) {
    return trimmed
  }

  return trimmed.slice(1, -1).trim()
}

function pushUnique(out: string[], seen: Set<string>, candidate: string): void {
  if (!isNonEmptyString(candidate)) {
    return
  }

  const normalized = candidate.trim()
  if (normalized.length === 0 || seen.has(normalized)) {
    return
  }

  seen.add(normalized)
  out.push(normalized)
}

function suffixTokenIfSupported(id: string): string | null {
  // TRACE_SCHEMA_REPORT.md documents a stable colon-numeric id family:
  // `prefix:number[:number]`, so a suffix variant is allowed.
  const match = id.match(PREFIXED_COLON_NUMERIC_RE)
  if (!match) {
    return null
  }

  return match[1] ?? null
}

function normalizeIdVariants(id: string): string[] {
  const variants: string[] = []
  const seen = new Set<string>()

  pushUnique(variants, seen, id.trim())
  pushUnique(variants, seen, stripWrappingQuotes(id))
  pushUnique(variants, seen, stripWrappingQuotes(stripWrappingQuotes(id)))

  const baseVariants = [...variants]
  for (const variant of baseVariants) {
    const suffix = suffixTokenIfSupported(variant)
    if (!suffix) {
      continue
    }
    pushUnique(variants, seen, suffix)
  }

  return variants
}

function edgeEndpointIds(id: string): string[] {
  if (!id.includes(EDGE_SEPARATOR)) {
    return []
  }

  return id
    .split(EDGE_SEPARATOR)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

function candidateIdsForSelection(selection: GraphSelection): string[] {
  const out: string[] = []
  const seen = new Set<string>()

  const normalizedSelectionIds = normalizeIdVariants(selection.id)
  for (const candidate of normalizedSelectionIds) {
    pushUnique(out, seen, candidate)
  }

  if (selection.kind === 'edge') {
    for (const endpoint of edgeEndpointIds(selection.id)) {
      for (const candidate of normalizeIdVariants(endpoint)) {
        pushUnique(out, seen, candidate)
      }
    }
  }

  return out
}

function locationKey(location: TraceLocation): string {
  return `${location.kind}|${location.index}|${location.tau ?? ''}|${location.wordIndex ?? ''}`
}

function kindRank(kind: TraceLocation['kind']): number {
  if (kind === 'event') {
    return 0
  }
  if (kind === 'word') {
    return 1
  }
  return 2
}

function rankLocations(locations: readonly TraceLocation[]): TraceLocation[] {
  const seen = new Set<string>()
  const deduped: TraceLocation[] = []

  for (const location of locations) {
    const key = locationKey(location)
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    deduped.push({ ...location })
  }

  deduped.sort((left, right) => {
    const kindDelta = kindRank(left.kind) - kindRank(right.kind)
    if (kindDelta !== 0) {
      return kindDelta
    }

    const leftHasTau = left.tau !== undefined ? 1 : 0
    const rightHasTau = right.tau !== undefined ? 1 : 0
    if (leftHasTau !== rightHasTau) {
      return rightHasTau - leftHasTau
    }

    const leftHasWordIndex = left.wordIndex !== undefined ? 1 : 0
    const rightHasWordIndex = right.wordIndex !== undefined ? 1 : 0
    if (leftHasWordIndex !== rightHasWordIndex) {
      return rightHasWordIndex - leftHasWordIndex
    }

    const leftTau = left.tau ?? Number.POSITIVE_INFINITY
    const rightTau = right.tau ?? Number.POSITIVE_INFINITY
    if (leftTau !== rightTau) {
      return leftTau - rightTau
    }

    const leftWordIndex = left.wordIndex ?? Number.POSITIVE_INFINITY
    const rightWordIndex = right.wordIndex ?? Number.POSITIVE_INFINITY
    if (leftWordIndex !== rightWordIndex) {
      return leftWordIndex - rightWordIndex
    }

    return left.index - right.index
  })

  return deduped
}

function buildResult(
  locations: readonly TraceLocation[],
  exactMatch: boolean
): ResolveResult {
  if (locations.length === 0) {
    return emptyLowResult()
  }

  const ranked = rankLocations(locations)
  const [primary, ...alternatives] = ranked

  let confidence: ResolveConfidence
  if (exactMatch) {
    if (ranked.length === 1) {
      confidence = 'high'
    } else {
      const eventCount = ranked.filter((location) => location.kind === 'event').length
      confidence = eventCount === 1 ? 'high' : 'medium'
    }
  } else if (primary) {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }

  return primary
    ? { primary, alternatives, confidence }
    : { alternatives: [], confidence: 'low' }
}

function exactByIdMatch(selection: GraphSelection, traceIndex: TraceIndex): TraceLocation[] {
  const exact = traceIndex.byId.get(selection.id)
  return exact ? [...exact] : []
}

function normalizedMatch(selection: GraphSelection, traceIndex: TraceIndex): TraceLocation[] {
  const candidates = candidateIdsForSelection(selection)
  for (const candidate of candidates) {
    if (candidate === selection.id) {
      continue
    }

    const matches = traceIndex.byId.get(candidate)
    if (!matches || matches.length === 0) {
      continue
    }

    return [...matches]
  }

  return []
}

export function resolveGraphSelection(
  selection: GraphSelection | null | undefined,
  traceIndex: TraceIndex | null | undefined
): ResolveResult {
  try {
    if (!selection || !traceIndex || !isNonEmptyString(selection.id)) {
      return emptyLowResult()
    }

    const exactMatches = exactByIdMatch(selection, traceIndex)
    if (exactMatches.length > 0) {
      return buildResult(exactMatches, true)
    }

    const normalizedMatches = normalizedMatch(selection, traceIndex)
    if (normalizedMatches.length > 0) {
      return buildResult(normalizedMatches, false)
    }

    return emptyLowResult()
  } catch {
    return emptyLowResult()
  }
}
