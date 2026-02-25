import { CORPUS_BASE_URL } from '../config/corpus'
import { fetchJson } from './fetcher'

const booksPromiseByBase = new Map<string, Promise<string[]>>()
const chaptersPromiseByPath = new Map<string, Promise<string[]>>()
const versesPromiseByPath = new Map<string, Promise<string[]>>()

function baseUrl(): string {
  return CORPUS_BASE_URL.replace(/\/+$/, '')
}

function normalizeBook(book: string): string {
  return book.trim().toLowerCase()
}

function normalizeChapter(chapter3: string): string {
  return chapter3.trim().padStart(3, '0')
}

function refsUrl(...parts: string[]): string {
  const safeParts = parts.map((part) => encodeURIComponent(part))
  return `${baseUrl()}/refs/${safeParts.join('/')}`
}

function parseStringList(
  payload: unknown,
  label: string,
  pathLabel: string
): string[] {
  if (!Array.isArray(payload)) {
    throw new Error(`Invalid ${label} payload at ${pathLabel}: expected JSON array`)
  }

  const values = payload.map((entry, index) => {
    if (typeof entry !== 'string') {
      throw new Error(
        `Invalid ${label} payload at ${pathLabel}[${index}]: expected string`
      )
    }
    return entry.trim()
  })

  return values.filter((value) => value.length > 0)
}

export function fetchBooks(): Promise<string[]> {
  const key = baseUrl()
  const cached = booksPromiseByBase.get(key)
  if (cached) {
    return cached
  }

  const url = refsUrl('books.json')
  const promise = fetchJson<unknown>(url).then((payload) =>
    parseStringList(payload, 'books.json', url)
  )

  booksPromiseByBase.set(key, promise)
  return promise.catch((error: unknown) => {
    booksPromiseByBase.delete(key)
    throw error
  })
}

export function fetchChapters(book: string): Promise<string[]> {
  const normalizedBook = normalizeBook(book)
  const cacheKey = `${baseUrl()}:${normalizedBook}`
  const cached = chaptersPromiseByPath.get(cacheKey)
  if (cached) {
    return cached
  }

  const url = refsUrl(normalizedBook, 'chapters.json')
  const promise = fetchJson<unknown>(url).then((payload) =>
    parseStringList(payload, 'chapters.json', url)
  )

  chaptersPromiseByPath.set(cacheKey, promise)
  return promise.catch((error: unknown) => {
    chaptersPromiseByPath.delete(cacheKey)
    throw error
  })
}

export function fetchVerses(book: string, chapter3: string): Promise<string[]> {
  const normalizedBook = normalizeBook(book)
  const normalizedChapter = normalizeChapter(chapter3)
  const cacheKey = `${baseUrl()}:${normalizedBook}/${normalizedChapter}`
  const cached = versesPromiseByPath.get(cacheKey)
  if (cached) {
    return cached
  }

  const url = refsUrl(normalizedBook, normalizedChapter, 'verses.json')
  const promise = fetchJson<unknown>(url).then((payload) =>
    parseStringList(payload, 'verses.json', url)
  )

  versesPromiseByPath.set(cacheKey, promise)
  return promise.catch((error: unknown) => {
    versesPromiseByPath.delete(cacheKey)
    throw error
  })
}
