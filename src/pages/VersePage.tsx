import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppShell from '../layout/AppShell'
import TraceViewer from '../components/TraceViewer'
import VerseHeader from '../components/VerseHeader'
import VerseText from '../components/VerseText'
import { graphDotUrl, manifestUrl, traceJsonUrl, traceTxtUrl } from '../lib/corpus'
import { FetchError, fetchJson, fetchText } from '../lib/fetcher'
import { normalizeVerseRef } from '../lib/ref'
import type { Manifest } from '../lib/types'
import { extractVerseText } from '../lib/verseText'

type LoadError = {
  message: string
  detail: string
}

type VerseData = {
  traceJson: any
  traceTxt: string
  graphDot: string | null
}

function toLoadError(fileName: string, url: string, error: unknown): LoadError {
  if (error instanceof FetchError) {
    const statusPart = error.status ? ` (status ${error.status})` : ''
    return {
      message: `Failed to load ${fileName}`,
      detail: `${error.url}${statusPart}`,
    }
  }

  const fallback = error instanceof Error ? error.message : 'Unknown fetch failure'
  return {
    message: `Failed to load ${fileName}`,
    detail: `${url} (${fallback})`,
  }
}

function VersePage() {
  const { book, chapter, verse } = useParams()
  const ref = useMemo(
    () => normalizeVerseRef({ book, chapter, verse }),
    [book, chapter, verse]
  )
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<LoadError | null>(null)
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [data, setData] = useState<VerseData | null>(null)
  const [graphError, setGraphError] = useState<LoadError | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!ref) {
      setLoading(false)
      setError(null)
      setManifest(null)
      setData(null)
      setGraphError(null)
      return
    }

    const currentRef = ref

    let canceled = false

    async function loadVerseData() {
      setLoading(true)
      setError(null)
      setGraphError(null)

      const urls = {
        manifest: manifestUrl(),
        traceJson: traceJsonUrl(currentRef),
        traceTxt: traceTxtUrl(currentRef),
        graphDot: graphDotUrl(currentRef),
      }

      const [manifestResult, traceJsonResult, traceTxtResult, graphDotResult] =
        await Promise.allSettled([
          fetchJson<Manifest>(urls.manifest),
          fetchJson<any>(urls.traceJson),
          fetchText(urls.traceTxt),
          fetchText(urls.graphDot),
        ])

      if (canceled) {
        return
      }

      if (traceTxtResult.status === 'rejected') {
        setManifest(
          manifestResult.status === 'fulfilled' ? manifestResult.value : null
        )
        setData(null)
        setError(toLoadError('trace.txt', urls.traceTxt, traceTxtResult.reason))
        setLoading(false)
        return
      }

      setManifest(manifestResult.status === 'fulfilled' ? manifestResult.value : {})

      if (graphDotResult.status === 'rejected') {
        setGraphError(toLoadError('graph.dot', urls.graphDot, graphDotResult.reason))
      }

      setData({
        traceJson: traceJsonResult.status === 'fulfilled' ? traceJsonResult.value : {},
        traceTxt: traceTxtResult.value,
        graphDot: graphDotResult.status === 'fulfilled' ? graphDotResult.value : null,
      })
      setLoading(false)
    }

    void loadVerseData()

    return () => {
      canceled = true
    }
  }, [ref, retryCount])

  const verseText = useMemo(() => {
    if (!data) {
      return { text: '(verse text unavailable)', source: 'none' as const }
    }

    return extractVerseText(data.traceJson, data.traceTxt)
  }, [data])

  function retryLoad() {
    setRetryCount((count) => count + 1)
  }

  return (
    <AppShell>
      {!ref ? (
        <p role="alert">Invalid verse reference</p>
      ) : (
        <>
          {loading ? (
            <section
              aria-busy="true"
              style={{ display: 'grid', gap: '0.75rem', maxWidth: '760px' }}
            >
              <p>Loading verse...</p>
              <div
                style={{
                  height: '28px',
                  borderRadius: '6px',
                  background: '#eef2f7',
                }}
              />
              <div
                style={{
                  height: '48px',
                  borderRadius: '6px',
                  background: '#eef2f7',
                }}
              />
              <div
                style={{
                  height: '220px',
                  borderRadius: '8px',
                  background: '#f4f6fa',
                }}
              />
            </section>
          ) : error ? (
            <section style={{ display: 'grid', gap: '0.5rem' }}>
              <p role="alert">{error.message}</p>
              <p style={{ margin: 0, color: '#475569' }}>{error.detail}</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={retryLoad}>
                  Retry
                </button>
                <Link to="/">Back to Home</Link>
              </div>
            </section>
          ) : data && manifest ? (
            <>
              <VerseHeader verseRef={ref} manifest={manifest} />
              <VerseText text={verseText.text} />

              <main
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                  gap: '1rem',
                }}
              >
                <section
                  aria-label="Graph"
                  style={{
                    border: '1px solid #d0d7e2',
                    borderRadius: '8px',
                    padding: '1rem',
                    minHeight: '240px',
                    minWidth: 0,
                  }}
                >
                  <h2>Graph</h2>
                  {graphError ? (
                    <>
                      <p role="alert" style={{ marginTop: 0 }}>
                        {graphError.message}
                      </p>
                      <p style={{ color: '#475569', marginTop: 0 }}>
                        {graphError.detail}
                      </p>
                      <button type="button" onClick={retryLoad}>
                        Retry
                      </button>
                    </>
                  ) : (
                    <p>Graph placeholder</p>
                  )}
                </section>

                <section
                  aria-label="Trace"
                  style={{
                    border: '1px solid #d0d7e2',
                    borderRadius: '8px',
                    padding: '1rem',
                    minHeight: '240px',
                    height: '520px',
                    minWidth: 0,
                  }}
                >
                  <TraceViewer text={data.traceTxt} />
                </section>
              </main>
            </>
          ) : null}
        </>
      )}
    </AppShell>
  )
}

export default VersePage
