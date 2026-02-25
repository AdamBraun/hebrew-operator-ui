import { describe, expect, it } from 'vitest'
import type { NavModel } from './navModel'
import { getNextRef, getPrevRef } from './navWalk'

const nav: NavModel = {
  books: ['genesis', 'exodus'],
  chaptersByBook: {
    genesis: ['001', '002'],
    exodus: ['001'],
  },
  versesByBookChapter: {
    genesis: {
      '001': ['001', '002'],
      '002': ['001'],
    },
    exodus: {
      '001': ['001', '002'],
    },
  },
}

describe('getNextRef', () => {
  it('advances within the same chapter when a next verse exists', () => {
    expect(
      getNextRef(nav, { book: 'genesis', chapter3: '001', verse3: '001' })
    ).toEqual({
      book: 'genesis',
      chapter3: '001',
      verse3: '002',
    })
  })

  it('crosses to first verse of next chapter at chapter end', () => {
    expect(
      getNextRef(nav, { book: 'genesis', chapter3: '001', verse3: '002' })
    ).toEqual({
      book: 'genesis',
      chapter3: '002',
      verse3: '001',
    })
  })

  it('crosses to next book at final chapter end', () => {
    expect(
      getNextRef(nav, { book: 'genesis', chapter3: '002', verse3: '001' })
    ).toEqual({
      book: 'exodus',
      chapter3: '001',
      verse3: '001',
    })
  })

  it('returns null at corpus end', () => {
    expect(
      getNextRef(nav, { book: 'exodus', chapter3: '001', verse3: '002' })
    ).toBeNull()
  })
})

describe('getPrevRef', () => {
  it('moves backward within the same chapter when a previous verse exists', () => {
    expect(
      getPrevRef(nav, { book: 'exodus', chapter3: '001', verse3: '002' })
    ).toEqual({
      book: 'exodus',
      chapter3: '001',
      verse3: '001',
    })
  })

  it('crosses to last verse of previous chapter at chapter start', () => {
    expect(
      getPrevRef(nav, { book: 'genesis', chapter3: '002', verse3: '001' })
    ).toEqual({
      book: 'genesis',
      chapter3: '001',
      verse3: '002',
    })
  })

  it('crosses to previous book at first chapter start', () => {
    expect(
      getPrevRef(nav, { book: 'exodus', chapter3: '001', verse3: '001' })
    ).toEqual({
      book: 'genesis',
      chapter3: '002',
      verse3: '001',
    })
  })

  it('returns null at corpus start', () => {
    expect(
      getPrevRef(nav, { book: 'genesis', chapter3: '001', verse3: '001' })
    ).toBeNull()
  })
})
