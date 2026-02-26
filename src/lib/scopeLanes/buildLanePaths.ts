import type { WordRect } from '../../components/VerseLine'
import type { LaneSpan } from './types'

export type LanePathConfig = {
  laneOffsets?: Record<1 | 2 | 3, number>
  capHeight?: number
}

export type LanePath = {
  id: string
  rank: 1 | 2 | 3
  startWord: number
  endWord: number
  x1: number
  x2: number
  y: number
  d: string
}

const DEFAULT_LANE_OFFSETS: Record<1 | 2 | 3, number> = {
  3: 8,
  2: 20,
  1: 32,
}

const DEFAULT_CAP_HEIGHT = 6

export function buildLanePaths(
  spans: LaneSpan[],
  rects: WordRect[],
  laneConfig?: LanePathConfig
): LanePath[] {
  if (spans.length === 0 || rects.length === 0) {
    return []
  }

  const offsets = laneConfig?.laneOffsets ?? DEFAULT_LANE_OFFSETS
  const capHeight = laneConfig?.capHeight ?? DEFAULT_CAP_HEIGHT
  const baseline = rects.reduce((max, rect) => Math.max(max, rect.bottom), 0)
  const rectByWordIndex = new Map<number, WordRect>(rects.map((rect) => [rect.index, rect]))
  const paths: LanePath[] = []

  for (let i = 0; i < spans.length; i += 1) {
    const span = spans[i]
    const startRect = rectByWordIndex.get(span.startWord)
    const endRect = rectByWordIndex.get(span.endWord)
    if (!startRect || !endRect) {
      continue
    }

    const x1 = Math.min(startRect.left, endRect.left)
    const x2 = Math.max(startRect.right, endRect.right)
    const rank = span.rank
    const y = baseline + offsets[rank]
    const d = `M ${x1} ${y - capHeight} V ${y} H ${x2} V ${y - capHeight}`

    paths.push({
      id: `lane-${rank}-${span.startWord}-${span.endWord}-${i}`,
      rank,
      startWord: span.startWord,
      endWord: span.endWord,
      x1,
      x2,
      y,
      d,
    })
  }

  return paths
}
