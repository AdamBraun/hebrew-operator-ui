type LegacyTraceIndexLike = {
  handleById: Map<string, unknown>
  refsByHandleId: Map<string, number[]>
}

type UnknownRecord = Record<string, unknown>

const ID_HINT_RE =
  /(?:^|_)(?:id|focus|target|source|inside|outside|from|to|seedof|c0|f0|left|right|base|domain|endpoint|anchor|node|parent|child|zone|zoneid)$/i
const COLON_NUMERIC_RE = /^[\p{L}\p{N}_+\-⊥Ω]+(?::\d+){1,}$/u
const ALPHA_NUM_RE = /^[A-Za-z]+[0-9]+$/

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIdLikeString(value: string): boolean {
  return COLON_NUMERIC_RE.test(value) || ALPHA_NUM_RE.test(value)
}

function collectIdLikeValues(value: unknown, out: Set<string>, keyHint?: string): void {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      return
    }

    if ((keyHint && ID_HINT_RE.test(keyHint)) || isIdLikeString(trimmed)) {
      out.add(trimmed)
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

function sortedUnique(values: readonly number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right)
}

function directRefs(handleId: string, traceIndex: LegacyTraceIndexLike): number[] {
  const refs = traceIndex.refsByHandleId.get(handleId)
  if (!refs || refs.length === 0) {
    return []
  }

  return sortedUnique(refs)
}

function fallbackRefs(handleId: string, traceIndex: LegacyTraceIndexLike): number[] {
  const handle = traceIndex.handleById.get(handleId)
  if (!handle) {
    return []
  }

  const candidates = new Set<string>()
  collectIdLikeValues(handle, candidates)
  candidates.delete(handleId)

  const refs: number[] = []
  for (const candidate of [...candidates].sort((a, b) => a.localeCompare(b))) {
    const candidateRefs = traceIndex.refsByHandleId.get(candidate)
    if (!candidateRefs || candidateRefs.length === 0) {
      continue
    }
    refs.push(...candidateRefs)
  }

  return sortedUnique(refs)
}

export function resolveEventRefsForHandle(
  handleId: string | null | undefined,
  traceIndex: LegacyTraceIndexLike | null | undefined
): number[] {
  if (!handleId || !traceIndex) {
    return []
  }

  const direct = directRefs(handleId, traceIndex)
  if (direct.length > 0) {
    return direct
  }

  return fallbackRefs(handleId, traceIndex)
}
