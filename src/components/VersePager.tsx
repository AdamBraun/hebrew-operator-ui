import { useNavigate } from 'react-router-dom'
import type { VerseRef } from '../lib/ref'

type VersePagerProps = {
  prevRef: VerseRef | null
  nextRef: VerseRef | null
  navLoading?: boolean
}

function displayNumber(value: string): string {
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? value : String(parsed)
}

function previewLabel(ref: VerseRef | null, direction: 'Prev' | 'Next'): string {
  if (!ref) {
    return `${direction}: End`
  }

  return `${direction}: ${ref.book} ${displayNumber(ref.chapter3)}:${displayNumber(ref.verse3)}`
}

function VersePager({ prevRef, nextRef, navLoading = false }: VersePagerProps) {
  const navigate = useNavigate()

  return (
    <section className="verse-page__pager" aria-label="Verse Pager">
      {navLoading ? <span className="verse-page__pager-status">Loading navigation…</span> : null}
      <button
        type="button"
        disabled={navLoading || !prevRef}
        title={previewLabel(prevRef, 'Prev')}
        onClick={() =>
          prevRef && navigate(`/${prevRef.book}/${prevRef.chapter3}/${prevRef.verse3}`)
        }
      >
        Prev
      </button>
      <button
        type="button"
        disabled={navLoading || !nextRef}
        title={previewLabel(nextRef, 'Next')}
        onClick={() =>
          nextRef && navigate(`/${nextRef.book}/${nextRef.chapter3}/${nextRef.verse3}`)
        }
      >
        Next
      </button>
    </section>
  )
}

export default VersePager
