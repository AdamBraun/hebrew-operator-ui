import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppShell from '../layout/AppShell'
import GraphViewer from '../components/GraphViewer'
import SidebarNav from '../components/SidebarNav'
import VerseHeader from '../components/VerseHeader'
import VersePager from '../components/VersePager'
import VerseText from '../components/VerseText'
import TraceEventViewer from '../components/TraceEventViewer'
import { buildTraceIndex } from '../../ui/src/lib/trace/index_trace'
import type { TraceIndex, TraceJson } from '../../ui/src/lib/trace/types'
import { resolveEventRefsForHandle } from '../lib/trace/resolveEventRefsForHandle'
import { FetchError } from '../lib/fetcher'
import { getNextRefTiered, getPrevRefTiered } from '../lib/navWalkTiered'
import { normalizeVerseRef } from '../lib/ref'
import { resolveHandleIdFromGraphSelection } from '../lib/graphSelection'
import { useVerseHotkeys } from '../hooks/useVerseHotkeys'
import { useNavState } from '../state/nav'
import { loadGraphDot, loadManifest, loadTraceJson, sourceUrlsForRef } from '../lib/source'
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
  traceJson: TraceJson
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
  const {
    nav,
    loading: navLoading,
    error: navError,
    ensureChapters,
    ensureVerses,
  } = useNavState()
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
  const [navTransitionLoading, setNavTransitionLoading] = useState(false)
  const [prevRef, setPrevRef] = useState<VerseRef | null>(null)
  const [nextRef, setNextRef] = useState<VerseRef | null>(null)
  const [selectedHandleId, setSelectedHandleId] = useState<string | null>(null)
  const fallbackRef = useMemo(() => firstAvailableRef(nav), [nav])
  const isKnownRef = useMemo(() => {
    if (!ref || !nav) {
      return null
    }
    const verses = nav.versesByBookChapter[ref.book]?.[ref.chapter3]
    if (!verses) {
      return null
    }
    return verses.includes(ref.verse3)
  }, [nav, ref])
  const goPrev = useMemo(
    () =>
      prevRef ? () => navigate(`/${prevRef.book}/${prevRef.chapter3}/${prevRef.verse3}`) : null,
    [navigate, prevRef]
  )
  const goNext = useMemo(
    () =>
      nextRef ? () => navigate(`/${nextRef.book}/${nextRef.chapter3}/${nextRef.verse3}`) : null,
    [navigate, nextRef]
  )

  useVerseHotkeys({ onPrev: goPrev, onNext: goNext })

  useEffect(() => {
    if (!ref || !nav) {
      return
    }
    const currentRef = ref

    let canceled = false

    async function loadTierForCurrentRef() {
      try {
        await ensureChapters(currentRef.book)
        await ensureVerses(currentRef.book, currentRef.chapter3)
      } catch {
        // Preserve existing nav error handling from provider.
      }

      if (canceled) {
        return
      }
    }

    void loadTierForCurrentRef()

    return () => {
      canceled = true
    }
  }, [ensureChapters, ensureVerses, nav, ref])

  useEffect(() => {
    if (!nav || !ref || isKnownRef !== true) {
      setPrevRef(null)
      setNextRef(null)
      return
    }
    const currentNav = nav
    const currentRef = ref

    let canceled = false

    async function resolveAdjacentRefs() {
      setNavTransitionLoading(true)

      try {
        const [prev, next] = await Promise.all([
          getPrevRefTiered({ nav: currentNav, ensureChapters, ensureVerses }, currentRef),
          getNextRefTiered({ nav: currentNav, ensureChapters, ensureVerses }, currentRef),
        ])

        if (canceled) {
          return
        }

        setPrevRef(prev)
        setNextRef(next)
      } finally {
        if (!canceled) {
          setNavTransitionLoading(false)
        }
      }
    }

    void resolveAdjacentRefs()

    return () => {
      canceled = true
    }
  }, [ensureChapters, ensureVerses, isKnownRef, nav, ref])

  useEffect(() => {
    setSelectedHandleId(null)
  }, [ref?.book, ref?.chapter3, ref?.verse3])

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

      const urls = sourceUrlsForRef(currentRef)

      const [manifestResult, traceJsonResult, graphDotResult] = await Promise.allSettled([
        loadManifest({ cache: 'no-cache' }),
        loadTraceJson<TraceJson>(currentRef, { cache: 'no-cache' }),
        loadGraphDot(currentRef, { cache: 'no-cache' }),
      ])

      if (canceled) {
        return
      }

      if (traceJsonResult.status === 'rejected') {
        setManifest(manifestResult.status === 'fulfilled' ? manifestResult.value : null)
        setData(null)
        setError(toLoadError('trace.json', urls.traceJson, traceJsonResult.reason))
        setLoading(false)
        return
      }

      setManifest(manifestResult.status === 'fulfilled' ? manifestResult.value : {})

      if (graphDotResult.status === 'rejected') {
        setGraphError(toLoadError('graph.dot', urls.graphDot, graphDotResult.reason))
      }

      setData({
        traceJson: traceJsonResult.value,
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

    return extractVerseText(data.traceJson, '')
  }, [data])

  const traceModel = useMemo(() => {
    if (!data) {
      return {
        traceIndex: null as TraceIndex | null,
        error: null as LoadError | null,
      }
    }

    try {
      const traceIndex = buildTraceIndex(data.traceJson)
      return { traceIndex, error: null }
    } catch (buildError) {
      return {
        traceIndex: null as TraceIndex | null,
        error: {
          message: 'Failed to build trace index',
          detail:
            buildError instanceof Error
              ? buildError.message
              : 'Unknown trace index failure',
        },
      }
    }
  }, [data])

  const highlightedEventIndices = useMemo(() => {
    return resolveEventRefsForHandle(selectedHandleId, traceModel.traceIndex)
  }, [selectedHandleId, traceModel.traceIndex])

  const primaryTraceLocation = useMemo(() => {
    const firstEvent = highlightedEventIndices[0]
    if (firstEvent === undefined) {
      return undefined
    }

    return {
      kind: 'event' as const,
      index: firstEvent,
    }
  }, [highlightedEventIndices])

  const alternativeTraceLocations = useMemo(
    () =>
      highlightedEventIndices.slice(1).map((index) => ({
        kind: 'event' as const,
        index,
      })),
    [highlightedEventIndices]
  )

  useEffect(() => {
    if (!selectedHandleId || !traceModel.traceIndex) {
      return
    }

    if (!traceModel.traceIndex.handleById.has(selectedHandleId)) {
      setSelectedHandleId(null)
    }
  }, [selectedHandleId, traceModel.traceIndex])

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
    <SidebarNav
      nav={nav}
      currentRef={ref}
      navLoading={navLoading || navTransitionLoading}
      ensureChapters={ensureChapters}
      ensureVerses={ensureVerses}
    />
  ) : (
    <div className="verse-page__sidebar-state">
      <h2>Navigation</h2>
      <p>{navLoading ? 'Loading navigation…' : navError ?? 'Navigation unavailable'}</p>
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
              <VersePager
                prevRef={prevRef}
                nextRef={nextRef}
                navLoading={navLoading || navTransitionLoading}
              />
              <VerseHeader verseRef={ref} manifest={manifest} />
              <VerseText text={verseText.text} />

              <main className="verse-page__split">
                <section aria-label="Graph" className="verse-page__panel verse-page__panel--graph">
                  <h2>Graph</h2>
                  {selectedHandleId ? (
                    <p className="verse-page__error-detail">
                      Selected handle: <code>{selectedHandleId}</code>
                    </p>
                  ) : null}
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
                    <GraphViewer
                      dot={data.graphDot ?? ''}
                      onTokenClick={(token, matchTokens) =>
                        setSelectedHandleId(
                          resolveHandleIdFromGraphSelection(
                            token,
                            matchTokens,
                            traceModel.traceIndex
                          )
                        )
                      }
                    />
                  )}
                </section>

                <section aria-label="Trace" className="verse-page__panel verse-page__panel--trace">
                  {traceModel.error ? (
                    <>
                      <p role="alert" className="verse-page__panel-alert">
                        {traceModel.error.message}
                      </p>
                      <p className="verse-page__error-detail">{traceModel.error.detail}</p>
                    </>
                  ) : traceModel.traceIndex ? (
                    <TraceEventViewer
                      traceJson={data.traceJson}
                      primary={primaryTraceLocation}
                      alternatives={alternativeTraceLocations}
                    />
                  ) : (
                    <p className="verse-page__error-detail">Trace index unavailable.</p>
                  )}
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
