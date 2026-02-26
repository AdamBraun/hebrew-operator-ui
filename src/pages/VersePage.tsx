import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppShell from '../layout/AppShell'
import GraphViewer from '../components/GraphViewer'
import PasukHeader from '../components/PasukHeader/PasukHeader'
import ScopeLanesOverlay from '../components/ScopeLanesOverlay'
import SidebarNav from '../components/SidebarNav'
import VerseHeader from '../components/VerseHeader'
import VerseLine from '../components/VerseLine'
import VersePager from '../components/VersePager'
import TraceEventViewer from '../components/TraceEventViewer'
import TraceTextViewer from '../components/TraceTextViewer'
import { fallbackTextSearch } from '../lib/link/fallbackTextSearch'
import { resolveGraphSelection } from '../lib/link/resolveGraphSelection'
import type { GraphSelection } from '../lib/link/types'
import { buildPasukHeaderModel } from '../lib/pasukHeaderModel'
import { buildScopeLanesModel } from '../lib/scopeLanes/buildModel'
import { segmentScopeLanes } from '../lib/scopeLanes/segment'
import { useWordMeasurements } from '../lib/scopeLanes/useWordMeasurements'
import { buildTraceIndex } from '../lib/trace/buildTraceIndex'
import type { TraceIndex, TraceLocation } from '../lib/trace/types'
import { extractVerseText } from '../lib/verseText'
import { FetchError } from '../lib/fetcher'
import { useVerseHotkeys } from '../hooks/useVerseHotkeys'
import { getNextRefTiered, getPrevRefTiered } from '../lib/navWalkTiered'
import type { NavModel } from '../lib/navModel'
import { normalizeVerseRef, type VerseRef } from '../lib/ref'
import {
  loadGraphDot,
  loadManifest,
  loadTraceJson,
  loadTraceTxt,
  sourceUrlsForRef,
} from '../lib/source'
import type { Manifest } from '../lib/types'
import { useNavState } from '../state/nav'
import { useWordSelectionState } from '../state/selection'
import './VersePage.css'

type LoadError = {
  message: string
  detail: string
}

type VerseData = {
  traceJson: unknown
  graphDot: string | null
  traceTxt: string | null
}

