import { describe, expect, it } from 'vitest'
import { CORPUS_BASE_URL } from '../config/corpus'
import { graphDotUrl, manifestUrl } from './urls'

describe('urls', () => {
  it('builds manifest URL from corpus base URL', () => {
    expect(manifestUrl()).toBe(`${CORPUS_BASE_URL}/manifest.json`)
  })

  it('builds graph.dot URL for a known verse reference', () => {
    const ref = { book: 'genesis', chapter3: '001', verse3: '001' }
    expect(graphDotUrl(ref)).toBe(`${CORPUS_BASE_URL}/refs/genesis/001/001/graph.dot`)
  })
})
