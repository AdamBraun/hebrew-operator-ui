import { useMemo, useRef, useState } from 'react'
import ScopeLanesOverlay from './ScopeLanesOverlay'
import type { ScopeSpanSelection } from './ScopeLanesOverlay'
import ScopeLanesLegend from './ScopeLanesLegend'
import ScopeSpanTooltip from './ScopeSpanTooltip'
import VerseLine from './VerseLine'
import type { ScopeLanesModel, ScopeSelection } from '../lib/scopeLanes/types'
import { useWordMeasurements } from '../lib/scopeLanes/useWordMeasurements'
import './ScopeLanesHeader.css'

type ScopeLanesHeaderProps = {
  model: ScopeLanesModel
  mode?: 'read' | 'inspect'
  selection?: ScopeSelection | null
  onSelect: (selection: ScopeSelection | null) => void
}

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

function ScopeLanesHeader({ model, mode = 'read', selection = null, onSelect }: ScopeLanesHeaderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const { rects, contentWidth } = useWordMeasurements(containerRef)
  const [hoveredWordIndex, setHoveredWordIndex] = useState<number | undefined>(undefined)
  const [hoveredSpan, setHoveredSpan] = useState<ScopeSpanSelection | undefined>(undefined)
  const [legendOpen, setLegendOpen] = useState(false)

  const selectedWordIndex = selection?.type === 'word' ? selection.index : undefined
  const relatedSpan = useMemo(
    () =>
      smallestVisibleSpanContainingWord(
        selection?.type === 'word' ? selection.index : hoveredWordIndex,
        model.lanes
      ),
    [hoveredWordIndex, model.lanes, selection]
  )
  const words = useMemo(() => model.words.map((word) => word.text), [model.words])
  const tooltip = useMemo(() => {
    if (!hoveredSpan || rects.length === 0) {
      return null
    }
    const startRect = rects.find((rect) => rect.index === hoveredSpan.startWord)
    const endRect = rects.find((rect) => rect.index === hoveredSpan.endWord)
    if (!startRect || !endRect) {
      return null
    }
    return {
      x: (startRect.left + endRect.right) / 2,
      label: `Chunk rank ${hoveredSpan.rank}: words ${hoveredSpan.startWord}–${hoveredSpan.endWord}`,
    }
  }, [hoveredSpan, rects])

  return (
    <section className="scope-lanes-header" aria-label="Scope lanes header">
      {mode === 'inspect' ? (
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
      <VerseLine
        words={words}
        containerRef={containerRef}
        selectedWordIndex={selectedWordIndex}
        onWordClick={(index) => {
          onSelect({ type: 'word', index })
        }}
        onWordHover={(index) => setHoveredWordIndex(index)}
        onKeyDown={(event) => {
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
        }}
      />

      <ScopeLanesOverlay
        rects={rects}
        lanes={model.lanes}
        contentWidth={contentWidth}
        selection={selection}
        relatedSpan={relatedSpan}
        onSelectSpan={(spanSelection) => onSelect(spanSelection)}
        onPreviewSpan={(spanSelection) => setHoveredSpan(spanSelection)}
      />
      <ScopeSpanTooltip x={tooltip?.x ?? 0} text={tooltip?.label ?? ''} visible={tooltip !== null} />
    </section>
  )
}

export default ScopeLanesHeader
