import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VerseRef } from './ref'

const FIXTURE_REF: VerseRef = {
  book: 'genesis',
  chapter3: '001',
  verse3: '001',
}

describe('source fixture mode', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('loads local fixture artifacts when VITE_USE_FIXTURES=1', async () => {
    vi.stubEnv('VITE_USE_FIXTURES', '1')
    const source = await import('./source')

    expect(source.isFixtureSourceEnabled()).toBe(true)

    const urls = source.sourceUrlsForRef(FIXTURE_REF)
    expect(urls.mode).toBe('fixture')
    expect(urls.traceJson).toContain('src/fixtures/refs/genesis/001/001/trace.json')

    const traceJson = await source.loadTraceJson(FIXTURE_REF)
    const graphDot = await source.loadGraphDot(FIXTURE_REF)
    const traceTxt = await source.loadTraceTxt(FIXTURE_REF)

    expect(typeof traceJson).toBe('object')
    expect(graphDot.includes('digraph')).toBe(true)
    expect(traceTxt.length).toBeGreaterThan(0)
  })

  it('throws when a fixture ref is missing in fixture mode', async () => {
    vi.stubEnv('VITE_USE_FIXTURES', '1')
    const source = await import('./source')

    await expect(
      source.loadTraceJson({
        book: 'genesis',
        chapter3: '050',
        verse3: '099',
      })
    ).rejects.toMatchObject({
      name: 'FetchError',
      status: 404,
    })
  })
})

