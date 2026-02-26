import type { BoundaryAfterWord, BoundaryKind, LaneSpan, ScopeLanesModel } from './types'

export type ScopeSegmentationPolicy = {
  showRank1?: boolean
  includeHardBreaks?: boolean
}

export const DEFAULT_SCOPE_SEGMENTATION_POLICY: Required<ScopeSegmentationPolicy> = {
  showRank1: false,
  includeHardBreaks: false,
}

function toPolicy(policy?: ScopeSegmentationPolicy): Required<ScopeSegmentationPolicy> {
  return {
    ...DEFAULT_SCOPE_SEGMENTATION_POLICY,
    ...(policy ?? {}),
  }
}

function boundaryStrength(
  kind: BoundaryKind,
  policy: Required<ScopeSegmentationPolicy>
): 0 | 1 | 2 | 3 {
  if (kind === 'glue' || kind === 'glue_maqqef' || kind === 'unknown') {
    return 0
  }

  if (kind === 'hard') {
    return policy.includeHardBreaks ? 1 : 0
  }

  if (kind === 'cut_1') {
    return 1
  }
  if (kind === 'cut_2') {
    return 2
  }
  if (kind === 'cut_3') {
    return 3
  }

  return 0
}

function buildRankSpans(
  rank: 3 | 2 | 1,
  strengthsAfterWord: Array<0 | 1 | 2 | 3>
): LaneSpan[] {
  const spans: LaneSpan[] = []
  const n = strengthsAfterWord.length
  let start = 1

  for (let i = 1; i <= n; i += 1) {
    if (strengthsAfterWord[i - 1] >= rank) {
      spans.push({
        rank,
        startWord: start,
        endWord: i,
      })
      start = i + 1
    }
  }

  if (start <= n) {
    spans.push({
      rank,
      startWord: start,
      endWord: n,
    })
  }

  return spans
}

/**
 * Segment boundaries into rank lanes with a stable, text-first policy.
 *
 * Why this policy exists:
 * - We prioritize coarse readability over maximal fragmentation.
 * - By default, only cut_* boundaries drive segmentation; hard is treated as strength 0.
 * - This keeps lane 3/2 informative for first-time readers and avoids over-segmentation.
 * - Expert workflows can opt in to finer detail with showRank1/includeHardBreaks.
 */
export function segmentScopeLanes(
  boundariesAfter: BoundaryAfterWord[],
  wordCount: number,
  policy?: ScopeSegmentationPolicy
): ScopeLanesModel['lanes'] {
  const resolvedPolicy = toPolicy(policy)

  const strengthsAfterWord: Array<0 | 1 | 2 | 3> = Array.from(
    { length: wordCount },
    () => 0 as 0 | 1 | 2 | 3
  )

  for (const boundary of boundariesAfter) {
    const index = boundary.wordIndex
    if (!Number.isInteger(index) || index < 1 || index > wordCount) {
      continue
    }
    strengthsAfterWord[index - 1] = boundaryStrength(boundary.kind, resolvedPolicy)
  }

  return {
    rank3: buildRankSpans(3, strengthsAfterWord),
    rank2: buildRankSpans(2, strengthsAfterWord),
    ...(resolvedPolicy.showRank1
      ? { rank1: buildRankSpans(1, strengthsAfterWord) }
      : {}),
  }
}

