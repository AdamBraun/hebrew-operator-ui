import type { VerseRef } from '../ref'
import type { BoundaryKind, ScopeLanesModel } from './types'

const CLEANED_LINE_RE = /^\s*(cleaned(?:_text)?|verse|text)\s*:\s*(.+?)\s*$/iu
const WORD_LINE_RE = /^\s*WORD\s+(\d+)\s*[│|]\s*([^│|]+?)\s*[│|]/u
const EXIT_TOKEN_RE = /\bexit\s*=\s*□([^\s│|]+)/iu
const EXIT_KIND_RE = /\bexit_kind\s*=\s*([a-z_]+)/iu
const TRAILING_PUNCTUATION_RE = /([׃:;,.!?]+)\s*$/u

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return undefined
}

function readCleanedLikeLine(traceTxt: string): string | undefined {
  for (const line of traceTxt.split(/\r?\n/u)) {
    const match = line.match(CLEANED_LINE_RE)
    if (!match) {
      continue
    }

    const cleaned = match[2].trim()
    if (cleaned.length > 0) {
      return cleaned
    }
  }

  return undefined
}

function extractWordsFromCleanedLine(traceTxt: string): string[] {
  const cleaned = readCleanedLikeLine(traceTxt)
  if (!cleaned) {
    return []
  }

  return cleaned
    .split(/\s+/u)
    .map((word) => word.trim())
    .filter((word) => word.length > 0)
}

function extractWordsFromWordRows(traceTxt: string): string[] {
  const byIndex = new Map<number, string>()

  for (const line of traceTxt.split(/\r?\n/u)) {
    const match = line.match(WORD_LINE_RE)
    if (!match) {
      continue
    }

    const index = Number.parseInt(match[1], 10)
    if (!Number.isFinite(index) || index < 1) {
      continue
    }

    const word = match[2].trim()
    if (word.length === 0) {
      continue
    }

    byIndex.set(index, word)
  }

  return [...byIndex.entries()]
    .sort((left, right) => left[0] - right[0])
    .map((entry) => entry[1])
}

function extractCutRank(value: string): number | undefined {
  const cutParen = value.match(/cut\s*\(\s*(\d+)\s*\)/iu)
  if (cutParen) {
    return Number.parseInt(cutParen[1], 10)
  }

  const rankEq = value.match(/rank\s*=\s*(\d+)/iu)
  if (rankEq) {
    return Number.parseInt(rankEq[1], 10)
  }

  const cutNumeric = value.match(/cut[_\s-]*(\d+)/iu)
  if (cutNumeric) {
    return Number.parseInt(cutNumeric[1], 10)
  }

  return undefined
}

function cutKindFromRank(rank: number | undefined): BoundaryKind {
  if (rank === 1) {
    return 'cut_1'
  }
  if (rank === 2) {
    return 'cut_2'
  }
  if (rank === 3) {
    return 'cut_3'
  }
  return 'unknown'
}

function boundaryKindFromDescriptor(descriptor: string, rank?: number): BoundaryKind {
  const normalized = descriptor.trim().toLowerCase()

  // Mapping rules:
  // glue -> "glue"
  // glue_maqqef -> "glue_maqqef"
  // cut(rank=1..3) -> "cut_1..3"
  // hard -> "hard"
  // anything else -> "unknown"
  if (normalized === 'glue') {
    return 'glue'
  }
  if (normalized === 'glue_maqqef') {
    return 'glue_maqqef'
  }
  if (normalized === 'hard') {
    return 'hard'
  }
  if (normalized.startsWith('cut')) {
    return cutKindFromRank(rank ?? extractCutRank(normalized))
  }

  return 'unknown'
}

type JsonBoundaryExtraction = {
  kinds: BoundaryKind[]
  tropeMetaByIndex: Map<number, { tropeName?: string; tropeRank?: number }>
}

