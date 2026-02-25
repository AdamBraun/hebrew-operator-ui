import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  fetchBooks,
  fetchChapters,
  fetchLegacyCorpusIndex,
  fetchVerses,
} from '../lib'
import { buildNavModel, type NavModel } from '../lib/navModel'
import {
  fixtureChaptersForBook,
  fixtureVersesForChapter,
  initialNavModelForSource,
  isFixtureSourceEnabled,
} from '../lib/source'

type NavState = {
  nav: NavModel | null
  loading: boolean
  error: string | null
  ensureChapters: (book: string) => Promise<string[]>
  ensureVerses: (book: string, chapter3: string) => Promise<string[]>
}

const NavContext = createContext<NavState>({
  nav: null,
  loading: true,
  error: null,
  ensureChapters: async () => [],
  ensureVerses: async () => [],
})

type NavProviderProps = {
  children: ReactNode
}

function mergeUniqueSorted(current: string[] | undefined, incoming: string[]): string[] {
  const merged = new Set<string>([...(current ?? []), ...incoming])
  return [...merged].sort()
}

export function NavProvider({ children }: NavProviderProps) {
  const fixtureMode = isFixtureSourceEnabled()
  const [nav, setNav] = useState<NavModel | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const navRef = useRef<NavModel | null>(null)
  const chapterRequestsRef = useRef<Map<string, Promise<string[]>>>(new Map())
  const verseRequestsRef = useRef<Map<string, Promise<string[]>>>(new Map())

  useEffect(() => {
    navRef.current = nav
  }, [nav])

  const ensureChapters = useCallback(async (book: string) => {
    const normalizedBook = book.trim().toLowerCase()
    if (!normalizedBook) {
      return []
    }

    const existing = navRef.current?.chaptersByBook[normalizedBook]
    if (existing && existing.length > 0) {
      return existing
    }

    if (fixtureMode) {
      return fixtureChaptersForBook(normalizedBook)
    }

    const inFlight = chapterRequestsRef.current.get(normalizedBook)
    if (inFlight) {
      return inFlight
    }

    const request = fetchChapters(normalizedBook)
      .then((chapters) => {
        setNav((current) => {
          const base: NavModel = current ?? {
            books: [],
            chaptersByBook: {},
            versesByBookChapter: {},
          }

          return {
            ...base,
            books: mergeUniqueSorted(base.books, [normalizedBook]),
            chaptersByBook: {
              ...base.chaptersByBook,
              [normalizedBook]: chapters,
            },
          }
        })
        return chapters
      })
      .finally(() => {
        chapterRequestsRef.current.delete(normalizedBook)
      })

    chapterRequestsRef.current.set(normalizedBook, request)
    return request
  }, [fixtureMode])

  const ensureVerses = useCallback(
    async (book: string, chapter3: string) => {
      const normalizedBook = book.trim().toLowerCase()
      const normalizedChapter = chapter3.trim().padStart(3, '0')
      if (!normalizedBook || !normalizedChapter) {
        return []
      }

      const existing =
        navRef.current?.versesByBookChapter[normalizedBook]?.[normalizedChapter]
      if (existing && existing.length > 0) {
        return existing
      }

      if (fixtureMode) {
        return fixtureVersesForChapter(normalizedBook, normalizedChapter)
      }

      const key = `${normalizedBook}/${normalizedChapter}`
      const inFlight = verseRequestsRef.current.get(key)
      if (inFlight) {
        return inFlight
      }

      const request = fetchVerses(normalizedBook, normalizedChapter)
        .then((verses) => {
          setNav((current) => {
            const base: NavModel = current ?? {
              books: [],
              chaptersByBook: {},
              versesByBookChapter: {},
            }

            const existingVersesByBook = base.versesByBookChapter[normalizedBook] ?? {}
            const existingChapters = base.chaptersByBook[normalizedBook] ?? []

            return {
              ...base,
              books: mergeUniqueSorted(base.books, [normalizedBook]),
              chaptersByBook: {
                ...base.chaptersByBook,
                [normalizedBook]: mergeUniqueSorted(existingChapters, [normalizedChapter]),
              },
              versesByBookChapter: {
                ...base.versesByBookChapter,
                [normalizedBook]: {
                  ...existingVersesByBook,
                  [normalizedChapter]: verses,
                },
              },
            }
          })
          return verses
        })
        .finally(() => {
          verseRequestsRef.current.delete(key)
        })

      verseRequestsRef.current.set(key, request)
      return request
    },
    [fixtureMode]
  )

  useEffect(() => {
    let canceled = false

    async function loadBooks() {
      if (fixtureMode) {
        const fixtureNav = initialNavModelForSource()
        if (!canceled) {
          setNav(fixtureNav)
          setError(null)
          setLoading(false)
        }
        return
      }

      try {
        const books = await fetchBooks()
        if (canceled) {
          return
        }

        setNav({
          books: [...books],
          chaptersByBook: {},
          versesByBookChapter: {},
        })
        setError(null)
      } catch (loadError: unknown) {
        try {
          const legacyIndex = await fetchLegacyCorpusIndex()
          const model = buildNavModel(legacyIndex)

          if (canceled) {
            return
          }

          setNav(model)
          setError(null)
        } catch (fallbackError: unknown) {
          if (canceled) {
            return
          }

          const tieredMessage =
            loadError instanceof Error ? loadError.message : 'unknown tiered fetch error'
          const legacyMessage =
            fallbackError instanceof Error
              ? fallbackError.message
              : 'unknown legacy fetch error'

          setError(
            `Failed to load navigation (tiered + legacy). Tiered: ${tieredMessage}. Legacy: ${legacyMessage}`
          )
        }
      } finally {
        if (!canceled) {
          setLoading(false)
        }
      }
    }

    void loadBooks()

    return () => {
      canceled = true
    }
  }, [fixtureMode])

  const value = useMemo(
    () => ({
      nav,
      loading,
      error,
      ensureChapters,
      ensureVerses,
    }),
    [nav, loading, error, ensureChapters, ensureVerses]
  )

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

export function useNavState(): NavState {
  return useContext(NavContext)
}
