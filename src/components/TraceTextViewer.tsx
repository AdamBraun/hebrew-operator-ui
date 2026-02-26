import { useEffect, useMemo, useRef } from 'react'
import type { FallbackTextSearchResult } from '../lib/link/fallbackTextSearch'
import './TraceTextViewer.css'

type TraceTextViewerProps = {
  traceText: string
  searchResult: FallbackTextSearchResult | null
}

function TraceTextViewer({ traceText, searchResult }: TraceTextViewerProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const lines = useMemo(() => traceText.split(/\r?\n/), [traceText])
  const visibleRange = useMemo(() => {
    if (!searchResult) {
      return null
    }

    const start = Math.max(0, Math.min(searchResult.contextStart, lines.length - 1))
    const end = Math.max(start, Math.min(searchResult.contextEnd, lines.length - 1))
    return { start, end }
  }, [lines.length, searchResult])
  const highlightedSet = useMemo(
    () => new Set<number>(searchResult?.matchedLineIndices ?? []),
    [searchResult]
  )
  const firstHighlight = searchResult?.matchedLineIndices[0] ?? null
  const resultKey = useMemo(() => {
    if (!searchResult) {
      return 'none'
    }

    return `${searchResult.contextStart}:${searchResult.contextEnd}:${searchResult.matchedLineIndices.join(',')}`
  }, [searchResult])

  useEffect(() => {
    if (!searchResult || firstHighlight === null) {
      return
    }

    const target = scrollRef.current?.querySelector<HTMLElement>(
      `[data-line-index="${firstHighlight}"]`
    )
    target?.scrollIntoView({ block: 'center', inline: 'nearest' })
  }, [firstHighlight, resultKey, searchResult])

  if (!searchResult || !visibleRange) {
    return (
      <section className="trace-text-viewer" aria-label="Trace text fallback">
        <header className="trace-text-viewer__header">
          <h3 className="trace-text-viewer__title">Trace text fallback</h3>
        </header>
        <p className="trace-text-viewer__empty">No fallback search results.</p>
      </section>
    )
  }

  const rows: Array<{ index: number; line: string }> = []
  for (let index = visibleRange.start; index <= visibleRange.end; index += 1) {
    rows.push({ index, line: lines[index] ?? '' })
  }

  return (
    <section className="trace-text-viewer" aria-label="Trace text fallback">
      <header className="trace-text-viewer__header">
        <h3 className="trace-text-viewer__title">Trace text fallback</h3>
        <p className="trace-text-viewer__meta">
          terms: <code>{searchResult.terms.join(' | ') || '(none)'}</code> | matches:{' '}
          <code>{searchResult.matchedLineIndices.length}</code>
        </p>
      </header>

      <div ref={scrollRef} className="trace-text-viewer__scroll" role="region" aria-label="Trace text lines">
        {rows.map((row) => {
          const highlighted = highlightedSet.has(row.index)
          return (
            <div
              key={row.index}
              data-line-index={row.index}
              className={[
                'trace-text-viewer__line',
                highlighted ? 'trace-text-viewer__line--highlight' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="trace-text-viewer__line-number">{row.index + 1}</span>
              <span className="trace-text-viewer__line-text">{row.line}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default TraceTextViewer
