import { useState } from 'react'
import type { VerseRef } from '../lib/ref'
import './VerseHeader.css'

type ManifestFields = {
  engineSha: string | null
  generatedAt: string | null
  version: string | null
}

type VerseHeaderProps = {
  verseRef: VerseRef
  manifest: any
}

type SeamMarkerId =
  | 'seam.hard'
  | 'seam.glue'
  | 'seam.glue_maqqef'
  | 'seam.cut.1'
  | 'seam.cut.2'
  | 'seam.cut.3'

const SEAM_MARKERS: Array<{ id: SeamMarkerId; label: string; short: string }> = [
  { id: 'seam.hard', label: 'Hard seam', short: 'H' },
  { id: 'seam.glue', label: 'Glue seam', short: 'G' },
  { id: 'seam.glue_maqqef', label: 'Glue+maqqef seam', short: 'GM' },
  { id: 'seam.cut.1', label: 'Cut marker 1', short: 'C1' },
  { id: 'seam.cut.2', label: 'Cut marker 2', short: 'C2' },
  { id: 'seam.cut.3', label: 'Cut marker 3', short: 'C3' },
]

function pickFirstString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }

  return null
}

export function pickManifestFields(manifest: any): ManifestFields {
  const data =
    manifest && typeof manifest === 'object' ? (manifest as Record<string, unknown>) : {}

  return {
    engineSha: pickFirstString(data, ['engine_git_sha', 'engineSha', 'git_sha', 'sha']),
    generatedAt: pickFirstString(data, [
      'generated_at',
      'generatedAt',
      'created_at',
    ]),
    version: pickFirstString(data, ['version', 'corpus_version', 'run_id']),
  }
}

function displayNumber(value: string): string {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) {
    return value
  }

  return String(parsed)
}

function VerseHeader({ verseRef, manifest }: VerseHeaderProps) {
  const fields = pickManifestFields(manifest)
  const verseLabel = `${verseRef.book.toUpperCase()} ${displayNumber(verseRef.chapter3)}:${displayNumber(verseRef.verse3)}`
  const [selectedMarker, setSelectedMarker] = useState<SeamMarkerId>('seam.glue')

  return (
    <header className="verse-header">
      <strong className="verse-header__chip verse-header__chip--ref">{verseLabel}</strong>
      <span className="verse-header__chip">engine_sha: {fields.engineSha ?? 'unknown'}</span>
      <span className="verse-header__chip">generated_at: {fields.generatedAt ?? 'unknown'}</span>
      {fields.version ? <span className="verse-header__chip">version: {fields.version}</span> : null}

      <div className="verse-header__seams" role="group" aria-label="Seam marker variants">
        {SEAM_MARKERS.map((marker) => {
          const stateClass =
            marker.id === selectedMarker
              ? 'verse-header__seam-marker--selected'
              : 'verse-header__seam-marker--related'

          return (
            <button
              key={marker.id}
              type="button"
              className={[
                'verse-header__seam-marker',
                `verse-header__seam-marker--${marker.id.replaceAll('.', '-')}`,
                stateClass,
              ].join(' ')}
              onClick={() => setSelectedMarker(marker.id)}
              aria-pressed={marker.id === selectedMarker}
              title={marker.label}
            >
              {marker.short}
            </button>
          )
        })}
      </div>
    </header>
  )
}

export default VerseHeader
