import type { VerseRef } from './ref'

export type SeamKind =
  | 'hard'
  | 'glue'
  | 'glue_maqqef'
  | 'cut_1'
  | 'cut_2'
  | 'cut_3'
  | 'unknown'

export type PasukHeaderWord = {
  text: string
  index: number
  seamAfter: SeamKind
  seamMeta?: Record<string, unknown>
}

export type PasukHeaderModel = {
  ref: VerseRef
  words: PasukHeaderWord[]
  selection?: { wordIndex?: number }
}

type BuildPasukHeaderModelArgs = {
  ref: VerseRef
  traceTxt: string
  traceJson?: unknown
}

const CLEANED_LINE_RE = /^\s*(cleaned(?:_text)?|verse|text)\s*:\s*(.+?)\s*$/iu
const WORD_LINE_RE = /^\s*WORD\s+(\d+)\s*[│|]\s*([^│|]+?)\s*[│|]/u
const EXIT_TOKEN_RE = /\bexit\s*=\s*□([^\s│|]+)/iu
const EXIT_KIND_RE = /\bexit_kind\s*=\s*([a-z_]+)/iu

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

function normalizeWhitespaceWords(text: string): string[] {
  return text
    .trim()
    .split(/\s+/u)
    .map((word) => word.trim())
    .filter((word) => word.length > 0)
}

function readCleanedLikeLine(traceTxt: string): string | undefined {
  const lines = traceTxt.split(/\r?\n/u)
  for (const line of lines) {
    const match = line.match(CLEANED_LINE_RE)
    if (!match) {
      continue
    }

    const value = match[2].trim()
    if (value.length > 0) {
      return value
    }
  }

  return undefined
}

function parseWordRows(traceTxt: string): Map<number, string> {
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

  return byIndex
}

function cutKindFromRank(rank: number | undefined): SeamKind {
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

function extractCutRank(value: string): number | undefined {
  const paren = value.match(/cut\s*\(\s*(\d+)\s*\)/iu)
  if (paren) {
    return Number.parseInt(paren[1], 10)
  }

  const rankEq = value.match(/rank\s*=\s*(\d+)/iu)
  if (rankEq) {
    return Number.parseInt(rankEq[1], 10)
  }

  const cutRankEq = value.match(/cut[_\s-]*rank\s*=\s*(\d+)/iu)
  if (cutRankEq) {
    return Number.parseInt(cutRankEq[1], 10)
  }

  const cutNumeric = value.match(/cut[_\s-]*(\d+)/iu)
  if (cutNumeric) {
    return Number.parseInt(cutNumeric[1], 10)
  }

  return undefined
}

function seamFromDescriptor(descriptor: string, rank?: number): SeamKind {
  const normalized = descriptor.trim().toLowerCase()
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

function seamFromTraceWordLine(line: string): SeamKind {
  const exitToken = line.match(EXIT_TOKEN_RE)
  if (exitToken) {
    return seamFromDescriptor(exitToken[1])
  }

  const exitKind = line.match(EXIT_KIND_RE)
  if (!exitKind) {
    return 'unknown'
  }

  return seamFromDescriptor(exitKind[1], extractCutRank(line))
}

type JsonSeamData = {
  seams: SeamKind[]
  seamMetaByIndex: Map<number, Record<string, unknown>>
}

function deriveSeamsFromTraceJson(traceJson: unknown, wordCount: number): JsonSeamData | null {
  if (!isRecord(traceJson)) {
    return null
  }

  const sections = traceJson.word_sections
  if (!Array.isArray(sections) || sections.length === 0) {
    return null
  }

  const seams = Array.from({ length: wordCount }, () => 'unknown' as SeamKind)
  const seamMetaByIndex = new Map<number, Record<string, unknown>>()
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

    const seam = seamFromDescriptor(
      descriptor,
      toFiniteNumber(boundary?.rank) ?? toFiniteNumber(exitBoundary?.rank)
    )
    seams[index - 1] = seam
    const seamMeta: Record<string, unknown> = {}
    if (boundary?.rank !== undefined || exitBoundary?.rank !== undefined) {
      seamMeta.rank = toFiniteNumber(boundary?.rank) ?? toFiniteNumber(exitBoundary?.rank)
    }
    if (isRecord(boundary?.left_trope)) {
      const tropeName = boundary.left_trope.name
      if (typeof tropeName === 'string' && tropeName.trim().length > 0) {
        seamMeta.tropeName = tropeName.trim()
      }
      seamMeta.trope = boundary.left_trope
    }
    if (Object.keys(seamMeta).length > 0) {
      seamMetaByIndex.set(index, seamMeta)
    }
    foundAny = true
  }

  return foundAny ? { seams, seamMetaByIndex } : null
}

export function deriveWordsFromTraceTxt(traceTxt: string): string[] {
  const cleaned = readCleanedLikeLine(traceTxt)
  if (cleaned) {
    return normalizeWhitespaceWords(cleaned)
  }

  const byIndex = parseWordRows(traceTxt)
  if (byIndex.size === 0) {
    return []
  }

  return [...byIndex.entries()]
    .sort((left, right) => left[0] - right[0])
    .map((entry) => entry[1])
}

export function deriveSeamsFromTraceTxt(traceTxt: string, wordCount: number): SeamKind[] {
  const seams = Array.from({ length: wordCount }, () => 'unknown' as SeamKind)

  for (const line of traceTxt.split(/\r?\n/u)) {
    const match = line.match(WORD_LINE_RE)
    if (!match) {
      continue
    }

    const index = Number.parseInt(match[1], 10)
    if (!Number.isFinite(index) || index < 1 || index > wordCount) {
      continue
    }

    seams[index - 1] = seamFromTraceWordLine(line)
  }

  return seams
}

export function buildPasukHeaderModel({
  ref,
  traceTxt,
  traceJson,
}: BuildPasukHeaderModelArgs): PasukHeaderModel {
  const words = deriveWordsFromTraceTxt(traceTxt)
  const seamsFromTxt = deriveSeamsFromTraceTxt(traceTxt, words.length)
  let seamMetaByIndex = new Map<number, Record<string, unknown>>()

  let seams = seamsFromTxt
  if (traceJson !== undefined) {
    try {
      const seamsFromJson = deriveSeamsFromTraceJson(traceJson, words.length)
      if (seamsFromJson) {
        seams = seamsFromTxt.map((seam, index) =>
          seam === 'unknown' ? seamsFromJson.seams[index] : seam
        )
        seamMetaByIndex = seamsFromJson.seamMetaByIndex
      }
    } catch {
      // Optional enrichment only; baseline must remain stable.
    }
  }

  return {
    ref,
    words: words.map((text, i) => ({
      text,
      index: i + 1,
      seamAfter: seams[i] ?? 'unknown',
      seamMeta: seamMetaByIndex.get(i + 1),
    })),
  }
}
