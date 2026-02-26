import { useMemo, useRef, type RefObject } from 'react'
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
}

export function getWordRects(
  container: HTMLElement,
  wordSpans: HTMLElement[]
): WordRect[] {
  const containerRect = container.getBoundingClientRect()

  return wordSpans.map((span, i) => {
    const rect = span.getBoundingClientRect()
    return {
      index: i + 1,
      left: rect.left - containerRect.left + container.scrollLeft,
      right: rect.right - containerRect.left + container.scrollLeft,
      top: rect.top - containerRect.top + container.scrollTop,
      bottom: rect.bottom - containerRect.top + container.scrollTop,
    }
  })
}

function VerseLine({ words, containerRef }: VerseLineProps) {
  const localRef = useRef<HTMLDivElement | null>(null)
  const resolvedRef = containerRef ?? localRef
  const normalizedWords = useMemo(
    () => words.map((word) => word.trim()).filter((word) => word.length > 0),
    [words]
  )

  return (
    <div ref={resolvedRef} dir="rtl" lang="he" className="verse-line">
      {normalizedWords.map((word, index) => (
        <span key={`${index + 1}-${word}`} className="verse-line__word-wrap">
          <span data-word-index={index + 1} className="verse-line__word">
            {word}
          </span>
          {index < normalizedWords.length - 1 ? ' ' : null}
        </span>
      ))}
    </div>
  )
}

export default VerseLine
