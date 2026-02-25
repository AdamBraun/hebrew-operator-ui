import { describe, expect, it } from 'vitest'
import type { NavModel } from '../navModel'
import { getNextRef, getPrevRef } from '../navWalk'

const nav: NavModel = {
  books: ['genesis', 'exodus'],
  chaptersByBook: {
    genesis: ['001', '002'],
    exodus: ['001'],
  },
  versesByBookChapter: {
    genesis: {
      '001': ['001', '002', '003', '004', '005', '006', '007', '008', '009', '010', '011'],
      '002': ['001', '002'],
    },
    exodus: {
      '001': ['001'],
    },
  },
}

describe('nav walking', () => {
  it('first verse prev = null', () => {
    expect(
      getPrevRef(nav, {
        book: 'genesis',
        chapter3: '001',
        verse3: '001',
      })
    ).toBeNull()
  })

  it('last verse next = null', () => {
    expect(
      getNextRef(nav, {
        book: 'exodus',
        chapter3: '001',
        verse3: '001',
      })
    ).toBeNull()
  })

  it('crosses chapter boundaries in both directions', () => {
    expect(
      getNextRef(nav, { book: 'genesis', chapter3: '001', verse3: '011' })
    ).toEqual({
      book: 'genesis',
      chapter3: '002',
      verse3: '001',
    })

    expect(
      getPrevRef(nav, { book: 'genesis', chapter3: '002', verse3: '001' })
    ).toEqual({
      book: 'genesis',
      chapter3: '001',
      verse3: '011',
    })
  })

  it('advances 10 times from genesis 001:001 to genesis 001:011', () => {
    let current = { book: 'genesis', chapter3: '001', verse3: '001' }

    for (let i = 0; i < 10; i += 1) {
      const next = getNextRef(nav, current)
      expect(next).not.toBeNull()
      current = next!
    }

    expect(current).toEqual({ book: 'genesis', chapter3: '001', verse3: '011' })
  })
})
