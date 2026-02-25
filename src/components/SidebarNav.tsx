import type { ChangeEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { NavModel } from '../lib/navModel'
import type { VerseRef } from '../lib/ref'
import './SidebarNav.css'

type SidebarNavProps = {
  nav: NavModel
  currentRef: VerseRef | null
  navLoading?: boolean
  ensureChapters: (book: string) => Promise<string[]>
  ensureVerses: (book: string, chapter3: string) => Promise<string[]>
}

function routePath(book: string, chapter3: string, verse3: string): string {
  return `/${book}/${chapter3}/${verse3}`
}

function SidebarNav({
  nav,
  currentRef,
  navLoading = false,
  ensureChapters,
  ensureVerses,
}: SidebarNavProps) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const selectedBook = useMemo(() => {
    if (currentRef && nav.books.includes(currentRef.book)) {
      return currentRef.book
    }
    return nav.books[0] ?? ''
  }, [currentRef, nav.books])

  const chapterOptions = nav.chaptersByBook[selectedBook] ?? []

  const selectedChapter = useMemo(() => {
    if (currentRef?.book === selectedBook && chapterOptions.includes(currentRef.chapter3)) {
      return currentRef.chapter3
    }
    return chapterOptions[0] ?? ''
  }, [chapterOptions, currentRef, selectedBook])

  const verseOptions = nav.versesByBookChapter[selectedBook]?.[selectedChapter] ?? []

  useEffect(() => {
    if (!selectedBook || chapterOptions.length > 0) {
      return
    }

    void ensureChapters(selectedBook)
  }, [chapterOptions.length, ensureChapters, selectedBook])

  useEffect(() => {
    if (!selectedBook || !selectedChapter || verseOptions.length > 0) {
      return
    }

    void ensureVerses(selectedBook, selectedChapter)
  }, [ensureVerses, selectedBook, selectedChapter, verseOptions.length])

  async function onBookChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextBook = event.target.value
    if (!nextBook) {
      return
    }

    setBusy(true)
    try {
      const chapters = await ensureChapters(nextBook)
      const nextChapter = chapters[0]
      if (!nextChapter) {
        return
      }

      const verses = await ensureVerses(nextBook, nextChapter)
      const nextVerse = verses[0]
      if (!nextVerse) {
        return
      }

      navigate(routePath(nextBook, nextChapter, nextVerse))
    } finally {
      setBusy(false)
    }
  }

  async function onChapterChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextChapter = event.target.value
    if (!selectedBook || !nextChapter) {
      return
    }

    setBusy(true)
    try {
      const verses = await ensureVerses(selectedBook, nextChapter)
      const nextVerse = verses[0]
      if (!nextVerse) {
        return
      }
      navigate(routePath(selectedBook, nextChapter, nextVerse))
    } finally {
      setBusy(false)
    }
  }

  const controlsDisabled = navLoading || busy

  return (
    <nav aria-label="Corpus Navigation" className="sidebar-nav">
      <h2 className="sidebar-nav__title">Navigation</h2>

      <label className="sidebar-nav__label" htmlFor="sidebar-book">
        Book
      </label>
      <select
        id="sidebar-book"
        className="sidebar-nav__select"
        value={selectedBook}
        onChange={onBookChange}
        disabled={controlsDisabled}
      >
        {nav.books.map((book) => (
          <option key={book} value={book}>
            {book}
          </option>
        ))}
      </select>

      <label className="sidebar-nav__label" htmlFor="sidebar-chapter">
        Chapter
      </label>
      <select
        id="sidebar-chapter"
        className="sidebar-nav__select"
        value={selectedChapter}
        onChange={onChapterChange}
        disabled={controlsDisabled || chapterOptions.length === 0}
      >
        {chapterOptions.map((chapter3) => (
          <option key={chapter3} value={chapter3}>
            {chapter3}
          </option>
        ))}
      </select>

      <h3 className="sidebar-nav__subhead">Verses</h3>
      <div className="sidebar-nav__verses" role="list" aria-label="Verse list">
        {verseOptions.map((verse3) => {
          const isCurrent =
            currentRef?.book === selectedBook &&
            currentRef.chapter3 === selectedChapter &&
            currentRef.verse3 === verse3

          return (
            <button
              key={verse3}
              type="button"
              role="listitem"
              className={`sidebar-nav__verse ${isCurrent ? 'sidebar-nav__verse--active' : ''}`}
              aria-current={isCurrent ? 'true' : undefined}
              disabled={controlsDisabled}
              onClick={() => navigate(routePath(selectedBook, selectedChapter, verse3))}
            >
              {verse3}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default SidebarNav
