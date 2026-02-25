import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import AppShell from '../layout/AppShell'
import VerseText from '../components/VerseText'
import { fetchManifest, fetchVerseArtifacts } from '../lib/corpus'
import { FetchError } from '../lib/fetcher'
import { normalizeVerseRef } from '../lib/ref'
import type { Manifest, VerseArtifacts } from '../lib/types'
import { extractVerseText } from '../lib/verseText'

function VersePage() {
  const { book, chapter, verse } = useParams()
  const ref = useMemo(
    () => normalizeVerseRef({ book, chapter, verse }),
    [book, chapter, verse]
  )
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [artifacts, setArtifacts] = useState<VerseArtifacts | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!ref) {
      setLoading(false)
      setError(null)
      setManifest(null)
      setArtifacts(null)
      return
    }
    const currentRef = ref

    let canceled = false

    async function loadVerseData() {
      setLoading(true)
      setError(null)

      try {
        const [nextManifest, nextArtifacts] = await Promise.all([
          fetchManifest(),
          fetchVerseArtifacts(currentRef),
        ])

        if (canceled) {
          return
        }

        setManifest(nextManifest)
        setArtifacts(nextArtifacts)
        setLoading(false)
      } catch (nextError: unknown) {
        if (canceled) {
          return
        }

        setManifest(null)
        setArtifacts(null)

        if (nextError instanceof FetchError) {
          const statusPart = nextError.status ? ` (status ${nextError.status})` : ''
          setError(`Failed to load data from ${nextError.url}${statusPart}.`)
          setLoading(false)
          return
        }

        const message =
          nextError instanceof Error ? nextError.message : 'Unknown fetch failure'
        setError(`Failed to load verse data: ${message}`)
        setLoading(false)
      }
    }

    void loadVerseData()

    return () => {
      canceled = true
    }
  }, [ref, retryCount])

  const verseText = useMemo(() => {
    if (!artifacts) {
      return { text: '(verse text unavailable)', source: 'none' as const }
    }

    return extractVerseText(artifacts.traceJson, artifacts.traceTxt)
  }, [artifacts])

  function retryLoad() {
    setRetryCount((count) => count + 1)
  }

  return (
    <AppShell>
      <header style={{ marginBottom: '1rem' }} />

      {!ref ? (
        <p role="alert">Invalid verse reference</p>
      ) : (
        <>
          {loading ? (
            <p>Loading verse data...</p>
          ) : error ? (
            <section>
              <p role="alert">{error}</p>
              <button type="button" onClick={retryLoad}>
                Retry
              </button>
            </section>
          ) : artifacts && manifest ? (
            <>
              <VerseText text={verseText.text} />
              <h1>
                {ref.book} {ref.chapter3}:{ref.verse3}
              </h1>

              <main
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
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
                  }}
                >
                  <h2>Graph</h2>
                  <p>Graph placeholder</p>
                </section>

                <section
                  aria-label="Trace"
                  style={{
                    border: '1px solid #d0d7e2',
                    borderRadius: '8px',
                    padding: '1rem',
                    minHeight: '240px',
                  }}
                >
                  <h2>Trace</h2>
                  <p>Trace placeholder</p>
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
