import { describe, expect, it } from 'vitest'
import { buildNavModel } from './navModel'

describe('buildNavModel', () => {
  it('builds chapters and verses for nested refs', () => {
    const indexJson = {
      genesis: {
        '001': ['001', '002', '001'],
      },
    }

    const nav = buildNavModel(indexJson)

    expect(nav.chaptersByBook.genesis).toContain('001')
    expect(nav.versesByBookChapter.genesis['001']).toContain('001')
    expect(nav.versesByBookChapter.genesis['001']).toEqual(['001', '002'])
  })

  it('sorts Torah books canonically, then falls back to alphabetical', () => {
    const indexJson = {
      zechariah: { '001': ['001'] },
      deuteronomy: { '006': ['004'] },
      genesis: { '001': ['001'] },
      exodus: { '003': ['014'] },
      amos: { '001': ['001'] },
    }

    const nav = buildNavModel(indexJson)

    expect(nav.books).toEqual([
      'genesis',
      'exodus',
      'deuteronomy',
      'amos',
      'zechariah',
    ])
  })

  it('sorts numeric chapter and verse ids as zero-padded strings', () => {
    const indexJson = {
      refs: [
        'genesis/1/10',
        'genesis/1/2',
        'genesis/2/1',
        'genesis/10/1',
      ],
    }

    const nav = buildNavModel(indexJson)

    expect(nav.chaptersByBook.genesis).toEqual(['001', '002', '010'])
    expect(nav.versesByBookChapter.genesis['001']).toEqual(['002', '010'])
  })
})
