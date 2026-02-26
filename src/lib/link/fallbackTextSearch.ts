import type { GraphSelection } from './types'

export type FallbackTextSearchResult = {
  terms: string[]
  matchedLineIndices: number[]
  contextStart: number
  contextEnd: number
}

const DEFAULT_MAX_CONTEXT_LINES = 200
const MIN_TERM_LENGTH = 2
const PREFIXED_COLON_NUMERIC_RE = /^[\p{L}\p{N}_+\-⊥Ω]+:(\d+(?::\d+)*)$/u

function pushUnique(out: string[], seen: Set<string>, value: string): void {
  const term = value.trim()
  if (term.length < MIN_TERM_LENGTH || seen.has(term)) {
    return
  }

  seen.add(term)
  out.push(term)
}

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim()
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  if (!quoted || trimmed.length < 2) {
    return trimmed
  }

  return trimmed.slice(1, -1).trim()
}

function suffixTokenIfSupported(id: string): string | null {
  const match = id.match(PREFIXED_COLON_NUMERIC_RE)
  return match?.[1] ?? null
}

function idTokenVariants(id: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()

  pushUnique(out, seen, id)
  pushUnique(out, seen, stripWrappingQuotes(id))
  pushUnique(out, seen, stripWrappingQuotes(stripWrappingQuotes(id)))

  const baseVariants = [...out]
  for (const variant of baseVariants) {
    if (variant.includes('->')) {
      const endpoints = variant
        .split('->')
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
      for (const endpoint of endpoints) {
        pushUnique(out, seen, endpoint)
      }
    }

    const suffix = suffixTokenIfSupported(variant)
    if (suffix) {
      pushUnique(out, seen, suffix)
    }
  }

  return out
}

function labelTerms(label: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()

  const lines = label
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  for (const line of lines) {
    pushUnique(out, seen, line)
    const tokens = line.split(/[|,;()[\]{}<>\s]+/u)
    for (const token of tokens) {
      pushUnique(out, seen, token)
    }
  }

  return out
}

function findMatchedLines(lines: readonly string[], terms: readonly string[]): number[] {
  if (terms.length === 0) {
    return []
  }

  const matches: number[] = []
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (terms.some((term) => line.includes(term))) {
      matches.push(index)
    }
  }

  return matches
}

function boundedContext(
  totalLines: number,
  anchorLine: number,
  maxContextLines: number
): { start: number; end: number } {
  if (totalLines <= 0) {
    return { start: 0, end: -1 }
  }

  const boundedMax = Math.max(1, Math.min(DEFAULT_MAX_CONTEXT_LINES, maxContextLines))
  const window = Math.min(totalLines, boundedMax)
  const half = Math.floor(window / 2)

  let start = Math.max(0, anchorLine - half)
  let end = start + window - 1
  if (end >= totalLines) {
    end = totalLines - 1
    start = Math.max(0, end - window + 1)
  }

  return { start, end }
}

export function fallbackTextSearch(
  traceText: string,
  selection: GraphSelection | null | undefined,
  maxContextLines = DEFAULT_MAX_CONTEXT_LINES
): FallbackTextSearchResult | null {
  try {
    if (!selection) {
      return null
    }

    const lines = traceText.split(/\r?\n/)
    if (lines.length === 0) {
      return null
    }

    const preferredTerms = selection.label?.trim()
      ? labelTerms(selection.label)
      : idTokenVariants(selection.id)

    const terms = preferredTerms.length > 0 ? preferredTerms : idTokenVariants(selection.id)
    if (terms.length === 0) {
      return null
    }

    let matches = findMatchedLines(lines, terms)
    if (matches.length === 0 && selection.label?.trim()) {
      const idTerms = idTokenVariants(selection.id)
      if (idTerms.length > 0) {
        matches = findMatchedLines(lines, idTerms)
        if (matches.length > 0) {
          return {
            terms: idTerms,
            matchedLineIndices: matches,
            contextStart: boundedContext(lines.length, matches[0], maxContextLines).start,
            contextEnd: boundedContext(lines.length, matches[0], maxContextLines).end,
          }
        }
      }
    }

    const anchorLine = matches[0] ?? 0
    const context = boundedContext(lines.length, anchorLine, maxContextLines)
    const boundedMatches = matches.filter(
      (lineIndex) => lineIndex >= context.start && lineIndex <= context.end
    )

    return {
      terms,
      matchedLineIndices: boundedMatches,
      contextStart: context.start,
      contextEnd: context.end,
    }
  } catch {
    return null
  }
}
