import { describe, expect, it } from 'vitest'
import { buildNavModel } from '../navModel'

describe('buildNavModel', () => {
  it('sorts books in Torah order and deduplicates chapter/verse ids', () => {
    const indexJson = {
      exodus: { '003': ['014'] },
      genesis: { '001': ['001', '002', '001'] },
      amos: { '001': ['001'] },
      deuteronomy: { '006': ['004'] },
    }

    const nav = buildNavModel(indexJson)

    expect(nav.books).toEqual(['genesis', 'exodus', 'deuteronomy', 'amos'])
    expect(nav.chaptersByBook.genesis).toEqual(['001'])
    expect(nav.versesByBookChapter.genesis['001']).toEqual(['001', '002'])
  })

  it('sorts chapters and verses numerically while storing padded strings', () => {
    const indexJson = {
      refs: ['genesis/10/1', 'genesis/2/1', 'genesis/1/10', 'genesis/1/2'],
    }

    const nav = buildNavModel(indexJson)

    expect(nav.chaptersByBook.genesis).toEqual(['001', '002', '010'])
    expect(nav.versesByBookChapter.genesis['001']).toEqual(['002', '010'])
  })
})
