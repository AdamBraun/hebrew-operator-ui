import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import GraphViewer from '../components/GraphViewer'
import AppShell from '../layout/AppShell'

type SampleKey = 'small' | 'medium' | 'invalid'

const SMALL_DOT = `digraph G {
  rankdir=TB;
  A -> B;
  B -> C;
  A -> C;
}`

const MEDIUM_DOT = `digraph G {
  rankdir=LR;
  node [shape=box, style=rounded];
  Start -> Parse -> Normalize -> Analyze;
  Normalize -> Cache;
  Cache -> Analyze;
  Analyze -> Plan -> Execute -> Verify -> Done;
  Plan -> Retry;
  Retry -> Execute;
  Analyze -> Warn;
  Warn -> Done;
}`

const INVALID_DOT = `digraph G {
  A -> B
  B -> ;
}`

function DevGraphPage() {
  const [sample, setSample] = useState<SampleKey>('small')
  const [lastNode, setLastNode] = useState<string | null>(null)
  const [lastEdge, setLastEdge] = useState<string | null>(null)

  const dot = useMemo(() => {
    if (sample === 'medium') {
      return MEDIUM_DOT
    }
    if (sample === 'invalid') {
      return INVALID_DOT
    }
    return SMALL_DOT
  }, [sample])

  return (
    <AppShell>
      <h1>GraphViewer Dev Smoke</h1>
      <p>
        Local graph viewer test page. No corpus fetch is required.
        <br />
        <Link to="/">Back to Home</Link>
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <button type="button" onClick={() => setSample('small')}>
          Small sample
        </button>
        <button type="button" onClick={() => setSample('medium')}>
          Medium sample
        </button>
        <button type="button" onClick={() => setSample('invalid')}>
          Invalid sample
        </button>
      </div>

      <p style={{ marginTop: 0 }}>
        Active sample: <strong>{sample}</strong>
      </p>
      <p style={{ marginTop: 0 }}>
        Last node click: {lastNode ?? 'none'} | Last edge click: {lastEdge ?? 'none'}
      </p>

      <div
        style={{
          border: '1px solid #d0d7e2',
          borderRadius: '8px',
          padding: '1rem',
          height: 'min(65vh, 680px)',
          minHeight: 420,
        }}
      >
        <GraphViewer dot={dot} onNodeClick={setLastNode} onEdgeClick={setLastEdge} />
      </div>
    </AppShell>
  )
}

export default DevGraphPage
