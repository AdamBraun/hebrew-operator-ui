import { useParams } from 'react-router-dom'
import { useState } from 'react'
import AppShell from '../layout/AppShell'

function VersePage() {
  const { book, chapter, verse } = useParams()
  const [loading] = useState<boolean>(false)
  const [error] = useState<string | null>(null)
  const hasInvalidReference = !book || !chapter || !verse

  return (
    <AppShell>
      <header style={{ marginBottom: '1rem' }} />

      {hasInvalidReference ? (
        <p role="alert">Invalid verse reference</p>
      ) : (
        <>
          <h1>
            {book} {chapter}:{verse}
          </h1>

          {loading ? <p>Loading verse...</p> : null}
          {error ? <p role="alert">{error}</p> : null}

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
      )}
    </AppShell>
  )
}

export default VersePage
