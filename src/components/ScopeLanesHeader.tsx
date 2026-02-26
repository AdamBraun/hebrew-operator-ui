import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import ScopeLanesLegend from './ScopeLanesLegend'
import ScopeSpanTooltip from './ScopeSpanTooltip'
import type { LaneSpan, ScopeLanesModel, ScopeSelection } from '../lib/scopeLanes/types'
import './ScopeLanesHeader.css'

type ScopeLanesHeaderProps = {
  model: ScopeLanesModel
  mode?: 'lite' | 'research'
  colorByRank?: boolean
  showWordIndexOnHover?: boolean
  selection?: ScopeSelection | null
  onSelect: (selection: ScopeSelection | null) => void
}

type ScopeSpanSelection = Extract<ScopeSelection, { type: 'span' }>

function smallestVisibleSpanContainingWord(
  wordIndex: number | undefined,
  lanes: ScopeLanesModel['lanes']
): Extract<ScopeSelection, { type: 'span' }> | null {
  if (wordIndex === undefined) {
    return null
  }

  const visibleSpans = [...lanes.rank3, ...lanes.rank2, ...(lanes.rank1 ?? [])]
  const containing = visibleSpans.filter(
    (span) => wordIndex >= span.startWord && wordIndex <= span.endWord
  )
  if (containing.length === 0) {
    return null
  }

  containing.sort((a, b) => {
    const widthA = a.endWord - a.startWord
    const widthB = b.endWord - b.startWord
    if (widthA !== widthB) {
      return widthA - widthB
    }
    return a.rank - b.rank
  })

  const winner = containing[0]
  return {
    type: 'span',
    rank: winner.rank,
    startWord: winner.startWord,
    endWord: winner.endWord,
  }
}

function spansEqual(
  a: ScopeSpanSelection | null | undefined,
  b: ScopeSpanSelection | null | undefined
): boolean {
  if (!a || !b) {
    return false
  }
  return (
    a.rank === b.rank &&
    a.startWord === b.startWord &&
    a.endWord === b.endWord
  )
}

function spanSelectionFromLane(span: LaneSpan): ScopeSpanSelection {
  return {
    type: 'span',
    rank: span.rank,
    startWord: span.startWord,
    endWord: span.endWord,
  }
}

