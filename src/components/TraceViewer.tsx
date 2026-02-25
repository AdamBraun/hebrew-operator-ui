import { useEffect, useState } from 'react'

type TraceViewerProps = {
  text: string
}

function TraceViewer({ text }: TraceViewerProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) {
      return
    }

    const timer = setTimeout(() => setCopied(false), 1200)
    return () => clearTimeout(timer)
  }, [copied])

  async function copyTrace() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
        }}
      >
        <h2 style={{ margin: 0 }}>Trace</h2>
        <button type="button" onClick={copyTrace}>
          Copy trace
        </button>
      </div>

      {copied ? <p style={{ margin: '0 0 0.5rem' }}>Copied</p> : null}

      <pre
        style={{
          margin: 0,
          whiteSpace: 'pre',
          overflowX: 'auto',
          overflowY: 'auto',
          flex: 1,
          maxWidth: '100%',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: '0.85rem',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '0.75rem',
          background: '#f8fafc',
        }}
      >
        {text}
      </pre>
    </div>
  )
}

export default TraceViewer
