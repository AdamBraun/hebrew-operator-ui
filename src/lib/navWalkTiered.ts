import type { NavModel } from './navModel'
import type { VerseRef } from './ref'

export type TieredNavAccess = {
  nav: NavModel
  ensureChapters: (book: string) => Promise<string[]>
  ensureVerses: (book: string, chapter3: string) => Promise<string[]>
}

function first<T>(values: T[] | undefined): T | null {
  return values && values.length > 0 ? values[0] : null
}

function last<T>(values: T[] | undefined): T | null {
  return values && values.length > 0 ? values[values.length - 1] : null
}

async function getChapters(access: TieredNavAccess, book: string): Promise<string[]> {
  const cached = access.nav.chaptersByBook[book]
  if (cached && cached.length > 0) {
    return cached
  }
  return access.ensureChapters(book)
}

async function getVerses(
  access: TieredNavAccess,
  book: string,
  chapter3: string
): Promise<string[]> {
  const cached = access.nav.versesByBookChapter[book]?.[chapter3]
  if (cached && cached.length > 0) {
    return cached
  }
  return access.ensureVerses(book, chapter3)
}

export async function getNextRefTiered(
  access: TieredNavAccess,
  ref: VerseRef
): Promise<VerseRef | null> {
  const verses = await getVerses(access, ref.book, ref.chapter3)
  if (verses.length === 0) {
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

  const chapters = await getChapters(access, ref.book)
  const chapterIndex = chapters.indexOf(ref.chapter3)
  if (chapterIndex >= 0 && chapterIndex < chapters.length - 1) {
    const nextChapter = chapters[chapterIndex + 1]
    const nextVerse = first(await getVerses(access, ref.book, nextChapter))
    if (!nextVerse) {
      return null
    }

    return {
      book: ref.book,
      chapter3: nextChapter,
      verse3: nextVerse,
    }
  }

  const bookIndex = access.nav.books.indexOf(ref.book)
  if (bookIndex >= 0 && bookIndex < access.nav.books.length - 1) {
    const nextBook = access.nav.books[bookIndex + 1]
    const nextBookFirstChapter = first(await getChapters(access, nextBook))
    if (!nextBookFirstChapter) {
      return null
    }

    const nextBookFirstVerse = first(
      await getVerses(access, nextBook, nextBookFirstChapter)
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

export async function getPrevRefTiered(
  access: TieredNavAccess,
  ref: VerseRef
): Promise<VerseRef | null> {
  const verses = await getVerses(access, ref.book, ref.chapter3)
  if (verses.length === 0) {
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

  const chapters = await getChapters(access, ref.book)
  const chapterIndex = chapters.indexOf(ref.chapter3)
  if (chapterIndex > 0) {
    const prevChapter = chapters[chapterIndex - 1]
    const prevChapterLastVerse = last(await getVerses(access, ref.book, prevChapter))
    if (!prevChapterLastVerse) {
      return null
    }

    return {
      book: ref.book,
      chapter3: prevChapter,
      verse3: prevChapterLastVerse,
    }
  }

  const bookIndex = access.nav.books.indexOf(ref.book)
  if (bookIndex > 0) {
    const prevBook = access.nav.books[bookIndex - 1]
    const prevBookLastChapter = last(await getChapters(access, prevBook))
    if (!prevBookLastChapter) {
      return null
    }

    const prevBookLastVerse = last(
      await getVerses(access, prevBook, prevBookLastChapter)
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
