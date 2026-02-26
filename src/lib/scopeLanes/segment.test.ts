import { describe, expect, it } from 'vitest'
import type { BoundaryAfterWord } from './types'
import { segmentScopeLanes } from './segment'

function boundaries(kinds: BoundaryAfterWord['kind'][]): BoundaryAfterWord[] {
  return kinds.map((kind, i) => ({ wordIndex: i + 1, kind }))
}

describe('segmentScopeLanes', () => {
  it('builds deterministic rank3/rank2 spans from cut boundaries', () => {
    const result = segmentScopeLanes(
      boundaries(['cut_1', 'glue', 'cut_2', 'glue', 'cut_1', 'glue', 'cut_3']),
      7
    )

    expect(result.rank3).toEqual([{ rank: 3, startWord: 1, endWord: 7 }])
    expect(result.rank2).toEqual([
      { rank: 2, startWord: 1, endWord: 3 },
      { rank: 2, startWord: 4, endWord: 7 },
    ])
    expect(result.rank1).toBeUndefined()
  })

  it('includes rank1 only when showRank1 is true', () => {
    const hidden = segmentScopeLanes(
      boundaries(['cut_1', 'glue', 'cut_2', 'glue', 'cut_1', 'glue', 'cut_3']),
      7,
      { showRank1: false }
    )
    expect(hidden.rank1).toBeUndefined()

    const visible = segmentScopeLanes(
      boundaries(['cut_1', 'glue', 'cut_2', 'glue', 'cut_1', 'glue', 'cut_3']),
      7,
      { showRank1: true }
    )
    expect(visible.rank1).toEqual([
      { rank: 1, startWord: 1, endWord: 1 },
      { rank: 1, startWord: 2, endWord: 3 },
      { rank: 1, startWord: 4, endWord: 5 },
      { rank: 1, startWord: 6, endWord: 7 },
    ])
  })

  it('treats hard as strength 0 by default and 1 when includeHardBreaks is enabled', () => {
    const baseKinds: BoundaryAfterWord['kind'][] = ['hard', 'glue', 'hard', 'cut_2']

    const defaultPolicy = segmentScopeLanes(boundaries(baseKinds), 4, { showRank1: true })
    expect(defaultPolicy.rank2).toEqual([{ rank: 2, startWord: 1, endWord: 4 }])
    expect(defaultPolicy.rank1).toEqual([{ rank: 1, startWord: 1, endWord: 4 }])

    const includeHard = segmentScopeLanes(boundaries(baseKinds), 4, {
      showRank1: true,
      includeHardBreaks: true,
    })
    expect(includeHard.rank2).toEqual([{ rank: 2, startWord: 1, endWord: 4 }])
    expect(includeHard.rank1).toEqual([
      { rank: 1, startWord: 1, endWord: 1 },
      { rank: 1, startWord: 2, endWord: 3 },
      { rank: 1, startWord: 4, endWord: 4 },
    ])
  })
})

