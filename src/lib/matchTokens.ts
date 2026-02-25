const MAX_CANDIDATES_PER_TOKEN = 5

function stripSurroundingQuotes(token: string): string {
  if (token.length < 2) {
    return token
  }

  const startsWithSingle = token.startsWith("'") && token.endsWith("'")
  const startsWithDouble = token.startsWith('"') && token.endsWith('"')

  if (startsWithSingle || startsWithDouble) {
    return token.slice(1, -1)
  }

  return token
}

function firstSegment(token: string): string {
  const firstBreak = token.search(/\n|\|/)
  if (firstBreak < 0) {
    return token
  }

  return token.slice(0, firstBreak)
}

function compactWhitespace(token: string): string {
  return token.replace(/\s+/g, ' ').trim()
}

function splitAlphaNumericTail(token: string): { prefix: string; suffix: string } | null {
  const match = token.match(/^([A-Za-z]{1,12})(\d{1,12})$/)
  if (!match) {
    return null
  }

  return { prefix: match[1], suffix: match[2] }
}

function pushUniqueCandidate(candidates: string[], candidate: string) {
  const trimmed = candidate.trim()
  if (trimmed.length === 0 || candidates.includes(trimmed)) {
    return
  }

  candidates.push(trimmed)
}

export function normalizeToken(token: string): string[] {
  const candidates: string[] = []
  const stripped = stripSurroundingQuotes(token)
  const segmented = firstSegment(stripped)

  // 1) original token
  pushUniqueCandidate(candidates, token)
  // 2) token with surrounding quotes stripped
  pushUniqueCandidate(candidates, stripped)
  // 3) first segment when token includes newlines or pipes
  if (stripped.includes('\n') || stripped.includes('|')) {
    pushUniqueCandidate(candidates, segmented)
  }
  // 4) compact whitespace forms to tolerate formatting differences
  if (/\s/.test(token)) {
    pushUniqueCandidate(candidates, compactWhitespace(token))
  }
  if (/\s/.test(segmented)) {
    pushUniqueCandidate(candidates, compactWhitespace(segmented))
  }

  // Graph IDs often look like Th12 while traces may render separators/case differently.
  const alphaNumericTail = splitAlphaNumericTail(segmented)
  if (alphaNumericTail) {
    pushUniqueCandidate(
      candidates,
      `${alphaNumericTail.prefix.toLowerCase()}${alphaNumericTail.suffix}`
    )
    pushUniqueCandidate(candidates, `${alphaNumericTail.prefix} ${alphaNumericTail.suffix}`)
    pushUniqueCandidate(candidates, `${alphaNumericTail.prefix}_${alphaNumericTail.suffix}`)
  }

  return candidates.slice(0, MAX_CANDIDATES_PER_TOKEN)
}
