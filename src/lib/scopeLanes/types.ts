export type BoundaryKind =
  | 'glue'
  | 'glue_maqqef'
  | 'cut_1'
  | 'cut_2'
  | 'cut_3'
  | 'hard'
  | 'unknown'

export type VerseWord = {
  index: number
  text: string
}

export type BoundaryAfterWord = {
  wordIndex: number
  kind: BoundaryKind
}

export type LaneRank = 3 | 2 | 1

export type LaneSpan = {
  rank: LaneRank
  startWord: number
  endWord: number
}

export type ScopeLanesModel = {
  ref: {
    book: string
    chapter3: string
    verse3: string
  }
  words: VerseWord[]
  boundariesAfter: BoundaryAfterWord[]
  lanes: {
    rank3: LaneSpan[]
    rank2: LaneSpan[]
    rank1?: LaneSpan[]
  }
}

export type ScopeSelection =
  | { type: 'word'; index: number }
  | { type: 'span'; rank: 3 | 2 | 1; startWord: number; endWord: number }
