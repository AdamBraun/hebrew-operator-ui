type HandleLookup = {
  handleById: Map<string, unknown>
}

function normalizeGraphToken(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length < 2) {
    return trimmed
  }

  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))

  if (!quoted) {
    return trimmed
  }

  return trimmed.slice(1, -1).trim()
}

function candidateTokens(raw: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()

  function push(value: string) {
    const token = value.trim()
    if (token.length === 0 || seen.has(token)) {
      return
    }
    seen.add(token)
    out.push(token)
  }

  const normalized = normalizeGraphToken(raw)
  push(normalized)

  const normalizedEscapes = normalized.replace(/\\n/g, '\n')
  push(normalizedEscapes)

  for (const token of [normalized, normalizedEscapes]) {
    const firstLine = token.split(/\r?\n/, 1)[0]
    if (firstLine) {
      push(firstLine)
    }
  }

  return out
}

export function resolveHandleIdFromGraphSelection(
  token: string,
  matchTokens: string[] | undefined,
  traceIndex: HandleLookup | null
): string | null {
  if (!traceIndex) {
    return null
  }

  const candidates: string[] = []
  const seen = new Set<string>()

  function pushMany(values: string[]) {
    for (const value of values) {
      if (seen.has(value)) {
        continue
      }
      seen.add(value)
      candidates.push(value)
    }
  }

  pushMany(candidateTokens(token))
  for (const candidate of matchTokens ?? []) {
    pushMany(candidateTokens(candidate))
  }

  for (const candidate of candidates) {
    if (traceIndex.handleById.has(candidate)) {
      return candidate
    }

    const edgeSplit = candidate.split('->')
    if (edgeSplit.length !== 2) {
      continue
    }

    const left = normalizeGraphToken(edgeSplit[0] ?? '')
    const right = normalizeGraphToken(edgeSplit[1] ?? '')

    if (traceIndex.handleById.has(left)) {
      return left
    }
    if (traceIndex.handleById.has(right)) {
      return right
    }
  }

  return null
}
