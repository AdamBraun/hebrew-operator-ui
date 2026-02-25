import type { ChangeEvent } from 'react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { NavModel } from '../lib/navModel'
import type { VerseRef } from '../lib/ref'
import './SidebarNav.css'

type SidebarNavProps = {
  nav: NavModel
  currentRef: VerseRef | null
}

function routePath(book: string, chapter3: string, verse3: string): string {
  return `/${book}/${chapter3}/${verse3}`
}

function firstRefForBook(nav: NavModel, book: string): VerseRef | null {
  const chapter3 = nav.chaptersByBook[book]?.[0]
  if (!chapter3) {
    return null
  }

  const verse3 = nav.versesByBookChapter[book]?.[chapter3]?.[0]
  if (!verse3) {
    return null
  }

  return { book, chapter3, verse3 }
}

function firstRefForChapter(nav: NavModel, book: string, chapter3: string): VerseRef | null {
  const verse3 = nav.versesByBookChapter[book]?.[chapter3]?.[0]
  if (!verse3) {
    return null
  }

  return { book, chapter3, verse3 }
}

function SidebarNav({ nav, currentRef }: SidebarNavProps) {
  const navigate = useNavigate()

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

  function onBookChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextBook = event.target.value
    const nextRef = firstRefForBook(nav, nextBook)
    if (!nextRef) {
      return
    }
    navigate(routePath(nextRef.book, nextRef.chapter3, nextRef.verse3))
  }

  function onChapterChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextChapter = event.target.value
    const nextRef = firstRefForChapter(nav, selectedBook, nextChapter)
    if (!nextRef) {
      return
    }
    navigate(routePath(nextRef.book, nextRef.chapter3, nextRef.verse3))
  }

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
