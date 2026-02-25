export type { VerseRef } from './ref'

export type Manifest = {
  generated_at?: string
  engine_git_sha?: string
  [k: string]: unknown
}

export type VerseArtifacts = {
  traceJson: any
  traceTxt: string
  graphDot: string
  verseText?: string
}
