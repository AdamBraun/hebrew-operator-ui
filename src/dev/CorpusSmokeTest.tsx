import { useEffect, useState } from 'react'
import { fetchManifest, fetchVerseArtifacts } from '../lib/corpus'
import { FetchError } from '../lib/fetcher'
import type { Manifest, VerseArtifacts } from '../lib/types'

type SmokeState = {
  loading: boolean
  manifest?: Manifest
  artifacts?: VerseArtifacts
  error?: string
}

const SMOKE_REF = { book: 'genesis', chapter3: '001', verse3: '001' } as const

function CorpusSmokeTest() {
  const [state, setState] = useState<SmokeState>({ loading: true })

  useEffect(() => {
    let canceled = false

    async function runSmokeTest() {
      try {
        const [manifest, artifacts] = await Promise.all([
          fetchManifest(),
          fetchVerseArtifacts(SMOKE_REF),
        ])

        if (canceled) {
          return
        }

        setState({
          loading: false,
          manifest,
          artifacts,
        })
      } catch (error: unknown) {
        if (canceled) {
          return
        }

        if (error instanceof FetchError) {
          const statusPart = error.status ? ` (status ${error.status})` : ''
          setState({
            loading: false,
            error: `${error.message}${statusPart} [url: ${error.url}]`,
          })
          return
        }

        const message =
          error instanceof Error ? error.message : 'Unknown fetch failure'
        setState({
          loading: false,
          error: message,
        })
      }
    }

    void runSmokeTest()
    return () => {
      canceled = true
    }
  }, [])

  return (
    <section
      style={{
        border: '1px solid #d0d7e2',
        borderRadius: '8px',
        padding: '1rem',
        marginTop: '1rem',
      }}
    >
      <h2>Corpus Smoke Test (Dev Only)</h2>
      {state.loading && <p>Loading manifest and Genesis 001:001 artifacts...</p>}
      {state.error && (
        <pre style={{ whiteSpace: 'pre-wrap', color: '#9f1239' }}>{state.error}</pre>
      )}
      {!state.loading && !state.error && state.manifest && state.artifacts && (
        <>
          <p>generated_at: {state.manifest.generated_at ?? 'n/a'}</p>
          <p>engine_git_sha: {state.manifest.engine_git_sha ?? 'n/a'}</p>
          <p>verseText: {state.artifacts.verseText ?? 'Verse text unavailable'}</p>
          <p>traceTxt.length: {state.artifacts.traceTxt.length}</p>
          <p>graphDot.length: {state.artifacts.graphDot.length}</p>
          <h3>Trace Preview</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {state.artifacts.traceTxt.slice(0, 200)}
          </pre>
          <h3>Graph Preview</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {state.artifacts.graphDot.slice(0, 200)}
          </pre>
        </>
      )}
    </section>
  )
}

export default CorpusSmokeTest
