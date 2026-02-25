import { describe, expect, it } from 'vitest'
import { normalizeVerseRef } from './ref'

describe('normalizeVerseRef', () => {
  it('normalizes /genesis/1/1 to zero-padded chapter and verse', () => {
    expect(
      normalizeVerseRef({ book: 'genesis', chapter: '1', verse: '1' })
    ).toEqual({
      book: 'genesis',
      chapter3: '001',
      verse3: '001',
    })
  })

  it('normalizes mixed-case and padded input', () => {
    expect(
      normalizeVerseRef({ book: 'GENESIS', chapter: '001', verse: '1' })
    ).toEqual({
      book: 'genesis',
      chapter3: '001',
      verse3: '001',
    })
  })

  it('returns null when chapter is non-numeric', () => {
    expect(
      normalizeVerseRef({ book: 'genesis', chapter: 'abc', verse: '1' })
    ).toBeNull()
  })

  it('returns null when verse is zero', () => {
    expect(
      normalizeVerseRef({ book: 'genesis', chapter: '1', verse: '0' })
    ).toBeNull()
  })
})
