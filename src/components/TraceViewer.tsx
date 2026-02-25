import { useEffect, useMemo, useRef } from 'react'
import './TraceViewer.css'

type TraceViewerProps = {
  traceText: string
  highlightTokens: string[]
  onClearHighlight?: () => void
}

function splitTraceLines(traceText: string): string[] {
  return traceText.split('\n')
}

function hasHighlight(line: string, highlightTokens: string[]): boolean {
  if (highlightTokens.length === 0) {
    return false
  }

  return highlightTokens.some((token) => token.length > 0 && line.includes(token))
}

function TraceViewer({ traceText, highlightTokens, onClearHighlight }: TraceViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const previousTokenKeyRef = useRef<string>('[]')
  const previousHasTokensRef = useRef(false)
  const lines = useMemo(() => splitTraceLines(traceText), [traceText])
  const tokenKey = useMemo(() => JSON.stringify(highlightTokens), [highlightTokens])
  const lineHighlights = useMemo(
    () => lines.map((line) => hasHighlight(line, highlightTokens)),
    [highlightTokens, lines]
  )
  const firstMatchIndex = useMemo(
    () => lineHighlights.findIndex((matches) => matches),
    [lineHighlights]
  )

  useEffect(() => {
    const hasTokens = highlightTokens.length > 0
    const tokenValuesChanged = tokenKey !== previousTokenKeyRef.current
    const becameNonEmpty = !previousHasTokensRef.current && hasTokens

    if (hasTokens && firstMatchIndex >= 0 && (becameNonEmpty || tokenValuesChanged)) {
      const container = containerRef.current
      const firstMatch = container?.querySelector<HTMLElement>(
        `[data-line-index="${firstMatchIndex}"]`
      )
      firstMatch?.scrollIntoView({ block: 'center', inline: 'nearest' })
    }

    previousTokenKeyRef.current = tokenKey
    previousHasTokensRef.current = hasTokens
  }, [firstMatchIndex, highlightTokens.length, tokenKey])

  return (
    <div className="trace-viewer">
      <div className="trace-viewer__header">
        <h2 className="trace-viewer__title">Trace</h2>
        {onClearHighlight ? (
          <button type="button" onClick={onClearHighlight}>
            Clear highlight
          </button>
        ) : null}
      </div>

      <div
        ref={containerRef}
        className="trace-viewer__scroll"
        role="region"
        aria-label="Trace lines"
      >
        {lines.map((line, index) => {
          const highlighted = lineHighlights[index]

          return (
            <div
              key={index}
              data-line-index={index}
              className={[
                'trace-viewer__line',
                highlighted ? 'trace-viewer__line--highlight' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="trace-viewer__line-number" aria-hidden="true">
                {index + 1}
              </span>
              <span className="trace-viewer__line-text">{line}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TraceViewer