function deriveBoundariesFromTraceJson(
  traceJson: unknown,
  wordCount: number
): JsonBoundaryExtraction | null {
  if (!isRecord(traceJson)) {
    return null
  }

  const sections = traceJson.word_sections
  if (!Array.isArray(sections) || sections.length === 0) {
    return null
  }

  const boundaries = Array.from({ length: wordCount }, () => 'unknown' as BoundaryKind)
  const tropeMetaByIndex = new Map<number, { tropeName?: string; tropeRank?: number }>()
  let foundAny = false

  for (let i = 0; i < sections.length; i += 1) {
    const section = sections[i]
    if (!isRecord(section)) {
      continue
    }

    const sectionWordIndex = toFiniteNumber(section.word_index)
    const index = sectionWordIndex && sectionWordIndex > 0 ? sectionWordIndex : i + 1
    if (index < 1 || index > wordCount) {
      continue
    }

    const exitBoundary = isRecord(section.exit_boundary) ? section.exit_boundary : null
    const boundary = exitBoundary && isRecord(exitBoundary.boundary) ? exitBoundary.boundary : null

    const descriptorCandidates: unknown[] = [
      boundary?.mode,
      exitBoundary?.boundary_mode,
      section.exit_kind,
    ]
    const descriptor = descriptorCandidates.find((value) => typeof value === 'string')
    if (typeof descriptor !== 'string') {
      continue
    }

    const rank = toFiniteNumber(boundary?.rank) ?? toFiniteNumber(exitBoundary?.rank)
    boundaries[index - 1] = boundaryKindFromDescriptor(descriptor, rank)
    const leftTrope = isRecord(boundary?.left_trope) ? boundary.left_trope : null
    const tropeName =
      leftTrope && typeof leftTrope.name === 'string' && leftTrope.name.trim().length > 0
        ? leftTrope.name.trim()
        : undefined
    const tropeRank = toFiniteNumber(leftTrope?.rank)
    if (tropeName !== undefined || tropeRank !== undefined) {
      tropeMetaByIndex.set(index, { tropeName, tropeRank })
    }
    foundAny = true
  }

  return foundAny ? { kinds: boundaries, tropeMetaByIndex } : null
}

function deriveBoundariesFromTraceTxt(traceTxt: string, wordCount: number): BoundaryKind[] {
  const boundaries = Array.from({ length: wordCount }, () => 'unknown' as BoundaryKind)

  for (const line of traceTxt.split(/\r?\n/u)) {
    const match = line.match(WORD_LINE_RE)
    if (!match) {
      continue
    }

    const index = Number.parseInt(match[1], 10)
    if (!Number.isFinite(index) || index < 1 || index > wordCount) {
      continue
    }

    const exitTokenMatch = line.match(EXIT_TOKEN_RE)
    if (exitTokenMatch) {
      boundaries[index - 1] = boundaryKindFromDescriptor(exitTokenMatch[1])
      continue
    }

    const exitKindMatch = line.match(EXIT_KIND_RE)
    if (!exitKindMatch) {
      continue
    }

    boundaries[index - 1] = boundaryKindFromDescriptor(
      exitKindMatch[1],
      extractCutRank(line)
    )
  }

  return boundaries
}

export function buildScopeLanesModel(
  ref: VerseRef,
  traceTxt: string,
  traceJson?: unknown
): ScopeLanesModel {
  const wordsFromRows = extractWordsFromWordRows(traceTxt)
  const words = (
    wordsFromRows.length > 0 ? wordsFromRows : extractWordsFromCleanedLine(traceTxt)
  ).slice()

  const cleanedLine = readCleanedLikeLine(traceTxt)
  if (wordsFromRows.length > 0 && words.length > 0 && cleanedLine) {
    const trailingPunctuation = cleanedLine.match(TRAILING_PUNCTUATION_RE)?.[1]
    if (trailingPunctuation && !words[words.length - 1].endsWith(trailingPunctuation)) {
      words[words.length - 1] = `${words[words.length - 1]}${trailingPunctuation}`
    }
  }

  const wordCount = words.length
  let boundaries: BoundaryKind[] = deriveBoundariesFromTraceTxt(traceTxt, wordCount)
  let tropeMetaByIndex = new Map<number, { tropeName?: string; tropeRank?: number }>()

  if (traceJson !== undefined) {
    try {
      const fromJson = deriveBoundariesFromTraceJson(traceJson, wordCount)
      if (fromJson) {
        boundaries = fromJson.kinds
        tropeMetaByIndex = fromJson.tropeMetaByIndex
      }
    } catch {
      // Keep trace.txt-derived boundaries on json extraction failures.
    }
  }

  return {
    ref,
    words: words.map((text, index) => ({ index: index + 1, text })),
    boundariesAfter: boundaries.map((kind, i) => {
      const wordIndex = i + 1
      return {
        wordIndex,
        kind,
        ...tropeMetaByIndex.get(wordIndex),
      }
    }),
    lanes: {
      rank3: [],
      rank2: [],
    },
  }
}
