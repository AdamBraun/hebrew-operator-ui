import { describe, expect, it } from 'vitest'
import {
  FIXTURE_NAV_MODEL,
  FIXTURE_REGISTRY,
  fixtureKeyForRef,
  getFixtureData,
} from './fixtures'

describe('fixtures registry', () => {
  it('lists three deterministic refs with metadata', () => {
    expect(FIXTURE_REGISTRY).toHaveLength(3)

    for (const entry of FIXTURE_REGISTRY) {
      expect(entry.key).toBe(fixtureKeyForRef(entry.ref))
      expect(entry.traceJson.localPath.endsWith('/trace.json')).toBe(true)
      expect(entry.graphDot.localPath.endsWith('/graph.dot')).toBe(true)
      expect(entry.traceJson.sha256).toMatch(/^[a-f0-9]{64}$/)
      expect(entry.graphDot.sha256).toMatch(/^[a-f0-9]{64}$/)
      expect(entry.traceTxt?.sha256).toMatch(/^[a-f0-9]{64}$/)
      expect(entry.traceJson.sourceUrl).toMatch(/^https:\/\//)
    }
  })

  it('returns parsed in-memory data for known refs', () => {
    const refs = FIXTURE_REGISTRY.map((entry) => entry.ref)

    for (const ref of refs) {
      const fixture = getFixtureData(ref)
      expect(fixture).not.toBeNull()
      expect(typeof fixture?.traceJsonData).toBe('object')
      expect(fixture?.graphDotData.includes('digraph')).toBe(true)
      expect(fixture?.traceTxtData.length ?? 0).toBeGreaterThan(0)
    }
  })

  it('builds a nav model from fixture refs', () => {
    expect(FIXTURE_NAV_MODEL.books).toEqual(['genesis', 'leviticus', 'deuteronomy'])
    expect(FIXTURE_NAV_MODEL.versesByBookChapter.genesis?.['001']).toEqual(['001'])
    expect(FIXTURE_NAV_MODEL.versesByBookChapter.deuteronomy?.['006']).toEqual(['004'])
    expect(FIXTURE_NAV_MODEL.versesByBookChapter.leviticus?.['001']).toEqual(['001'])
  })
})
