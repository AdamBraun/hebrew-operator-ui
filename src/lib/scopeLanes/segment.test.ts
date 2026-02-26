import { describe, expect, it } from 'vitest'
import type { BoundaryAfterWord } from './types'
import { segmentScopeLanes } from './segment'

function boundaries(kinds: BoundaryAfterWord['kind'][]): BoundaryAfterWord[] {
  return kinds.map((kind, i) => ({ wordIndex: i + 1, kind }))
}

function boundariesWithTropes(
  rows: Array<{ kind: BoundaryAfterWord['kind']; tropeName?: string }>
): BoundaryAfterWord[] {
  return rows.map((row, i) => ({ wordIndex: i + 1, kind: row.kind, tropeName: row.tropeName }))
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

  it('uses trope-aware hierarchy when trope metadata is present', () => {
    const result = segmentScopeLanes(
      boundariesWithTropes([
        { kind: 'glue_maqqef' },
        { kind: 'cut_1', tropeName: 'gershayim' },
        { kind: 'glue' },
        { kind: 'cut_1', tropeName: 'tevir' },
        { kind: 'glue_maqqef' },
        { kind: 'cut_1', tropeName: 'tipcha' },
        { kind: 'glue_maqqef' },
        { kind: 'cut_2', tropeName: 'etnahta' },
        { kind: 'glue' },
        { kind: 'glue_maqqef' },
        { kind: 'cut_2', tropeName: 'pashta' },
        { kind: 'cut_2', tropeName: 'zaqef_qatan' },
        { kind: 'glue' },
        { kind: 'cut_1', tropeName: 'tipcha' },
        { kind: 'glue_maqqef' },
        { kind: 'glue' },
        { kind: 'cut_3' },
      ]),
      17,
      { showRank1: true }
    )

    expect(result.rank3).toEqual([
      { rank: 3, startWord: 1, endWord: 8 },
      { rank: 3, startWord: 9, endWord: 17 },
    ])
    expect(result.rank2).toEqual([
      { rank: 2, startWord: 1, endWord: 6 },
      { rank: 2, startWord: 7, endWord: 8 },
      { rank: 2, startWord: 9, endWord: 14 },
      { rank: 2, startWord: 15, endWord: 17 },
    ])
    expect(result.rank1).toEqual([
      { rank: 1, startWord: 1, endWord: 4 },
      { rank: 1, startWord: 5, endWord: 6 },
      { rank: 1, startWord: 7, endWord: 8 },
      { rank: 1, startWord: 9, endWord: 12 },
      { rank: 1, startWord: 13, endWord: 14 },
      { rank: 1, startWord: 15, endWord: 17 },
    ])
  })
})
