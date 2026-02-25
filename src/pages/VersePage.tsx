import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppShell from '../layout/AppShell'
import GraphViewer from '../components/GraphViewer'
import SidebarNav from '../components/SidebarNav'
import TraceViewer from '../components/TraceViewer'
import VerseHeader from '../components/VerseHeader'
import VersePager from '../components/VersePager'
import VerseText from '../components/VerseText'
import { graphDotUrl, manifestUrl, traceJsonUrl, traceTxtUrl } from '../lib/corpus'
import { FetchError, fetchJson, fetchText } from '../lib/fetcher'
import { fetchCorpusIndex } from '../lib'
import { buildNavModel } from '../lib/navModel'
import { getNextRef, getPrevRef } from '../lib/navWalk'
import { normalizeVerseRef } from '../lib/ref'
import type { Manifest } from '../lib/types'
import type { NavModel } from '../lib/navModel'
import type { VerseRef } from '../lib/ref'
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

function firstAvailableRef(nav: NavModel | null): VerseRef | null {
  if (!nav || nav.books.length === 0) {
    return null
  }

  const book = nav.books[0]
  const chapter3 = nav.chaptersByBook[book]?.[0]
  if (!chapter3) {
    return null
  }

  const verse3 = nav.versesByBookChapter[book]?.[chapter3]?.[0]
  if (!verse3) {
    return null
  }

  return { book, chapter3, verse3 }
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
  const navigate = useNavigate()
  const { book, chapter, verse } = useParams()
  const ref = useMemo(
    () => normalizeVerseRef({ book, chapter, verse }),
    [book, chapter, verse]
  )
  const [nav, setNav] = useState<NavModel | null>(null)
  const [navError, setNavError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<LoadError | null>(null)
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [data, setData] = useState<VerseData | null>(null)
  const [graphError, setGraphError] = useState<LoadError | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const fallbackRef = useMemo(() => firstAvailableRef(nav), [nav])
  const isKnownRef = useMemo(() => {
    if (!ref || !nav) {
      return null
    }
    return Boolean(nav.versesByBookChapter[ref.book]?.[ref.chapter3]?.includes(ref.verse3))
  }, [nav, ref])
  const prevRef = useMemo(() => {
    if (!nav || !ref || isKnownRef !== true) {
      return null
    }
    return getPrevRef(nav, ref)
  }, [nav, ref, isKnownRef])
  const nextRef = useMemo(() => {
    if (!nav || !ref || isKnownRef !== true) {
      return null
    }
    return getNextRef(nav, ref)
  }, [nav, ref, isKnownRef])

  useEffect(() => {
    let canceled = false

    async function loadNav() {
      try {
        const indexJson = await fetchCorpusIndex()
        const model = buildNavModel(indexJson)

        if (canceled) {
          return
        }

        setNav(model)
        setNavError(null)
      } catch (loadError: unknown) {
        if (canceled) {
          return
        }

        const message =
          loadError instanceof Error ? loadError.message : 'Failed to load corpus index'
        setNavError(message)
      }
    }

    void loadNav()

    return () => {
      canceled = true
    }
  }, [])

  useEffect(() => {
    if (!ref || isKnownRef === false) {
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
  }, [ref, retryCount, isKnownRef])

  const verseText = useMemo(() => {
    if (!data) {
      return { text: '(verse text unavailable)', source: 'none' as const }
    }

    return extractVerseText(data.traceJson, data.traceTxt)
  }, [data])

  function retryLoad() {
    setRetryCount((count) => count + 1)
  }

  function goToFirstAvailableRef() {
    if (!fallbackRef) {
      return
    }
    navigate(`/${fallbackRef.book}/${fallbackRef.chapter3}/${fallbackRef.verse3}`)
  }

  const sidebar = nav ? (
    <SidebarNav nav={nav} currentRef={ref} />
  ) : (
    <div className="verse-page__sidebar-state">
      <h2>Navigation</h2>
      <p>{navError ?? 'Loading corpus index...'}</p>
    </div>
  )

  return (
    <AppShell sidebar={sidebar}>
      {!ref ? (
        <p role="alert">Invalid verse reference</p>
      ) : isKnownRef === false ? (
        <section className="verse-page__error">
          <p role="alert">Unknown reference</p>
          {fallbackRef ? (
            <button type="button" onClick={goToFirstAvailableRef}>
              Go to first available ref
            </button>
          ) : (
            <p className="verse-page__error-detail">
              The corpus index did not include any references.
            </p>
          )}
        </section>
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
              <VersePager prevRef={prevRef} nextRef={nextRef} />
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