function formatLocationLabel(location: TraceLocation): string {
  const parts = [`${location.kind} #${location.index}`]
  if (location.tau !== undefined) {
    parts.push(`tau ${location.tau}`)
  }
  if (location.wordIndex !== undefined) {
    parts.push(`word ${location.wordIndex}`)
  }
  return parts.join(' | ')
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
  const ref = useMemo(() => normalizeVerseRef({ book, chapter, verse }), [book, chapter, verse])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<LoadError | null>(null)
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [data, setData] = useState<VerseData | null>(null)
  const [graphError, setGraphError] = useState<LoadError | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [navTransitionLoading, setNavTransitionLoading] = useState(false)
  const [prevRef, setPrevRef] = useState<VerseRef | null>(null)
  const [nextRef, setNextRef] = useState<VerseRef | null>(null)
  const [graphSelection, setGraphSelection] = useState<GraphSelection | null>(null)
  const [selectedMatchIndex, setSelectedMatchIndex] = useState(0)
  const [headerMode, setHeaderMode] = useState<'read' | 'inspect'>('read')
  const [inspectDebugVisible, setInspectDebugVisible] = useState(false)
  const { selectedWordIndex, selectWord, clearWordSelection } = useWordSelectionState()

  const verseLineContainerRef = useRef<HTMLDivElement | null>(null)
  const {
    rects: verseWordRects,
    contentWidth: verseLineScrollWidth,
    recalc: recalcWordMeasurements,
  } = useWordMeasurements(verseLineContainerRef)

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
    () => (prevRef ? () => navigate(`/${prevRef.book}/${prevRef.chapter3}/${prevRef.verse3}`) : null),
    [navigate, prevRef]
  )
  const goNext = useMemo(
    () => (nextRef ? () => navigate(`/${nextRef.book}/${nextRef.chapter3}/${nextRef.verse3}`) : null),
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
        // Nav provider handles errors.
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
    setGraphSelection(null)
    setSelectedMatchIndex(0)
    clearWordSelection()
    setHeaderMode('read')
    setInspectDebugVisible(false)
  }, [clearWordSelection, ref?.book, ref?.chapter3, ref?.verse3])

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
      const [manifestResult, traceJsonResult, graphDotResult, traceTxtResult] =
        await Promise.allSettled([
          loadManifest({ cache: 'no-cache' }),
          loadTraceJson(currentRef, { cache: 'no-cache' }),
          loadGraphDot(currentRef, { cache: 'no-cache' }),
          loadTraceTxt(currentRef, { cache: 'no-cache' }),
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
        traceTxt: traceTxtResult.status === 'fulfilled' ? traceTxtResult.value : null,
      })
      setLoading(false)
    }

    void loadVerseData()

    return () => {
      canceled = true
    }
  }, [isKnownRef, ref, retryCount])

  const verseText = useMemo(() => {
    if (!data) {
      return { text: '(verse text unavailable)', source: 'none' as const }
    }
    return extractVerseText(data.traceJson, data.traceTxt ?? '')
  }, [data])

  const pasukHeaderModel = useMemo(() => {
    if (!data || !ref) {
      return null
    }
    return buildPasukHeaderModel({
      ref,
      traceTxt: data.traceTxt ?? '',
      traceJson: data.traceJson,
    })
  }, [data, ref])

  const verseWords = useMemo(() => {
    if (pasukHeaderModel && pasukHeaderModel.words.length > 0) {
      return pasukHeaderModel.words.map((word) => word.text)
    }
    return verseText.text
      .split(/\s+/u)
      .map((word) => word.trim())
      .filter((word) => word.length > 0)
  }, [pasukHeaderModel, verseText.text])

  const scopeLanesModel = useMemo(() => {
    if (!data || !ref) {
      return null
    }
    const model = buildScopeLanesModel(ref, data.traceTxt ?? '', data.traceJson)
    return {
      ...model,
      lanes: segmentScopeLanes(model.boundariesAfter, model.words.length),
    }
  }, [data, ref])

  useEffect(() => {
    recalcWordMeasurements()
  }, [recalcWordMeasurements, verseWords])

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
          detail: buildError instanceof Error ? buildError.message : 'Unknown trace index failure',
        },
      }
    }
  }, [data])

  const resolvedSelection = useMemo(
    () => resolveGraphSelection(graphSelection, traceModel.traceIndex),
    [graphSelection, traceModel.traceIndex]
  )

  const rankedLocations = useMemo(() => {
    if (resolvedSelection.primary) {
      return [resolvedSelection.primary, ...resolvedSelection.alternatives]
    }
    return [...resolvedSelection.alternatives]
  }, [resolvedSelection])

  useEffect(() => {
    setSelectedMatchIndex(0)
  }, [graphSelection])

  useEffect(() => {
    if (rankedLocations.length === 0) {
      setSelectedMatchIndex(0)
      return
    }
    setSelectedMatchIndex((current) => Math.min(current, rankedLocations.length - 1))
  }, [rankedLocations.length])

  const primaryTraceLocation = useMemo(() => {
    if (rankedLocations.length === 0) {
      return undefined
    }
    return rankedLocations[selectedMatchIndex]
  }, [rankedLocations, selectedMatchIndex])

  const alternativeTraceLocations = useMemo(
    () => rankedLocations.filter((_, index) => index !== selectedMatchIndex),
    [rankedLocations, selectedMatchIndex]
  )

  const selectedWordTraceLocations = useMemo(() => {
    if (!traceModel.traceIndex?.byWordIndex || !selectedWordIndex) {
      return []
    }
    return [...(traceModel.traceIndex.byWordIndex.get(selectedWordIndex) ?? [])]
  }, [selectedWordIndex, traceModel.traceIndex])

  const selectedWordPrimaryTraceLocation = useMemo(
    () => selectedWordTraceLocations[0],
    [selectedWordTraceLocations]
  )

  const selectedWordAlternativeTraceLocations = useMemo(
    () => selectedWordTraceLocations.slice(1),
    [selectedWordTraceLocations]
  )

  const fallbackSearch = useMemo(() => {
    if (!graphSelection || !data?.traceTxt) {
      return null
    }
    if (resolvedSelection.confidence === 'high') {
      return null
    }
    return fallbackTextSearch(data.traceTxt, graphSelection, 200)
  }, [data?.traceTxt, graphSelection, resolvedSelection.confidence])

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
            <p className="verse-page__error-detail">The corpus index did not include any references.</p>
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

              <div className="verse-page__header-controls" role="group" aria-label="Pasuk header mode">
                <button type="button" onClick={() => setHeaderMode('read')} aria-pressed={headerMode === 'read'}>
                  Read
                </button>
                <button
                  type="button"
                  onClick={() => setHeaderMode('inspect')}
                  aria-pressed={headerMode === 'inspect'}
                >
                  Inspect
                </button>
                {headerMode === 'inspect' ? (
                  <button
                    type="button"
                    onClick={() => setInspectDebugVisible((value) => !value)}
                    aria-pressed={inspectDebugVisible}
                    className="verse-page__header-controls-debug"
                    title="Show/hide per-word debug char length badges"
                  >
                    Debug
                  </button>
                ) : null}
              </div>

              {pasukHeaderModel ? (
                <PasukHeader
                  model={pasukHeaderModel}
                  selectedWordIndex={selectedWordIndex}
                  mode={headerMode}
                  showDebugMeta={headerMode === 'inspect' && inspectDebugVisible}
                  onWordSelect={({ wordIndex }) => {
                    setGraphSelection(null)
                    setSelectedMatchIndex(0)
                    selectWord(wordIndex)
                  }}
                  onSelectionClear={() => clearWordSelection()}
                />
              ) : null}

              <section className="verse-page__verse-structure">
                <VerseLine words={verseWords} containerRef={verseLineContainerRef} />
                {scopeLanesModel ? (
                  <ScopeLanesOverlay
                    rects={verseWordRects}
                    lanes={scopeLanesModel.lanes}
                    contentWidth={verseLineScrollWidth}
                  />
                ) : null}
              </section>

              <main className="verse-page__split">
                <section aria-label="Graph" className="verse-page__panel verse-page__panel--graph">
                  <h2>Graph</h2>
                  {graphSelection ? (
                    <p className="verse-page__error-detail">
                      Selection: <code>{graphSelection.kind}</code> <code>{graphSelection.id}</code> | confidence{' '}
                      <code>{resolvedSelection.confidence}</code>
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
                      onEntityClick={(entity) => {
                        if (!entity) {
                          setGraphSelection(null)
                          return
                        }
                        clearWordSelection()
                        setGraphSelection({
                          kind: entity.kind,
                          id: entity.id,
                          label: entity.label,
                        })
                      }}
                    />
                  )}
                </section>

                <section aria-label="Trace" className="verse-page__panel verse-page__panel--trace">
                  {graphSelection ? (
                    <div className="verse-page__resolver">
                      <p className="verse-page__error-detail">
                        Resolver: <code>{resolvedSelection.confidence}</code> | matches{' '}
                        <code>{rankedLocations.length}</code>
                      </p>
                      {rankedLocations.length > 1 ? (
                        <label className="verse-page__resolver-select">
                          <span>Alternatives</span>
                          <select
                            value={selectedMatchIndex}
                            onChange={(event) => setSelectedMatchIndex(Number.parseInt(event.target.value, 10) || 0)}
                          >
                            {rankedLocations.map((location, index) => (
                              <option key={`${location.kind}-${location.index}-${index}`} value={index}>
                                {formatLocationLabel(location)}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                    </div>
                  ) : null}
                  {traceModel.error ? (
                    <>
                      <p role="alert" className="verse-page__panel-alert">
                        {traceModel.error.message}
                      </p>
                      <p className="verse-page__error-detail">{traceModel.error.detail}</p>
                    </>
                  ) : traceModel.traceIndex ? (
                    <>
                      <TraceEventViewer
                        traceJson={data.traceJson}
                        primary={graphSelection ? primaryTraceLocation : selectedWordPrimaryTraceLocation}
                        alternatives={
                          graphSelection ? alternativeTraceLocations : selectedWordAlternativeTraceLocations
                        }
                      />
                      {resolvedSelection.confidence !== 'high' && data.traceTxt ? (
                        <TraceTextViewer traceText={data.traceTxt} searchResult={fallbackSearch} />
                      ) : null}
                    </>
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
