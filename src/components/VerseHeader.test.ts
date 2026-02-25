import { describe, expect, it } from 'vitest'
import { pickManifestFields } from './VerseHeader'

describe('pickManifestFields', () => {
  it('picks common manifest field variants', () => {
    const fields = pickManifestFields({
      engineSha: 'abc123',
      generatedAt: '2026-02-25T12:34:56Z',
      corpus_version: 'v1.2.3',
    })

    expect(fields).toEqual({
      engineSha: 'abc123',
      generatedAt: '2026-02-25T12:34:56Z',
      version: 'v1.2.3',
    })
  })

  it('returns null values for missing manifest fields', () => {
    const fields = pickManifestFields({})
    expect(fields).toEqual({
      engineSha: null,
      generatedAt: null,
      version: null,
    })
  })
})