function ScopeLanesHeader({
  model,
  mode = 'lite',
  colorByRank = false,
  showWordIndexOnHover = false,
  selection = null,
  onSelect,
}: ScopeLanesHeaderProps) {
  const headerRef = useRef<HTMLElement | null>(null)
  const lineRef = useRef<HTMLDivElement | null>(null)
  const [hoveredWordIndex, setHoveredWordIndex] = useState<number | undefined>(undefined)
  const [hoveredSpan, setHoveredSpan] = useState<ScopeSpanSelection | undefined>(undefined)
  const [legendOpen, setLegendOpen] = useState(false)

  const visibleRanks = useMemo<Array<3 | 2 | 1>>(
    () => (model.lanes.rank1 ? [3, 2, 1] : [3, 2]),
    [model.lanes.rank1]
  )
  const lanesByRank = useMemo(
    () => ({
      3: [...model.lanes.rank3].sort((a, b) => a.startWord - b.startWord),
      2: [...model.lanes.rank2].sort((a, b) => a.startWord - b.startWord),
      1: [...(model.lanes.rank1 ?? [])].sort((a, b) => a.startWord - b.startWord),
    }),
    [model.lanes.rank1, model.lanes.rank2, model.lanes.rank3]
  )
  const wordsByIndex = useMemo(
    () => new Map(model.words.map((word) => [word.index, word.text])),
    [model.words]
  )
  const boundaryByWordIndex = useMemo(
    () => new Map(model.boundariesAfter.map((boundary) => [boundary.wordIndex, boundary.kind])),
    [model.boundariesAfter]
  )

  const selectedWordIndex = selection?.type === 'word' ? selection.index : undefined
  const tooltipSpan =
    hoveredSpan ?? (selection?.type === 'span' ? (selection as ScopeSpanSelection) : undefined)
  const relatedSpan = useMemo(
    () =>
      smallestVisibleSpanContainingWord(
        selection?.type === 'word' ? selection.index : hoveredWordIndex,
        model.lanes
      ),
    [hoveredWordIndex, model.lanes, selection]
  )
  const tooltip = useMemo(() => {
    if (!tooltipSpan) {
      return null
    }
    const container = lineRef.current
    const header = headerRef.current
    if (!container || !header) {
      return null
    }
    const startNode = container.querySelector<HTMLElement>(
      `[data-word-index="${tooltipSpan.startWord}"]`
    )
    const endNode = container.querySelector<HTMLElement>(`[data-word-index="${tooltipSpan.endWord}"]`)
    if (!startNode || !endNode) {
      return null
    }
    const headerRect = header.getBoundingClientRect()
    const startRect = startNode.getBoundingClientRect()
    const endRect = endNode.getBoundingClientRect()
    const rawX = (startRect.left + endRect.right) / 2 - headerRect.left
    const x = Math.max(28, Math.min(headerRect.width - 28, rawX))
    return {
      x,
      label: `Chunk rank ${tooltipSpan.rank}: words ${tooltipSpan.startWord}–${tooltipSpan.endWord}`,
    }
  }, [tooltipSpan])
  const hoverSpanRef = useMemo(() => {
    if (!tooltipSpan) {
      return undefined
    }
    return `rank=${tooltipSpan.rank};start=${tooltipSpan.startWord};end=${tooltipSpan.endWord}`
  }, [tooltipSpan])

  function nextVisibleRank(rank: 3 | 2 | 1): 3 | 2 | 1 | null {
    const i = visibleRanks.indexOf(rank)
    if (i < 0 || i === visibleRanks.length - 1) {
      return null
    }
    return visibleRanks[i + 1]
  }

  function renderWords(startWord: number, endWord: number, keyPrefix: string): ReactNode[] {
    const nodes: ReactNode[] = []
    for (let wordIndex = startWord; wordIndex <= endWord; wordIndex += 1) {
      nodes.push(
        <span
          key={`${keyPrefix}-w-${wordIndex}`}
          data-word-index={wordIndex}
          className={[
            'scope-lanes-header__word',
            selectedWordIndex === wordIndex ? 'scope-lanes-header__word--selected' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          title={showWordIndexOnHover ? `#${wordIndex}` : undefined}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onSelect({ type: 'word', index: wordIndex })
          }}
          onMouseEnter={() => setHoveredWordIndex(wordIndex)}
          onMouseLeave={() => setHoveredWordIndex(undefined)}
        >
          {wordsByIndex.get(wordIndex) ?? ''}
        </span>
      )
      if (wordIndex < endWord) {
        const gap = boundaryByWordIndex.get(wordIndex) === 'glue_maqqef' ? '־' : ' '
        nodes.push(
          <span key={`${keyPrefix}-gap-${wordIndex}`} className="scope-lanes-header__gap" aria-hidden="true">
            {gap}
          </span>
        )
      }
    }
    return nodes
  }

  function renderRankRange(
    rank: 3 | 2 | 1,
    startWord: number,
    endWord: number,
    keyPrefix: string
  ): ReactNode[] {
    const rankSpans = lanesByRank[rank].filter(
      (span) => span.startWord >= startWord && span.endWord <= endWord
    )
    const nextRank = nextVisibleRank(rank)

    if (rankSpans.length === 0) {
      if (!nextRank) {
        return renderWords(startWord, endWord, `${keyPrefix}-words`)
      }
      return renderRankRange(nextRank, startWord, endWord, `${keyPrefix}-r${nextRank}`)
    }

    const nodes: ReactNode[] = []
    rankSpans.forEach((span, idx) => {
      const spanSelection = spanSelectionFromLane(span)
      const child = nextRank
        ? renderRankRange(nextRank, span.startWord, span.endWord, `${keyPrefix}-${span.rank}-${span.startWord}-${span.endWord}-r${nextRank}`)
        : renderWords(span.startWord, span.endWord, `${keyPrefix}-${span.rank}-${span.startWord}-${span.endWord}-words`)
      nodes.push(
        <span
          key={`${keyPrefix}-lane-${span.rank}-${span.startWord}-${span.endWord}`}
          className={[
            'scope-lane',
            `scope-lane--rank-${span.rank}`,
            spansEqual(hoveredSpan, spanSelection) ? 'scope-lane--hovered' : '',
            spansEqual(selection?.type === 'span' ? selection : undefined, spanSelection)
              ? 'scope-lane--selected'
              : '',
            spansEqual(relatedSpan ?? undefined, spanSelection) ? 'scope-lane--related' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onPointerDown={(event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) {
              return
            }
            event.preventDefault()
            event.stopPropagation()
            onSelect(spanSelection)
          }}
          onMouseEnter={() => setHoveredSpan(spanSelection)}
          onMouseLeave={() => {
            setHoveredSpan((current) => (spansEqual(current, spanSelection) ? undefined : current))
          }}
        >
          {child}
        </span>
      )
      if (idx < rankSpans.length - 1) {
        nodes.push(
          <span
            key={`${keyPrefix}-lane-gap-${rank}-${idx}`}
            className="scope-lanes-header__gap"
            aria-hidden="true"
          >
            {' '}
          </span>
        )
      }
    })
    return nodes
  }

  function handleLineKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onSelect(null)
      return
    }

    const currentWordIndex =
      selection?.type === 'word'
        ? selection.index
        : selection?.type === 'span'
          ? selection.startWord
          : 1

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      onSelect({
        type: 'word',
        index: Math.min(model.words.length, currentWordIndex + 1),
      })
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      onSelect({
        type: 'word',
        index: Math.max(1, currentWordIndex - 1),
      })
    }
  }

  const renderedLine = renderRankRange(visibleRanks[0], 1, model.words.length, 'root')

  return (
    <section
      ref={headerRef}
      className={[
        'scope-lanes-header',
        colorByRank ? 'scope-lanes-header--color-by-rank' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Scope lanes header"
    >
      {mode === 'research' ? (
        <div className="scope-lanes-header__inspect-tools">
          <button
            type="button"
            className="scope-lanes-header__legend-toggle"
            onClick={() => setLegendOpen((open) => !open)}
            aria-expanded={legendOpen}
            aria-controls="scope-lanes-legend"
          >
            {legendOpen ? 'Hide legend' : 'Show legend'}
          </button>
          {legendOpen ? <ScopeLanesLegend id="scope-lanes-legend" /> : null}
        </div>
      ) : null}
      <div
        ref={lineRef}
        dir="rtl"
        lang="he"
        tabIndex={0}
        className="scope-lanes-header__line"
        onKeyDown={handleLineKeyDown}
      >
        {renderedLine}
      </div>
      <ScopeSpanTooltip
        x={tooltip?.x ?? 28}
        text={tooltip?.label ?? ''}
        visible={tooltip !== null}
        copyValue={mode === 'research' ? hoverSpanRef : undefined}
        onCopy={(value) => {
          if (typeof navigator === 'undefined' || !navigator.clipboard) {
            return
          }
          void navigator.clipboard.writeText(value)
        }}
      />
    </section>
  )
}

export default ScopeLanesHeader
