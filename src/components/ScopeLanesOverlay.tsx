import { useMemo, useState } from 'react'
import type { WordRect } from './VerseLine'
import type { ScopeLanesModel, ScopeSelection } from '../lib/scopeLanes/types'
import { buildLanePaths, type LanePathConfig } from '../lib/scopeLanes/buildLanePaths'
import './ScopeLanesOverlay.css'

type ScopeLanesOverlayProps = {
  rects: WordRect[]
  lanes: ScopeLanesModel['lanes']
  contentWidth: number
  selection?: ScopeSelection | null
  relatedSpan?: Extract<ScopeSelection, { type: 'span' }> | null
  onSelectSpan?: (selection: Extract<ScopeSelection, { type: 'span' }>) => void
  onPreviewSpan?: (selection?: Extract<ScopeSelection, { type: 'span' }>) => void
  laneConfig?: LanePathConfig
}

function ScopeLanesOverlay({
  rects,
  lanes,
  contentWidth,
  selection,
  relatedSpan,
  onSelectSpan,
  onPreviewSpan,
  laneConfig,
}: ScopeLanesOverlayProps) {
  const [hoveredPathId, setHoveredPathId] = useState<string | null>(null)

  const spans = useMemo(
    () => [...lanes.rank3, ...lanes.rank2, ...(lanes.rank1 ?? [])],
    [lanes.rank1, lanes.rank2, lanes.rank3]
  )
  const paths = useMemo(() => buildLanePaths(spans, rects, laneConfig), [laneConfig, rects, spans])
  const svgHeight = useMemo(() => {
    if (paths.length === 0) {
      return 0
    }
    return Math.max(...paths.map((path) => path.y)) + 10
  }, [paths])

  if (paths.length === 0 || svgHeight === 0) {
    return null
  }

  return (
    <svg
      className="scope-lanes-overlay"
      width={contentWidth}
      height={svgHeight}
      viewBox={`0 0 ${contentWidth} ${svgHeight}`}
      aria-label="Scope lanes"
    >
      {paths.map((path) => {
        const spanSelection: Extract<ScopeSelection, { type: 'span' }> = {
          type: 'span',
          rank: path.rank,
          startWord: path.startWord,
          endWord: path.endWord,
        }
        const isHovered = hoveredPathId === path.id
        const isSelected =
          selection?.type === 'span' &&
          selection.rank === path.rank &&
          selection.startWord === path.startWord &&
          selection.endWord === path.endWord
        const isRelatedToWord =
          relatedSpan?.rank === path.rank &&
          relatedSpan?.startWord === path.startWord &&
          relatedSpan?.endWord === path.endWord

        return (
          <g
            key={path.id}
            className={[
              'scope-lanes-overlay__path',
              `scope-lanes-overlay__path--rank-${path.rank}`,
              isHovered ? 'scope-lanes-overlay__path--hovered' : '',
              isSelected ? 'scope-lanes-overlay__path--selected' : '',
              isRelatedToWord ? 'scope-lanes-overlay__path--related' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <path d={path.d} className="scope-lanes-overlay__visible" />
            <path
              d={path.d}
              className="scope-lanes-overlay__hit"
              onPointerDown={(event) => {
                if (event.pointerType === 'mouse' && event.button !== 0) {
                  return
                }
                event.preventDefault()
                onSelectSpan?.(spanSelection)
              }}
              onMouseEnter={() => {
                setHoveredPathId(path.id)
                onPreviewSpan?.(spanSelection)
              }}
              onMouseLeave={() => {
                setHoveredPathId((current) => (current === path.id ? null : current))
                onPreviewSpan?.(undefined)
              }}
            />
          </g>
        )
      })}
    </svg>
  )
}

export default ScopeLanesOverlay
