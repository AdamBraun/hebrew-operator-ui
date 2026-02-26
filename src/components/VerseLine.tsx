import { useMemo, useRef, type KeyboardEvent, type RefObject } from 'react'
import './VerseLine.css'

export type WordRect = {
  index: number
  left: number
  right: number
  top: number
  bottom: number
}

type VerseLineProps = {
  words: string[]
  containerRef?: RefObject<HTMLDivElement | null>
  selectedWordIndex?: number
  showWordIndexOnHover?: boolean
  onWordClick?: (index: number) => void
  onWordHover?: (index?: number) => void
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void
}

export function getWordRects(
  container: HTMLElement,
  wordSpans: HTMLElement[]
): WordRect[] {
  const containerRect = container.getBoundingClientRect()
  const localRects = wordSpans.map((span) => {
    const rect = span.getBoundingClientRect()
    return {
      left: rect.left - containerRect.left,
      right: rect.right - containerRect.left,
      top: rect.top - containerRect.top,
      bottom: rect.bottom - containerRect.top,
    }
  })
  const minLeft = localRects.reduce(
    (min, rect) => Math.min(min, rect.left),
    Number.POSITIVE_INFINITY
  )
  const offsetX = Number.isFinite(minLeft) ? -minLeft : 0

  return localRects.map((rect, i) => {
    return {
      index: i + 1,
      left: rect.left + offsetX,
      right: rect.right + offsetX,
      top: rect.top,
      bottom: rect.bottom,
    }
  })
}

function VerseLine({
  words,
  containerRef,
  selectedWordIndex,
  showWordIndexOnHover = false,
  onWordClick,
  onWordHover,
  onKeyDown,
}: VerseLineProps) {
  const localRef = useRef<HTMLDivElement | null>(null)
  const resolvedRef = containerRef ?? localRef
  const normalizedWords = useMemo(
    () => words.map((word) => word.trim()).filter((word) => word.length > 0),
    [words]
  )

  return (
    <div
      ref={resolvedRef}
      dir="rtl"
      lang="he"
      className="verse-line"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {normalizedWords.map((word, index) => (
        <span key={`${index + 1}-${word}`} className="verse-line__word-wrap">
          <span
            data-word-index={index + 1}
            className={[
              'verse-line__word',
              selectedWordIndex === index + 1 ? 'verse-line__word--selected' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            title={showWordIndexOnHover ? `#${index + 1}` : undefined}
            onClick={() => onWordClick?.(index + 1)}
            onMouseEnter={() => onWordHover?.(index + 1)}
            onMouseLeave={() => onWordHover?.(undefined)}
          >
            {word}
          </span>
          {index < normalizedWords.length - 1 ? ' ' : null}
        </span>
      ))}
    </div>
  )
}

export default VerseLine
