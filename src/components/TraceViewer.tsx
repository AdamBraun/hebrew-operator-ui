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
  const lines = splitTraceLines(traceText)

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

      <div className="trace-viewer__scroll" role="region" aria-label="Trace lines">
        {lines.map((line, index) => {
          const highlighted = hasHighlight(line, highlightTokens)

          return (
            <div
              key={index}
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
