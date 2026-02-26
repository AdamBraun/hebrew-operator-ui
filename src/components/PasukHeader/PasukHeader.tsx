import { useEffect, useMemo, useRef, useState } from 'react'
import type { PasukHeaderModel } from '../../lib/pasukHeaderModel'
import { getSeamMarkerProps } from '../../ui/seams'
import './PasukHeader.css'

type PasukHeaderMode = 'read' | 'inspect'

type PasukHeaderProps = {
  model: PasukHeaderModel
  selectedWordIndex?: number
  mode: PasukHeaderMode
  onWordSelect?: (payload: { wordIndex: number; wordText: string }) => void
  onWordHover?: (payload?: { wordIndex: number; wordText: string }) => void
  onSelectionClear?: () => void
  className?: string
}

function PasukHeader({
  model,
  selectedWordIndex,
  mode,
  onWordSelect,
  onWordHover,
  onSelectionClear,
  className,
}: PasukHeaderProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const chipRefs = useRef(new Map<number, HTMLButtonElement>())
  const [isScrollable, setIsScrollable] = useState(false)

  useEffect(() => {
    const container = scrollRef.current
    if (!container) {
      return
    }

    const updateScrollable = () => {
      setIsScrollable(container.scrollWidth > container.clientWidth + 1)
    }

    updateScrollable()

    const resizeObserver = new ResizeObserver(() => updateScrollable())
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [model.words.length])

  useEffect(() => {
    if (!selectedWordIndex) {
      return
    }

    const chip = chipRefs.current.get(selectedWordIndex)
    if (!chip) {
      return
    }

    chip.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [selectedWordIndex])

  function findWordTextByIndex(wordIndex: number): string | null {
    const word = model.words.find((entry) => entry.index === wordIndex)
    return word?.text ?? null
  }

  function emitWordSelect(wordIndex: number): void {
    const wordText = findWordTextByIndex(wordIndex)
    if (!wordText) {
      return
    }

    // Chosen D4 behavior: clicking an already-selected word is a no-op.
    if (selectedWordIndex === wordIndex) {
      return
    }

    onWordSelect?.({ wordIndex, wordText })
  }

  function emitWordHover(wordIndex?: number): void {
    if (!onWordHover) {
      return
    }

    if (wordIndex === undefined) {
      onWordHover(undefined)
      return
    }

    const wordText = findWordTextByIndex(wordIndex)
    if (!wordText) {
      onWordHover(undefined)
      return
    }

    onWordHover({ wordIndex, wordText })
  }

  function nextWordIndexFromArrow(
    currentWordIndex: number,
    key: string
  ): number | null {
    if (key === 'ArrowLeft') {
      return currentWordIndex + 1 <= model.words.length ? currentWordIndex + 1 : null
    }

    if (key === 'ArrowRight') {
      return currentWordIndex - 1 >= 1 ? currentWordIndex - 1 : null
    }

    return null
  }

  const rootClassName = useMemo(
    () =>
      [
        'pasuk-header',
        isScrollable ? 'pasuk-header--scrollable' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' '),
    [className, isScrollable]
  )

  return (
    <section className={rootClassName} aria-label="Pasuk header">
      <div className="pasuk-header__scroll" dir="rtl" lang="he" ref={scrollRef}>
        {model.words.map((word) => {
          const seam = getSeamMarkerProps(word.seamAfter)
          const isSelected = selectedWordIndex === word.index
          const seamTitle =
            mode === 'inspect'
              ? `${seam.ariaLabel} (${word.seamAfter})`
              : seam.ariaLabel

          return (
            <span key={word.index} className="pasuk-header__item">
              <button
                ref={(node) => {
                  if (node) {
                    chipRefs.current.set(word.index, node)
                  } else {
                    chipRefs.current.delete(word.index)
                  }
                }}
                type="button"
                className={[
                  'pasuk-header__chip',
                  isSelected ? 'pasuk-header__chip--selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => emitWordSelect(word.index)}
                onMouseEnter={() => emitWordHover(word.index)}
                onMouseLeave={() => emitWordHover(undefined)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    onSelectionClear?.()
                    return
                  }

                  const nextWordIndex = nextWordIndexFromArrow(word.index, event.key)
                  if (nextWordIndex === null) {
                    return
                  }

                  event.preventDefault()
                  emitWordSelect(nextWordIndex)
                }}
                aria-pressed={isSelected}
                aria-label={`Word ${word.index}: ${word.text}`}
              >
                <span className="pasuk-header__word">{word.text}</span>
                {mode === 'inspect' ? (
                  <span className="pasuk-header__index" aria-hidden="true">
                    #{word.index}
                  </span>
                ) : null}
              </button>

              <span
                className={['pasuk-header__seam', seam.className].join(' ')}
                title={seamTitle}
                aria-label={seamTitle}
                role="img"
              >
                {seam.glyph}
              </span>

              {mode === 'inspect' ? (
                <span className="pasuk-header__seam-label" aria-hidden="true">
                  {word.seamAfter}
                </span>
              ) : null}
            </span>
          )
        })}
      </div>
    </section>
  )
}

export default PasukHeader
