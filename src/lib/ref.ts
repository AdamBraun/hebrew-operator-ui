export type VerseRef = { book: string; chapter3: string; verse3: string }

type RawVerseParams = { book?: string; chapter?: string; verse?: string }

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) {
    return null
  }

  const parsed = Number.parseInt(trimmed, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

export function normalizeVerseRef(params: RawVerseParams): VerseRef | null {
  const normalizedBook = params.book?.trim().toLowerCase() ?? ''
  if (!normalizedBook) {
    return null
  }

  const chapter = parsePositiveInt(params.chapter)
  const verse = parsePositiveInt(params.verse)
  if (!chapter || !verse) {
    return null
  }

  return {
    book: normalizedBook,
    chapter3: String(chapter).padStart(3, '0'),
    verse3: String(verse).padStart(3, '0'),
  }
}
