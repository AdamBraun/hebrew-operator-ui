import { useParams } from 'react-router-dom'
import AppShell from '../layout/AppShell'

function VersePage() {
  const { book, chapter, verse } = useParams()

  return (
    <AppShell>
      <h1>Verse Page</h1>
      <p>
        Book: {book} | Chapter: {chapter} | Verse: {verse}
      </p>
    </AppShell>
  )
}

export default VersePage
