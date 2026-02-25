import type { VerseRef } from '../lib/ref'

type ManifestFields = {
  engineSha: string | null
  generatedAt: string | null
  version: string | null
}

type VerseHeaderProps = {
  verseRef: VerseRef
  manifest: any
}

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

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.9rem',
        flexWrap: 'wrap',
        marginBottom: '0.75rem',
      }}
    >
      <strong>{verseLabel}</strong>
      <span>engine_sha: {fields.engineSha ?? 'unknown'}</span>
      <span>generated_at: {fields.generatedAt ?? 'unknown'}</span>
      {fields.version ? <span>version: {fields.version}</span> : null}
    </header>
  )
}

export default VerseHeader

