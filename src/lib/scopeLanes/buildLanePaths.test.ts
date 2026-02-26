import { describe, expect, it } from 'vitest'
import { buildLanePaths } from './buildLanePaths'

describe('buildLanePaths', () => {
  it('maps span word boundaries to bracket path geometry', () => {
    const rects = [
      { index: 1, left: 10, right: 30, top: 0, bottom: 18 },
      { index: 2, left: 35, right: 60, top: 0, bottom: 18 },
      { index: 3, left: 65, right: 95, top: 0, bottom: 18 },
    ]
    const spans = [{ rank: 2 as const, startWord: 1, endWord: 3 }]

    const paths = buildLanePaths(spans, rects, {
      laneOffsets: { 3: 8, 2: 20, 1: 32 },
      capHeight: 6,
    })

    expect(paths).toHaveLength(1)
    expect(paths[0]).toMatchObject({
      rank: 2,
      x1: 10,
      x2: 95,
      y: 38,
    })
    expect(paths[0].d).toBe('M 10 32 V 38 H 95 V 32')
  })
})

