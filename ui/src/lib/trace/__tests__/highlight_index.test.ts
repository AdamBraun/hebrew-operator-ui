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

  it('indexes boundary handles from boundary_open events', () => {
    const trace: TraceJson = {
      handles: [
        { id: 'C:8:7', kind: 'scope' },
        { id: 'ב:8:3', kind: 'boundary', meta: { inside: 'C:8:7', outside: 'C:8:7' } },
      ],
      boundaries: [{ id: 'ב:8:3', inside: 'C:8:7', outside: 'C:8:7', members: ['C:8:7'] }],
      links: [],
      rules: [],
      vm: {
        H: [
          {
            type: 'WORD_START',
            tau: 8,
            data: {
              activeConstruct: 'C:8:7',
              focus: 'C:8:7',
              inboundFocus: 'ר:7:3',
              C0: 'C:8:7',
              F0: 'ר:7:3',
              wordText: 'אָבִי',
            },
          },
          {
            type: 'alias',
            tau: 8,
            data: {
              id: 'א:8:6',
              left: 'ר:7:3',
              right: 'C:8:7',
            },
          },
          {
            type: 'boundary_open',
            tau: 8,
            data: {
              anchor: 1,
              boundaryId: 'ב:8:3',
              id: 'ב:8:3',
              inside: 'C:8:7',
              outside: 'C:8:7',
            },
          },
        ],
      },
    }

    const index = buildTraceIndex(trace)

    expect(index.refsByHandleId.get('C:8:7')).toEqual([0, 1, 2])
    expect(index.refsByHandleId.get('ב:8:3')).toEqual([2])
    expect(eventRefs(index.events[2])).toContain('ב:8:3')
  })
})
