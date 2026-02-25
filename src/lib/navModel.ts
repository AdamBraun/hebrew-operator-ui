export type NavModel = {
  books: string[]
  chaptersByBook: Record<string, string[]>
  versesByBookChapter: Record<string, Record<string, string[]>>
}

type VerseTuple = {
  book: string
  chapter: string
  verse: string
}

const TORAH_ORDER = [
  'genesis',
  'exodus',
  'leviticus',
  'numbers',
  'deuteronomy',
] as const

const torahOrderIndex = new Map<string, number>(
  TORAH_ORDER.map((book, index) => [book, index])
)

function normalizeBook(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()
  if (!normalized || /^\d+$/.test(normalized)) {
    return null
  }

  return normalized
}

function normalizeThreeDigitId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return String(value).padStart(3, '0')
  }

  if (typeof value !== 'string') {
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

  return String(parsed).padStart(3, '0')
}

function addTuple(
  tuples: Map<string, VerseTuple>,
  bookRaw: unknown,
  chapterRaw: unknown,
  verseRaw: unknown
): void {
  const book = normalizeBook(bookRaw)
  const chapter = normalizeThreeDigitId(chapterRaw)
  const verse = normalizeThreeDigitId(verseRaw)
  if (!book || !chapter || !verse) {
    return
  }

  tuples.set(`${book}/${chapter}/${verse}`, { book, chapter, verse })
}

function maybeAddTupleFromPath(path: string[], tuples: Map<string, VerseTuple>): void {
  if (path.length < 3) {
    return
  }

  for (let i = 0; i <= path.length - 3; i += 1) {
    addTuple(tuples, path[i], path[i + 1], path[i + 2])
  }
}

function maybeAddTupleFromString(value: string, tuples: Map<string, VerseTuple>): void {
  const match = value
    .toLowerCase()
    .match(/(?:^|\/)([a-z][a-z0-9_-]*)\/(\d{1,3})\/(\d{1,3})(?:\/|$)/)
  if (!match) {
    return
  }

  addTuple(tuples, match[1], match[2], match[3])
}

function walkIndex(value: unknown, path: string[], tuples: Map<string, VerseTuple>): void {
  if (Array.isArray(value)) {
    maybeAddTupleFromPath(path, tuples)

    for (const item of value) {
      if (path.length >= 2) {
        addTuple(tuples, path[path.length - 2], path[path.length - 1], item)
      }
      walkIndex(item, path, tuples)
    }
    return
  }

  if (value && typeof value === 'object') {
    maybeAddTupleFromPath(path, tuples)

    const record = value as Record<string, unknown>
    addTuple(
      tuples,
      record.book,
      record.chapter ?? record.chapter3,
      record.verse ?? record.verse3
    )

    for (const [key, child] of Object.entries(record)) {
      walkIndex(child, [...path, key], tuples)
    }
    return
  }

  if (typeof value === 'string') {
    if (path.length >= 2) {
      addTuple(tuples, path[path.length - 2], path[path.length - 1], value)
    }
    maybeAddTupleFromString(value, tuples)
  }
}

function sortPaddedNumeric(values: Iterable<string>): string[] {
  return [...values].sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10))
}

function sortBooks(books: Iterable<string>): string[] {
  return [...books].sort((a, b) => {
    const aTorah = torahOrderIndex.get(a)
    const bTorah = torahOrderIndex.get(b)

    if (aTorah !== undefined && bTorah !== undefined) {
      return aTorah - bTorah
    }

    if (aTorah !== undefined) {
      return -1
    }

    if (bTorah !== undefined) {
      return 1
    }

    return a.localeCompare(b)
  })
}

export function buildNavModel(indexJson: unknown): NavModel {
  const tuples = new Map<string, VerseTuple>()
  walkIndex(indexJson, [], tuples)

  const chapterSetsByBook = new Map<string, Set<string>>()
  const verseSetsByBookChapter = new Map<string, Map<string, Set<string>>>()

  for (const { book, chapter, verse } of tuples.values()) {
    if (!chapterSetsByBook.has(book)) {
      chapterSetsByBook.set(book, new Set())
    }
    chapterSetsByBook.get(book)!.add(chapter)

    if (!verseSetsByBookChapter.has(book)) {
      verseSetsByBookChapter.set(book, new Map())
    }
    const versesByChapter = verseSetsByBookChapter.get(book)!
    if (!versesByChapter.has(chapter)) {
      versesByChapter.set(chapter, new Set())
    }
    versesByChapter.get(chapter)!.add(verse)
  }

  const books = sortBooks(chapterSetsByBook.keys())
  const chaptersByBook: Record<string, string[]> = {}
  const versesByBookChapter: Record<string, Record<string, string[]>> = {}

  for (const book of books) {
    const chapterSet = chapterSetsByBook.get(book) ?? new Set<string>()
    const sortedChapters = sortPaddedNumeric(chapterSet)
    chaptersByBook[book] = sortedChapters

    const versesForBook: Record<string, string[]> = {}
    const versesByChapter = verseSetsByBookChapter.get(book) ?? new Map()
    for (const chapter of sortedChapters) {
      const verseSet = versesByChapter.get(chapter) ?? new Set<string>()
      versesForBook[chapter] = sortPaddedNumeric(verseSet)
    }
    versesByBookChapter[book] = versesForBook
  }

  return {
    books,
    chaptersByBook,
    versesByBookChapter,
  }
}
