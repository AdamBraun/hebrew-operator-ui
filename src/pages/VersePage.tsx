import { useParams } from 'react-router-dom'
import AppShell from '../layout/AppShell'
import { CORPUS_BASE_URL } from '../config/corpus'

function VersePage() {
  const { book, chapter, verse } = useParams()

  return (
    <AppShell>
      <h1>
        Verse: {book} {chapter}:{verse}
      </h1>
      <p>Corpus base URL: {CORPUS_BASE_URL}</p>
      <section
        style={{
          border: '1px solid #d0d7e2',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem',
        }}
      >
        <h2>Graph</h2>
        <p>Graph will render here</p>
      </section>
      <section
        style={{
          border: '1px solid #d0d7e2',
          borderRadius: '8px',
          padding: '1rem',
        }}
      >
        <h2>Trace</h2>
        <p>Trace will render here</p>
      </section>
    </AppShell>
  )
}

export default VersePage
