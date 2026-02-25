import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppShell from '../layout/AppShell'
import GraphViewer from '../components/GraphViewer'
import TraceViewer from '../components/TraceViewer'
import VerseHeader from '../components/VerseHeader'
import VerseText from '../components/VerseText'
import { graphDotUrl, manifestUrl, traceJsonUrl, traceTxtUrl } from '../lib/corpus'
import { FetchError, fetchJson, fetchText } from '../lib/fetcher'
import { normalizeVerseRef } from '../lib/ref'
import type { Manifest } from '../lib/types'
import { extractVerseText } from '../lib/verseText'
import './VersePage.css'

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
            <section aria-busy="true" className="verse-page__loading">
              <p>Loading verse...</p>
              <div className="verse-page__skeleton verse-page__skeleton--line-sm" />
              <div className="verse-page__skeleton verse-page__skeleton--line-lg" />
              <div className="verse-page__skeleton verse-page__skeleton--block" />
            </section>
          ) : error ? (
            <section className="verse-page__error">
              <p role="alert">{error.message}</p>
              <p className="verse-page__error-detail">{error.detail}</p>
              <div className="verse-page__error-actions">
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

              <main className="verse-page__split">
                <section aria-label="Graph" className="verse-page__panel verse-page__panel--graph">
                  <h2>Graph</h2>
                  {graphError ? (
                    <>
                      <p role="alert" className="verse-page__panel-alert">
                        {graphError.message}
                      </p>
                      <p className="verse-page__error-detail">{graphError.detail}</p>
                      <button type="button" onClick={retryLoad}>
                        Retry
                      </button>
                    </>
                  ) : (
                    <GraphViewer dot={data.graphDot ?? ''} />
                  )}
                </section>

                <section aria-label="Trace" className="verse-page__panel verse-page__panel--trace">
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
