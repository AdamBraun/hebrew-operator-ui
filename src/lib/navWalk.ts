import type { VerseRef } from './ref'
import type { NavModel } from './navModel'

function first<T>(values: T[] | undefined): T | null {
  return values && values.length > 0 ? values[0] : null
}

function last<T>(values: T[] | undefined): T | null {
  return values && values.length > 0 ? values[values.length - 1] : null
}

export function getNextRef(nav: NavModel, ref: VerseRef): VerseRef | null {
  const chapters = nav.chaptersByBook[ref.book]
  if (!chapters || chapters.length === 0) {
    return null
  }

  const verses = nav.versesByBookChapter[ref.book]?.[ref.chapter3]
  if (!verses || verses.length === 0) {
    return null
  }

  const verseIndex = verses.indexOf(ref.verse3)
  if (verseIndex >= 0 && verseIndex < verses.length - 1) {
    return {
      book: ref.book,
      chapter3: ref.chapter3,
      verse3: verses[verseIndex + 1],
    }
  }

  const chapterIndex = chapters.indexOf(ref.chapter3)
  if (chapterIndex >= 0 && chapterIndex < chapters.length - 1) {
    const nextChapter = chapters[chapterIndex + 1]
    const nextVerse = first(nav.versesByBookChapter[ref.book]?.[nextChapter])
    if (!nextVerse) {
      return null
    }

    return {
      book: ref.book,
      chapter3: nextChapter,
      verse3: nextVerse,
    }
  }

  const bookIndex = nav.books.indexOf(ref.book)
  if (bookIndex >= 0 && bookIndex < nav.books.length - 1) {
    const nextBook = nav.books[bookIndex + 1]
    const nextBookFirstChapter = first(nav.chaptersByBook[nextBook])
    if (!nextBookFirstChapter) {
      return null
    }

    const nextBookFirstVerse = first(
      nav.versesByBookChapter[nextBook]?.[nextBookFirstChapter]
    )
    if (!nextBookFirstVerse) {
      return null
    }

    return {
      book: nextBook,
      chapter3: nextBookFirstChapter,
      verse3: nextBookFirstVerse,
    }
  }

  return null
}

export function getPrevRef(nav: NavModel, ref: VerseRef): VerseRef | null {
  const chapters = nav.chaptersByBook[ref.book]
  if (!chapters || chapters.length === 0) {
    return null
  }

  const verses = nav.versesByBookChapter[ref.book]?.[ref.chapter3]
  if (!verses || verses.length === 0) {
    return null
  }

  const verseIndex = verses.indexOf(ref.verse3)
  if (verseIndex > 0) {
    return {
      book: ref.book,
      chapter3: ref.chapter3,
      verse3: verses[verseIndex - 1],
    }
  }

  const chapterIndex = chapters.indexOf(ref.chapter3)
  if (chapterIndex > 0) {
    const prevChapter = chapters[chapterIndex - 1]
    const prevChapterLastVerse = last(nav.versesByBookChapter[ref.book]?.[prevChapter])
    if (!prevChapterLastVerse) {
      return null
    }

    return {
      book: ref.book,
      chapter3: prevChapter,
      verse3: prevChapterLastVerse,
    }
  }

  const bookIndex = nav.books.indexOf(ref.book)
  if (bookIndex > 0) {
    const prevBook = nav.books[bookIndex - 1]
    const prevBookLastChapter = last(nav.chaptersByBook[prevBook])
    if (!prevBookLastChapter) {
      return null
    }

    const prevBookLastVerse = last(
      nav.versesByBookChapter[prevBook]?.[prevBookLastChapter]
    )
    if (!prevBookLastVerse) {
      return null
    }

    return {
      book: prevBook,
      chapter3: prevBookLastChapter,
      verse3: prevBookLastVerse,
    }
  }

  return null
}
