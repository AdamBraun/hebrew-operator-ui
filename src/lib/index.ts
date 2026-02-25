import { CORPUS_BASE_URL } from '../config/corpus'
import { fetchJson } from './fetcher'

let booksCache: string[] | null = null
const chaptersCache = new Map<string, string[]>()
const versesCache = new Map<string, string[]>()

const booksPromiseByBase = new Map<string, Promise<string[]>>()
const chaptersPromiseByPath = new Map<string, Promise<string[]>>()
const versesPromiseByPath = new Map<string, Promise<string[]>>()
const legacyIndexPromiseByBase = new Map<string, Promise<unknown>>()

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

function legacyIndexUrl(): string {
  return refsUrl('index.json')
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
  if (booksCache) {
    return Promise.resolve(booksCache)
  }

  const key = baseUrl()
  const cached = booksPromiseByBase.get(key)
  if (cached) {
    return cached
  }

  const url = refsUrl('books.json')
  const promise = fetchJson<unknown>(url).then((payload) => {
    const books = parseStringList(payload, 'books.json', url)
    booksCache = books
    return books
  })

  booksPromiseByBase.set(key, promise)
  return promise.catch((error: unknown) => {
    booksPromiseByBase.delete(key)
    throw error
  })
}

export function fetchLegacyCorpusIndex(): Promise<unknown> {
  const key = baseUrl()
  const cached = legacyIndexPromiseByBase.get(key)
  if (cached) {
    return cached
  }

  const url = legacyIndexUrl()
  const promise = fetchJson<unknown>(url)

  legacyIndexPromiseByBase.set(key, promise)
  return promise.catch((error: unknown) => {
    legacyIndexPromiseByBase.delete(key)
    throw error
  })
}

export function fetchChapters(book: string): Promise<string[]> {
  const normalizedBook = normalizeBook(book)
  const cachedChapters = chaptersCache.get(normalizedBook)
  if (cachedChapters) {
    return Promise.resolve(cachedChapters)
  }

  const cacheKey = `${baseUrl()}:${normalizedBook}`
  const cached = chaptersPromiseByPath.get(cacheKey)
  if (cached) {
    return cached
  }

  const url = refsUrl(normalizedBook, 'chapters.json')
  const promise = fetchJson<unknown>(url).then((payload) => {
    const chapters = parseStringList(payload, 'chapters.json', url)
    chaptersCache.set(normalizedBook, chapters)
    return chapters
  })

  chaptersPromiseByPath.set(cacheKey, promise)
  return promise.catch((error: unknown) => {
    chaptersPromiseByPath.delete(cacheKey)
    throw error
  })
}

export function fetchVerses(book: string, chapter3: string): Promise<string[]> {
  const normalizedBook = normalizeBook(book)
  const normalizedChapter = normalizeChapter(chapter3)
  const versesKey = `${normalizedBook}/${normalizedChapter}`
  const cachedVerses = versesCache.get(versesKey)
  if (cachedVerses) {
    return Promise.resolve(cachedVerses)
  }

  const cacheKey = `${baseUrl()}:${normalizedBook}/${normalizedChapter}`
  const cached = versesPromiseByPath.get(cacheKey)
  if (cached) {
    return cached
  }

  const url = refsUrl(normalizedBook, normalizedChapter, 'verses.json')
  const promise = fetchJson<unknown>(url).then((payload) => {
    const verses = parseStringList(payload, 'verses.json', url)
    versesCache.set(versesKey, verses)
    return verses
  })

  versesPromiseByPath.set(cacheKey, promise)
  return promise.catch((error: unknown) => {
    versesPromiseByPath.delete(cacheKey)
    throw error
  })
}
