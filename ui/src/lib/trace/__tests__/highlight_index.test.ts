import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { eventRefs } from '../event_refs'
import { buildTraceIndex } from '../index_trace'
import type { TraceJson } from '../types'

function loadTraceFixture(fileName: string): TraceJson {
  const fixtureUrl = new URL(`../__fixtures__/${fileName}`, import.meta.url)
  const fixturePath = fileURLToPath(fixtureUrl)
  const raw = readFileSync(fixturePath, 'utf8')
  return JSON.parse(raw) as TraceJson
}

describe('buildTraceIndex highlight determinism', () => {
  it('builds stable refs and each highlighted event explicitly references the handle id', () => {
    const trace = loadTraceFixture('genesis_001_001.trace.min.json')

    expect(() => buildTraceIndex(trace)).not.toThrow()

    const index = buildTraceIndex(trace)
    const trackedHandleIds = ['ב:2:4', 'ר:2:2', 'ת:7:8'] as const

    const refsByHandle = Object.fromEntries(
      trackedHandleIds.map((handleId) => [handleId, index.refsByHandleId.get(handleId) ?? []])
    ) as Record<(typeof trackedHandleIds)[number], number[]>

    expect(refsByHandle).toMatchSnapshot()

    for (const handleId of trackedHandleIds) {
      const refs = refsByHandle[handleId]
      expect(refs.length).toBeGreaterThan(0)

      let previous = -1
      for (const eventIndex of refs) {
        expect(eventIndex).toBeGreaterThan(previous)
        previous = eventIndex

        const event = index.events[eventIndex]
        expect(event).toBeDefined()
        expect(eventRefs(event)).toContain(handleId)
      }
    }

    // Regression guard: this boundary_close reference is a known anchor in Genesis 1:1.
    expect(refsByHandle['ב:2:4']).toContain(8)
  })
})
